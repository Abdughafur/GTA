import * as THREE from 'three';
import { modelFactory } from '../world/ModelFactory';
import { CollisionBox, getTerrainGrip, getTerrainHeight, WORLD_RADIUS } from '../world/CityGenerator';
import { audioManager } from '../core/AudioManager';
import { getVehicleRules } from './models';
import { VehicleConfig, VehicleMeshRig, VehicleRules } from './types';
export type { VehicleConfig } from './types';

interface VehicleDebris {
  object: THREE.Object3D;
  velocity: THREE.Vector3;
  angularVelocity: THREE.Vector3;
  groundY: number;
  lifetime: number;
}

interface PaintMaterialState {
  material: THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial;
  color: THREE.Color;
  roughness: number;
  metalness: number;
}

export class Vehicle {
  public group: THREE.Group;
  public rig: VehicleMeshRig;
  public config: VehicleConfig;
  public position: THREE.Vector3;
  public readonly tireTemperatures: number[];
  public readonly tireWear: number[];
  public readonly tireHealth: number[];
  public readonly features: readonly string[];
  public velocity: THREE.Vector3 = new THREE.Vector3();
  public heading = 0; // Radians
  public speed = 0; // m/s
  public steerAngle = 0; // Radians
  public health = 100;
  public fuel = 95; // 0 to 100%
  public odometer = 14.8; // Miles
  public engineTemp = 195; // °F
  public isPlayerDriving = false;
  public isTraffic = false;
  public isDestroyed = false;
  public isParked = false;

  // Animated Door Pivot Angles
  public leftDoorAngle = 0;
  public targetLeftDoorAngle = 0;
  public rightDoorAngle = 0;
  public targetRightDoorAngle = 0;

  // Transmission simulation
  public currentGear = 1;
  public rpm = 1000;

  // Visual body roll & pitch
  private bodyRoll = 0;
  private bodyPitch = 0;
  private terrainPitch = 0;
  private terrainRoll = 0;
  private wheelSpinAngle = 0;
  private rules: VehicleRules;
  private collisionCooldown = 0;
  private smoke: THREE.Points;
  private smokePositions: Float32Array;
  private smokeClock = 0;
  private explosionMesh: THREE.Mesh | null = null;
  private explosionClock = 0;
  private fire: THREE.Points | null = null;
  private fireClock = 0;
  private readonly fireDuration = 180;
  private readonly debris: VehicleDebris[] = [];
  private readonly hiddenDamageParts: THREE.Object3D[] = [];
  private readonly paintMaterialStates: PaintMaterialState[];
  private readonly baseAcceleration: number;
  private readonly baseMaxSpeed: number;
  private readonly underglow: THREE.Mesh;
  private readonly previousPosition: THREE.Vector3;
  private readonly wheelSuspensionOffsets: number[];
  private readonly wheelSuspensionVelocities: number[];
  private previousHeading: number;

  // Siren timer for police cars
  private sirenFlashTimer = 0;

  constructor(config: VehicleConfig, startPos: THREE.Vector3, startHeading = 0) {
    this.config = config;
    this.baseAcceleration = config.acceleration;
    this.baseMaxSpeed = config.maxSpeed;
    this.rules = getVehicleRules(config.type);
    this.rig = modelFactory.createVehicle(config.type, config.colorHex);
    this.features = this.rig.features;
    this.group = this.rig.group;
    const paintMaterials = new Set<THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial>([
      this.rig.bodyMaterial
    ]);
    this.rig.body.traverse((child) => {
      if (!(child instanceof THREE.Mesh) || child.userData.paintable !== true) return;
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      for (const material of materials) {
        if (material instanceof THREE.MeshStandardMaterial || material instanceof THREE.MeshPhysicalMaterial) {
          paintMaterials.add(material);
        }
      }
    });
    this.paintMaterialStates = [...paintMaterials].map((material) => ({
      material,
      color: material.color.clone(),
      roughness: material.roughness,
      metalness: material.metalness
    }));
    this.position = startPos.clone();
    this.group.position.copy(startPos);
    this.heading = startHeading;
    this.previousHeading = startHeading;
    this.previousPosition = startPos.clone();
    this.group.rotation.order = 'YXZ';
    this.group.rotation.y = this.heading;
    this.health = config.healthMax;
    this.tireTemperatures = this.rig.wheels.map(() => 24);
    this.tireWear = this.rig.wheels.map(() => 0);
    this.tireHealth = this.rig.wheels.map(() => 100);
    this.wheelSuspensionOffsets = this.rig.wheels.map(() => 0);
    this.wheelSuspensionVelocities = this.rig.wheels.map(() => 0);
    this.smokePositions = new Float32Array(30);
    const smokeGeometry = new THREE.BufferGeometry();
    smokeGeometry.setAttribute('position', new THREE.BufferAttribute(this.smokePositions, 3));
    this.smoke = new THREE.Points(
      smokeGeometry,
      new THREE.PointsMaterial({
        color: 0x55585b,
        size: 0.8,
        transparent: true,
        opacity: 0.35,
        depthWrite: false,
        sizeAttenuation: true
      })
    );
    this.smoke.position.set(0, 0.75, 1.9);
    this.smoke.visible = false;
    this.group.add(this.smoke);

    this.underglow = new THREE.Mesh(
      new THREE.PlaneGeometry(2.2, 4.1),
      new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide,
        depthWrite: false
      })
    );
    this.underglow.rotation.x = -Math.PI / 2;
    this.underglow.position.y = 0.06;
    this.underglow.visible = false;
    this.group.add(this.underglow);
  }

  public get collisionRadius() {
    return this.rules.collisionRadius;
  }

  public update(
    input: { throttle: number; brake: number; steer: number; handbrake: boolean },
    colliders: CollisionBox[],
    dt: number,
    otherVehicles: Vehicle[] = []
  ) {
    this.previousPosition.copy(this.position);
    this.previousHeading = this.heading;
    this.collisionCooldown = Math.max(0, this.collisionCooldown - dt);

    // 1. Steering with speed sensitivity
    const speedRatio = Math.min(1, Math.abs(this.speed) / this.config.maxSpeed);
    const tireGrip = this.getTireGrip() * getTerrainGrip(this.position.x, this.position.z);
    const steerFactor = 1.0 - speedRatio * (1 - this.rules.highSpeedSteering);
    const tireCondition = this.tireHealth.reduce((sum, health) => sum + health, 0) /
      Math.max(1, this.tireHealth.length) / 100;
    const targetSteer = input.steer * this.config.steerAngleMax * steerFactor *
      THREE.MathUtils.lerp(0.55, 1, tireCondition);
    this.steerAngle += (targetSteer - this.steerAngle) *
      Math.min(1.0, dt * this.rules.steeringResponse * this.config.handling);

    // The steering knuckle pivots around the wheel hub; the nested axle spins independently.
    this.rig.frontLeftWheel.rotation.y = this.steerAngle;
    this.rig.frontRightWheel.rotation.y = this.steerAngle;

    // 2. Engine force, tire grip, braking and aerodynamic drag.
    const massFactor = THREE.MathUtils.clamp(Math.sqrt(1600 / this.rules.massKg), 0.78, 1.28);
    const downforceGrip = 1 + speedRatio * 0.2;

    if (this.isParked || this.isDestroyed) {
      this.speed = 0;
    } else if (input.throttle > 0 && this.fuel > 0) {
      if (this.speed < -0.5) {
        // Reverse braking
        this.speed += this.config.brakeForce * dt;
      } else {
        // Accelerate forward
        const accel = this.config.acceleration * massFactor * tireGrip * downforceGrip *
          (1.0 - speedRatio * 0.7);
        this.speed = Math.min(this.config.maxSpeed, this.speed + accel * input.throttle * dt);
        // Burn fuel & increase engine temp slightly
        this.fuel = Math.max(0, this.fuel - (0.03 + (this.rpm / 6500) * 0.08) * this.rules.fuelMultiplier * dt);
        this.engineTemp = Math.min(225, this.engineTemp + 0.4 * dt);
      }
    } else if (input.brake > 0) {
      if (this.speed > 0.5) {
        const absPulse = speedRatio > 0.12
          ? 0.92 + Math.sin(performance.now() * 0.11) * 0.08
          : 1;
        const braking = this.config.brakeForce * this.rules.brakeMultiplier *
          input.brake * absPulse * THREE.MathUtils.lerp(0.45, 1, tireGrip);
        this.speed = Math.max(0, this.speed - braking * dt);
      } else if (this.fuel > 0) {
        // Reverse gear
        const reverseMax = this.config.maxSpeed * 0.35;
        this.speed = Math.max(-reverseMax, this.speed - this.config.acceleration * 0.6 * dt);
        this.fuel = Math.max(0, this.fuel - 0.02 * dt);
      }
    } else {
      // Natural rolling friction & air drag
      const drag = this.rules.rollingResistance + Math.abs(this.speed) * 0.15 +
        this.speed * this.speed * 0.001;
      if (this.speed > 0) this.speed = Math.max(0, this.speed - drag * dt);
      else if (this.speed < 0) this.speed = Math.min(0, this.speed + drag * dt);
      // Engine temp slowly normalizes to 195
      this.engineTemp += (195 - this.engineTemp) * Math.min(1.0, dt * 0.1);
    }

    // Accumulate odometer
    this.odometer += (Math.abs(this.speed * 2.237) / 3600) * dt;

    // 3. Handbrake releases rear grip for a controlled drift.
    if (input.handbrake) {
      this.speed *= Math.max(0, 1.0 - dt * 2.2 * this.rules.driftGrip);
      if (Math.abs(this.speed) > 6 && Math.abs(this.steerAngle) > 0.1) {
        // Oversteer drift turn
        this.heading += this.steerAngle * dt * 2.8 * this.rules.driftGrip * Math.sign(this.speed);
        if (this.isPlayerDriving) {
          audioManager.playTireSkid(0.8);
        }
      }
    } else if (Math.abs(this.speed) > 0.2) {
      // Normal turning
      const turnRate = (this.speed / 2.7) * Math.tan(this.steerAngle) * Math.min(1, tireGrip);
      const espCorrection = THREE.MathUtils.clamp(turnRate * speedRatio * 0.035, -0.035, 0.035);
      this.heading += (turnRate - espCorrection) * dt;
    }

    if (this.isParked) {
      this.speed = 0;
      this.steerAngle = 0;
    }

    const speedLimit = Math.max(14, this.config.maxSpeed * 1.35);
    this.speed = THREE.MathUtils.clamp(this.speed, -speedLimit, speedLimit);
    if (!Number.isFinite(this.speed)) {
      this.speed = 0;
    }

    this.group.rotation.y = this.heading;

    // 4. Update velocity and position
    const forwardVec = new THREE.Vector3(Math.sin(this.heading), 0, Math.cos(this.heading));
    this.velocity.copy(forwardVec).multiplyScalar(this.speed);
    const nextX = this.isParked
      ? this.position.x
      : THREE.MathUtils.clamp(this.position.x + this.velocity.x * dt, -WORLD_RADIUS + 8, WORLD_RADIUS - 8);
    const nextZ = this.isParked
      ? this.position.z
      : THREE.MathUtils.clamp(this.position.z + this.velocity.z * dt, -WORLD_RADIUS + 8, WORLD_RADIUS - 8);

    // Collision check against city buildings & obstacles
    const carRadius = this.rules.collisionRadius;
    let collided = false;

    for (const other of otherVehicles) {
      if (this.isParked) break;
      if (other === this || other.isDestroyed) continue;
      const minDistance = (carRadius + other.rules.collisionRadius) * 0.98;
      const dx = nextX - other.position.x;
      const dz = nextZ - other.position.z;
      const distance = Math.hypot(dx, dz);
      if (distance >= minDistance) continue;

      collided = true;
      if (this.isTraffic && other.isTraffic) {
        let normalX = distance > 0.001 ? dx / distance : Math.cos(this.heading);
        let normalZ = distance > 0.001 ? dz / distance : -Math.sin(this.heading);
        const normalLength = Math.hypot(normalX, normalZ) || 1;
        normalX /= normalLength;
        normalZ /= normalLength;
        this.position.x = other.position.x + normalX * minDistance;
        this.position.z = other.position.z + normalZ * minDistance;
        this.speed = 0;
        break;
      }
      let fallbackX = Math.sin(this.heading) - Math.sin(other.heading);
      let fallbackZ = Math.cos(this.heading) - Math.cos(other.heading);
      let fallbackLength = Math.hypot(fallbackX, fallbackZ);
      if (fallbackLength < 0.001) {
        fallbackX = Math.cos(this.heading);
        fallbackZ = -Math.sin(this.heading);
        fallbackLength = 1;
      }
      const normalX = distance > 0.001 ? dx / distance : fallbackX / fallbackLength;
      const normalZ = distance > 0.001 ? dz / distance : fallbackZ / fallbackLength;
      this.position.x = other.position.x + normalX * minDistance;
      this.position.z = other.position.z + normalZ * minDistance;

      if (this.collisionCooldown === 0 && other.collisionCooldown === 0) {
        const impactSpeed = Math.abs(this.speed - other.speed);
        const impactRatio = impactSpeed / Math.max(this.config.maxSpeed, other.config.maxSpeed);
        audioManager.playCrash(impactRatio);
        if (!this.isTraffic || this.isPlayerDriving) this.applyDamage(impactRatio * 35);
        if (!other.isTraffic || other.isPlayerDriving) other.applyDamage(impactRatio * 22);
        this.collisionCooldown = 0.65;
        other.collisionCooldown = 0.65;
      }

      this.speed = this.isTraffic && !this.isPlayerDriving ? 0 : -this.speed * 0.2;
      break;
    }

    for (const col of colliders) {
      if (this.isParked) break;
      if (collided) break;
      if (
        nextX + carRadius > col.minX &&
        nextX - carRadius < col.maxX &&
        nextZ + carRadius > col.minZ &&
        nextZ - carRadius < col.maxZ
      ) {
        collided = true;
        if (this.isTraffic && !this.isPlayerDriving) {
          this.speed = 0;
        } else if (Math.abs(this.speed) > 4) {
          // Player-driven impacts remain damaging; traffic should stop instead of bouncing into obstacles.
          const impact = Math.abs(this.speed) / this.config.maxSpeed;
          audioManager.playCrash(impact);
          this.applyDamage(impact * 25);
          this.speed = -this.speed * 0.35;
        } else {
          this.speed = -this.speed * 0.35;
        }

        break;
      }
    }

    if (!collided) {
      this.position.x = nextX;
      this.position.z = nextZ;
    }

    this.position.y = getTerrainHeight(this.position.x, this.position.z);
    const forwardX = Math.sin(this.heading);
    const forwardZ = Math.cos(this.heading);
    const rightX = Math.cos(this.heading);
    const rightZ = -Math.sin(this.heading);
    const terrainSampleDistance = Math.max(2.4, this.rules.collisionRadius * 1.1);
    const groundAhead = getTerrainHeight(
      this.position.x + forwardX * terrainSampleDistance,
      this.position.z + forwardZ * terrainSampleDistance
    );
    const groundBehind = getTerrainHeight(
      this.position.x - forwardX * terrainSampleDistance,
      this.position.z - forwardZ * terrainSampleDistance
    );
    const groundLeft = getTerrainHeight(
      this.position.x - rightX * terrainSampleDistance,
      this.position.z - rightZ * terrainSampleDistance
    );
    const groundRight = getTerrainHeight(
      this.position.x + rightX * terrainSampleDistance,
      this.position.z + rightZ * terrainSampleDistance
    );
    const terrainBlend = Math.min(1, dt * 9);
    this.terrainPitch += (
      Math.atan2(groundAhead - groundBehind, terrainSampleDistance * 2) - this.terrainPitch
    ) * terrainBlend;
    this.terrainRoll += (
      Math.atan2(groundLeft - groundRight, terrainSampleDistance * 2) - this.terrainRoll
    ) * terrainBlend;
    this.group.rotation.x = this.terrainPitch;
    this.group.rotation.z = this.terrainRoll;

    // 5. Per-wheel suspension, tire temperature/wear and independent wheel spin.
    this.wheelSpinAngle += (this.speed / this.rules.wheelRadius) * dt;
    let suspensionAverage = 0;
    let leftCompression = 0;
    let rightCompression = 0;
    for (let i = 0; i < this.rig.wheels.length; i++) {
      const wheel = this.rig.wheels[i];
      const isFront = wheel.userData.frontAxle as boolean;
      const side = wheel.userData.side as number;
      const longitudinalLoad = input.brake > 0
        ? (isFront ? input.brake : -input.brake) * 0.45
        : input.throttle > 0 ? (isFront ? -0.2 : 0.2) : 0;
      const lateralLoad = this.steerAngle * speedRatio * side * 0.24;
      const targetCompression = THREE.MathUtils.clamp(
        (longitudinalLoad + lateralLoad) * this.rules.suspensionTravel,
        -this.rules.suspensionTravel * 0.55,
        this.rules.suspensionTravel
      );
      const springForce = (targetCompression - this.wheelSuspensionOffsets[i]) * 85;
      const damperForce = this.wheelSuspensionVelocities[i] * 16;
      this.wheelSuspensionVelocities[i] += (springForce - damperForce) * dt;
      this.wheelSuspensionOffsets[i] += this.wheelSuspensionVelocities[i] * dt;
      wheel.position.y = (wheel.userData.baseRideHeight as number) - this.wheelSuspensionOffsets[i];
      suspensionAverage += this.wheelSuspensionOffsets[i];
      if (side < 0) leftCompression += this.wheelSuspensionOffsets[i];
      else rightCompression += this.wheelSuspensionOffsets[i];

      const rearHandbrake = input.handbrake && !isFront;
      const wheelSpin = this.wheelSpinAngle * (rearHandbrake ? 1.25 : 1);
      const axle = wheel.children[0];
      if (axle) axle.rotation.x = wheelSpin;

      const tireWork = Math.abs(this.speed) / Math.max(1, this.config.maxSpeed) *
        (0.6 + input.brake * 1.4 + (rearHandbrake ? 2 : 0));
      this.tireTemperatures[i] = THREE.MathUtils.clamp(
        this.tireTemperatures[i] + (tireWork - (this.tireTemperatures[i] - 24) * 0.015) * dt,
        20,
        150
      );
      this.tireWear[i] = Math.min(1, this.tireWear[i] + tireWork * dt * 0.0000015);
    }

    // 6. Anti-roll response and sprung body roll/pitch.
    const targetRoll = -this.steerAngle * (this.speed / this.config.maxSpeed) * 0.18 * this.rules.suspension;
    const targetPitch = input.brake > 0 ? 0.08 * this.rules.suspension : input.throttle > 0 ? -0.05 * this.rules.suspension : 0;
    const antiRoll = (rightCompression - leftCompression) /
      Math.max(1, this.rig.wheels.length / 2) * 0.18;
    this.bodyRoll += (targetRoll - antiRoll - this.bodyRoll) * Math.min(1.0, dt * 8);
    this.bodyPitch += (targetPitch - suspensionAverage / Math.max(1, this.rig.wheels.length) * 0.12 - this.bodyPitch) *
      Math.min(1.0, dt * 8);
    this.rig.body.position.y = suspensionAverage / Math.max(1, this.rig.wheels.length) * 0.25;
    this.rig.body.rotation.z = this.bodyRoll;
    this.rig.body.rotation.x = this.bodyPitch;
    this.rig.animate?.(dt, this.speed, input);
    if (this.rig.steeringWheel) {
      this.rig.steeringWheel.rotation.z = -this.steerAngle * 2.2;
    }
    if (this.rig.speedNeedle) {
      const speedRatio = THREE.MathUtils.clamp(Math.abs(this.speed) / this.config.maxSpeed, 0, 1);
      this.rig.speedNeedle.rotation.z = THREE.MathUtils.lerp(-2.35, 2.35, speedRatio);
    }
    if (this.rig.rpmNeedle) {
      const rpmRatio = THREE.MathUtils.clamp((this.rpm - 1000) / 6500, 0, 1);
      this.rig.rpmNeedle.rotation.z = THREE.MathUtils.lerp(-2.35, 2.35, rpmRatio);
    }

    // 7. Brake Lights & Taillights
    const isBraking = (input.brake > 0 && this.speed > 0.5) || input.handbrake;
    for (const tl of this.rig.taillights) {
      const mat = tl.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = isBraking ? 2.5 : 0.6;
    }

    // 8. Police Lightbar Strobe
    if (this.config.type === 'police' && this.rig.sirenMeshes) {
      this.sirenFlashTimer += dt * 8;
      const flash = Math.sin(this.sirenFlashTimer) > 0;
      (this.rig.sirenMeshes.red.material as THREE.MeshStandardMaterial).emissiveIntensity = flash ? 3.0 : 0.2;
      (this.rig.sirenMeshes.blue.material as THREE.MeshStandardMaterial).emissiveIntensity = flash ? 0.2 : 3.0;
    }

    // 9. Animate Car Doors
    this.leftDoorAngle = THREE.MathUtils.lerp(this.leftDoorAngle, this.targetLeftDoorAngle, Math.min(1.0, dt * 8));
    this.rightDoorAngle = THREE.MathUtils.lerp(this.rightDoorAngle, this.targetRightDoorAngle, Math.min(1.0, dt * 8));
    if (this.rig.leftDoorPivot) {
      this.rig.leftDoorPivot.rotation.y = -this.leftDoorAngle;
    }
    if (this.rig.rightDoorPivot) {
      this.rig.rightDoorPivot.rotation.y = this.rightDoorAngle;
    }

    // 10. Engine RPM & Transmission calculation
    this.calculateTransmission();

    // 11. Update Audio if player is driving
    if (this.isPlayerDriving) {
      const rpmRatio = (this.rpm - 1000) / 6500;
      audioManager.updateEngine(rpmRatio, input.throttle > 0);
    }
    this.group.position.copy(this.position);
  }

  public setRenderAlpha(alpha: number) {
    this.group.position.lerpVectors(this.previousPosition, this.position, alpha);
    const headingDelta = Math.atan2(
      Math.sin(this.heading - this.previousHeading),
      Math.cos(this.heading - this.previousHeading)
    );
    this.group.rotation.y = this.previousHeading + headingDelta * alpha;
  }

  private getTireGrip() {
    if (this.rig.wheels.length === 0) return 1;
    let grip = 0;
    for (let i = 0; i < this.rig.wheels.length; i++) {
      const temperatureGrip = THREE.MathUtils.clamp(1 - Math.abs(this.tireTemperatures[i] - 72) / 115, 0.68, 1);
      const wearGrip = 1 - this.tireWear[i] * 0.28;
      const punctureGrip = THREE.MathUtils.lerp(0.45, 1, this.tireHealth[i] / 100);
      grip += temperatureGrip * wearGrip * punctureGrip;
    }
    return this.rules.tireGrip * grip / this.rig.wheels.length;
  }

  public applyDamage(amount: number) {
    if (this.isDestroyed || amount <= 0) return;
    this.health = Math.max(0, this.health - amount);
    if (amount >= 16 && this.tireHealth.length > 0) {
      const damagedWheelIndex = this.tireHealth.indexOf(Math.min(...this.tireHealth));
      this.tireHealth[damagedWheelIndex] = Math.max(0, this.tireHealth[damagedWheelIndex] - amount * 0.8);
      const tire = this.rig.wheels[damagedWheelIndex]?.children[0]?.children[0] as THREE.Mesh | undefined;
      if (tire) {
        const tireCondition = this.tireHealth[damagedWheelIndex] / 100;
        tire.scale.set(1, 0.65 + tireCondition * 0.35, 0.65 + tireCondition * 0.35);
      }
    }
    if (this.health === 0) {
      this.isDestroyed = true;
      this.speed = 0;
      this.explosionClock = 0;
      this.fireClock = 0;
      for (const state of this.paintMaterialStates) {
        state.material.color.setRGB(0.055, 0.055, 0.055);
        state.material.roughness = 0.94;
        state.material.metalness = 0.04;
      }
      for (const wheel of this.rig.wheels) this.spawnDebris(wheel, 5);
      for (const mirror of this.rig.damageParts.mirrors) this.spawnDebris(mirror, 3.2);
      for (const window of this.rig.damageParts.windows.slice(0, 4)) this.spawnDebris(window, 2.4);
      this.createFire();
      (this.smoke.material as THREE.PointsMaterial).color.setHex(0x252321);
      const material = new THREE.MeshBasicMaterial({
        color: 0xff7a1a,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      this.explosionMesh = new THREE.Mesh(new THREE.SphereGeometry(0.7, 12, 8), material);
      this.explosionMesh.position.set(0, 0.8, 0);
      this.group.add(this.explosionMesh);
      audioManager.playHeavyCrash();
    }
  }

  public updateDamageEffects(dt: number) {
    this.smoke.visible = this.health < this.config.healthMax * 0.65 &&
      (!this.isDestroyed || this.fireClock < this.fireDuration);
    if (this.smoke.visible) {
      this.smokeClock += dt;
      for (let i = 0; i < this.smokePositions.length; i += 3) {
        const phase = (this.smokeClock * 0.7 + i * 0.08) % 2.4;
        this.smokePositions[i] = Math.sin(this.smokeClock * 1.7 + i) * 0.3;
        this.smokePositions[i + 1] = phase;
        this.smokePositions[i + 2] = Math.cos(this.smokeClock * 1.3 + i) * 0.2;
      }
      this.smoke.geometry.attributes.position.needsUpdate = true;
      const smokeMaterial = this.smoke.material as THREE.PointsMaterial;
      const baseOpacity = this.health < this.config.healthMax * 0.3 ? 0.65 : 0.3;
      smokeMaterial.opacity = this.isDestroyed
        ? baseOpacity * Math.max(0, 1 - this.fireClock / this.fireDuration)
        : baseOpacity;
    }

    for (let index = this.debris.length - 1; index >= 0; index--) {
      const part = this.debris[index];
      part.lifetime -= dt;
      part.velocity.y -= 9.8 * dt;
      part.object.position.addScaledVector(part.velocity, dt);
      part.object.rotation.x += part.angularVelocity.x * dt;
      part.object.rotation.y += part.angularVelocity.y * dt;
      part.object.rotation.z += part.angularVelocity.z * dt;
      if (part.object.position.y < part.groundY) {
        part.object.position.y = part.groundY;
        part.velocity.y = Math.abs(part.velocity.y) > 1
          ? -part.velocity.y * 0.24
          : 0;
        part.velocity.x *= 0.62;
        part.velocity.z *= 0.62;
      }
      if (part.lifetime <= 0) {
        part.object.parent?.remove(part.object);
        this.debris.splice(index, 1);
      }
    }

    if (this.fire) {
      this.fireClock += dt;
      const positions = this.fire.geometry.attributes.position.array as Float32Array;
      for (let index = 0; index < positions.length; index += 3) {
        const particle = index / 3;
        const phase = (this.fireClock * 1.4 + particle * 0.31) % 1;
        positions[index] = Math.sin(this.fireClock * 3.2 + particle * 1.7) * (0.18 + phase * 0.2);
        positions[index + 1] = phase * 2.1;
        positions[index + 2] = Math.cos(this.fireClock * 2.7 + particle * 1.3) * 0.2;
      }
      this.fire.geometry.attributes.position.needsUpdate = true;
      (this.fire.material as THREE.PointsMaterial).opacity = Math.min(
        1,
        Math.max(0, (this.fireDuration - this.fireClock) / 30)
      );
      if (this.fireClock >= this.fireDuration) {
        this.group.remove(this.fire);
        this.fire.geometry.dispose();
        (this.fire.material as THREE.Material).dispose();
        this.fire = null;
      }
    }

    if (this.explosionMesh) {
      this.explosionClock += dt;
      const progress = Math.min(1, this.explosionClock / 0.7);
      this.explosionMesh.scale.setScalar(1 + progress * 5);
      (this.explosionMesh.material as THREE.MeshBasicMaterial).opacity = 0.9 * (1 - progress);
      if (progress === 1) {
        this.group.remove(this.explosionMesh);
        this.explosionMesh.geometry.dispose();
        (this.explosionMesh.material as THREE.Material).dispose();
        this.explosionMesh = null;
      }
    }
  }

  public openDoor(side: 'left' | 'right' = 'left') {
    if (side === 'left') {
      this.targetLeftDoorAngle = 1.25; // ~72 degrees
    } else {
      this.targetRightDoorAngle = 1.25;
    }
    audioManager.playDoorOpen();
  }

  public closeDoor(side: 'left' | 'right' = 'left') {
    if (side === 'left') {
      this.targetLeftDoorAngle = 0;
    } else {
      this.targetRightDoorAngle = 0;
    }
    audioManager.playDoorClose();
  }

  private calculateTransmission() {
    const absSpeed = Math.abs(this.speed);
    const maxSpd = this.config.maxSpeed;

    if (absSpeed < 0.1) {
      this.currentGear = 1;
      this.rpm = 1000;
      return;
    }

    // 5 forward gears
    const gearRatios = [0, 0.2, 0.42, 0.65, 0.85, 1.0];
    let gear = 1;
    for (let i = 1; i < gearRatios.length; i++) {
      if (absSpeed / maxSpd > gearRatios[i]) {
        gear = i + 1;
      }
    }
    this.currentGear = Math.min(5, gear);

    const prevThreshold = (gearRatios[this.currentGear - 1] || 0) * maxSpd;
    const nextThreshold = (gearRatios[this.currentGear] || 1) * maxSpd;
    const gearProgress = (absSpeed - prevThreshold) / Math.max(1, nextThreshold - prevThreshold);
    this.rpm = 1200 + Math.min(6300, gearProgress * 5500);
  }

  public repair(colorHex?: number) {
    this.health = this.config.healthMax;
    this.isDestroyed = false;
    this.clearDamageEffects();
    this.config.colorHex = colorHex ?? this.config.colorHex;
    for (const state of this.paintMaterialStates) {
      state.material.color.copy(state.color);
      state.material.roughness = state.roughness;
      state.material.metalness = state.metalness;
    }
    if (colorHex !== undefined) {
      this.rig.body.traverse((child) => {
        if (!(child instanceof THREE.Mesh)) return;
        const material = child.material;
        if (Array.isArray(material)) {
          for (const entry of material) {
            if (entry instanceof THREE.MeshStandardMaterial || entry instanceof THREE.MeshPhysicalMaterial) {
              entry.color.setHex(colorHex);
            }
          }
          return;
        }
        if (
          (material instanceof THREE.MeshStandardMaterial || material instanceof THREE.MeshPhysicalMaterial) &&
          child.userData.paintable === true
        ) {
          material.color.setHex(colorHex);
        }
      });
      for (const state of this.paintMaterialStates) {
        state.color.copy(state.material.color);
      }
    }
    this.tireHealth.fill(100);
    this.tireWear.fill(0);
    for (const wheel of this.rig.wheels) {
      const tire = wheel.children[0]?.children[0] as THREE.Mesh | undefined;
      if (tire) tire.scale.set(1, 1, 1);
    }
    (this.smoke.material as THREE.PointsMaterial).color.setHex(0x55585b);
    (this.smoke.material as THREE.PointsMaterial).opacity = 0.35;
    this.smoke.visible = false;
    this.smokeClock = 0;
    this.explosionClock = 0;
    this.fireClock = 0;
  }

  public getInteriorCameraPosition() {
    return this.rig.body.localToWorld(this.rig.interiorCameraPosition.clone());
  }

  private spawnDebris(source: THREE.Object3D, intensity: number) {
    const parent = source.parent;
    if (!parent || !source.visible) return;
    const object = source.clone(true);
    parent.add(object);
    source.visible = false;
    this.hiddenDamageParts.push(source);
    this.debris.push({
      object,
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * intensity,
        1.8 + Math.random() * intensity * 0.55,
        (Math.random() - 0.5) * intensity
      ),
      angularVelocity: new THREE.Vector3(
        (Math.random() - 0.5) * 12,
        (Math.random() - 0.5) * 12,
        (Math.random() - 0.5) * 12
      ),
      groundY: typeof source.userData.baseRideHeight === 'number'
        ? source.userData.baseRideHeight
        : 0.12,
      lifetime: typeof source.userData.baseRideHeight === 'number'
        ? 6 + Math.random() * 2
        : source.name === 'vehicle-window'
          ? 3.5 + Math.random() * 1.5
          : 4 + Math.random() * 2
    });
  }

  private createFire() {
    const particleCount = 14;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    for (let index = 0; index < particleCount; index++) {
      const color = new THREE.Color().setHSL(0.035 + (index % 4) * 0.018, 1, 0.5 + (index % 3) * 0.12);
      color.toArray(colors, index * 3);
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 1, 0), 3.5);
    this.fire = new THREE.Points(
      geometry,
      new THREE.PointsMaterial({
        size: 0.9,
        vertexColors: true,
        transparent: true,
        opacity: 1,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        sizeAttenuation: true
      })
    );
    this.fire.position.set(0, 0.75, 0.3);
    this.group.add(this.fire);
  }

  private clearDamageEffects() {
    if (this.explosionMesh) {
      this.group.remove(this.explosionMesh);
      this.explosionMesh.geometry.dispose();
      (this.explosionMesh.material as THREE.Material).dispose();
      this.explosionMesh = null;
    }
    if (this.fire) {
      this.group.remove(this.fire);
      this.fire.geometry.dispose();
      (this.fire.material as THREE.Material).dispose();
      this.fire = null;
    }
    for (const part of this.debris) part.object.parent?.remove(part.object);
    this.debris.length = 0;
    for (const original of this.hiddenDamageParts) original.visible = true;
    this.hiddenDamageParts.length = 0;
  }

  public refuel() {
    this.fuel = 100;
  }

  public applyCustomization(updates: {
    colorHex?: number;
    turbo?: boolean;
    turboLevel?: number;
    neonUnderglow?: boolean;
    neonColor?: number;
  }) {
    if (updates.colorHex !== undefined) {
      this.repair(updates.colorHex);
    }
    if (updates.turbo !== undefined || updates.turboLevel !== undefined) {
      const tuned = updates.turboLevel !== undefined ? updates.turboLevel > 0 : updates.turbo;
      this.config.acceleration = this.baseAcceleration * (tuned ? 1.22 : 1);
      this.config.maxSpeed = this.baseMaxSpeed * (tuned ? 1.12 : 1);
    }
    if (updates.neonColor !== undefined) {
      (this.underglow.material as THREE.MeshBasicMaterial).color.setHex(updates.neonColor);
    }
    if (updates.neonUnderglow !== undefined) {
      this.underglow.visible = updates.neonUnderglow;
    }
  }
}
