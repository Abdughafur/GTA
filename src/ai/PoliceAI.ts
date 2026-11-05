import * as THREE from 'three';
import { Vehicle, VehicleConfig } from '../vehicles/Vehicle';
import { CollisionBox } from '../world/CityGenerator';
import { audioManager } from '../core/AudioManager';
import { useGameStore } from '../core/gameState';
import { CharacterRig, modelFactory } from '../world/ModelFactory';

export class PoliceOfficer {
  public group: THREE.Group;
  public rig: CharacterRig;
  public position: THREE.Vector3;
  public velocity: THREE.Vector3 = new THREE.Vector3();
  public heading = 0;
  public health = 80;
  public isDead = false;
  public isDeployed = false;
  private shootTimer = 0;
  private isUsingCover = false;
  private gunMesh: THREE.Mesh;
  private flashLight: THREE.PointLight;

  constructor(startPos: THREE.Vector3) {
    // Navy blue uniform (0x1e3a8a) with police cap
    this.rig = modelFactory.createCharacter(0x1e3a8a, 0xf6d8ae, {
      pantsColor: 0x0f172a,
      shoesColor: 0x09090b,
      hairColor: 0x18181b,
      glasses: false,
      hat: true,
      watch: true
    });
    this.group = this.rig.group;
    this.position = this.group.position;
    this.position.copy(startPos);
    this.group.visible = false;

    // Attach Police Pistol
    const gunMat = new THREE.MeshStandardMaterial({ color: 0x09090b, metalness: 0.85, roughness: 0.2 });
    this.gunMesh = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.2), gunMat);
    this.gunMesh.position.set(0, -0.42, 0.1);
    this.gunMesh.rotation.x = Math.PI / 2;
    this.rig.rightArm.add(this.gunMesh);

    // Muzzle Flash Light
    this.flashLight = new THREE.PointLight(0xf59e0b, 0, 8);
    this.flashLight.position.set(0, 0, 0.15);
    this.gunMesh.add(this.flashLight);
  }

  public deploy(spawnPos: THREE.Vector3, targetHeading: number) {
    this.position.copy(spawnPos);
    this.heading = targetHeading;
    this.group.rotation.y = this.heading;
    this.isDeployed = true;
    this.isDead = false;
    this.health = 80;
    this.group.visible = true;
    this.shootTimer = 0.5 + Math.random() * 1.0;
  }

  public takeDamage(amount: number, knockback?: THREE.Vector3): boolean {
    if (this.isDead) return false;
    this.health -= amount;

    if (knockback) {
      this.position.add(knockback);
    }
    this.position.y += 0.1;

    if (this.health <= 0) {
      this.isDead = true;
      this.group.rotation.x = Math.PI / 2; // Fall to ground
      this.group.position.y = 0.2;
      this.rig.leftArm.rotation.z = Math.PI / 2.5;
      this.rig.rightArm.rotation.z = -Math.PI / 2.5;
      audioManager.playCitizenScream(0.75);
      return true; // Dropped
    }
    return false;
  }

  public update(playerPos: THREE.Vector3, colliders: CollisionBox[], dt: number, onShootPlayer: (from: THREE.Vector3) => void) {
    if (!this.isDeployed || this.isDead) return;

    const toPlayer = new THREE.Vector3().subVectors(playerPos, this.position);
    const dist = toPlayer.length();

    // Aim heading directly at player
    this.heading = Math.atan2(toPlayer.x, toPlayer.z);
    this.group.rotation.y = this.heading;

    // Tactical combat stance: maintain 8m - 16m distance
    let moveSpeed = 0;
    this.isUsingCover = dist >= 7 && dist <= 16;
    if (dist > 18) {
      // Advance toward player
      moveSpeed = 4.2;
    } else if (dist < 7) {
      // Backpedal to safe firing distance
      moveSpeed = -3.0;
    } else {
      // Strafe slightly
      moveSpeed = 0;
    }

    if (moveSpeed !== 0) {
      this.velocity.x = Math.sin(this.heading) * moveSpeed;
      this.velocity.z = Math.cos(this.heading) * moveSpeed;
      this.position.x += this.velocity.x * dt;
      this.position.z += this.velocity.z * dt;
    }

    // Aim right arm pointing gun
    this.rig.rightArm.rotation.x = -Math.PI / 2 + 0.1;
    this.rig.rightArm.rotation.y = 0.1;
    this.group.scale.y = this.isUsingCover ? 0.78 : 1;
    this.rig.animate(Math.abs(moveSpeed) / 4.0, false, false, dt);

    // Shooting AI cycle
    this.shootTimer -= dt;
    if (this.shootTimer <= 0 && dist < 35) {
      this.shootTimer = 1.4 + Math.random() * 1.2;
      this.fireWeapon(playerPos, onShootPlayer);
    }
  }

  private fireWeapon(playerPos: THREE.Vector3, onShootPlayer: (from: THREE.Vector3) => void) {
    audioManager.playPistolShot();
    this.flashLight.intensity = 2.5;
    setTimeout(() => {
      this.flashLight.intensity = 0;
    }, 80);

    const muzzleWorld = new THREE.Vector3();
    this.gunMesh.getWorldPosition(muzzleWorld);
    onShootPlayer(muzzleWorld);
  }
}

export class PoliceAI {
  public vehicle: Vehicle;
  public officers: PoliceOfficer[] = [];
  public hasDeployedOfficers = false;
  private deployCheckTimer = 0;
  private officersExitDelay = 0;

  constructor(startPos: THREE.Vector3, scene: THREE.Scene) {
    const config: VehicleConfig = {
      name: 'VCPD Interceptor Cruiser',
      type: 'police',
      colorHex: 0x111827,
      maxSpeed: 29.0, // High-speed pursuit
      acceleration: 15.0,
      brakeForce: 26.0,
      steerAngleMax: 0.55,
      handling: 1.25,
      healthMax: 150
    };

    this.vehicle = new Vehicle(config, startPos, 0);

    // 2 Police Officers assigned to cruiser
    for (let i = 0; i < 2; i++) {
      const officer = new PoliceOfficer(startPos);
      this.officers.push(officer);
      scene.add(officer.group);
    }
  }

  public update(
    playerPos: THREE.Vector3,
    isPlayerInVehicle: boolean,
    colliders: CollisionBox[],
    dt: number,
    onShootPlayer: (from: THREE.Vector3) => void,
    otherVehicles: Vehicle[] = []
  ) {
    const toPlayer = new THREE.Vector3().subVectors(playerPos, this.vehicle.position);
    const distToPlayer = toPlayer.length();

    // Check if officers should exit car and shoot player
    this.deployCheckTimer += dt;
    if (!this.hasDeployedOfficers && distToPlayer < 18) {
      this.hasDeployedOfficers = true;
      this.vehicle.speed = 0;
      this.vehicle.openDoor('left');
      this.vehicle.openDoor('right');
      this.officersExitDelay = 0.55;
    }

    if (!this.hasDeployedOfficers) {
      // Cruiser pursuit driving
      const targetHeading = Math.atan2(toPlayer.x, toPlayer.z);
      let diff = targetHeading - this.vehicle.heading;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;

      const steer = Math.max(-1, Math.min(1, diff * 2.2));
      let throttle = distToPlayer > 8 ? 1.0 : 0.4;
      let brake = distToPlayer < 6 ? 0.8 : 0;
      let handbrake = Math.abs(diff) > 1.2 && this.vehicle.speed > 12;

      this.vehicle.update({ throttle, brake, steer, handbrake }, colliders, dt, otherVehicles);
    } else {
      // Cruiser is parked, brake held
      this.vehicle.update({ throttle: 0, brake: 1.0, steer: 0, handbrake: true }, colliders, dt, otherVehicles);

      if (this.officersExitDelay > 0) {
        this.officersExitDelay = Math.max(0, this.officersExitDelay - dt);
        if (this.officersExitDelay === 0) {
          const exitOffset = new THREE.Vector3(Math.cos(this.vehicle.heading), 0, -Math.sin(this.vehicle.heading))
            .multiplyScalar(2.2);
          this.officers[0].deploy(this.vehicle.position.clone().add(exitOffset), this.vehicle.heading);
          this.officers[1].deploy(this.vehicle.position.clone().sub(exitOffset), this.vehicle.heading);
          audioManager.playDoorSlam();
          useGameStore.getState().showNotification('VCPD: "Freeze! Drop your weapon!"');
        }
      } else {
        for (const officer of this.officers) {
          officer.update(playerPos, colliders, dt, onShootPlayer);
        }
      }
    }
  }

  public cleanup(scene: THREE.Scene) {
    scene.remove(this.vehicle.group);
    for (const officer of this.officers) {
      scene.remove(officer.group);
    }
  }
}

export class PoliceSystem {
  public cruisers: PoliceAI[] = [];
  public bulletTracers: { line: THREE.Line; age: number }[] = [];
  private scene: THREE.Scene;
  private colliders: CollisionBox[];
  private lastWantedLevel = 0;
  private heatTimer = 0;

  constructor(scene: THREE.Scene, colliders: CollisionBox[]) {
    this.scene = scene;
    this.colliders = colliders;
  }

  public update(playerPos: THREE.Vector3, isPlayerInVehicle: boolean, dt: number, otherVehicles: Vehicle[] = []) {
    const store = useGameStore.getState();
    const wantedLevel = store.wantedLevel;

    // Trigger siren sound when wanted level rises
    if (wantedLevel > 0 && this.lastWantedLevel === 0) {
      audioManager.playWantedSting();
      audioManager.setSiren(true);
    } else if (wantedLevel === 0 && this.lastWantedLevel > 0) {
      audioManager.setSiren(false);
    }
    this.lastWantedLevel = wantedLevel;

    // Adjust police cruiser fleet to match wanted level
    const targetCount = wantedLevel === 0 ? 0 : wantedLevel === 1 ? 1 : wantedLevel === 2 ? 2 : 3;

    while (this.cruisers.length < targetCount) {
      // Spawn cruiser 70-100m away from player
      const angle = Math.random() * Math.PI * 2;
      const spawnPos = new THREE.Vector3(
        playerPos.x + Math.sin(angle) * 80,
        0,
        playerPos.z + Math.cos(angle) * 80
      );
      const police = new PoliceAI(spawnPos, this.scene);
      this.cruisers.push(police);
      this.scene.add(police.vehicle.group);
    }

    while (this.cruisers.length > targetCount) {
      const removed = this.cruisers.pop();
      if (removed) {
        removed.cleanup(this.scene);
      }
    }

    if (wantedLevel === 0) return;

    // Callback when police officer shoots at player
    const handleOfficerShot = (fromPos: THREE.Vector3) => {
      // Bullet tracer from officer to player
      const tracerGeo = new THREE.BufferGeometry().setFromPoints([
        fromPos,
        playerPos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.6, 1.4, (Math.random() - 0.5) * 0.6))
      ]);
      const tracerMat = new THREE.LineBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.9 });
      const tracerLine = new THREE.Line(tracerGeo, tracerMat);
      this.scene.add(tracerLine);
      this.bulletTracers.push({ line: tracerLine, age: 0 });

      // Hit chance based on distance
      const dist = fromPos.distanceTo(playerPos);
      const hitProb = Math.max(0.2, 0.75 - (dist / 35) * 0.5);
      if (Math.random() < hitProb) {
        // Player takes bullet damage!
        store.damagePlayer(11);
        audioManager.playBulletImpact();
      }
    };

    // Update active cruisers and their deployed officers
    let minCruiserDist = 999;
    for (const cruiser of this.cruisers) {
      const otherPoliceVehicles = this.cruisers
        .filter((other) => other !== cruiser)
        .map((other) => other.vehicle);
      cruiser.update(playerPos, isPlayerInVehicle, this.colliders, dt, handleOfficerShot, [
        ...otherPoliceVehicles,
        ...otherVehicles
      ]);
      const d = cruiser.vehicle.position.distanceTo(playerPos);
      if (d < minCruiserDist) minCruiserDist = d;
    }

    // Update and fade bullet tracers
    for (let i = this.bulletTracers.length - 1; i >= 0; i--) {
      const tr = this.bulletTracers[i];
      tr.age += dt;
      if (tr.age > 0.09) {
        this.scene.remove(tr.line);
        this.bulletTracers.splice(i, 1);
      }
    }

    // Line of sight & heat cooldown
    if (minCruiserDist > 55) {
      this.heatTimer += dt;
      store.heatCooldown = Math.max(0, 15 - this.heatTimer);
      store.isEscapingHeat = true;
      if (this.heatTimer >= 15) {
        store.clearWantedLevel();
        this.heatTimer = 0;
        this.clearAll();
      }
    } else {
      this.heatTimer = 0;
      store.isEscapingHeat = false;
    }
  }

  public clearAll() {
    for (const cruiser of this.cruisers) {
      cruiser.cleanup(this.scene);
    }
    this.cruisers = [];
    for (const tr of this.bulletTracers) {
      this.scene.remove(tr.line);
    }
    this.bulletTracers = [];
    audioManager.setSiren(false);
  }
}
