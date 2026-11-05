import * as THREE from 'three';
import { Vehicle, VehicleConfig } from '../vehicles/Vehicle';
import { CITY_ROAD_COORDS, CollisionBox, TrafficSignalData } from '../world/CityGenerator';
import { audioManager } from '../core/AudioManager';
import { CharacterRig, modelFactory } from '../world/ModelFactory';
import { useGameStore } from '../core/gameState';

interface NavRoute {
  axis: 'x' | 'z';
  coord: number;
  direction: 1 | -1;
}

export class TrafficCarAI {
  public vehicle: Vehicle;
  public targetHeading: number = 0;
  public laneAxis: 'x' | 'z' = 'z';
  public laneCoord: number = 0;
  public laneDirection: 1 | -1 = 1;
  public stuckTimer = 0;
  public isPanicking = false;
  public hasDriver = true;
  public driverRig?: CharacterRig;
  private lastHealth = 100;
  private lastIntersectionPosition: THREE.Vector3 | null = null;
  private hornCooldown = 0;

  constructor(config: VehicleConfig, startPos: THREE.Vector3, heading: number, axis: 'x' | 'z', dir: 1 | -1) {
    this.vehicle = new Vehicle(config, startPos, heading);
    this.vehicle.isTraffic = true;
    this.targetHeading = heading;
    this.laneAxis = axis;
    this.laneDirection = dir;
    this.laneCoord = axis === 'z' ? startPos.x : startPos.z;
    this.lastHealth = this.vehicle.health;

    // Visual Driver Citizen in Driver's Seat
    this.driverRig = modelFactory.createCharacter(
      [0xd97706, 0x059669, 0xdc2626, 0x4f46e5, 0x0284c7, 0x475569][Math.floor(Math.random() * 6)],
      0xf6d8ae
    );
    this.driverRig.group.scale.setScalar(0.72);
    this.driverRig.group.position.set(-0.35, 0.45, -0.05);
    this.driverRig.animate(0, false, true, 0.016); // sitting pose
    this.vehicle.group.add(this.driverRig.group);
  }

  public carjack(): { cash: number } {
    this.hasDriver = false;
    if (this.driverRig) {
      this.vehicle.group.remove(this.driverRig.group);
      this.driverRig = undefined;
    }
    this.vehicle.speed = 0;
    return { cash: 50 + Math.floor(Math.random() * 80) };
  }

  public update(
    playerPos: THREE.Vector3,
    allCars: TrafficCarAI[],
    colliders: CollisionBox[],
    dt: number,
    otherVehicles: Vehicle[] = [],
    greenAxis: 'x' | 'z' = 'z',
    rushHour = false
  ) {
    if (this.vehicle.isPlayerDriving) return;

    // Detect if car was shot or hit by player -> panic drive!
    if (this.vehicle.health < this.lastHealth) {
      this.isPanicking = true;
      audioManager.playCrash(0.6);
    }
    this.lastHealth = this.vehicle.health;
    this.hornCooldown = Math.max(0, this.hornCooldown - dt);

    const pos = this.vehicle.position;
    const roadGridLines: readonly number[] = CITY_ROAD_COORDS;

    if (this.lastIntersectionPosition && pos.distanceToSquared(this.lastIntersectionPosition) > 64) {
      this.lastIntersectionPosition = null;
    }

    // Make one route decision per intersection, rather than changing direction every frame.
    const crossCoord = this.laneAxis === 'z' ? pos.z : pos.x;
    const intersection = roadGridLines.find((line) => Math.abs(crossCoord - line) < 2.0);
    if (intersection !== undefined && !this.lastIntersectionPosition) {
      this.lastIntersectionPosition = pos.clone();
      if (Math.random() < 0.35) {
        const nextAxis: 'x' | 'z' = this.laneAxis === 'z' ? 'x' : 'z';
        const nextDir: 1 | -1 = Math.random() > 0.5 ? 1 : -1;
        const laneOffset = nextDir === 1 ? 3.5 : -3.5;
        this.laneAxis = nextAxis;
        this.laneDirection = nextDir;
        this.laneCoord = nextAxis === 'z' ? pos.x + laneOffset : pos.z + laneOffset;
        this.targetHeading = nextAxis === 'x'
          ? (nextDir === 1 ? Math.PI / 2 : -Math.PI / 2)
          : (nextDir === 1 ? 0 : Math.PI);
      }
    }

    // Steer towards target heading
    let diff = this.targetHeading - this.vehicle.heading;
    while (diff < -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;
    const steer = Math.max(-1, Math.min(1, diff * 2.5));

    // Obstacle and traffic collision check
    const fwdVec = new THREE.Vector3(Math.sin(this.vehicle.heading), 0, Math.cos(this.vehicle.heading));
    let blockedAhead = false;
    const forwardCoord = this.laneAxis === 'z' ? pos.z : pos.x;
    const nextIntersectionDistance = roadGridLines.reduce((nearest, line) => {
      const distance = (line - forwardCoord) * this.laneDirection;
      return distance > 0 ? Math.min(nearest, distance) : nearest;
    }, Number.POSITIVE_INFINITY);
    if (this.laneAxis !== greenAxis && nextIntersectionDistance >= 3 && nextIntersectionDistance <= 14) {
      blockedAhead = true;
    }

    const lookAhead = Math.max(4, Math.abs(this.vehicle.speed) * 0.45 + 3);
    const obstaclePos = pos.clone().addScaledVector(fwdVec, lookAhead);

    for (const collider of colliders) {
      if (blockedAhead) break;
      const radius = 2.2;
      if (
        obstaclePos.x + radius > collider.minX &&
        obstaclePos.x - radius < collider.maxX &&
        obstaclePos.z + radius > collider.minZ &&
        obstaclePos.z - radius < collider.maxZ
      ) {
        blockedAhead = true;
        break;
      }
    }

    // Check distance to player
    const distToPlayer = pos.distanceTo(playerPos);
    if (!blockedAhead && distToPlayer < 10) {
      const toPlayer = new THREE.Vector3().subVectors(playerPos, pos).normalize();
      if (fwdVec.dot(toPlayer) > 0.5) {
        blockedAhead = true;
      }
    }

    // Check distance to other traffic cars
    for (const other of allCars) {
      if (blockedAhead) break;
      if (other === this) continue;
      const d = pos.distanceTo(other.vehicle.position);
      if (d < 11) {
        const toOther = new THREE.Vector3().subVectors(other.vehicle.position, pos).normalize();
        if (fwdVec.dot(toOther) > 0.6) {
          blockedAhead = true;
          break;
        }
      }
    }

    let throttle = 0;
    let brake = 0;
    if (!blockedAhead) this.stuckTimer = 0;

    if (blockedAhead) {
      brake = 1.0;
      this.stuckTimer += dt;
      if (this.stuckTimer > 1.8 && this.hornCooldown === 0) {
        audioManager.playCarHorn();
        this.hornCooldown = 3;
      }
    } else if (this.isPanicking) {
      throttle = 1.0;
      brake = 0;
    } else {
      throttle = rushHour ? 0.58 : 0.75;
      brake = 0;
    }

    this.vehicle.update(
      { throttle, brake, steer, handbrake: false },
      colliders,
      dt,
      [...allCars.map((car) => car.vehicle), ...otherVehicles]
    );
  }
}

export class TrafficManager {
  public vehicles: Vehicle[] = [];
  public trafficCars: TrafficCarAI[] = [];
  private roadNodes: THREE.Vector3[];
  private scene: THREE.Scene;
  private colliders: CollisionBox[];
  private trafficSignals: TrafficSignalData[];
  private signalClock = 0;
  private greenAxis: 'x' | 'z' = 'z';
  private isYellow = false;

  constructor(
    scene: THREE.Scene,
    roadNodes: THREE.Vector3[],
    colliders: CollisionBox[],
    trafficSignals: TrafficSignalData[] = []
  ) {
    this.scene = scene;
    this.roadNodes = roadNodes;
    this.colliders = colliders;
    this.trafficSignals = trafficSignals;
    this.spawnTrafficPool(22);
  }

  private updateTrafficSignals(dt: number) {
    this.signalClock = (this.signalClock + dt) % 46;
    this.greenAxis = this.signalClock < 20 || this.signalClock >= 43 ? 'z' : 'x';
    this.isYellow = (this.signalClock >= 17 && this.signalClock < 20) ||
      (this.signalClock >= 40 && this.signalClock < 43);
    for (const signal of this.trafficSignals) {
      const lenses = signal.group.userData.signalLenses as {
        redLens: THREE.Mesh;
        yellowLens: THREE.Mesh;
        greenLens: THREE.Mesh;
      } | undefined;
      if (!lenses) continue;
      const redOn = signal.axis !== this.greenAxis;
      const yellowOn = !redOn && this.isYellow;
      const greenOn = !redOn && !this.isYellow;
      (lenses.redLens.material as THREE.MeshStandardMaterial).emissiveIntensity = redOn ? 2.4 : 0.05;
      (lenses.yellowLens.material as THREE.MeshStandardMaterial).emissiveIntensity = yellowOn ? 2.4 : 0.05;
      (lenses.greenLens.material as THREE.MeshStandardMaterial).emissiveIntensity = greenOn ? 2.4 : 0.05;
    }
  }

  private spawnTrafficPool(count: number) {
    const types: ('taxi' | 'sports' | 'sedan' | 'suv' | 'truck' | 'ambulance')[] = [
      'taxi', 'sedan', 'suv', 'sports', 'taxi', 'sedan', 'truck', 'sedan', 'ambulance'
    ];
    const colors = [
      0xfacc15, // Taxi Yellow
      0x3b82f6, // Blue
      0xef4444, // Red
      0x10b981, // Green
      0xd97706, // Amber
      0x8b5cf6, // Purple
      0x475569, // Slate
      0xf8fafc  // White
    ];

    const avenues = CITY_ROAD_COORDS;
    const boulevards = CITY_ROAD_COORDS;

    for (let i = 0; i < count; i++) {
      const type = types[i % types.length];
      const colorHex = type === 'taxi' ? 0xfacc15 : colors[i % colors.length];

      // Assign to either an avenue (moving along Z) or boulevard (moving along X)
      const isZAxis = i % 2 === 0;
      const axis: 'x' | 'z' = isZAxis ? 'z' : 'x';
      const dir: 1 | -1 = i % 4 < 2 ? 1 : -1;

      let startPos: THREE.Vector3;
      let heading: number;

      if (isZAxis) {
        const roadX = avenues[i % avenues.length];
        const offsetLane = dir === 1 ? 3.5 : -3.5;
        const z = -380 + ((i * 35) % 760);
        startPos = new THREE.Vector3(roadX + offsetLane, 0, z);
        heading = dir === 1 ? 0 : Math.PI;
      } else {
        const roadZ = boulevards[i % boulevards.length];
        const offsetLane = dir === 1 ? 3.5 : -3.5;
        const x = -380 + ((i * 35) % 760);
        startPos = new THREE.Vector3(x, 0, roadZ + offsetLane);
        heading = dir === 1 ? Math.PI / 2 : -Math.PI / 2;
      }

      const config: VehicleConfig = {
        name: type === 'taxi' ? 'Vice Bay Taxi' : type === 'truck' ? 'Utility Carriage Truck' : `Civilian ${type.toUpperCase()}`,
        type,
        colorHex,
        maxSpeed: type === 'sports' ? 24.0 : 16.0,
        acceleration: 9.0,
        brakeForce: 20.0,
        steerAngleMax: 0.52,
        handling: 1.1,
        healthMax: 100
      };

      const trafficAI = new TrafficCarAI(config, startPos, heading, axis, dir);
      this.trafficCars.push(trafficAI);
      this.vehicles.push(trafficAI.vehicle);
      this.scene.add(trafficAI.vehicle.group);
    }
  }

  public update(playerPos: THREE.Vector3, isPlayerInVehicle: boolean, dt: number, otherVehicles: Vehicle[] = []) {
    this.updateTrafficSignals(dt);
    const timeOfDay = useGameStore.getState().timeOfDay;
    const rushHour = (timeOfDay >= 7 && timeOfDay < 9) || (timeOfDay >= 16 && timeOfDay < 18);
    for (const trafficAI of this.trafficCars) {
      const dist = trafficAI.vehicle.position.distanceTo(playerPos);

      // If traffic car is too far (> 220m), respawn it closer ahead of player along active road
      if (dist > 220) {
        const roadCoord = CITY_ROAD_COORDS[Math.floor(Math.random() * CITY_ROAD_COORDS.length)];
        if (trafficAI.laneAxis === 'z') {
          trafficAI.laneCoord = roadCoord + (trafficAI.laneDirection === 1 ? 3.5 : -3.5);
          trafficAI.vehicle.position.set(
            trafficAI.laneCoord,
            0,
            playerPos.z + (Math.random() - 0.5) * 140
          );
        } else {
          trafficAI.laneCoord = roadCoord + (trafficAI.laneDirection === 1 ? 3.5 : -3.5);
          trafficAI.vehicle.position.set(
            playerPos.x + (Math.random() - 0.5) * 140,
            0,
            trafficAI.laneCoord
          );
        }
        trafficAI.vehicle.speed = 0;
        trafficAI.isPanicking = false;
        continue;
      }

      trafficAI.update(playerPos, this.trafficCars, this.colliders, dt, otherVehicles, this.greenAxis, rushHour);
    }
  }
}
