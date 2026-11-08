import * as THREE from 'three';
import { CollisionBox, getDistrictName, getTerrainHeight, isWaterArea, WORLD_RADIUS } from './CityGenerator';
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
const WORLD_LIMIT = WORLD_RADIUS;

const paletteByDistrict: Array<{ match: RegExp; colors: number[]; sign: string }> = [
  { match: /University|Stadium/i, colors: [0xd9d4c5, 0x879a9e, 0xb8a27a], sign: '#59666d' },
  { match: /Market|Old Quarter|Ghetto/i, colors: [0xa66e4e, 0xc18a5c, 0x82715d], sign: '#843f2e' },
  { match: /Military|Air Force/i, colors: [0x78836b, 0x656e60, 0x9a9677], sign: '#52614a' },
  { match: /Elite|Villa/i, colors: [0xe8dfce, 0xd8c6a9, 0xc9d5ca], sign: '#78674e' },
  { match: /Park|Castle|Mountain/i, colors: [0x9b947d, 0x897f69, 0xb1a78d], sign: '#566b43' },
  { match: /Farm|Village/i, colors: [0xb7a078, 0x9d6948, 0xd0b87f], sign: '#68743d' },
  { match: /Industrial|Harbor/i, colors: [0x7d8988, 0x687778, 0x9a8569], sign: '#53666b' },
  { match: /Outskirts|Countryside|Rural/i, colors: [0xb79b72, 0x8e7358, 0xc5b58e], sign: '#68743d' }
];

export class WorldChunkStreamer {
  private readonly chunks = new Map<string, StreamedChunk>();
  private readonly roadMaterial = new THREE.MeshStandardMaterial({
    color: 0x303438,
    roughness: 0.88,
    metalness: 0.04
  });
  private readonly dirtRoadMaterial = new THREE.MeshStandardMaterial({
    color: 0x776b52,
    roughness: 1,
    metalness: 0
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
  private readonly houseRoofMaterials = [
    new THREE.MeshStandardMaterial({ color: 0x8b4936, roughness: 0.88 }),
    new THREE.MeshStandardMaterial({ color: 0x55585a, roughness: 0.88 }),
    new THREE.MeshStandardMaterial({ color: 0x9a7a4d, roughness: 0.88 })
  ];
  private readonly doorMaterial = new THREE.MeshStandardMaterial({ color: 0x493a2e, roughness: 0.9 });
  private readonly ruinMaterial = new THREE.MeshStandardMaterial({ color: 0x746d5c, roughness: 1 });
  private readonly sidewalkMaterial = new THREE.MeshStandardMaterial({ color: 0x8d8a7f, roughness: 0.95 });
  private readonly pitchMaterial = new THREE.MeshStandardMaterial({ color: 0x3e7543, roughness: 0.98 });
  private readonly pitchLineMaterial = new THREE.MeshStandardMaterial({ color: 0xe7e5cd, roughness: 0.8 });
  private readonly goalMaterial = new THREE.MeshStandardMaterial({ color: 0xe5e7eb, roughness: 0.55, metalness: 0.2 });
  private readonly rubbleMaterial = new THREE.MeshStandardMaterial({ color: 0x625e54, roughness: 1 });
  private readonly fenceMaterial = new THREE.MeshStandardMaterial({ color: 0x765d3b, roughness: 0.95 });
  private readonly gateMaterial = new THREE.MeshStandardMaterial({ color: 0x68472c, roughness: 0.9 });
  private readonly yardGrassMaterial = new THREE.MeshStandardMaterial({ color: 0x71805a, roughness: 1 });
  private readonly treeTrunkMaterial = new THREE.MeshStandardMaterial({ color: 0x705238, roughness: 1 });
  private readonly treeCrownMaterials = [
    new THREE.MeshStandardMaterial({ color: 0x627b49, roughness: 1 }),
    new THREE.MeshStandardMaterial({ color: 0x778452, roughness: 1 })
  ];
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

    this.addRoads(base, originX, originZ);
    this.addStreetLights(detail, originX, originZ);

    for (const localX of [50, 150]) {
      for (const localZ of [50, 150]) {
        const worldX = originX + localX;
        const worldZ = originZ + localZ;
        if (Math.abs(worldX) < 430 && Math.abs(worldZ) < 430) continue;
        if (isWaterArea(worldX, worldZ)) continue;

        const seed = this.seed(worldX, worldZ);
        const isVillage = /Village/i.test(district);
        const rural = Math.max(Math.abs(worldX), Math.abs(worldZ)) > 3500;
        if (seed % (isVillage ? 53 : rural ? 37 : 31) === 0) {
          this.addFootballPitch(detail, localX, localZ);
          continue;
        }

        const type = seed % 100;
        const isShop = type < (isVillage ? 7 : 11);
        const isBar = type >= 11 && type < 15;
        const isRuin = type >= 15 && type < (isVillage ? 20 : 24);
        const isHut = type >= (isVillage ? 20 : 24) && type < (isVillage ? 72 : 40);
        const width = isHut ? 13 + seed % 8 : isRuin ? 20 + seed % 12 : isShop || isBar ? 24 + seed % 12 : 22 + seed % 18;
        const depth = isHut ? 12 + Math.floor(seed / 7) % 8 : isRuin ? 19 + Math.floor(seed / 7) % 12 : isShop || isBar ? 20 + Math.floor(seed / 7) % 12 : 20 + Math.floor(seed / 7) % 17;
        const height = this.getBuildingHeight(district, seed);
        const color = palette.colors[seed % palette.colors.length];
        const material = this.getBuildingMaterial(color);
        const terrainY = getTerrainHeight(worldX, worldZ);
        const building = isRuin
          ? this.createRuinedBuilding(width, depth, height, material, seed)
          : this.createBuilding(width, depth, height, material, seed, isHut, isShop || isBar);
        building.position.set(localX, terrainY, localZ);
        detail.add(building);
        if (isVillage && !isRuin && !isShop && !isBar && seed % 4 !== 0) {
          this.addVillageYard(detail, colliders, localX, localZ, worldX, worldZ, terrainY, seed);
        }
        if (isShop || isBar) {
          const label = isBar ? ['THE LOCAL', 'LAST STOP', 'COUNTRY BAR'][seed % 3] : ['CORNER SHOP', 'MINI MARKET', 'GROCER'][seed % 3];
          const sign = new THREE.Mesh(
            this.unitBox,
            this.getSignMaterial(label, isBar ? '#8b3a31' : palette.sign)
          );
          sign.position.set(localX, terrainY + height * 0.78, localZ + depth * 0.5 + 0.2);
          sign.scale.set(Math.min(width * 0.78, 20), 2.4, 0.3);
          detail.add(sign);
        }

        const silhouette = new THREE.Mesh(this.unitBox, material);
        silhouette.position.set(localX, terrainY + height * 0.45, localZ);
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
    sign.position.set(12, getTerrainHeight(originX + 12, originZ + 35) + 4.6, 35);
    sign.scale.set(14, 3.2, 0.25);
    detail.add(sign);

    this.addCountryCastle(detail, colliders, originX, originZ);

    group.add(base, detail, proxy);
    return { group, detail, proxy, colliders };
  }

  private addVillageYard(
    group: THREE.Group,
    colliders: CollisionBox[],
    localX: number,
    localZ: number,
    worldX: number,
    worldZ: number,
    terrainY: number,
    seed: number
  ) {
    const yard = new THREE.Group();
    const lawn = new THREE.Mesh(new THREE.PlaneGeometry(52, 48), this.yardGrassMaterial);
    lawn.rotation.x = -Math.PI / 2;
    lawn.position.set(localX, terrainY + 0.018, localZ);
    yard.add(lawn);

    const addFence = (x: number, z: number, width: number, depth: number) => {
      const fence = new THREE.Mesh(this.unitBox, this.fenceMaterial);
      fence.position.set(x, terrainY + 0.75, z);
      fence.scale.set(width, 1.5, depth);
      yard.add(fence);
      colliders.push({
        minX: worldX + x - width / 2,
        maxX: worldX + x + width / 2,
        minZ: worldZ + z - depth / 2,
        maxZ: worldZ + z + depth / 2,
        type: 'building'
      });
    };

    addFence(0, -24, 54, 0.5);
    addFence(-27, 0, 0.5, 48);
    addFence(27, 0, 0.5, 48);
    addFence(-15.5, 24, 23, 0.5);
    addFence(15.5, 24, 23, 0.5);

    for (const side of [-1, 1]) {
      const gate = new THREE.Group();
      gate.position.set(localX + side * 4, terrainY + 0.1, localZ + 24);
      gate.rotation.y = side * 0.72;
      const leaf = new THREE.Mesh(new THREE.BoxGeometry(7.5, 1.2, 0.16), this.gateMaterial);
      leaf.position.set(-side * 3.75, 0.6, 0);
      gate.add(leaf);
      yard.add(gate);
    }

    for (let treeIndex = 0; treeIndex < 2; treeIndex++) {
      const treeX = localX + (treeIndex === 0 ? -19 : 19);
      const treeZ = localZ + (treeIndex === 0 ? -17 : 15);
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.35, 0.55, 5, 8),
        this.treeTrunkMaterial
      );
      trunk.position.set(treeX, terrainY + 2.5, treeZ);
      const crown = new THREE.Mesh(
        new THREE.SphereGeometry(2.6 + (seed % 3) * 0.35, 9, 7),
        this.treeCrownMaterials[treeIndex]
      );
      crown.position.set(treeX, terrainY + 5.3, treeZ);
      yard.add(trunk, crown);
    }

    const path = new THREE.Mesh(
      new THREE.BoxGeometry(4, 0.08, 12),
      new THREE.MeshStandardMaterial({ color: 0x9a8b6c, roughness: 1 })
    );
    path.position.set(localX, terrainY + 0.05, localZ + 17);
    yard.add(path);
    group.add(yard);
  }

  private addCountryCastle(
    group: THREE.Group,
    colliders: CollisionBox[],
    originX: number,
    originZ: number
  ) {
    const centerX = Math.round((originX + CHUNK_SIZE / 2) / 16000) * 16000;
    const centerZ = Math.round((originZ + CHUNK_SIZE / 2) / 16000) * 16000;
    if (
      Math.abs(centerX - (originX + CHUNK_SIZE / 2)) > 100 ||
      Math.abs(centerZ - (originZ + CHUNK_SIZE / 2)) > 100
    ) return;
    const castleSeed = Math.abs(Math.round(centerX / 16000) * 13 + Math.round(centerZ / 16000) * 7);
    if (castleSeed % 3 !== 0 || Math.max(Math.abs(centerX), Math.abs(centerZ)) < 7000) return;

    const localX = centerX - originX;
    const localZ = centerZ - originZ;
    const terrainY = getTerrainHeight(centerX, centerZ);
    const stone = new THREE.MeshStandardMaterial({ color: 0x817d70, roughness: 0.95 });
    const roof = new THREE.MeshStandardMaterial({ color: 0x51483c, roughness: 0.9 });
    const compound = new THREE.Group();
    compound.position.set(localX, terrainY, localZ);

    const addWall = (x: number, z: number, width: number, depth: number) => {
      const wall = new THREE.Mesh(this.unitBox, stone);
      wall.position.set(x, 3.1, z);
      wall.scale.set(width, 6.2, depth);
      compound.add(wall);
    };
    addWall(0, -39, 82, 2.4);
    addWall(-39, 0, 2.4, 78);
    addWall(39, 0, 2.4, 78);
    addWall(-23, 39, 33, 2.4);
    addWall(23, 39, 33, 2.4);

    for (const sideX of [-39, 39]) {
      for (const sideZ of [-39, 39]) {
        const tower = new THREE.Mesh(new THREE.CylinderGeometry(5.2, 6.4, 17, 10), stone);
        tower.position.set(sideX, 8.5, sideZ);
        const cap = new THREE.Mesh(new THREE.ConeGeometry(6.7, 7, 10), roof);
        cap.position.set(sideX, 20.5, sideZ);
        compound.add(tower, cap);
      }
    }

    const keep = new THREE.Mesh(this.unitBox, stone);
    keep.position.set(0, 12, -3);
    keep.scale.set(34, 24, 27);
    const keepRoof = new THREE.Mesh(this.unitBox, roof);
    keepRoof.position.set(0, 24.7, -3);
    keepRoof.scale.set(36, 1.4, 29);
    compound.add(keep, keepRoof);

    for (const postX of [-6.5, 6.5]) {
      const post = new THREE.Mesh(this.unitBox, stone);
      post.position.set(postX, 5, 37);
      post.scale.set(4.5, 10, 7);
      compound.add(post);
    }
    const lintel = new THREE.Mesh(this.unitBox, stone);
    lintel.position.set(0, 9.5, 37);
    lintel.scale.set(17.5, 1.8, 7);
    compound.add(lintel);
    group.add(compound);

    const addCollider = (x: number, z: number, width: number, depth: number) => {
      colliders.push({
        minX: centerX + x - width / 2,
        maxX: centerX + x + width / 2,
        minZ: centerZ + z - depth / 2,
        maxZ: centerZ + z + depth / 2,
        name: 'Stonewatch Castle',
        type: 'building'
      });
    };
    addCollider(0, -3, 34, 27);
    addCollider(0, -39, 82, 2.4);
    addCollider(-39, 0, 2.4, 78);
    addCollider(39, 0, 2.4, 78);
    addCollider(-23, 39, 33, 2.4);
    addCollider(23, 39, 33, 2.4);
    addCollider(-6.5, 39, 4.5, 7);
    addCollider(6.5, 39, 4.5, 7);
  }

  private addRoads(group: THREE.Group, originX: number, originZ: number) {
    const rural = Math.max(Math.abs(originX + CHUNK_SIZE / 2), Math.abs(originZ + CHUNK_SIZE / 2)) > 3500;
    const horizontalCoords = rural
      ? (Math.abs(Math.round(originZ / CHUNK_SIZE)) % 2 === 0 ? [0] : [])
      : [0, 100];
    const verticalCoords = rural
      ? (Math.abs(Math.round(originX / CHUNK_SIZE)) % 2 === 0 ? [0] : [])
      : [0, 100];
    const horizontalRoadMaterial = rural ? this.dirtRoadMaterial : this.roadMaterial;

    for (const coordinate of horizontalCoords) {
      const horizontalInWater =
        originZ + coordinate >= 360 &&
        originZ + coordinate <= 540 &&
        originX <= 550 &&
        originX + CHUNK_SIZE >= -550;
      const elevation = getTerrainHeight(originX + 100, originZ + coordinate);

      if (!horizontalInWater) {
        for (const offset of rural ? [] : [-9, 9]) {
          const sidewalk = new THREE.Mesh(this.unitPlane, this.sidewalkMaterial);
          sidewalk.rotation.x = -Math.PI / 2;
          sidewalk.position.set(100, elevation + 0.025, coordinate + offset);
          sidewalk.scale.set(CHUNK_SIZE, 3.5, 1);
          group.add(sidewalk);
        }

        const horizontal = this.createRoadSurface(
          originX,
          originZ,
          coordinate,
          true,
          7,
          horizontalRoadMaterial,
          0.035
        );
        group.add(horizontal);

        if (!rural) {
          const dash = new THREE.Mesh(this.unitPlane, this.markingMaterial);
          dash.rotation.x = -Math.PI / 2;
          dash.position.set(100, elevation + 0.055, coordinate + 7);
          dash.scale.set(CHUNK_SIZE, 0.14, 1);
          group.add(dash);
        }
      }
    }

    for (const coordinate of verticalCoords) {
      const verticalX = originX + coordinate;
      const verticalCrossesWater =
        Math.abs(verticalX) <= 550 &&
        originZ <= 540 &&
        originZ + CHUNK_SIZE >= 360;
      const onBridgeRoad = verticalX >= 148 && verticalX <= 172;
      if (!verticalCrossesWater || onBridgeRoad) {
        for (const offset of rural ? [] : [-9, 9]) {
          const sidewalk = new THREE.Mesh(this.unitPlane, this.sidewalkMaterial);
          sidewalk.rotation.x = -Math.PI / 2;
          sidewalk.position.set(coordinate + offset, getTerrainHeight(verticalX, originZ + 100) + 0.03, 100);
          sidewalk.scale.set(3.5, CHUNK_SIZE, 1);
          group.add(sidewalk);
        }

        const vertical = this.createRoadSurface(
          originX,
          originZ,
          coordinate,
          false,
          7,
          horizontalRoadMaterial,
          0.04
        );
        group.add(vertical);
      }
    }
  }

  private createRoadSurface(
    originX: number,
    originZ: number,
    coordinate: number,
    horizontal: boolean,
    halfWidth: number,
    material: THREE.MeshStandardMaterial,
    heightOffset: number
  ): THREE.Mesh {
    const positions: number[] = [];
    const indices: number[] = [];
    const segments = 12;

    for (let segment = 0; segment <= segments; segment++) {
      const along = (segment / segments) * CHUNK_SIZE;
      for (const side of [-halfWidth, halfWidth]) {
        const localX = horizontal ? along : coordinate + side;
        const localZ = horizontal ? coordinate + side : along;
        positions.push(
          localX,
          getTerrainHeight(originX + localX, originZ + localZ) + heightOffset,
          localZ
        );
      }
    }

    for (let segment = 0; segment < segments; segment++) {
      const a = segment * 2;
      const b = a + 1;
      const c = a + 3;
      const d = a + 2;
      if (horizontal) indices.push(a, b, c, a, c, d);
      else indices.push(a, c, b, a, d, c);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return new THREE.Mesh(geometry, material);
  }

  private addStreetLights(group: THREE.Group, originX: number, originZ: number) {
    for (const [x, z] of [[18, 18], [118, 118]] as const) {
      if (isWaterArea(originX + x, originZ + z)) continue;
      const y = getTerrainHeight(originX + x, originZ + z);
      const post = new THREE.Mesh(this.lampPostGeometry, this.lampPostMaterial);
      post.position.set(x, y + 4, z);
      const bulb = new THREE.Mesh(this.lampBulbGeometry, this.lampBulbMaterial);
      bulb.position.set(x, y + 8.2, z);
      group.add(post, bulb);
    }
  }

  private createBuilding(
    width: number,
    depth: number,
    height: number,
    material: THREE.MeshStandardMaterial,
    seed: number,
    isHut: boolean,
    isCommercial: boolean
  ): THREE.Group {
    const building = new THREE.Group();
    const body = new THREE.Mesh(this.unitBox, material);
    body.position.y = height / 2;
    body.scale.set(width, height, depth);
    body.castShadow = true;
    body.receiveShadow = true;
    building.add(body);

    const roofMaterial = isCommercial ? this.roofMaterial : this.houseRoofMaterials[seed % this.houseRoofMaterials.length];
    const roof = new THREE.Mesh(this.unitBox, roofMaterial);
    roof.position.y = height + (isHut ? 0.35 : 0.5);
    roof.scale.set(width + 1, isHut ? 0.7 : 1, depth + 1);
    building.add(roof);

    const windowCount = isCommercial ? 3 : isHut ? 1 : 2;
    for (let index = 0; index < windowCount; index++) {
      const pane = new THREE.Mesh(this.unitBox, this.windowMaterial);
      const paneX = windowCount === 1 ? 0 : -width * 0.24 + index * width * 0.24;
      pane.position.set(paneX, Math.min(height - 2.2, isCommercial ? 3.2 : 4.2), depth / 2 + 0.08);
      pane.scale.set(isCommercial ? 3.8 : 2.4, isCommercial ? 2.2 : 1.8, 0.12);
      building.add(pane);
    }

    const door = new THREE.Mesh(this.unitBox, this.doorMaterial);
    door.position.set(width * 0.3, Math.min(1.5, height * 0.35), depth / 2 + 0.09);
    door.scale.set(isHut ? 1.3 : 1.8, isHut ? 2.4 : 3, 0.14);
    building.add(door);

    if (isHut) {
      const porch = new THREE.Mesh(this.unitBox, this.doorMaterial);
      porch.position.set(width * 0.3, 0.15, depth / 2 + 1.2);
      porch.scale.set(4, 0.25, 2.4);
      building.add(porch);
    }

    if (height > 28) {
      const antenna = new THREE.Mesh(this.unitBox, this.antennaMaterial);
      antenna.position.set(-width * 0.25, height + 4, -depth * 0.2);
      antenna.scale.set(0.35, 8, 0.35);
      building.add(antenna);
    }
    return building;
  }

  private createRuinedBuilding(
    width: number,
    depth: number,
    height: number,
    material: THREE.MeshStandardMaterial,
    seed: number
  ): THREE.Group {
    const ruin = new THREE.Group();
    const wallHeight = height * (0.35 + (seed % 4) * 0.09);
    const backWall = new THREE.Mesh(this.unitBox, this.ruinMaterial);
    backWall.position.set(0, wallHeight / 2, -depth / 2);
    backWall.scale.set(width, wallHeight, 1.2);
    ruin.add(backWall);

    const sideWall = new THREE.Mesh(this.unitBox, material);
    sideWall.position.set(-width / 2, wallHeight * 0.47, 0);
    sideWall.scale.set(1.2, wallHeight, depth);
    ruin.add(sideWall);

    const brokenWall = new THREE.Mesh(this.unitBox, this.ruinMaterial);
    brokenWall.position.set(width * 0.22, wallHeight * 0.22, depth / 2);
    brokenWall.rotation.z = -0.08;
    brokenWall.scale.set(width * 0.42, wallHeight * 0.44, 1);
    ruin.add(brokenWall);

    for (let i = 0; i < 5; i++) {
      const rubble = new THREE.Mesh(this.unitBox, this.rubbleMaterial);
      rubble.position.set(
        (this.seed(seed + i * 17, width) % 100) / 10 - 5,
        0.35,
        (this.seed(depth, seed + i * 29) % 100) / 10 - 5
      );
      rubble.rotation.y = i * 0.61;
      rubble.scale.set(1.2 + i % 2, 0.7, 0.8 + (i % 3) * 0.3);
      ruin.add(rubble);
    }
    return ruin;
  }

  private addFootballPitch(group: THREE.Group, x: number, z: number) {
    const pitch = new THREE.Group();
    const field = new THREE.Mesh(this.unitPlane, this.pitchMaterial);
    field.rotation.x = -Math.PI / 2;
    field.position.y = 0.025;
    field.scale.set(66, 38, 1);
    pitch.add(field);

    const addLine = (lineX: number, lineZ: number, width: number, depth: number) => {
      const line = new THREE.Mesh(this.unitPlane, this.pitchLineMaterial);
      line.rotation.x = -Math.PI / 2;
      line.position.set(lineX, 0.045, lineZ);
      line.scale.set(width, depth, 1);
      pitch.add(line);
    };
    addLine(0, -19, 66, 0.35);
    addLine(0, 19, 66, 0.35);
    addLine(-33, 0, 0.35, 38);
    addLine(33, 0, 0.35, 38);
    addLine(0, 0, 0.3, 38);

    for (const goalX of [-31, 31]) {
      const postA = new THREE.Mesh(this.unitBox, this.goalMaterial);
      postA.position.set(goalX, 1.5, -4);
      postA.scale.set(0.25, 3, 0.25);
      const postB = postA.clone();
      postB.position.z = 4;
      const crossbar = new THREE.Mesh(this.unitBox, this.goalMaterial);
      crossbar.position.set(goalX, 3, 0);
      crossbar.scale.set(0.25, 0.25, 8);
      pitch.add(postA, postB, crossbar);
    }
    pitch.position.set(x, 0, z);
    group.add(pitch);
  }

  private getBuildingHeight(district: string, seed: number): number {
    if (/Financial|Downtown|Commercial/i.test(district)) return 35 + (seed % 45);
    if (/University|Military|Airport|Stadium|Castle/i.test(district)) return 18 + (seed % 25);
    if (/Farm|Village|Villa|Beach|Park|Mountain|Outskirts|Countryside|Rural/i.test(district)) return 9 + (seed % 16);
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
