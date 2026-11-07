import * as THREE from 'three';
import { CollisionBox, getDistrictName } from './CityGenerator';
import { textureFactory } from './TextureGenerator';

interface StreamedChunk {
  group: THREE.Group;
  detail: THREE.Group;
  proxy: THREE.Group;
  colliders: CollisionBox[];
}

const CHUNK_SIZE = 200;
const CHUNK_RADIUS = 2;
const DETAIL_DISTANCE = 360;
const WORLD_LIMIT = 1500;

const paletteByDistrict: Array<{ match: RegExp; colors: number[]; sign: string }> = [
  { match: /University|Stadium/i, colors: [0xd9d4c5, 0x879a9e, 0xb8a27a], sign: '#59666d' },
  { match: /Market|Old Quarter|Ghetto/i, colors: [0xa66e4e, 0xc18a5c, 0x82715d], sign: '#843f2e' },
  { match: /Military|Air Force/i, colors: [0x78836b, 0x656e60, 0x9a9677], sign: '#52614a' },
  { match: /Elite|Villa/i, colors: [0xe8dfce, 0xd8c6a9, 0xc9d5ca], sign: '#78674e' },
  { match: /Park|Castle|Mountain/i, colors: [0x9b947d, 0x897f69, 0xb1a78d], sign: '#566b43' },
  { match: /Farm|Village/i, colors: [0xb7a078, 0x9d6948, 0xd0b87f], sign: '#68743d' },
  { match: /Industrial|Harbor/i, colors: [0x7d8988, 0x687778, 0x9a8569], sign: '#53666b' }
];

export class WorldChunkStreamer {
  private readonly chunks = new Map<string, StreamedChunk>();
  private readonly roadMaterial = new THREE.MeshStandardMaterial({
    color: 0x303438,
    roughness: 0.88,
    metalness: 0.04
  });
  private readonly markingMaterial = new THREE.MeshStandardMaterial({
    color: 0xe7d28a,
    roughness: 0.75
  });
  private readonly unitBox = new THREE.BoxGeometry(1, 1, 1);
  private readonly unitPlane = new THREE.PlaneGeometry(1, 1);
  private readonly windowMaterial = new THREE.MeshStandardMaterial({
    color: 0x9fd6df,
    emissive: 0x527f89,
    emissiveIntensity: 0.08,
    roughness: 0.24,
    metalness: 0.12
  });
  private readonly roofMaterial = new THREE.MeshStandardMaterial({ color: 0x505959, roughness: 0.88 });
  private readonly antennaMaterial = new THREE.MeshStandardMaterial({
    color: 0xc9d1cc,
    metalness: 0.7,
    roughness: 0.25
  });
  private readonly lampPostMaterial = new THREE.MeshStandardMaterial({ color: 0x343b3c, metalness: 0.65, roughness: 0.45 });
  private readonly lampBulbMaterial = new THREE.MeshStandardMaterial({
    color: 0xffe7a5,
    emissive: 0xffbd66,
    emissiveIntensity: 0.05
  });
  private readonly lampPostGeometry = new THREE.CylinderGeometry(0.12, 0.18, 8, 6);
  private readonly lampBulbGeometry = new THREE.SphereGeometry(0.38, 8, 6);
  private readonly materialCache = new Map<number, THREE.MeshStandardMaterial>();
  private readonly signMaterialCache = new Map<string, THREE.MeshStandardMaterial>();

  constructor(
    private readonly scene: THREE.Scene,
    private readonly colliders: CollisionBox[]
  ) {}

  public update(position: THREE.Vector3, isNight: boolean) {
    const chunkX = Math.floor((position.x - 60) / CHUNK_SIZE);
    const chunkZ = Math.floor((position.z - 60) / CHUNK_SIZE);
    const wanted = new Set<string>();

    for (let x = chunkX - CHUNK_RADIUS; x <= chunkX + CHUNK_RADIUS; x++) {
      for (let z = chunkZ - CHUNK_RADIUS; z <= chunkZ + CHUNK_RADIUS; z++) {
        const originX = 60 + x * CHUNK_SIZE;
        const originZ = 60 + z * CHUNK_SIZE;
        const centerX = originX + CHUNK_SIZE / 2;
        const centerZ = originZ + CHUNK_SIZE / 2;
        if (Math.abs(centerX) > WORLD_LIMIT || Math.abs(centerZ) > WORLD_LIMIT) continue;

        const key = `${x}:${z}`;
        wanted.add(key);
        let chunk = this.chunks.get(key);
        if (!chunk) {
          chunk = this.createChunk(originX, originZ);
          this.chunks.set(key, chunk);
          this.scene.add(chunk.group);
          this.colliders.push(...chunk.colliders);
        }

        const distance = Math.hypot(centerX - position.x, centerZ - position.z);
        chunk.detail.visible = distance <= DETAIL_DISTANCE;
        chunk.proxy.visible = distance > DETAIL_DISTANCE;
      }
    }

    for (const [key, chunk] of this.chunks) {
      if (wanted.has(key)) continue;
      this.scene.remove(chunk.group);
      const colliderSet = new Set(chunk.colliders);
      for (let i = this.colliders.length - 1; i >= 0; i--) {
        if (colliderSet.has(this.colliders[i])) this.colliders.splice(i, 1);
      }
      this.chunks.delete(key);
    }

    const nightIntensity = isNight ? 1.15 : 0.08;
    this.windowMaterial.emissiveIntensity = nightIntensity;
    this.lampBulbMaterial.emissiveIntensity = isNight ? 2 : 0.05;
  }

  private createChunk(originX: number, originZ: number): StreamedChunk {
    const group = new THREE.Group();
    group.position.set(originX, 0, originZ);
    const base = new THREE.Group();
    const detail = new THREE.Group();
    const proxy = new THREE.Group();
    const colliders: CollisionBox[] = [];
    const district = getDistrictName(originX + CHUNK_SIZE / 2, originZ + CHUNK_SIZE / 2);
    const palette = paletteByDistrict.find((entry) => entry.match.test(district)) ?? {
      colors: [0xc1bba8, 0x96a8a4, 0x8c7965],
      sign: '#526a70'
    };

    this.addRoads(base);
    this.addStreetLights(detail);

    for (const localX of [50, 150]) {
      for (const localZ of [50, 150]) {
        const worldX = originX + localX;
        const worldZ = originZ + localZ;
        if (Math.abs(worldX) < 430 && Math.abs(worldZ) < 430) continue;

        const seed = this.seed(worldX, worldZ);
        const width = 24 + seed % 9;
        const depth = 24 + Math.floor(seed / 7) % 9;
        const height = this.getBuildingHeight(district, seed);
        const color = palette.colors[seed % palette.colors.length];
        const material = this.getBuildingMaterial(color);
        const building = this.createBuilding(width, depth, height, material);
        building.position.set(localX, 0, localZ);
        detail.add(building);

        const silhouette = new THREE.Mesh(this.unitBox, material);
        silhouette.position.set(localX, height * 0.45, localZ);
        silhouette.scale.set(width, height * 0.9, depth);
        proxy.add(silhouette);

        colliders.push({
          minX: worldX - width / 2 - 1,
          maxX: worldX + width / 2 + 1,
          minZ: worldZ - depth / 2 - 1,
          maxZ: worldZ + depth / 2 + 1,
          name: district,
          type: 'building'
        });
      }
    }

    const sign = new THREE.Mesh(this.unitBox, this.getSignMaterial(district, palette.sign));
    sign.position.set(12, 4.6, 35);
    sign.scale.set(14, 3.2, 0.25);
    detail.add(sign);

    group.add(base, detail, proxy);
    return { group, detail, proxy, colliders };
  }

  private addRoads(group: THREE.Group) {
    for (const coordinate of [0, 100]) {
      const horizontal = new THREE.Mesh(this.unitPlane, this.roadMaterial);
      horizontal.rotation.x = -Math.PI / 2;
      horizontal.position.set(100, 0.035, coordinate);
      horizontal.scale.set(CHUNK_SIZE, 14, 1);
      group.add(horizontal);

      const vertical = new THREE.Mesh(this.unitPlane, this.roadMaterial);
      vertical.rotation.x = -Math.PI / 2;
      vertical.position.set(coordinate, 0.04, 100);
      vertical.scale.set(14, CHUNK_SIZE, 1);
      group.add(vertical);

      const dash = new THREE.Mesh(this.unitPlane, this.markingMaterial);
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(100, 0.055, coordinate + 7);
      dash.scale.set(CHUNK_SIZE, 0.14, 1);
      group.add(dash);
    }
  }

  private addStreetLights(group: THREE.Group) {
    for (const [x, z] of [[18, 18], [118, 118]] as const) {
      const post = new THREE.Mesh(this.lampPostGeometry, this.lampPostMaterial);
      post.position.set(x, 4, z);
      const bulb = new THREE.Mesh(this.lampBulbGeometry, this.lampBulbMaterial);
      bulb.position.set(x, 8.2, z);
      group.add(post, bulb);
    }
  }

  private createBuilding(
    width: number,
    depth: number,
    height: number,
    material: THREE.MeshStandardMaterial
  ): THREE.Group {
    const building = new THREE.Group();
    const body = new THREE.Mesh(this.unitBox, material);
    body.position.y = height / 2;
    body.scale.set(width, height, depth);
    body.castShadow = true;
    body.receiveShadow = true;
    building.add(body);

    const roof = new THREE.Mesh(this.unitBox, this.roofMaterial);
    roof.position.y = height + 0.5;
    roof.scale.set(width + 1, 1, depth + 1);
    building.add(roof);

    const pane = new THREE.Mesh(this.unitBox, this.windowMaterial);
    pane.position.set(0, Math.min(height - 2, 5), depth / 2 + 0.08);
    pane.scale.set(Math.min(width * 0.55, 12), 1.8, 0.12);
    building.add(pane);

    if (height > 28) {
      const antenna = new THREE.Mesh(this.unitBox, this.antennaMaterial);
      antenna.position.set(-width * 0.25, height + 4, -depth * 0.2);
      antenna.scale.set(0.35, 8, 0.35);
      building.add(antenna);
    }
    return building;
  }

  private getBuildingHeight(district: string, seed: number): number {
    if (/Financial|Downtown|Commercial/i.test(district)) return 35 + (seed % 45);
    if (/University|Military|Airport|Stadium|Castle/i.test(district)) return 18 + (seed % 25);
    if (/Farm|Village|Villa|Beach|Park|Mountain/i.test(district)) return 9 + (seed % 16);
    return 12 + (seed % 24);
  }

  private getBuildingMaterial(color: number): THREE.MeshStandardMaterial {
    let material = this.materialCache.get(color);
    if (!material) {
      material = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.68,
        metalness: 0.06
      });
      this.materialCache.set(color, material);
    }
    return material;
  }

  private getSignMaterial(district: string, color: string): THREE.MeshStandardMaterial {
    let material = this.signMaterialCache.get(district);
    if (!material) {
      material = new THREE.MeshStandardMaterial({
        map: textureFactory.getStorefrontTexture(district.toUpperCase(), color, '#f2ead8'),
        roughness: 0.65,
        metalness: 0.08
      });
      this.signMaterialCache.set(district, material);
    }
    return material;
  }

  private seed(x: number, z: number): number {
    const value = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453;
    return Math.floor((value - Math.floor(value)) * 1000);
  }
}
