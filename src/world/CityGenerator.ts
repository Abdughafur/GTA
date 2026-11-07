import * as THREE from 'three';
import { textureFactory } from './TextureGenerator';
import { modelFactory } from './ModelFactory';

export const CITY_ROAD_COORDS = [-340, -240, -140, -40, 60, 160, 260] as const;

export interface CollisionBox {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  name?: string;
  isTrigger?: boolean;
  type?: 'building' | 'interiorWall' | 'water' | 'garage' | 'dealership' | 'food';
}

export interface CityMotionData {
  windSwayObjects: THREE.Object3D[];
  oceanGeometry: THREE.BufferGeometry;
  oceanBaseHeights: Float32Array;
}

export interface TrafficSignalData {
  position: THREE.Vector3;
  axis: 'x' | 'z';
  group: THREE.Group;
}

export function getDistrictName(x: number, z: number): string {
  if (x > 700 && z < -400) return 'Vice Bay Air Force Base';
  if (Math.abs(x) > 700 && z < -700) return x < -1050 ? 'Vice Bay Stadium District' : 'Vice Bay University';
  if (z < -900 && Math.abs(x) <= 700) return 'Kingsgate Castle & Old Fort';
  if (z > 700 && Math.abs(x) < 700) return 'Liberty Grand Park';
  if (x < -700 && z > 700) return 'Southside Ghetto';
  if (x < -700) return 'Old Quarter Market';
  if (x > 700 && z > 400) return 'Carter Hills & Elite Villas';
  if (x > 700) return 'East Ridge Villas';
  if (z < -700) return 'North Bay Mountain Pass';
  if (z > 700) return 'Liberty Grand Park';
  if (x > 240 && z < -120) return 'Vice Bay International Airport';
  if (x > 240 && z > 55) return 'Carter County Farms';
  if (z > 245) return 'Sunset Beach & Pier 9';
  if (x < -50 && z > 60) return 'Port Vice Industrial Harbor';
  if (x > 40 && z > 70) return 'Vice Marina & Oceanview';
  if (x > 40 && z < -20) return 'Financial District';
  if (x > 40) return 'Commercial Avenue';
  if (z < -180) return 'North Bay Residential';
  if (z > 140) return 'Marina Promenade';
  if (z > 55) return 'Southside & Cluckin’ Bell';
  return 'Downtown Metropolitan';
}

export interface CityData {
  cityGroup: THREE.Group;
  colliders: CollisionBox[];
  roadNodes: THREE.Vector3[];
  trafficSignals: TrafficSignalData[];
  spawnPoints: {
    player: THREE.Vector3;
    safehouse: THREE.Vector3;
    dealership: THREE.Vector3;
    garage: THREE.Vector3;
    downtownRace: THREE.Vector3;
    docks: THREE.Vector3;
  };
  streetLamps: THREE.Group[];
  motion: CityMotionData;
  farmBounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  interactiveZones: {
    garage: THREE.Vector3;
    dealership: THREE.Vector3;
    fastFood: THREE.Vector3;
  };
}

export class CityGenerator {
  public generateCity(): CityData {
    const cityGroup = new THREE.Group();
    const colliders: CollisionBox[] = [];
    const streetLamps: THREE.Group[] = [];
    const roadNodes: THREE.Vector3[] = [];
    const trafficSignals: TrafficSignalData[] = [];

    // City Ground Plane (Asphalt / Sidewalk / Grass)
    const groundGeo = new THREE.PlaneGeometry(3000, 3000, 64, 64);
    const grassTexture = textureFactory.getGrassTexture();
    grassTexture.repeat.set(70, 70);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: grassTexture,
      roughness: 0.85,
      metalness: 0.02
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    cityGroup.add(ground);

    // Ocean and pale sand beach along the southern edge of the city.
    const beach = new THREE.Mesh(
      new THREE.PlaneGeometry(1100, 90),
      new THREE.MeshStandardMaterial({ color: 0xe7c98e, roughness: 0.95 })
    );
    beach.rotation.x = -Math.PI / 2;
    beach.position.set(0, -0.12, 315);
    beach.receiveShadow = true;
    cityGroup.add(beach);

    const oceanGeo = new THREE.PlaneGeometry(1100, 180, 56, 20);
    const oceanMat = new THREE.MeshPhysicalMaterial({
      color: 0x28a9ca,
      roughness: 0.24,
      metalness: 0.12,
      clearcoat: 0.8,
      clearcoatRoughness: 0.18
    });
    const ocean = new THREE.Mesh(oceanGeo, oceanMat);
    ocean.rotation.x = -Math.PI / 2;
    ocean.position.set(0, -0.35, 450);
    ocean.userData.waterSurface = true;
    cityGroup.add(ocean);
    const oceanBaseHeights = (
      oceanGeo.attributes.position as THREE.BufferAttribute
    ).array.slice() as Float32Array;

    colliders.push({ minX: -450, maxX: 450, minZ: 360, maxZ: 540, type: 'water' });

    // --- ROAD NETWORK GRID ---
    // Major Avenue X: Z = -140, Z = -40, Z = 60, Z = 160
    // Major Avenue Z: X = -160, X = -60, X = 40, X = 140
    const roadZCoords = [...CITY_ROAD_COORDS];
    const roadXCoords = [...CITY_ROAD_COORDS];
    const roadWidth = 20;

    const roadMat = new THREE.MeshStandardMaterial({
      map: textureFactory.getRoadTexture(),
      roughness: 0.6,
      metalness: 0.1,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1
    });

    // Horizontal roads
    roadZCoords.forEach((z) => {
      const roadGeo = new THREE.PlaneGeometry(800, roadWidth);
      const roadMesh = new THREE.Mesh(roadGeo, roadMat);
      roadMesh.rotation.x = -Math.PI / 2;
      roadMesh.position.set(-10, 0.03, z);
      roadMesh.receiveShadow = true;
      cityGroup.add(roadMesh);

      // Create road waypoints along this avenue
      for (let x = -400; x <= 400; x += 30) {
        roadNodes.push(new THREE.Vector3(x, 0, z));
      }
    });

    // Vertical roads
    roadXCoords.forEach((x) => {
      const roadGeo = new THREE.PlaneGeometry(roadWidth, 800);
      const roadMesh = new THREE.Mesh(roadGeo, roadMat);
      roadMesh.rotation.x = -Math.PI / 2;
      roadMesh.rotation.z = Math.PI / 2;
      roadMesh.position.set(x, 0.035, 0);
      roadMesh.receiveShadow = true;
      cityGroup.add(roadMesh);

      for (let z = -400; z <= 400; z += 30) {
        roadNodes.push(new THREE.Vector3(x, 0, z));
      }
    });

    // Raised reflective lane dashes, batched into one mesh to avoid hundreds of draw calls.
    const laneDashVertices: number[] = [];
    const addDash = (x: number, z: number, horizontal: boolean) => {
      const halfWidth = 0.11;
      const halfLength = 2.2;
      const x1 = x + (horizontal ? -halfLength : -halfWidth);
      const x2 = x + (horizontal ? halfLength : halfWidth);
      const z1 = z + (horizontal ? -halfWidth : -halfLength);
      const z2 = z + (horizontal ? halfWidth : halfLength);
      laneDashVertices.push(
        x1, 0.052, z1, x1, 0.052, z2, x2, 0.052, z2,
        x1, 0.052, z1, x2, 0.052, z2, x2, 0.052, z1
      );
    };
    for (const z of roadZCoords) {
      for (let x = -390; x <= 390; x += 12) {
        if (roadXCoords.some((crossing) => Math.abs(x - crossing) < 14)) continue;
        addDash(x, z, true);
      }
    }
    for (const x of roadXCoords) {
      for (let z = -390; z <= 390; z += 12) {
        if (roadZCoords.some((crossing) => Math.abs(z - crossing) < 14)) continue;
        addDash(x, z, false);
      }
    }
    const laneGeometry = new THREE.BufferGeometry();
    laneGeometry.setAttribute('position', new THREE.Float32BufferAttribute(laneDashVertices, 3));
    laneGeometry.computeVertexNormals();
    const laneMarkings = new THREE.Mesh(
      laneGeometry,
      new THREE.MeshStandardMaterial({ color: 0xf2d27b, roughness: 0.72, metalness: 0.08 })
    );
    laneMarkings.receiveShadow = true;
    cityGroup.add(laneMarkings);

    // Sidewalk tiles & crosswalks at intersections
    const crosswalkMat = new THREE.MeshStandardMaterial({
      map: textureFactory.getCrosswalkTexture(),
      roughness: 0.5,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2
    });

    roadZCoords.forEach((z) => {
      roadXCoords.forEach((x) => {
        // Crosswalks around each intersection
        const cw1 = new THREE.Mesh(new THREE.PlaneGeometry(roadWidth, 6), crosswalkMat);
        cw1.rotation.x = -Math.PI / 2;
        cw1.position.set(x, 0.04, z + roadWidth * 0.5 + 3);
        const cw2 = cw1.clone();
        cw2.position.z = z - roadWidth * 0.5 - 3;
        cityGroup.add(cw1, cw2);

        // Synchronized signal heads for both crossing directions.
        const signalZ = modelFactory.createTrafficLight();
        signalZ.position.set(x + roadWidth * 0.5 + 1.5, 0, z + roadWidth * 0.5 + 1.5);
        signalZ.rotation.y = -Math.PI / 4;
        cityGroup.add(signalZ);
        trafficSignals.push({ position: new THREE.Vector3(x, 0, z), axis: 'z', group: signalZ });

        const signalX = modelFactory.createTrafficLight();
        signalX.position.set(x - roadWidth * 0.5 - 1.5, 0, z + roadWidth * 0.5 + 1.5);
        signalX.rotation.y = Math.PI / 4;
        cityGroup.add(signalX);
        trafficSignals.push({ position: new THREE.Vector3(x, 0, z), axis: 'x', group: signalX });
      });
    });

    // Street Lamps along roads
    roadZCoords.forEach((z) => {
      for (let x = -190; x <= 170; x += 55) {
        const lamp = modelFactory.createStreetLamp();
        lamp.position.set(x, 0, z + roadWidth * 0.5 + 1.8);
        cityGroup.add(lamp);
        streetLamps.push(lamp);

        // Palm tree on opposite sidewalk
        if (Math.abs(x) % 110 === 0) {
          const tree = modelFactory.createPalmTree();
          tree.position.set(x + 10, 0, z - roadWidth * 0.5 - 2.5);
          cityGroup.add(tree);
        }
      }
    });

    // --- DISTRICT 1: DOWNTOWN FINANCIAL SKYSCRAPERS (X: -50 to 30, Z: -130 to -50) ---
    const downtownBlocks = [
      { x: -10, z: -90, w: 46, d: 52, h: 110, style: 0, name: 'Maze Bank Tower' },
      { x: -38, z: -90, w: 28, d: 42, h: 75, style: 1, name: 'V-Bay Trade Center' },
      { x: 18, z: -90, w: 32, d: 48, h: 85, style: 2, name: 'Apex Financial' },
      { x: -110, z: -90, w: 50, d: 50, h: 65, style: 3, name: 'Centrum Tower' },
      { x: -110, z: 10, w: 52, d: 54, h: 58, style: 1, name: 'Metropolitan Life' }
    ];

    downtownBlocks.forEach((b) => {
      const bldg = this.createSkyscraper(b.w, b.h, b.d, b.style, b.name);
      bldg.position.set(b.x, 0, b.z);
      cityGroup.add(bldg);
      colliders.push({
        minX: b.x - b.w * 0.5 - 0.5,
        maxX: b.x + b.w * 0.5 + 0.5,
        minZ: b.z - b.d * 0.5 - 0.5,
        maxZ: b.z + b.d * 0.5 + 0.5,
        name: b.name,
        type: 'building'
      });
    });

    this.addCentralPlaza(cityGroup, streetLamps);

    // --- DISTRICT 2: COMMERCIAL & DEALERSHIP (X: 50 to 130, Z: -130 to -50) ---
    // Legendary Motorsport Dealership
    const dealerGroup = new THREE.Group();
    dealerGroup.position.set(90, 0, -90);

    const dealerBase = new THREE.Mesh(
      new THREE.BoxGeometry(45, 10, 40),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3 })
    );
    dealerBase.position.y = 5;
    dealerGroup.add(dealerBase);

    // Glass showroom front
    const dealerGlass = new THREE.Mesh(
      new THREE.BoxGeometry(45.2, 7, 1),
      new THREE.MeshPhysicalMaterial({ color: 0x38bdf8, transmission: 0.85, transparent: true, opacity: 0.5 })
    );
    dealerGlass.position.set(0, 4.5, 20.1);
    dealerGroup.add(dealerGlass);

    // Dealership Sign
    const dealerSign = new THREE.Mesh(
      new THREE.BoxGeometry(36, 4, 1),
      new THREE.MeshStandardMaterial({
        map: textureFactory.getStorefrontTexture('LEGENDARY MOTORSPORT', '#dc2626', '#ffffff'),
        emissive: 0xdc2626,
        emissiveIntensity: 0.5
      })
    );
    dealerSign.position.set(0, 10.5, 20.2);
    dealerGroup.add(dealerSign);

    cityGroup.add(dealerGroup);
    colliders.push({
      minX: 90 - 23,
      maxX: 90 + 23,
      minZ: -90 - 21,
      maxZ: -90 + 21,
      name: 'Legendary Motorsport Dealership',
      type: 'dealership'
    });

    // Pay 'n' Spray Garage (X: 90, Z: 10)
    const garageGroup = new THREE.Group();
    garageGroup.position.set(90, 0, 10);
    const garageBuilding = new THREE.Mesh(
      new THREE.BoxGeometry(36, 12, 34),
      new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.7 })
    );
    garageBuilding.position.y = 6;
    garageGroup.add(garageBuilding);

    // Open Doorway for drive-in
    const garageSign = new THREE.Mesh(
      new THREE.BoxGeometry(26, 3.5, 1),
      new THREE.MeshStandardMaterial({
        map: textureFactory.getStorefrontTexture("PAY 'N' SPRAY", '#2563eb', '#facc15'),
        emissive: 0x2563eb,
        emissiveIntensity: 0.6
      })
    );
    garageSign.position.set(0, 10, 17.2);
    garageGroup.add(garageSign);

    // Glowing garage entrance bay
    const bayRing = new THREE.Mesh(
      new THREE.RingGeometry(4, 5.5, 16),
      new THREE.MeshBasicMaterial({ color: 0x3b82f6, side: THREE.DoubleSide })
    );
    bayRing.rotation.x = -Math.PI / 2;
    bayRing.position.set(0, 0.05, 18);
    garageGroup.add(bayRing);

    cityGroup.add(garageGroup);
    colliders.push({
      minX: 90 - 18,
      maxX: 90 + 18,
      minZ: 10 - 17,
      maxZ: 10 + 17,
      name: "Pay 'n' Spray Garage",
      type: 'garage'
    });

    // Cluckin' Bell Fast Food (X: -10, Z: 110)
    const foodGroup = new THREE.Group();
    foodGroup.position.set(-10, 0, 110);
    const foodBuilding = new THREE.Mesh(
      new THREE.BoxGeometry(28, 8, 26),
      new THREE.MeshStandardMaterial({ color: 0x7f1d1d, roughness: 0.5 })
    );
    foodBuilding.position.y = 4;
    foodGroup.add(foodBuilding);

    const foodSign = new THREE.Mesh(
      new THREE.BoxGeometry(22, 3.5, 1),
      new THREE.MeshStandardMaterial({
        map: textureFactory.getStorefrontTexture("CLUCKIN' BELL BURGER", '#eab308', '#dc2626'),
        emissive: 0xeab308,
        emissiveIntensity: 0.6
      })
    );
    foodSign.position.set(0, 8.5, 13.2);
    foodGroup.add(foodSign);

    cityGroup.add(foodGroup);
    colliders.push({
      minX: -10 - 15,
      maxX: -10 + 15,
      minZ: 110 - 14,
      maxZ: 110 + 14,
      name: "Cluckin' Bell",
      type: 'food'
    });

    // --- DISTRICT 3: INDUSTRIAL HARBOR & DOCKS (X: -160 to -60, Z: 80 to 220) ---
    // Shipping Containers in bright industrial colors
    const containerColors = [0xef4444, 0x3b82f6, 0x10b981, 0xf59e0b, 0x6366f1];
    for (let i = 0; i < 18; i++) {
      const cx = -110 + (i % 4) * 16 + (Math.random() * 4 - 2);
      const cz = 100 + Math.floor(i / 4) * 22;
      const ch = Math.random() > 0.4 ? 2 : 1; // stacked 1 or 2 high
      const color = containerColors[i % containerColors.length];

      const cMat = new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.5 });
      for (let s = 0; s < ch; s++) {
        const container = new THREE.Mesh(new THREE.BoxGeometry(6, 4, 14), cMat);
        container.position.set(cx, 2 + s * 4, cz);
        container.castShadow = true;
        cityGroup.add(container);
      }
      colliders.push({ minX: cx - 3.5, maxX: cx + 3.5, minZ: cz - 7.5, maxZ: cz + 7.5, type: 'building' });
    }

    // Stunt Jump Ramp near the docks
    const rampGeo = new THREE.BoxGeometry(10, 3, 14);
    const rampMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.6 });
    const ramp = new THREE.Mesh(rampGeo, rampMat);
    ramp.rotation.x = -0.35;
    ramp.position.set(-60, 1.2, 190);
    cityGroup.add(ramp);

    // --- DISTRICT 4: MARINA & LUXURY HOTEL RESIDENCES (X: 50 to 140, Z: 90 to 210) ---
    const luxuryHotels = [
      { x: 90, z: 110, w: 42, d: 38, h: 48, style: 2, name: 'Oceanview Suites' },
      { x: 90, z: 180, w: 48, d: 42, h: 56, style: 3, name: 'The Vice Marina Club' }
    ];
    luxuryHotels.forEach((h) => {
      const bldg = this.createSkyscraper(h.w, h.h, h.d, h.style, h.name);
      bldg.position.set(h.x, 0, h.z);
      cityGroup.add(bldg);
      colliders.push({
        minX: h.x - h.w * 0.5 - 0.5,
        maxX: h.x + h.w * 0.5 + 0.5,
        minZ: h.z - h.d * 0.5 - 0.5,
        maxZ: h.z + h.d * 0.5 + 0.5,
        name: h.name,
        type: 'building'
      });
    });

    this.addOuterDistricts(cityGroup, colliders);
    this.addSupermarketExterior(cityGroup, colliders);
    this.addAirport(cityGroup);
    this.addBeachfront(cityGroup);
    this.addFarm(cityGroup, colliders);
    this.addDistantHills(cityGroup, colliders);
    this.addLandmarkSigns(cityGroup);

    // Outlying boundaries / city fence to prevent falling off the expanded map.
    colliders.push(
      { minX: -1510, maxX: -1490, minZ: -1510, maxZ: 1510, type: 'building' },
      { minX: 1490, maxX: 1510, minZ: -1510, maxZ: 1510, type: 'building' },
      { minX: -1510, maxX: 1510, minZ: -1510, maxZ: -1490, type: 'building' },
      { minX: -1510, maxX: 1510, minZ: 1490, maxZ: 1510, type: 'building' }
    );

    return {
      cityGroup,
      colliders,
      roadNodes,
      trafficSignals,
      spawnPoints: {
        player: new THREE.Vector3(-10, 0, 25),
        safehouse: new THREE.Vector3(-10, 0, 25),
        dealership: new THREE.Vector3(90, 0, -65),
        garage: new THREE.Vector3(90, 0, 32),
        downtownRace: new THREE.Vector3(-10, 0, -140),
        docks: new THREE.Vector3(-110, 0, 160)
      },
      streetLamps,
      motion: {
        windSwayObjects: this.collectWindObjects(cityGroup),
        oceanGeometry: oceanGeo,
        oceanBaseHeights
      },
      farmBounds: { minX: 262, maxX: 388, minZ: 75, maxZ: 163 },
      interactiveZones: {
        garage: new THREE.Vector3(90, 0, 28),
        dealership: new THREE.Vector3(90, 0, -68),
        fastFood: new THREE.Vector3(-10, 0, 125)
      }
    };
  }

  private collectWindObjects(root: THREE.Object3D): THREE.Object3D[] {
    const objects: THREE.Object3D[] = [];
    root.traverse((object) => {
      if (object.userData.windSway) objects.push(object);
    });
    return objects;
  }

  private addLandmarkSigns(cityGroup: THREE.Group) {
    const landmarks = [
      { name: 'WELCOME TO VICE BAY', x: -18, z: -254, color: '#087e8b' },
      { name: 'MAZE BANK FINANCIAL QUARTER', x: -20, z: -160, color: '#263c55' },
      { name: 'GRAND PLAZA · FOUNTAIN WALK', x: 122, z: 40, color: '#8a6340' },
      { name: "PAY 'N' SPRAY · SERVICE BAY", x: 112, z: 37, color: '#2455a1' },
      { name: "CLUCKIN' BELL · SOUTH MARKET", x: -30, z: 92, color: '#9b3025' },
      { name: 'PORT VICE · GATE 04', x: -178, z: 92, color: '#3e5962' },
      { name: 'OCEANVIEW · MARINA CLUB', x: 142, z: 142, color: '#287f88' },
      { name: 'SUNSET BEACH', x: 45, z: 250, color: '#d36e49' },
      { name: 'PIER 9 · PUBLIC WALK', x: -160, z: 265, color: '#76533b' },
      { name: 'VICE BAY INTERNATIONAL', x: 280, z: -192, color: '#18788d' },
      { name: 'CARTER COUNTY · FARM GATE', x: 298, z: 82, color: '#6f763b' },
      { name: 'V-BAY TRADE CENTER', x: -130, z: -160, color: '#565276' },
      { name: 'NORTH BAY · RESIDENTIAL', x: 24, z: -254, color: '#687a65' },
      { name: 'MARINA PROMENADE', x: 148, z: 225, color: '#3d8793' },
      { name: 'INDUSTRIAL HARBOR', x: -185, z: 225, color: '#8d5d35' }
    ];

    for (const landmark of landmarks) {
      const sign = new THREE.Group();
      const postMaterial = new THREE.MeshStandardMaterial({ color: 0x3c4748, roughness: 0.72, metalness: 0.38 });
      for (const x of [-4.6, 4.6]) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.18, 3.2, 0.18), postMaterial);
        post.position.set(x, 1.6, 0);
        post.castShadow = true;
        sign.add(post);
      }

      const panel = new THREE.Mesh(
        new THREE.BoxGeometry(10.2, 2.4, 0.22),
        new THREE.MeshStandardMaterial({
          map: textureFactory.getStorefrontTexture(landmark.name, landmark.color, '#f4ead4'),
          roughness: 0.62,
          metalness: 0.12
        })
      );
      panel.position.y = 3.2;
      panel.castShadow = true;
      sign.add(panel);

      const cap = new THREE.Mesh(
        new THREE.BoxGeometry(10.5, 0.12, 0.38),
        new THREE.MeshStandardMaterial({ color: 0xc49b62, roughness: 0.55, metalness: 0.35 })
      );
      cap.position.y = 4.48;
      sign.add(cap);
      sign.position.set(landmark.x, 0, landmark.z);
      sign.rotation.y = landmark.x < -150 ? Math.PI / 2 : 0;
      cityGroup.add(sign);
    }
  }

  private addSupermarketExterior(cityGroup: THREE.Group, colliders: CollisionBox[]) {
    const shop = new THREE.Group();
    shop.position.set(180, 0, -320);

    const facade = new THREE.MeshStandardMaterial({ color: 0xe7e4d8, roughness: 0.76 });
    const trim = new THREE.MeshStandardMaterial({ color: 0x126b52, roughness: 0.5 });
    const glass = new THREE.MeshPhysicalMaterial({
      color: 0x9de5ec,
      roughness: 0.12,
      metalness: 0.12,
      transparent: true,
      opacity: 0.65
    });

    const body = new THREE.Mesh(new THREE.BoxGeometry(28, 12, 28), facade);
    body.position.y = 6;
    body.castShadow = true;
    body.receiveShadow = true;
    shop.add(body);

    const awning = new THREE.Mesh(new THREE.BoxGeometry(30, 1.2, 5), trim);
    awning.position.set(0, 9.5, 14);
    shop.add(awning);

    const sign = new THREE.Mesh(
      new THREE.BoxGeometry(20, 3.2, 0.5),
      new THREE.MeshStandardMaterial({
        map: textureFactory.getStorefrontTexture('VICE BAY FRESH MARKET', '#126b52', '#fff8dc'),
        emissive: 0x0b382b,
        emissiveIntensity: 0.65
      })
    );
    sign.position.set(0, 11.2, 14.2);
    shop.add(sign);

    const displayWindow = new THREE.Mesh(new THREE.BoxGeometry(8, 4.5, 0.18), glass);
    displayWindow.position.set(-8, 4.3, 14.08);
    const rightWindow = displayWindow.clone();
    rightWindow.position.x = 8;
    shop.add(displayWindow, rightWindow);

    const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(4, 5.2, 0.3), trim);
    doorFrame.position.set(0, 2.6, 14);
    const doorGlass = new THREE.Mesh(new THREE.BoxGeometry(3.2, 4.6, 0.18), glass);
    doorGlass.position.set(0, 2.5, 14.1);
    shop.add(doorFrame, doorGlass);
    cityGroup.add(shop);

    colliders.push({
      minX: 165.5,
      maxX: 194.5,
      minZ: -334.5,
      maxZ: -305.5,
      name: 'Vice Bay Fresh Market',
      type: 'building'
    });
  }

  private addOuterDistricts(cityGroup: THREE.Group, colliders: CollisionBox[]) {
    const blockCenters = [-290, -190, -90, 10, 110, 210];
    const facadeColors = [0xe8cda7, 0xd9e4dc, 0xf0b989, 0x9db6bc, 0xd9c8b3];

    for (const x of blockCenters) {
      for (const z of blockCenters) {
        if (Math.abs(x) < 150 && Math.abs(z) < 150) continue;
        if (x > 50 && z > 150) continue;
        if (x > 130 && z < -120) continue;
        if (x < -130 && z < -230) continue;

        const seed = Math.abs((x * 17 + z * 31) % 997);
        const width = 25 + (seed % 10);
        const depth = 26 + ((seed * 3) % 12);
        const height = 17 + ((seed * 7) % 38);
        const color = facadeColors[seed % facadeColors.length];
        const building = new THREE.Group();
        building.rotation.y = ((seed % 5) - 2) * 0.012;
        building.scale.set(0.96 + (seed % 7) * 0.012, 0.97 + (seed % 5) * 0.014, 0.96 + (seed % 6) * 0.013);
        const facadeColor = new THREE.Color(color).offsetHSL(((seed % 9) - 4) * 0.006, 0, ((seed % 7) - 3) * 0.012);
        const body = new THREE.Mesh(
          new THREE.BoxGeometry(width, height, depth),
          new THREE.MeshStandardMaterial({
            color: facadeColor,
            roughness: 0.58 + (seed % 5) * 0.045,
            metalness: 0.04 + (seed % 4) * 0.025
          })
        );
        body.position.y = height / 2;
        body.castShadow = true;
        body.receiveShadow = true;
        building.add(body);

        const roof = new THREE.Mesh(
          new THREE.BoxGeometry(width + 1.2, 1.2, depth + 1.2),
          new THREE.MeshStandardMaterial({ color: 0x6d7474, roughness: 0.85 })
        );
        roof.position.y = height + 0.6;
        building.add(roof);

        const floors = Math.floor(height / 4);
        const windowMat = new THREE.MeshStandardMaterial({
          color: 0x9fd6df,
          emissive: 0x244650,
          emissiveIntensity: 0.08 + (seed % 5) * 0.025,
          roughness: 0.28,
          metalness: 0.25
        });
        for (let floor = 1; floor < floors; floor++) {
          for (let window = -1; window <= 1; window++) {
            const pane = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.25, 0.12), windowMat);
            pane.position.set(window * (width / 3), floor * 4, depth / 2 + 0.08);
            const rearPane = pane.clone();
            rearPane.position.z = -depth / 2 - 0.08;
            building.add(pane, rearPane);
          }
          for (const sideZ of [-1, 1]) {
            const pane = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.25, 0.12), windowMat);
            pane.rotation.y = Math.PI / 2;
            pane.position.set(sideZ * (width / 2 + 0.08), floor * 4, -depth / 3);
            const secondPane = pane.clone();
            secondPane.position.z = depth / 3;
            building.add(pane, secondPane);
          }
        }

        const serviceUnit = new THREE.Mesh(
          new THREE.BoxGeometry(3 + (seed % 3), 1.2, 2.1),
          new THREE.MeshStandardMaterial({ color: seed % 2 ? 0x727978 : 0x856e57, roughness: 0.88, metalness: 0.18 })
        );
        serviceUnit.position.set((seed % 2 ? -1 : 1) * width * 0.22, height + 1.15, (seed % 3 - 1) * depth * 0.18);
        serviceUnit.rotation.y = (seed % 4) * 0.1;
        building.add(serviceUnit);

        const patchMaterial = new THREE.MeshStandardMaterial({
          color: seed % 2 ? 0x766c5d : 0x4c5c60,
          roughness: 0.96
        });
        const facadePatch = new THREE.Mesh(
          new THREE.BoxGeometry(1.4 + (seed % 3) * 0.35, 0.55, 0.035),
          patchMaterial
        );
        facadePatch.position.set((seed % 3 - 1) * width * 0.21, 0.8 + (seed % 4) * 0.18, depth / 2 + 0.04);
        building.add(facadePatch);

        building.position.set(x, 0, z);
        cityGroup.add(building);
        colliders.push({
          minX: x - width / 2 - 1,
          maxX: x + width / 2 + 1,
          minZ: z - depth / 2 - 1,
          maxZ: z + depth / 2 + 1,
          type: 'building'
        });
      }
    }
  }

  private addCentralPlaza(cityGroup: THREE.Group, streetLamps: THREE.Group[]) {
          const plaza = new THREE.Group();
          plaza.position.set(128, 0, 10);
          plaza.scale.setScalar(0.65);

          const paving = new THREE.Mesh(
            new THREE.CircleGeometry(27, 48),
            new THREE.MeshStandardMaterial({ color: 0xa9a89f, roughness: 0.88 })
          );
          paving.rotation.x = -Math.PI / 2;
          paving.position.y = 0.055;
          paving.receiveShadow = true;
          plaza.add(paving);

          const outerRing = new THREE.Mesh(
            new THREE.RingGeometry(25.5, 27, 48),
            new THREE.MeshStandardMaterial({ color: 0x687476, roughness: 0.72, metalness: 0.08, side: THREE.DoubleSide })
          );
          outerRing.rotation.x = -Math.PI / 2;
          outerRing.position.y = 0.09;
          plaza.add(outerRing);

          const pathMaterial = new THREE.MeshStandardMaterial({ color: 0xd1c6ae, roughness: 0.92 });
          for (let i = 0; i < 4; i++) {
            const path = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 16), pathMaterial);
            path.rotation.x = -Math.PI / 2;
            path.rotation.z = Math.PI / 2 + i * Math.PI / 4;
            path.position.set(Math.cos(i * Math.PI / 2) * 17, 0.075, Math.sin(i * Math.PI / 2) * 17);
            plaza.add(path);
          }

          const basinStone = new THREE.MeshStandardMaterial({ color: 0x7d8988, roughness: 0.55, metalness: 0.18 });
          const basin = new THREE.Mesh(new THREE.CylinderGeometry(10.5, 11.5, 0.8, 40), basinStone);
          basin.position.y = 0.45;
          basin.castShadow = true;
          basin.receiveShadow = true;
          plaza.add(basin);

          const water = new THREE.Mesh(
            new THREE.CylinderGeometry(9.7, 9.7, 0.12, 40),
            new THREE.MeshPhysicalMaterial({
              color: 0x329bb0,
              roughness: 0.2,
              metalness: 0.12,
              clearcoat: 0.9,
              clearcoatRoughness: 0.12
            })
          );
          water.position.y = 0.88;
          plaza.add(water);

          const innerTier = new THREE.Mesh(new THREE.CylinderGeometry(5.8, 6.8, 0.6, 32), basinStone);
          innerTier.position.y = 1.15;
          plaza.add(innerTier);
          const topBowl = new THREE.Mesh(new THREE.CylinderGeometry(2.7, 3.4, 0.45, 28), basinStone);
          topBowl.position.y = 1.65;
          plaza.add(topBowl);

          const bronze = new THREE.MeshStandardMaterial({ color: 0x8c7043, roughness: 0.38, metalness: 0.72 });
          const monumentBase = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.35, 1, 12), bronze);
          monumentBase.position.y = 2.35;
          const monumentStem = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.52, 4.6, 10), bronze);
          monumentStem.position.y = 4.9;
          const monumentCrown = new THREE.Mesh(new THREE.OctahedronGeometry(1.15, 1), bronze);
          monumentCrown.scale.set(0.8, 1.55, 0.8);
          monumentCrown.position.y = 7.65;
          plaza.add(monumentBase, monumentStem, monumentCrown);

          const jetMaterial = new THREE.MeshStandardMaterial({
            color: 0xa4ebf1,
            emissive: 0x1e6570,
            emissiveIntensity: 0.35,
            transparent: true,
            opacity: 0.7,
            roughness: 0.18
          });
          for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const jet = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.1, 1.45, 6), jetMaterial);
            jet.position.set(Math.cos(angle) * 4.4, 1.9, Math.sin(angle) * 4.4);
            jet.rotation.z = Math.cos(angle) * -0.18;
            jet.rotation.x = Math.sin(angle) * 0.18;
            plaza.add(jet);
          }

          const benchWood = new THREE.MeshStandardMaterial({ color: 0x76513a, roughness: 0.82 });
          const benchMetal = new THREE.MeshStandardMaterial({ color: 0x34494a, roughness: 0.48, metalness: 0.62 });
          for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            const bench = new THREE.Group();
            const seat = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.16, 0.72), benchWood);
            seat.position.y = 0.72;
            const back = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.9, 0.14), benchWood);
            back.position.set(0, 1.12, -0.3);
            const legs = new THREE.Mesh(new THREE.BoxGeometry(3.55, 0.68, 0.5), benchMetal);
            legs.position.y = 0.34;
            bench.add(seat, back, legs);
            bench.position.set(Math.cos(angle) * 19, 0, Math.sin(angle) * 19);
            bench.rotation.y = -angle;
            plaza.add(bench);

            const planter = new THREE.Mesh(
              new THREE.CylinderGeometry(1.25, 1.45, 0.65, 8),
              new THREE.MeshStandardMaterial({ color: 0x806f58, roughness: 0.88 })
            );
            planter.position.set(Math.cos(angle + Math.PI / 6) * 24, 0.33, Math.sin(angle + Math.PI / 6) * 24);
            const shrub = new THREE.Mesh(
              new THREE.IcosahedronGeometry(1.05, 1),
              new THREE.MeshStandardMaterial({ color: 0x496b48, roughness: 0.95 })
            );
            shrub.position.set(planter.position.x, 1.1, planter.position.z);
            shrub.scale.y = 0.72;
            shrub.castShadow = true;
            plaza.add(planter, shrub);
          }

          cityGroup.add(plaza);

          for (const [x, z] of [[-14, -14], [14, -14], [-14, 14], [14, 14]]) {
            const lamp = modelFactory.createStreetLamp();
            lamp.position.set(x, 0, z);
            plaza.add(lamp);
            streetLamps.push(lamp);
          }
        }

  private addAirport(cityGroup: THREE.Group) {
    const airport = new THREE.Group();
    const asphalt = new THREE.MeshStandardMaterial({ color: 0x353c3d, roughness: 0.86 });
    const concrete = new THREE.MeshStandardMaterial({ color: 0xc3c2b8, roughness: 0.82 });
    const runway = new THREE.Mesh(new THREE.PlaneGeometry(38, 210), asphalt);
    runway.rotation.x = -Math.PI / 2;
    runway.position.set(325, 0.08, -300);
    airport.add(runway);

    const centerLineMat = new THREE.MeshBasicMaterial({ color: 0xfff4d0 });
    for (let z = -395; z <= -205; z += 16) {
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 7), centerLineMat);
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(325, 0.1, z);
      airport.add(dash);
    }

    for (const x of [306, 344]) {
      for (let z = -395; z <= -205; z += 12) {
        const light = new THREE.Mesh(
          new THREE.BoxGeometry(0.38, 0.18, 0.38),
          new THREE.MeshBasicMaterial({ color: 0xfde68a })
        );
        light.position.set(x, 0.16, z);
        airport.add(light);
      }
    }

    const apron = new THREE.Mesh(new THREE.PlaneGeometry(110, 64), concrete);
    apron.rotation.x = -Math.PI / 2;
    apron.position.set(325, 0.06, -185);
    airport.add(apron);

    const terminal = new THREE.Mesh(
      new THREE.BoxGeometry(86, 15, 25),
      new THREE.MeshStandardMaterial({ color: 0xe7e1d3, roughness: 0.55 })
    );
    terminal.position.set(325, 7.5, -167);
    terminal.castShadow = true;
    airport.add(terminal);

    const terminalGlass = new THREE.Mesh(
      new THREE.BoxGeometry(78, 7, 0.5),
      new THREE.MeshPhysicalMaterial({
        color: 0x68b8d0,
        roughness: 0.16,
        metalness: 0.2,
        clearcoat: 1
      })
    );
    terminalGlass.position.set(325, 8, -154.2);
    airport.add(terminalGlass);

    const canopy = new THREE.Mesh(
      new THREE.BoxGeometry(95, 1, 34),
      new THREE.MeshStandardMaterial({ color: 0xf3eee2, roughness: 0.45 })
    );
    canopy.position.set(325, 16, -165);
    airport.add(canopy);

    const tower = new THREE.Group();
    const towerShaft = new THREE.Mesh(
      new THREE.BoxGeometry(11, 42, 11),
      new THREE.MeshStandardMaterial({ color: 0xe8dfce, roughness: 0.62 })
    );
    towerShaft.position.y = 21;
    tower.add(towerShaft);
    const cab = new THREE.Mesh(
      new THREE.BoxGeometry(18, 9, 18),
      new THREE.MeshPhysicalMaterial({ color: 0x4ca6c1, roughness: 0.18, metalness: 0.25 })
    );
    cab.position.y = 46;
    tower.add(cab);
    const roof = new THREE.Mesh(
      new THREE.BoxGeometry(20, 1.2, 20),
      new THREE.MeshStandardMaterial({ color: 0xf3eee2, roughness: 0.5 })
    );
    roof.position.y = 51;
    tower.add(roof);
    tower.position.set(380, 0, -145);
    airport.add(tower);

    const sign = new THREE.Mesh(
      new THREE.BoxGeometry(38, 4, 0.8),
      new THREE.MeshStandardMaterial({ color: 0x1689a2, emissive: 0x06323b, emissiveIntensity: 0.3 })
    );
    sign.position.set(325, 12, -153.7);
    airport.add(sign);

    cityGroup.add(airport);
  }

  private addBeachfront(cityGroup: THREE.Group) {
    const promenade = new THREE.Mesh(
      new THREE.PlaneGeometry(760, 9),
      new THREE.MeshStandardMaterial({ color: 0xd9d3c3, roughness: 0.86 })
    );
    promenade.rotation.x = -Math.PI / 2;
    promenade.position.set(-10, 0.015, 268);
    cityGroup.add(promenade);

    const sandMat = new THREE.MeshStandardMaterial({ color: 0xf2dfa9, roughness: 0.94 });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x9d6940, roughness: 0.86 });
    const umbrellaColors = [0xe87555, 0x45a9ba, 0xf1c451];

    for (let x = -350; x <= 350; x += 48) {
      const palm = modelFactory.createPalmTree();
      palm.scale.setScalar(0.8);
      palm.position.set(x, 0, 275);
      cityGroup.add(palm);

      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 2.2, 7), woodMat);
      pole.position.set(x + 13, 1.1, 292);
      cityGroup.add(pole);
      const canopy = new THREE.Mesh(
        new THREE.ConeGeometry(3.2, 1.5, 8),
        new THREE.MeshStandardMaterial({
          color: umbrellaColors[Math.floor(Math.abs(x / 48)) % umbrellaColors.length],
          roughness: 0.7
        })
      );
      canopy.position.set(x + 13, 2.65, 292);
      cityGroup.add(canopy);
      const lounger = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.25, 1.6), sandMat);
      lounger.position.set(x + 17, 0.25, 294.2);
      lounger.rotation.y = -0.2;
      cityGroup.add(lounger);
    }

    const pier = new THREE.Group();
    const deck = new THREE.Mesh(
      new THREE.BoxGeometry(12, 0.8, 76),
      new THREE.MeshStandardMaterial({ color: 0x9a704c, roughness: 0.78 })
    );
    deck.position.set(-145, 1.8, 315);
    pier.add(deck);
    for (let z = 280; z <= 350; z += 14) {
      for (const x of [-150, -140]) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.55, 3.6, 8), woodMat);
        post.position.set(x, 0, z);
        pier.add(post);
      }
    }
    const endDeck = new THREE.Mesh(
      new THREE.BoxGeometry(30, 0.8, 22),
      new THREE.MeshStandardMaterial({ color: 0xa68059, roughness: 0.78 })
    );
    endDeck.position.set(-145, 1.8, 354);
    pier.add(endDeck);
    cityGroup.add(pier);
  }

  private addFarm(cityGroup: THREE.Group, colliders: CollisionBox[]) {
    const dirtRoad = new THREE.Mesh(
      new THREE.PlaneGeometry(90, 8),
      new THREE.MeshStandardMaterial({ color: 0x74624a, roughness: 0.98 })
    );
    dirtRoad.rotation.x = -Math.PI / 2;
    dirtRoad.position.set(305, 0.045, 65);
    dirtRoad.receiveShadow = true;
    cityGroup.add(dirtRoad);

    const field = new THREE.Group();
    const stemMaterial = new THREE.MeshStandardMaterial({ color: 0x738b35, roughness: 0.9 });
    const leafMaterial = new THREE.MeshStandardMaterial({ color: 0x9ca34a, roughness: 0.85 });
    const plantCount = 8 * 18;
    const stemMesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.08, 0.55, 0.08),
      stemMaterial,
      plantCount
    );
    const leafMesh = new THREE.InstancedMesh(
      new THREE.ConeGeometry(0.22, 0.58, 5),
      leafMaterial,
      plantCount
    );
    const transform = new THREE.Object3D();
    let plant = 0;
    for (let row = 0; row < 8; row++) {
      for (let index = 0; index < 18; index++) {
        const x = 278 + row * 4.1;
        const z = 78 + index * 4.4;
        const height = 0.75 + Math.sin((row + index) * 0.71) * 0.12;
        transform.position.set(x, height / 2, z);
        transform.rotation.set(0, Math.sin(index * 2.3) * 0.16, 0);
        transform.scale.set(1, height / 0.55, 1);
        transform.updateMatrix();
        stemMesh.setMatrixAt(plant, transform.matrix);
        transform.position.y = height * 0.78;
        transform.scale.setScalar(1);
        transform.updateMatrix();
        leafMesh.setMatrixAt(plant, transform.matrix);
        plant++;
      }
    }
    stemMesh.instanceMatrix.needsUpdate = true;
    leafMesh.instanceMatrix.needsUpdate = true;
    field.add(stemMesh, leafMesh);
    cityGroup.add(field);

    const barn = new THREE.Group();
    const barnBody = new THREE.Mesh(
      new THREE.BoxGeometry(18, 8, 16),
      new THREE.MeshStandardMaterial({ color: 0x8f3c2c, roughness: 0.8 })
    );
    barnBody.position.y = 4;
    barnBody.castShadow = true;
    barnBody.receiveShadow = true;
    const roofMaterial = new THREE.MeshStandardMaterial({ color: 0x373b3c, roughness: 0.75 });
    const roofA = new THREE.Mesh(new THREE.BoxGeometry(10, 0.7, 18), roofMaterial);
    roofA.position.set(-4, 8.45, 0);
    roofA.rotation.z = -0.52;
    const roofB = roofA.clone();
    roofB.position.x = 4;
    roofB.rotation.z = 0.52;
    const barnDoor = new THREE.Mesh(
      new THREE.BoxGeometry(5.5, 5.2, 0.16),
      new THREE.MeshStandardMaterial({ color: 0x55382b, roughness: 0.9 })
    );
    barnDoor.position.set(0, 2.6, 8.08);
    const loftWindow = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 1.6, 0.12),
      new THREE.MeshPhysicalMaterial({ color: 0x6da2a8, roughness: 0.28, metalness: 0.2 })
    );
    loftWindow.position.set(0, 6.2, 8.1);
    barn.add(barnBody, roofA, roofB, barnDoor, loftWindow);
    barn.position.set(363, 0, 125);
    cityGroup.add(barn);
    colliders.push({ minX: 353, maxX: 373, minZ: 115, maxZ: 135, type: 'building' });

    const silo = new THREE.Group();
    const siloBody = new THREE.Mesh(
      new THREE.CylinderGeometry(3.2, 3.5, 13, 20),
      new THREE.MeshStandardMaterial({ color: 0x9c9b8e, roughness: 0.62, metalness: 0.25 })
    );
    siloBody.position.y = 6.5;
    const siloRoof = new THREE.Mesh(
      new THREE.ConeGeometry(3.5, 2.6, 20),
      new THREE.MeshStandardMaterial({ color: 0x70716e, roughness: 0.6, metalness: 0.3 })
    );
    siloRoof.position.y = 14.3;
    silo.add(siloBody, siloRoof);
    silo.position.set(382, 0, 112);
    cityGroup.add(silo);
    colliders.push({ minX: 378, maxX: 386, minZ: 108, maxZ: 116, type: 'building' });

    const fenceMaterial = new THREE.MeshStandardMaterial({ color: 0x795b3b, roughness: 0.9 });
    const fence = new THREE.Group();
    const postGeometry = new THREE.BoxGeometry(0.18, 1.2, 0.18);
    for (const x of [260, 390]) {
      for (let z = 70; z <= 168; z += 8) {
        const post = new THREE.Mesh(postGeometry, fenceMaterial);
        post.position.set(x, 0.6, z);
        fence.add(post);
      }
    }
    for (const z of [70, 168]) {
      for (let x = 260; x <= 390; x += 8) {
        if (z === 70 && x >= 308 && x <= 316) continue;
        const post = new THREE.Mesh(postGeometry, fenceMaterial);
        post.position.set(x, 0.6, z);
        fence.add(post);
      }
    }
    for (const y of [0.45, 0.9]) {
      const railNorthWest = new THREE.Mesh(new THREE.BoxGeometry(45, 0.1, 0.12), fenceMaterial);
      railNorthWest.position.set(282.5, y, 70);
      const railNorthEast = new THREE.Mesh(new THREE.BoxGeometry(75, 0.1, 0.12), fenceMaterial);
      railNorthEast.position.set(352.5, y, 70);
      const railSouth = new THREE.Mesh(new THREE.BoxGeometry(130, 0.1, 0.12), fenceMaterial);
      railSouth.position.set(325, y, 168);
      const railWest = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 98), fenceMaterial);
      railWest.position.set(260, y, 119);
      const railEast = railWest.clone();
      railEast.position.x = 390;
      fence.add(railNorthWest, railNorthEast, railSouth, railWest, railEast);
    }
    cityGroup.add(fence);
    colliders.push(
      { minX: 259.8, maxX: 260.2, minZ: 70, maxZ: 168, type: 'building' },
      { minX: 389.8, maxX: 390.2, minZ: 70, maxZ: 168, type: 'building' },
      { minX: 260, maxX: 305, minZ: 69.8, maxZ: 70.2, type: 'building' },
      { minX: 315, maxX: 390, minZ: 69.8, maxZ: 70.2, type: 'building' },
      { minX: 260, maxX: 390, minZ: 167.8, maxZ: 168.2, type: 'building' }
    );
  }

  private addDistantHills(cityGroup: THREE.Group, colliders: CollisionBox[]) {
    const hillside = new THREE.Group();
    const peaks = [
      { x: 470, z: -130, r: 85, h: 125 },
      { x: 520, z: -5, r: 108, h: 165 },
      { x: 470, z: 145, r: 100, h: 118 },
      { x: 560, z: 235, r: 115, h: 142 }
    ];

    peaks.forEach((peak, index) => {
      const hill = new THREE.Mesh(
        this.createMountainGeometry(peak.r, peak.h, index + 1),
        new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 })
      );
      hill.position.set(peak.x, peak.h / 2 - 4, peak.z);
      hill.rotation.y = index * 0.55;
      hill.receiveShadow = true;
      hillside.add(hill);

      for (let tree = 0; tree < 5; tree++) {
        const palm = modelFactory.createPalmTree();
        palm.scale.setScalar(0.75 + (tree % 2) * 0.12);
        palm.position.set(
          peak.x + Math.cos(tree * 2.4) * peak.r * 0.55,
          0,
          peak.z + Math.sin(tree * 2.4) * peak.r * 0.48
        );
        hillside.add(palm);
      }
    });

    cityGroup.add(hillside);
    colliders.push(
      { minX: 390, maxX: 580, minZ: -260, maxZ: -30, type: 'building' },
      { minX: 390, maxX: 590, minZ: 30, maxZ: 270, type: 'building' }
    );
  }

  private createMountainGeometry(radius: number, height: number, seed: number): THREE.BufferGeometry {
    const segments = 48;
    const rings = 20;
    const positions: number[] = [];
    const colors: number[] = [];
    const indices: number[] = [];
    const forest = new THREE.Color(0x526d3e);
    const scrub = new THREE.Color(0x7d8558);
    const rock = new THREE.Color(0x77766f);
    const snow = new THREE.Color(0xc3c5bf);

    for (let ring = 0; ring <= rings; ring++) {
      const t = ring / rings;
      const baseRadius = radius * Math.pow(1 - t, 0.92);
      for (let segment = 0; segment < segments; segment++) {
        const angle = (segment / segments) * Math.PI * 2;
        const noise =
          1 +
          Math.sin(angle * 3 + seed) * 0.09 +
          Math.sin(angle * 7 - seed * 1.7) * 0.045 +
          Math.cos(angle * 11 + ring * 0.35) * 0.025;
        const localRadius = baseRadius * noise;
        const ridge = Math.sin(angle * 4 + seed) * Math.sin(t * Math.PI) * height * 0.035;
        positions.push(
          Math.cos(angle) * localRadius,
          height * t + ridge,
          Math.sin(angle) * localRadius
        );

        const color = t < 0.38
          ? forest.clone().lerp(scrub, t / 0.38)
          : t < 0.72
            ? scrub.clone().lerp(rock, (t - 0.38) / 0.34)
            : rock.clone().lerp(snow, (t - 0.72) / 0.28);
        colors.push(color.r, color.g, color.b);
      }
    }

    for (let ring = 0; ring < rings; ring++) {
      for (let segment = 0; segment < segments; segment++) {
        const next = (segment + 1) % segments;
        const a = ring * segments + segment;
        const b = ring * segments + next;
        const c = (ring + 1) * segments + next;
        const d = (ring + 1) * segments + segment;
        indices.push(a, d, b, b, d, c);
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return geometry;
  }

  // Composite 5-part Skyscraper: Podium, Main Tower, Upper Crown, Antenna Mast, Heliport / AC units
  private createSkyscraper(w: number, h: number, d: number, style: number, name: string): THREE.Group {
    const building = new THREE.Group();
    const facadeTex = textureFactory.getBuildingFacadeTexture(style);

    const bldgMat = new THREE.MeshStandardMaterial({
      map: facadeTex,
      roughness: 0.25,
      metalness: 0.6
    });

    // 1. Podium Base (Ground level commercial retail)
    const podiumHeight = Math.min(10, h * 0.15);
    const podiumGeo = new THREE.BoxGeometry(w + 3, podiumHeight, d + 3);
    const podiumMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.6 });
    const podium = new THREE.Mesh(podiumGeo, podiumMat);
    podium.position.y = podiumHeight * 0.5;
    podium.castShadow = true;
    building.add(podium);

    // 2. Main Tower Shaft
    const towerH = h - podiumHeight - 6;
    const towerGeo = new THREE.BoxGeometry(w, towerH, d);
    const tower = new THREE.Mesh(towerGeo, bldgMat);
    tower.position.y = podiumHeight + towerH * 0.5;
    tower.castShadow = true;
    building.add(tower);

    // 3. Rooftop Crown
    const crownGeo = new THREE.BoxGeometry(w * 0.75, 4, d * 0.75);
    const crownMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4 });
    const crown = new THREE.Mesh(crownGeo, crownMat);
    crown.position.y = h - 1;
    building.add(crown);

    // 4. Rooftop AC Chiller / Elevator Mechanical Room
    const ac = new THREE.Mesh(new THREE.BoxGeometry(w * 0.35, 3.5, d * 0.35), crownMat);
    ac.position.set(w * 0.15, h + 1, d * 0.15);
    building.add(ac);

    // 5. Communications Antenna Mast with flashing warning beacon
    const antennaGeo = new THREE.CylinderGeometry(0.12, 0.4, 14, 8);
    const antennaMat = new THREE.MeshStandardMaterial({ color: 0xd1d5db, metalness: 0.9, roughness: 0.2 });
    const antenna = new THREE.Mesh(antennaGeo, antennaMat);
    antenna.position.set(-w * 0.15, h + 6, -d * 0.15);
    building.add(antenna);

    const beaconLight = new THREE.Mesh(
      new THREE.SphereGeometry(0.35, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 2.5 })
    );
    beaconLight.position.set(-w * 0.15, h + 13.2, -d * 0.15);
    building.add(beaconLight);

    return building;
  }
}

export const cityGenerator = new CityGenerator();
