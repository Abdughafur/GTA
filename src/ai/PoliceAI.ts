import * as THREE from 'three';
import { Vehicle, VehicleConfig } from '../vehicles/Vehicle';
import { CollisionBox } from '../world/CityGenerator';
import { CollisionGrid } from '../world/CollisionGrid';
import { audioManager } from '../core/AudioManager';
import { useGameStore } from '../core/gameState';
import { CharacterRig, modelFactory } from '../world/ModelFactory';

const POLICE_WEAPON_RANGE = 30;

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
  private gunMesh: THREE.Group;
  private flashLight: THREE.PointLight;
  private muzzleFlash: THREE.Mesh;
  private muzzleFlashTimer = 0;

  constructor(startPos: THREE.Vector3) {
    this.rig = modelFactory.createCharacter(0x172b46, 0xf6d8ae, {
      pantsColor: 0x0f172a,
      shoesColor: 0x09090b,
      hairColor: 0x18181b,
      glasses: false,
      hat: false,
      hairStyle: 4,
      watch: true
    });
    this.group = this.rig.group;
    this.position = this.group.position;
    this.position.copy(startPos);
    this.group.visible = false;

    const uniformTrim = new THREE.MeshStandardMaterial({ color: 0x0b1728, roughness: 0.72 });
    const badgeMaterial = new THREE.MeshStandardMaterial({ color: 0xd6b85d, metalness: 0.72, roughness: 0.3 });
    const patchMaterial = new THREE.MeshStandardMaterial({ color: 0x263e5c, roughness: 0.75 });
    const belt = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.09, 0.3), uniformTrim);
    belt.position.set(0, 0.99, 0);
    this.group.add(belt);

    const vest = new THREE.Mesh(
      new THREE.BoxGeometry(0.38, 0.4, 0.035),
      new THREE.MeshStandardMaterial({ color: 0x203754, roughness: 0.8 })
    );
    vest.position.set(0, 1.35, 0.155);
    this.group.add(vest);

    const tie = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.22, 0.025), uniformTrim);
    tie.position.set(0, 1.48, 0.18);
    this.group.add(tie);

    const badge = new THREE.Mesh(new THREE.CircleGeometry(0.065, 6), badgeMaterial);
    badge.position.set(-0.115, 1.47, 0.181);
    this.group.add(badge);

    for (const side of [-1, 1]) {
      const shoulderPatch = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 0.16), patchMaterial);
      shoulderPatch.position.set(side * 0.32, 1.51, 0.005);
      this.group.add(shoulderPatch);

      const beltPouch = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.13, 0.12), uniformTrim);
      beltPouch.position.set(side * 0.25, 0.98, 0.04);
      this.group.add(beltPouch);
    }

    const radio = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.17, 0.07), uniformTrim);
    radio.position.set(-0.25, 1.56, 0.02);
    this.group.add(radio);

    const capMaterial = new THREE.MeshStandardMaterial({ color: 0x101e32, roughness: 0.68 });
    const cap = new THREE.Group();
    const crown = new THREE.Mesh(new THREE.SphereGeometry(0.19, 12, 8), capMaterial);
    crown.scale.set(1, 0.45, 1);
    crown.position.y = 1.94;
    const brim = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.035, 0.25), capMaterial);
    brim.position.set(0, 1.91, 0.13);
    const capBadge = new THREE.Mesh(new THREE.CircleGeometry(0.045, 6), badgeMaterial);
    capBadge.position.set(0, 1.94, 0.188);
    cap.add(crown, brim, capBadge);
    this.group.add(cap);

    const gunMat = new THREE.MeshStandardMaterial({ color: 0x111820, metalness: 0.82, roughness: 0.24 });
    this.gunMesh = new THREE.Group();
    const slide = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.075, 0.22), gunMat);
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.14, 0.075), uniformTrim);
    grip.position.set(0, -0.09, -0.025);
    grip.rotation.x = -0.16;
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.11, 8), gunMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.z = 0.14;
    this.gunMesh.add(slide, grip, barrel);
    this.gunMesh.position.set(0, -0.42, 0.1);
    this.gunMesh.rotation.x = Math.PI / 2;
    this.rig.rightArm.add(this.gunMesh);

    const flashMaterial = new THREE.MeshBasicMaterial({
      color: 0xffe18a,
      transparent: true,
      opacity: 0.95,
      depthWrite: false
    });
    this.muzzleFlash = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), flashMaterial);
    this.muzzleFlash.position.set(0, 0, 0.22);
    this.muzzleFlash.scale.set(0.7, 0.7, 2.4);
    this.muzzleFlash.visible = false;
    this.gunMesh.add(this.muzzleFlash);

    this.flashLight = new THREE.PointLight(0xffc45c, 0, 4, 2);
    this.flashLight.position.copy(this.muzzleFlash.position);
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

    this.muzzleFlashTimer = Math.max(0, this.muzzleFlashTimer - dt);
    this.muzzleFlash.visible = this.muzzleFlashTimer > 0;
    this.flashLight.intensity = this.muzzleFlashTimer > 0 ? 3.5 : 0;

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
    if (this.shootTimer <= 0 && dist <= POLICE_WEAPON_RANGE) {
      this.shootTimer = 1.4 + Math.random() * 1.2;
      this.fireWeapon(playerPos, onShootPlayer);
    }
  }

  private fireWeapon(playerPos: THREE.Vector3, onShootPlayer: (from: THREE.Vector3) => void) {
    audioManager.playPistolShot();
    this.muzzleFlashTimer = 0.075;
    this.muzzleFlash.visible = true;
    this.flashLight.intensity = 3.5;

    const muzzleWorld = new THREE.Vector3();
    this.muzzleFlash.getWorldPosition(muzzleWorld);
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
    if (!this.vehicle.isPlayerDriving && !this.hasDeployedOfficers && distToPlayer < 18) {
      this.hasDeployedOfficers = true;
      this.vehicle.speed = 0;
      this.vehicle.velocity.set(0, 0, 0);
      this.vehicle.isParked = true;
      this.vehicle.openDoor('left');
      this.vehicle.openDoor('right');
      this.officersExitDelay = 0.55;
    }

    if (!this.hasDeployedOfficers) {
      if (this.vehicle.isPlayerDriving) return;
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
      if (!this.vehicle.isPlayerDriving) {
        this.vehicle.update({ throttle: 0, brake: 1.0, steer: 0, handbrake: true }, colliders, dt, otherVehicles);
      }

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
  private scene: THREE.Scene;
  private collisionGrid: CollisionGrid;
  private lastWantedLevel = 0;
  private heatTimer = 0;

  constructor(scene: THREE.Scene, collisionGrid: CollisionGrid) {
    this.scene = scene;
    this.collisionGrid = collisionGrid;
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
      const removableIndex = this.cruisers.findIndex((cruiser) => !cruiser.vehicle.isPlayerDriving);
      if (removableIndex < 0) break;
      const [removed] = this.cruisers.splice(removableIndex, 1);
      removed.cleanup(this.scene);
    }

    if (wantedLevel === 0) return;

    // Callback when police officer shoots at player
    const handleOfficerShot = (fromPos: THREE.Vector3) => {
      const dist = fromPos.distanceTo(playerPos);
      if (dist > POLICE_WEAPON_RANGE) return;
      const hitProb = Math.max(0.08, 0.72 - (dist / POLICE_WEAPON_RANGE) * 0.58);
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
      cruiser.update(
        playerPos,
        isPlayerInVehicle,
        this.collisionGrid.getNearby(cruiser.vehicle.position.x, cruiser.vehicle.position.z, 60),
        dt,
        handleOfficerShot,
        [...otherPoliceVehicles, ...otherVehicles]
      );
      const d = cruiser.vehicle.position.distanceTo(playerPos);
      if (d < minCruiserDist) minCruiserDist = d;
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
    audioManager.setSiren(false);
  }
}
