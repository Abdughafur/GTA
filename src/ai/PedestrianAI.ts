import * as THREE from 'three';
import { CharacterRig, modelFactory } from '../world/ModelFactory';
import { CollisionBox, getDistrictName } from '../world/CityGenerator';
import { audioManager } from '../core/AudioManager';
import { CITY_ROAD_COORDS } from '../world/CityGenerator';
import { useGameStore } from '../core/gameState';

interface WalkNode {
  position: THREE.Vector3;
  neighbors: number[];
}

export interface CitizenProfile {
  name: string;
  age: number;
  gender: 'man' | 'woman' | 'boy' | 'girl' | 'older man' | 'older woman';
  ethnicity: string;
  job: string;
  personality: 'calm' | 'social' | 'hurried' | 'cautious' | 'bold';
  homeDistrict: string;
  workHours: [number, number];
  height: number;
  build: number;
  skinTone: number;
  jacketColor: number;
  pantsColor: number;
  shoesColor: number;
  hairColor: number;
  hairStyle: number;
  glasses: boolean;
  hat: boolean;
  watch: boolean;
  facialHair: boolean;
}

const FIRST_NAMES = [
  'Amina', 'Arman', 'Aziz', 'Caleb', 'Daria', 'Elias', 'Farah', 'Hana',
  'Idris', 'Jamal', 'Kira', 'Layla', 'Malik', 'Mira', 'Nadia', 'Omar',
  'Rafi', 'Samira', 'Tariq', 'Uma', 'Victor', 'Yasmin', 'Zara', 'Zayn'
];
const LAST_NAMES = [
  'Adler', 'Bennett', 'Costa', 'Diaz', 'Farouk', 'Grant', 'Haddad', 'Ivanov',
  'Jones', 'Khan', 'Lopez', 'Mercer', 'Nakamura', 'Okafor', 'Patel', 'Reed',
  'Santos', 'Turner', 'Usman', 'Vega'
];
const CITIZEN_JOBS = [
  'shopkeeper', 'student', 'nurse', 'mechanic', 'cook', 'courier',
  'teacher', 'artist', 'security guard', 'office worker', 'fisher', 'driver'
];
const ETHNICITIES = ['Bay local', 'Central Asian', 'East African', 'Mediterranean', 'South Asian', 'East Asian', 'Latino', 'Northern European'];
const PERSONALITIES: CitizenProfile['personality'][] = ['calm', 'social', 'hurried', 'cautious', 'bold'];
const SKIN_TONES = [
  0xffe0bd, 0xf3c89d, 0xdca879, 0xc98d62, 0xa96f4d, 0x85563f,
  0x684431, 0x4c3025, 0x38231d, 0xf0c7ae, 0xb98069, 0x916a58
];
const CLOTHING_COLORS = [
  0x1d4ed8, 0x047857, 0xb91c1c, 0x6d28d9, 0x0369a1, 0x475569,
  0xbe185d, 0x78716c, 0xc2410c, 0x365314, 0x0f766e, 0x334155
];
const HAIR_COLORS = [0x171717, 0x3f2a1d, 0x724b2a, 0xa16207, 0x8b4513, 0xb45309, 0x9ca3af, 0x6b7280];

function createCitizenProfile(index: number, position: THREE.Vector3, jacketColor: number): CitizenProfile {
  const ageGroup = index % 6;
  const genders: CitizenProfile['gender'][] = ['man', 'woman', 'boy', 'girl', 'older man', 'older woman'];
  const gender = genders[ageGroup];
  const age = ageGroup < 2 ? 19 + (index * 7) % 46 : ageGroup < 4 ? 7 + (index * 3) % 10 : 65 + (index * 5) % 25;
  const firstName = FIRST_NAMES[index % FIRST_NAMES.length];
  const lastName = LAST_NAMES[Math.floor(index / FIRST_NAMES.length) % LAST_NAMES.length];
  const adult = age >= 18;
  const older = age >= 65;
  const build = 0.78 + ((index * 7) % 11) * 0.055;
  const height = age < 13 ? 0.68 + ((index * 3) % 6) * 0.045 : older ? 0.88 + ((index * 5) % 5) * 0.025 : 0.92 + ((index * 11) % 9) * 0.025;
  const hair = new THREE.Color(HAIR_COLORS[(index * 3) % HAIR_COLORS.length]).getHex();

  return {
    name: `${firstName} ${lastName}`,
    age,
    gender,
    ethnicity: ETHNICITIES[(index * 5) % ETHNICITIES.length],
    job: age < 18 ? 'student' : CITIZEN_JOBS[(index * 5) % CITIZEN_JOBS.length],
    personality: PERSONALITIES[(index * 3) % PERSONALITIES.length],
    homeDistrict: getDistrictName(position.x, position.z),
    workHours: [7 + (index % 3), 15 + (index % 5)],
    height,
    build,
    skinTone: SKIN_TONES[(index * 5) % SKIN_TONES.length],
    jacketColor: age < 18 ? CLOTHING_COLORS[(index * 7) % CLOTHING_COLORS.length] : jacketColor,
    pantsColor: CLOTHING_COLORS[(index * 7 + 4) % CLOTHING_COLORS.length],
    shoesColor: CLOTHING_COLORS[(index * 5 + 2) % CLOTHING_COLORS.length],
    hairColor: older ? 0x9ca3af : hair,
    hairStyle: (index * 7) % 6,
    glasses: index % 5 === 0,
    hat: index % 7 === 0,
    watch: index % 3 !== 0,
    facialHair: adult && gender === 'man' && index % 4 === 0
  };
}

function createSidewalkNetwork(colliders: CollisionBox[]): WalkNode[] {
  const nodes: WalkNode[] = [];
  const indices = new Map<string, number>();
  const signs = [-1, 1] as const;
  const key = (x: number, z: number, sideX: number, sideZ: number) => `${x},${z},${sideX},${sideZ}`;
  const isBlocked = (position: THREE.Vector3) =>
    colliders.some((collider) =>
      position.x > collider.minX &&
      position.x < collider.maxX &&
      position.z > collider.minZ &&
      position.z < collider.maxZ
    );

  CITY_ROAD_COORDS.forEach((roadX, xIndex) => {
    CITY_ROAD_COORDS.forEach((roadZ, zIndex) => {
      for (const sideX of signs) {
        for (const sideZ of signs) {
          const position = new THREE.Vector3(roadX + sideX * 13, 0, roadZ + sideZ * 13);
          if (isBlocked(position)) continue;
          indices.set(key(xIndex, zIndex, sideX, sideZ), nodes.length);
          nodes.push({ position, neighbors: [] });
        }
      }
    });
  });

  const connect = (aKey: string, bKey: string) => {
    const a = indices.get(aKey);
    const b = indices.get(bKey);
    if (a === undefined || b === undefined) return;
    const from = nodes[a].position;
    const to = nodes[b].position;
    const blockedOnRoute = Array.from({ length: 7 }, (_, step) => {
      const position = from.clone().lerp(to, (step + 1) / 8);
      return isBlocked(position);
    }).some(Boolean);
    if (blockedOnRoute) return;
    nodes[a].neighbors.push(b);
    nodes[b].neighbors.push(a);
  };

  for (let xIndex = 0; xIndex < CITY_ROAD_COORDS.length; xIndex++) {
    for (let zIndex = 0; zIndex < CITY_ROAD_COORDS.length; zIndex++) {
      for (const sideX of signs) {
        for (const sideZ of signs) {
          connect(key(xIndex, zIndex, sideX, sideZ), key(xIndex, zIndex, -sideX, sideZ));
          connect(key(xIndex, zIndex, sideX, sideZ), key(xIndex, zIndex, sideX, -sideZ));
        }
      }

      for (const sideZ of signs) {
        if (xIndex + 1 < CITY_ROAD_COORDS.length) {
          connect(key(xIndex, zIndex, 1, sideZ), key(xIndex + 1, zIndex, -1, sideZ));
        }
        if (zIndex + 1 < CITY_ROAD_COORDS.length) {
          connect(key(xIndex, zIndex, sideZ, 1), key(xIndex, zIndex + 1, sideZ, -1));
        }
      }
    }
  }
  return nodes;
}

function findNearestNode(position: THREE.Vector3, nodes: WalkNode[]): number {
  let nearest = 0;
  let nearestDistance = Number.POSITIVE_INFINITY;
  for (let i = 0; i < nodes.length; i++) {
    const distance = position.distanceToSquared(nodes[i].position);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearest = i;
    }
  }
  return nearest;
}

export class PedestrianAI {
  public rig: CharacterRig;
  public group: THREE.Group;
  public position: THREE.Vector3;
  public velocity: THREE.Vector3 = new THREE.Vector3();
  public heading = 0;
  public isFleeing = false;
  public health = 50;
  public isDead = false;
  public readonly profile: CitizenProfile;
  private walkSpeed: number;
  private fleeSpeed: number;
  private routeGraph: WalkNode[];
  private route: THREE.Vector3[] = [];
  private routeIndex = 0;
  private routePause = 0;
  private isElderly: boolean;

  constructor(startPos: THREE.Vector3, outfitColor: number, routeGraph: WalkNode[], profileIndex = 0) {
    this.profile = createCitizenProfile(profileIndex, startPos, outfitColor);
    this.isElderly = this.profile.age >= 65;
    this.walkSpeed = this.isElderly ? 1.25 : 2.2;
    this.fleeSpeed = this.isElderly ? 3.4 : 6.8;
    this.routeGraph = routeGraph;
    const bodyShape = this.profile.gender === 'woman' || this.profile.gender === 'girl' || this.profile.gender === 'older woman'
      ? 'feminine'
      : 'masculine';
    this.rig = modelFactory.createCharacter(
      this.profile.jacketColor,
      this.profile.skinTone,
      {
        bodyShape,
        isElderly: this.isElderly,
        pantsColor: this.profile.pantsColor,
        shoesColor: this.profile.shoesColor,
        hairColor: this.profile.hairColor,
        hairStyle: this.profile.hairStyle,
        glasses: this.profile.glasses,
        hat: this.profile.hat,
        watch: this.profile.watch,
        height: this.profile.height,
        build: this.profile.build,
        facialHair: this.profile.facialHair
      }
    );
    if (this.isElderly) this.addWalkingCane();
    this.group = this.rig.group;
    this.position = this.group.position;
    this.position.copy(startPos);
    if (this.routeGraph.length > 0) {
      this.position.copy(this.routeGraph[findNearestNode(this.position, this.routeGraph)].position);
    }
    this.heading = Math.random() * Math.PI * 2;
  }

  private chooseRoute() {
    if (this.routeGraph.length === 0) return;
    const start = findNearestNode(this.position, this.routeGraph);
    const previous = new Int32Array(this.routeGraph.length).fill(-1);
    const depth = new Int32Array(this.routeGraph.length).fill(-1);
    const queue = [start];
    previous[start] = start;
    depth[start] = 0;
    const candidates: number[] = [];

    for (let cursor = 0; cursor < queue.length; cursor++) {
      const current = queue[cursor];
      if (current !== start) candidates.push(current);
      if (depth[current] >= 4) continue;
      for (const neighbor of this.routeGraph[current].neighbors) {
        if (previous[neighbor] !== -1) continue;
        previous[neighbor] = current;
        depth[neighbor] = depth[current] + 1;
        queue.push(neighbor);
      }
    }

    if (candidates.length === 0) return;
    const destination = candidates[Math.floor(Math.random() * candidates.length)];
    const path: THREE.Vector3[] = [];
    let cursor = destination;
    while (cursor !== start) {
      path.push(this.routeGraph[cursor].position);
      cursor = previous[cursor];
    }
    path.push(this.routeGraph[start].position);
    this.route = path.reverse();
    this.routeIndex = 0;
  }

  public resetRoute() {
    this.route = [];
    this.routePause = 0;
  }

  private addWalkingCane() {
    const cane = new THREE.Group();
    const material = new THREE.MeshStandardMaterial({ color: 0x3f3026, roughness: 0.6 });
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 0.84, 8), material);
    shaft.position.y = -0.84;
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.18, 8), material);
    handle.rotation.z = Math.PI / 2;
    handle.position.set(0.06, -0.43, 0);
    cane.add(shaft, handle);
    cane.position.set(-0.02, 0, 0.12);
    this.rig.leftArm.add(cane);
  }

  public takeDamage(amount: number, knockback?: THREE.Vector3): boolean {
    if (this.isDead) return false;
    this.health -= amount;
    this.isFleeing = true;
    audioManager.playCitizenScream();

    if (knockback) {
      this.position.add(knockback);
    }

    if (this.health <= 0) {
      this.isDead = true;
      this.group.rotation.x = Math.PI / 2; // Collapse to ground
      this.group.position.y = 0.18;
      this.rig.leftArm.rotation.z = Math.PI / 2.5;
      this.rig.rightArm.rotation.z = -Math.PI / 2.5;
      return true; // Dropped
    }
    return false;
  }

  public triggerPanic(threatPos: THREE.Vector3) {
    if (this.isDead) return;
    this.isFleeing = true;
    audioManager.playCitizenScream(1.1);
    const away = new THREE.Vector3().subVectors(this.position, threatPos).normalize();
    this.heading = Math.atan2(away.x, away.z);
  }

  public update(playerPos: THREE.Vector3, playerSpeed: number, colliders: CollisionBox[], dt: number) {
    if (this.isDead) return;

    const distToPlayer = this.position.distanceTo(playerPos);

    // Flee if player is speeding close by (< 14m)
    if (distToPlayer < 14 && playerSpeed > 8 && (this.profile.personality !== 'bold' || distToPlayer < 6)) {
      this.isFleeing = true;
      const awayVec = new THREE.Vector3().subVectors(this.position, playerPos).normalize();
      this.heading = Math.atan2(awayVec.x, awayVec.z);
    } else if (distToPlayer > 35 && this.isFleeing) {
      this.isFleeing = false;
    }

    if (!this.isFleeing) {
      if (this.route.length === 0) {
        this.routePause = Math.max(0, this.routePause - dt);
        if (this.routePause === 0) this.chooseRoute();
      }

      if (this.route.length > 0) {
        let target = this.route[this.routeIndex];
        if (this.position.distanceTo(target) < 1.8) {
          if (this.routeIndex + 1 < this.route.length) {
            target = this.route[++this.routeIndex];
          } else {
            this.route = [];
            this.routePause = this.profile.personality === 'hurried'
              ? 0.3 + Math.random() * 0.7
              : this.profile.personality === 'social'
                ? 2 + Math.random() * 3
                : 1 + Math.random() * 2;
          }
        }

        if (this.route.length > 0) {
          const direction = target.clone().sub(this.position);
          this.heading = Math.atan2(direction.x, direction.z);
        }
      }
    }

    this.group.rotation.y = this.heading;

    const timeOfDay = useGameStore.getState().timeOfDay;
    const isWorkTime = timeOfDay >= this.profile.workHours[0] && timeOfDay < this.profile.workHours[1];
    const scheduleFactor = isWorkTime && this.profile.personality === 'hurried' ? 1.15 : 1;
    const currentSpeed = this.isFleeing ? this.fleeSpeed : this.route.length > 0 ? this.walkSpeed * scheduleFactor : 0;
    this.velocity.x = Math.sin(this.heading) * currentSpeed;
    this.velocity.z = Math.cos(this.heading) * currentSpeed;

    const nextX = this.position.x + this.velocity.x * dt;
    const nextZ = this.position.z + this.velocity.z * dt;

    let canMove = true;
    for (const col of colliders) {
      if (nextX > col.minX && nextX < col.maxX && nextZ > col.minZ && nextZ < col.maxZ) {
        canMove = false;
        this.heading += Math.PI * 0.75; // Turn around when hitting wall
        this.route = [];
        this.routePause = 0;
        break;
      }
    }

    if (canMove) {
      this.position.x = nextX;
      this.position.z = nextZ;
    }

    this.position.y = 0;

    // Procedural animation
    this.rig.animate(currentSpeed / 2.5, false, false, dt, {
      running: this.isFleeing,
      fatigue: this.profile.personality === 'hurried' ? 0.25 : 0
    });
  }
}

export class PedestrianManager {
  public pedestrians: PedestrianAI[] = [];
  private scene: THREE.Scene;
  private colliders: CollisionBox[];
  private routeGraph: WalkNode[];

  constructor(scene: THREE.Scene, colliders: CollisionBox[]) {
    this.scene = scene;
    this.colliders = colliders;
    this.routeGraph = createSidewalkNetwork(colliders);
    this.spawnPedestrians(40);
  }

  private spawnPedestrians(count: number) {
    const outfitColors = [0xd97706, 0x059669, 0xdc2626, 0x4f46e5, 0x0284c7, 0x475569, 0xec4899, 0x78716c];
    const spawnSidewalks = [
      new THREE.Vector3(-25, 0, -30),
      new THREE.Vector3(5, 0, -30),
      new THREE.Vector3(-45, 0, 70),
      new THREE.Vector3(25, 0, 70),
      new THREE.Vector3(80, 0, -45),
      new THREE.Vector3(100, 0, -45),
      new THREE.Vector3(-15, 0, 100),
      new THREE.Vector3(75, 0, 30),
      new THREE.Vector3(-70, 0, -50),
      new THREE.Vector3(20, 0, -10),
      new THREE.Vector3(-50, 0, 120),
      new THREE.Vector3(120, 0, 70)
    ];

    for (let i = 0; i < count; i++) {
      const basePos = spawnSidewalks[i % spawnSidewalks.length].clone();
      basePos.x += (Math.random() - 0.5) * 16;
      basePos.z += (Math.random() - 0.5) * 16;

      const ped = new PedestrianAI(basePos, outfitColors[i % outfitColors.length], this.routeGraph, i);
      this.pedestrians.push(ped);
      this.scene.add(ped.group);
    }
  }

  public panicNearby(threatPos: THREE.Vector3, radius: number = 30) {
    for (const ped of this.pedestrians) {
      if (ped.position.distanceTo(threatPos) < radius) {
        ped.triggerPanic(threatPos);
      }
    }
  }

  public update(playerPos: THREE.Vector3, playerSpeed: number, dt: number) {
    for (const ped of this.pedestrians) {
      // Re-cluster pedestrians if too far
      if (ped.position.distanceTo(playerPos) > 160) {
        if (this.routeGraph.length > 0) {
          const nearbyNodes = this.routeGraph.filter((node) => node.position.distanceTo(playerPos) < 90);
          const node = nearbyNodes[Math.floor(Math.random() * nearbyNodes.length)] ??
            this.routeGraph[Math.floor(Math.random() * this.routeGraph.length)];
          ped.position.copy(node.position);
        } else {
          ped.position.set(playerPos.x + 10, 0, playerPos.z + 10);
        }
        ped.health = 50;
        ped.isDead = false;
        ped.group.rotation.x = 0;
        ped.resetRoute();
      }
      ped.update(playerPos, playerSpeed, this.colliders, dt);
    }
  }
}
