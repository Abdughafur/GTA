import * as THREE from 'three';
import { CharacterRig, modelFactory } from '../world/ModelFactory';
import { CollisionBox } from '../world/CityGenerator';
import { audioManager } from '../core/AudioManager';
import { CITY_ROAD_COORDS } from '../world/CityGenerator';

interface WalkNode {
  position: THREE.Vector3;
  neighbors: number[];
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
  private walkSpeed: number;
  private fleeSpeed: number;
  private routeGraph: WalkNode[];
  private route: THREE.Vector3[] = [];
  private routeIndex = 0;
  private routePause = 0;
  private isElderly: boolean;

  constructor(startPos: THREE.Vector3, outfitColor: number, routeGraph: WalkNode[]) {
    this.isElderly = Math.random() < 0.12;
    this.walkSpeed = this.isElderly ? 1.25 : 2.2;
    this.fleeSpeed = this.isElderly ? 3.4 : 6.8;
    this.routeGraph = routeGraph;
    const bodyShape = Math.random() < 0.5 ? 'feminine' : 'masculine';
    const skinTones = [0xf6d8ae, 0xd7a47c, 0x986b50, 0x6b4634];
    this.rig = modelFactory.createCharacter(
      outfitColor,
      skinTones[Math.floor(Math.random() * skinTones.length)],
      {
        bodyShape,
        isElderly: this.isElderly,
        glasses: Math.random() < 0.18,
        hat: Math.random() < 0.12
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
    if (distToPlayer < 14 && playerSpeed > 8) {
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
            this.routePause = 1.0 + Math.random() * 2;
          }
        }

        if (this.route.length > 0) {
          const direction = target.clone().sub(this.position);
          this.heading = Math.atan2(direction.x, direction.z);
        }
      }
    }

    this.group.rotation.y = this.heading;

    const currentSpeed = this.isFleeing ? this.fleeSpeed : this.route.length > 0 ? this.walkSpeed : 0;
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
    this.rig.animate(currentSpeed / 2.5, false, false, dt);
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

      const ped = new PedestrianAI(basePos, outfitColors[i % outfitColors.length], this.routeGraph);
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
