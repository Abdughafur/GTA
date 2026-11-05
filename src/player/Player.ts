import * as THREE from 'three';
import { CharacterRig, modelFactory } from '../world/ModelFactory';
import { CollisionBox } from '../world/CityGenerator';
import { audioManager } from '../core/AudioManager';
import { buildingInteriors } from '../world/BuildingInteriors';
import { useGameStore, WeaponType } from '../core/gameState';

export class Player {
  public group: THREE.Group;
  public rig: CharacterRig;
  public position: THREE.Vector3;
  public velocity: THREE.Vector3 = new THREE.Vector3();
  public heading = 0; // Radians
  public isGrounded = true;
  public isSprinting = false;
  public currentVehicleIndex: number | null = null;
  public currentGroundElevation = 0;

  // Attached Weapon Meshes in Right Hand
  public weaponMeshes: Partial<Record<WeaponType, THREE.Group>> = {};
  public muzzlePoint: THREE.Vector3 = new THREE.Vector3();

  private walkSpeed = 5.2; // m/s
  private sprintSpeed = 9.8; // m/s
  private jumpForce = 8.5; // m/s
  private gravity = -24.0;
  private footstepTimer = 0;

  constructor(startPos: THREE.Vector3) {
    const store = useGameStore.getState();
    this.rig = modelFactory.createCharacter(
      store.appearance.jacketColor,
      0xf6d8ae,
      store.appearance
    );
    this.group = this.rig.group;
    this.position = this.group.position;
    this.position.copy(startPos);

    // Build & Attach 3D Weapons to Right Hand
    this.initWeapons();
  }

  private initWeapons() {
    const gunMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.3, metalness: 0.85 });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.7 });

    // 1. Pistol Mesh
    const pistol = new THREE.Group();
    const pSlide = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.22), gunMat);
    pSlide.position.set(0, 0, 0.08);
    const pGrip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.14, 0.07), gunMat);
    pGrip.position.set(0, -0.09, 0.02);
    pGrip.rotation.x = -0.2;
    pistol.add(pSlide, pGrip);
    pistol.position.set(0, -0.44, 0.12);
    pistol.rotation.x = Math.PI / 2;
    this.rig.rightArm.add(pistol);
    this.weaponMeshes.pistol = pistol;

    // Combat knife
    const knife = new THREE.Group();
    const blade = new THREE.Mesh(
      new THREE.BoxGeometry(0.035, 0.035, 0.28),
      new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.24, metalness: 0.9 })
    );
    blade.position.z = 0.18;
    const knifeHandle = new THREE.Mesh(
      new THREE.BoxGeometry(0.055, 0.07, 0.13),
      new THREE.MeshStandardMaterial({ color: 0x292524, roughness: 0.78 })
    );
    knifeHandle.position.z = -0.02;
    knife.add(blade, knifeHandle);
    knife.position.set(0, -0.44, 0.12);
    knife.rotation.x = Math.PI / 2;
    this.rig.rightArm.add(knife);
    this.weaponMeshes.knife = knife;

    // 2. SMG Mesh
    const smg = new THREE.Group();
    const smgBody = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.1, 0.34), gunMat);
    smgBody.position.set(0, 0, 0.12);
    const smgGrip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.15, 0.07), gunMat);
    smgGrip.position.set(0, -0.1, 0.04);
    smgGrip.rotation.x = -0.2;
    const smgMag = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.18, 0.06), gunMat);
    smgMag.position.set(0, -0.12, 0.18);
    smg.add(smgBody, smgGrip, smgMag);
    smg.position.set(0, -0.44, 0.12);
    smg.rotation.x = Math.PI / 2;
    this.rig.rightArm.add(smg);
    this.weaponMeshes.smg = smg;

    // 3. Rifle Mesh
    const rifle = new THREE.Group();
    const rBody = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.12, 0.55), gunMat);
    rBody.position.set(0, 0, 0.18);
    const rStock = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.22), woodMat);
    rStock.position.set(0, -0.02, -0.16);
    const rGrip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.16, 0.07), gunMat);
    rGrip.position.set(0, -0.11, 0.06);
    rGrip.rotation.x = -0.25;
    const rMag = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.22, 0.08), gunMat);
    rMag.position.set(0, -0.14, 0.22);
    rMag.rotation.x = 0.2;
    rifle.add(rBody, rStock, rGrip, rMag);
    rifle.position.set(0, -0.44, 0.12);
    rifle.rotation.x = Math.PI / 2;
    this.rig.rightArm.add(rifle);
    this.weaponMeshes.rifle = rifle;

    this.updateActiveWeaponMesh('pistol');
  }

  public updateActiveWeaponMesh(weapon: WeaponType) {
    if (this.weaponMeshes.pistol) this.weaponMeshes.pistol.visible = weapon === 'pistol';
    if (this.weaponMeshes.knife) this.weaponMeshes.knife.visible = weapon === 'knife';
    if (this.weaponMeshes.smg) this.weaponMeshes.smg.visible = weapon === 'smg';
    if (this.weaponMeshes.rifle) this.weaponMeshes.rifle.visible = weapon === 'rifle';
  }

  public update(
    input: { forward: number; strafe: number; sprint: boolean; jump: boolean },
    cameraYaw: number,
    colliders: CollisionBox[],
    dt: number
  ) {
    const store = useGameStore.getState();

    // Update life simulation needs
    store.updateNeeds(dt);

    // Sync visible weapon mesh
    this.updateActiveWeaponMesh(store.currentWeapon);

    if (this.currentVehicleIndex !== null) {
      // In vehicle: update rig to sitting pose
      this.rig.animate(0, false, true, dt);
      return;
    }

    // Fatigue affects speed when energy < 20%
    const fatigueFactor = store.energy < 20 ? 0.7 : 1.0;
    this.isSprinting = input.sprint && store.energy > 5 && !store.isAiming;
    const moveSpeed = (this.isSprinting ? this.sprintSpeed : this.walkSpeed) * fatigueFactor;

    // CAMERA-RELATIVE FORWARD & RIGHT GROUND VECTORS
    // When camera is behind player looking into the screen, forward is -sin(yaw) on X, -cos(yaw) on Z.
    const fwdX = -Math.sin(cameraYaw);
    const fwdZ = -Math.cos(cameraYaw);
    const rightX = -fwdZ; // Math.cos(cameraYaw)
    const rightZ = fwdX;  // -Math.sin(cameraYaw)

    // Compute desired ground direction:
    // W = +forward, S = -forward, D = +strafe (right), A = -strafe (left)
    const dirX = fwdX * input.forward + rightX * input.strafe;
    const dirZ = fwdZ * input.forward + rightZ * input.strafe;
    const inputLen = Math.hypot(dirX, dirZ);

    if (inputLen > 0.05) {
      const normX = dirX / inputLen;
      const normZ = dirZ / inputLen;

      // When aiming, character faces directly where the camera aims; otherwise faces walking direction
      const targetHeading = store.isAiming
        ? Math.atan2(fwdX, fwdZ)
        : Math.atan2(normX, normZ);

      // Smooth heading turn
      let diff = targetHeading - this.heading;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      this.heading += diff * Math.min(1.0, dt * (store.isAiming ? 25 : 14));
      this.group.rotation.y = this.heading;

      // Apply velocity in desired direction
      const speed = Math.min(1.0, inputLen) * moveSpeed;
      this.velocity.x = normX * speed;
      this.velocity.z = normZ * speed;

      // Footstep audio
      if (this.isGrounded) {
        this.footstepTimer += dt * (this.isSprinting ? 2.5 : 1.6);
        if (this.footstepTimer >= 0.5) {
          this.footstepTimer = 0;
          audioManager.playFootstep();
        }
      }
    } else {
      this.velocity.x *= Math.max(0, 1 - dt * 14);
      this.velocity.z *= Math.max(0, 1 - dt * 14);
      this.footstepTimer = 0;

      // When stationary and aiming, align with camera view
      if (store.isAiming) {
        const targetHeading = Math.atan2(fwdX, fwdZ);
        let diff = targetHeading - this.heading;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        this.heading += diff * Math.min(1.0, dt * 25);
        this.group.rotation.y = this.heading;
      }
    }

    // Jump & Gravity
    if (input.jump && this.isGrounded) {
      this.velocity.y = this.jumpForce;
      this.isGrounded = false;
    }

    this.velocity.y += this.gravity * dt;

    // Proposed new position
    const nextX = this.position.x + this.velocity.x * dt;
    const nextZ = this.position.z + this.velocity.z * dt;
    const nextY = this.position.y + this.velocity.y * dt;

    // Dynamic ground elevation from multi-floor buildings, elevators, and staircases
    const targetGroundY = buildingInteriors.update(this.position, dt);
    this.currentGroundElevation = targetGroundY;

    // Horizontal Collision Check
    const playerRadius = 0.45;
    let allowedX = true;
    let allowedZ = true;

    for (const col of colliders) {
      if (col.type === 'building' && this.position.y >= 5.5) continue;

      if (
        nextX + playerRadius > col.minX &&
        nextX - playerRadius < col.maxX &&
        this.position.z + playerRadius > col.minZ &&
        this.position.z - playerRadius < col.maxZ
      ) {
        allowedX = false;
      }
      if (
        this.position.x + playerRadius > col.minX &&
        this.position.x - playerRadius < col.maxX &&
        nextZ + playerRadius > col.minZ &&
        nextZ - playerRadius < col.maxZ
      ) {
        allowedZ = false;
      }
    }

    if (allowedX) this.position.x = nextX;
    else this.velocity.x = 0;

    if (allowedZ) this.position.z = nextZ;
    else this.velocity.z = 0;

    // Vertical Collision against Ground
    if (nextY <= targetGroundY) {
      this.position.y = targetGroundY;
      this.velocity.y = 0;
      this.isGrounded = true;
    } else {
      this.position.y = nextY;
      this.isGrounded = false;
    }

    // Ocean fall respawn
    if (this.position.z > 248) {
      this.position.set(90, 0, 190);
      this.velocity.set(0, 0, 0);
    }

    // Rig procedural animation & Arm Aiming Pose
    const currentSpeed = Math.hypot(this.velocity.x, this.velocity.z);
    const speedRatio = currentSpeed / this.walkSpeed;
    this.rig.animate(speedRatio, !this.isGrounded, false, dt);

    // Aiming arm pose override when holding weapon
    if (store.currentWeapon !== 'fists' && (store.isAiming || inputLen > 0.05)) {
      this.rig.rightArm.rotation.x = -Math.PI / 2 + 0.1;
      this.rig.rightArm.rotation.y = 0.15;
    }

    // Update muzzle world position for bullet spawning
    this.group.getWorldPosition(this.muzzlePoint);
    this.muzzlePoint.y += 1.4;
  }

  public updateAppearance() {
    const store = useGameStore.getState();
    const app = store.appearance;
    (this.rig.torso.material as THREE.MeshStandardMaterial).color.setHex(app.jacketColor);
    const leftMesh = this.rig.leftLeg.children[0] as THREE.Mesh;
    const rightMesh = this.rig.rightLeg.children[0] as THREE.Mesh;
    if (leftMesh?.material) {
      (leftMesh.material as THREE.MeshStandardMaterial).color.setHex(app.pantsColor);
    }
    if (rightMesh?.material) {
      (rightMesh.material as THREE.MeshStandardMaterial).color.setHex(app.pantsColor);
    }
  }

  public collapseRagdoll(dt: number) {
    // Tilt whole body backward onto pavement
    this.rig.group.position.y = THREE.MathUtils.lerp(this.rig.group.position.y, 0.25, dt * 6);
    this.rig.torso.rotation.x = THREE.MathUtils.lerp(this.rig.torso.rotation.x, -Math.PI / 2, dt * 6);
    this.rig.leftArm.rotation.z = THREE.MathUtils.lerp(this.rig.leftArm.rotation.z, -1.3, dt * 6);
    this.rig.rightArm.rotation.z = THREE.MathUtils.lerp(this.rig.rightArm.rotation.z, 1.3, dt * 6);
    this.rig.leftLeg.rotation.x = THREE.MathUtils.lerp(this.rig.leftLeg.rotation.x, 0.4, dt * 6);
    this.rig.rightLeg.rotation.x = THREE.MathUtils.lerp(this.rig.rightLeg.rotation.x, 0.2, dt * 6);
  }

  public resetPose() {
    this.rig.group.position.y = 0;
    this.rig.torso.rotation.set(0, 0, 0);
    this.rig.leftArm.rotation.set(0, 0, 0);
    this.rig.rightArm.rotation.set(0, 0, 0);
    this.rig.leftLeg.rotation.set(0, 0, 0);
    this.rig.rightLeg.rotation.set(0, 0, 0);
  }

  public respawn(pos: THREE.Vector3) {
    this.position.copy(pos);
    this.velocity.set(0, 0, 0);
    this.heading = 0;
    this.group.rotation.y = 0;
    this.currentVehicleIndex = null;
    this.group.visible = true;
    this.resetPose();
  }
}
