import * as THREE from 'three';
import { CharacterRig, modelFactory } from '../world/ModelFactory';
import { CollisionBox, getTerrainHeight, isInSwimmableWater, WORLD_RADIUS } from '../world/CityGenerator';
import { audioManager } from '../core/AudioManager';
import { buildingInteriors } from '../world/BuildingInteriors';
import { useGameStore, WeaponType } from '../core/gameState';

const WEAPON_TYPES = ['knife', 'pistol', 'smg', 'rifle', 'sniper'] as const;
const FIRST_PERSON_WEAPON_POSES: Record<
  Exclude<WeaponType, 'fists'>,
  { hip: [number, number, number]; aim: [number, number, number]; scale: number }
> = {
  knife: { hip: [0.13, -0.06, -0.25], aim: [0.02, -0.08, -0.34], scale: 0.92 },
  pistol: { hip: [0.16, -0.13, -0.28], aim: [0.015, -0.08, -0.39], scale: 0.92 },
  smg: { hip: [0.16, -0.16, -0.34], aim: [0.025, -0.09, -0.43], scale: 0.86 },
  rifle: { hip: [0.16, -0.16, -0.39], aim: [0.025, -0.095, -0.48], scale: 0.82 },
  sniper: { hip: [0.17, -0.17, -0.48], aim: [0.015, -0.12, -0.56], scale: 0.76 }
};

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
  public isSwimming = false;

  // Attached Weapon Meshes in Right Hand
  public weaponMeshes: Partial<Record<WeaponType, THREE.Group>> = {};
  private firstPersonWeaponMeshes: Partial<Record<WeaponType, THREE.Group>> = {};
  public muzzlePoint: THREE.Vector3 = new THREE.Vector3();

  private walkSpeed = 5.2; // m/s
  private sprintSpeed = 9.8; // m/s
  private jumpForce = 8.5; // m/s
  private gravity = -24.0;
  private footstepTimer = 0;
  private landingRecovery = 0;
  private jumpWasDown = false;
  private lastHealth = 100;
  private hitReactionTimer = 0;
  private attackTimer = 0;
  private readonly attackDuration = 0.38;
  private meleeAttack = false;

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
    this.lastHealth = store.health;

    // Build & Attach 3D Weapons to Right Hand
    this.initWeapons();
  }

  private initWeapons() {
    for (const weaponType of WEAPON_TYPES) {
      const weapon = this.createWeaponModel(weaponType);
      weapon.position.set(0, -0.05, 0.12);
      this.rig.rightElbow.add(weapon);
      this.weaponMeshes[weaponType] = weapon;

      const viewmodelWeapon = weapon.clone(true);
      viewmodelWeapon.rotation.y = Math.PI;
      this.rig.firstPersonArms.add(viewmodelWeapon);
      this.firstPersonWeaponMeshes[weaponType] = viewmodelWeapon;
    }

    this.updateActiveWeaponMesh('fists');
  }

  private createWeaponModel(type: Exclude<WeaponType, 'fists'>) {
    const model = new THREE.Group();
    const receiver = new THREE.MeshStandardMaterial({ color: 0x202830, roughness: 0.34, metalness: 0.78 });
    const polymer = new THREE.MeshStandardMaterial({ color: 0x171b1f, roughness: 0.72, metalness: 0.12 });
    const gripMaterial = new THREE.MeshStandardMaterial({ color: 0x292c2b, roughness: 0.82 });
    const wood = new THREE.MeshStandardMaterial({ color: 0x604735, roughness: 0.68 });
    const optic = new THREE.MeshStandardMaterial({
      color: 0x183a48,
      roughness: 0.16,
      metalness: 0.2,
      emissive: 0x063043,
      emissiveIntensity: 0.18
    });
    const addBox = (
      size: [number, number, number],
      position: [number, number, number],
      material: THREE.Material
    ) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
      mesh.position.set(...position);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      model.add(mesh);
      return mesh;
    };
    const addBarrel = (radius: number, length: number, z: number) => {
      const barrel = new THREE.Mesh(
        new THREE.CylinderGeometry(radius, radius, length, 10),
        receiver
      );
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(0, 0.015, z);
      barrel.castShadow = true;
      model.add(barrel);
    };

    if (type === 'knife') {
      addBox([0.055, 0.065, 0.16], [0, -0.02, -0.08], gripMaterial);
      addBox([0.12, 0.025, 0.035], [0, 0.02, 0.01], receiver);
      const blade = addBox([0.04, 0.025, 0.24], [0, 0.02, 0.15], receiver);
      blade.rotation.y = 0.02;
      addBox([0.035, 0.01, 0.12], [0, 0.04, 0.17], optic);
    } else if (type === 'pistol') {
      addBox([0.085, 0.075, 0.27], [0, 0.035, 0.08], receiver);
      addBox([0.072, 0.045, 0.22], [0, 0.09, 0.08], polymer);
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.19, 10), receiver);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(0, 0.04, 0.3);
      model.add(barrel);
      const grip = addBox([0.07, 0.17, 0.09], [0, -0.09, -0.005], gripMaterial);
      grip.rotation.x = 0.16;
      addBox([0.045, 0.02, 0.035], [0, -0.005, -0.015], receiver);
      addBox([0.04, 0.035, 0.04], [0, 0.08, 0.19], polymer);
    } else {
      const isSniper = type === 'sniper';
      const isSmg = type === 'smg';
      const stockMaterial = type === 'rifle' ? polymer : gripMaterial;
      addBox(
        isSniper ? [0.12, 0.13, 0.48] : [0.105, 0.13, isSmg ? 0.32 : 0.36],
        [0, 0.015, 0.02],
        receiver
      );
      if (isSniper) {
        addBox([0.13, 0.15, 0.36], [0, 0.01, -0.34], stockMaterial);
        addBox([0.09, 0.23, 0.13], [0, -0.16, 0.015], polymer);
        addBarrel(0.023, 0.7, 0.57);
        addBox([0.075, 0.065, 0.09], [0, 0.015, 0.94], receiver);
        const scopeTube = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.34, 12), receiver);
        scopeTube.rotation.x = Math.PI / 2;
        scopeTube.position.set(0, 0.15, 0.14);
        model.add(scopeTube);
        for (const z of [0.0, 0.29]) {
          const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.018, 12), optic);
          lens.rotation.x = Math.PI / 2;
          lens.position.set(0, 0.15, z);
          model.add(lens);
        }
        for (const side of [-1, 1]) {
          const bipod = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.013, 0.24, 6), receiver);
          bipod.position.set(side * 0.055, -0.13, 0.42);
          bipod.rotation.z = side * 0.25;
          model.add(bipod);
        }
      } else {
        const barrelLength = isSmg ? 0.31 : 0.44;
        addBarrel(isSmg ? 0.024 : 0.022, barrelLength, isSmg ? 0.36 : 0.4);
        addBox(
          isSmg ? [0.08, 0.12, 0.16] : [0.115, 0.095, 0.23],
          [0, 0.015, 0.22],
          polymer
        );
        addBox([0.09, 0.22, 0.1], [0, -0.14, 0.05], gripMaterial);
        addBox([0.12, 0.24, 0.12], [0, -0.17, 0.11], polymer);
        addBox([0.12, 0.13, isSmg ? 0.2 : 0.25], [0, 0.015, -0.25], stockMaterial);
        const opticMesh = new THREE.Mesh(
          new THREE.BoxGeometry(isSmg ? 0.06 : 0.08, 0.055, isSmg ? 0.07 : 0.14),
          isSmg ? receiver : optic
        );
        opticMesh.position.set(0, 0.12, 0.04);
        model.add(opticMesh);
      }
    }

    model.name = `weapon-${type}`;
    return model;
  }

  public updateActiveWeaponMesh(weapon: WeaponType, isAiming = false) {
    for (const weaponType of WEAPON_TYPES) {
      const worldWeapon = this.weaponMeshes[weaponType];
      if (worldWeapon) worldWeapon.visible = weapon === weaponType;
      const viewmodelWeapon = this.firstPersonWeaponMeshes[weaponType];
      if (!viewmodelWeapon) continue;
      viewmodelWeapon.visible = weapon === weaponType && this.currentVehicleIndex === null;
    }
    const arms = this.rig.firstPersonArms;
    arms.position.set(0, isAiming ? -0.16 : -0.28, -0.95);
    const leftHand = arms.getObjectByName('first-person-left-hand');
    const rightHand = arms.getObjectByName('first-person-right-hand');
    if (leftHand) leftHand.position.set(isAiming ? -0.095 : -0.14, isAiming ? -0.045 : -0.09, isAiming ? -0.4 : -0.31);
    if (rightHand) rightHand.position.set(isAiming ? 0.065 : 0.14, isAiming ? -0.045 : -0.09, isAiming ? -0.37 : -0.31);

    if (weapon !== 'fists') {
      const model = this.firstPersonWeaponMeshes[weapon];
      const pose = FIRST_PERSON_WEAPON_POSES[weapon];
      if (model && pose) {
        model.position.set(...(isAiming ? pose.aim : pose.hip));
        model.scale.setScalar(pose.scale);
      }
    }
  }

  public update(
    input: { forward: number; strafe: number; sprint: boolean; jump: boolean },
    cameraYaw: number,
    colliders: CollisionBox[],
    dt: number,
    pedestrianPositions: THREE.Vector3[] = []
  ) {
    const store = useGameStore.getState();

    // Update life simulation needs
    store.updateNeeds(dt);
    if (store.health < this.lastHealth) this.hitReactionTimer = 0.24;
    this.lastHealth = store.health;

    // Sync visible weapon mesh
    this.updateActiveWeaponMesh(store.currentWeapon, store.isAiming);

    if (this.currentVehicleIndex !== null) {
      // In vehicle: update rig to sitting pose
      this.rig.animate(0, false, true, dt);
      return;
    }

    this.isSwimming = isInSwimmableWater(this.position.x, this.position.z);

    // Fatigue affects speed when energy < 20%
    const fatigueFactor = store.energy < 20 ? 0.7 : 1.0;
    this.isSprinting = input.sprint && store.energy > 5 && !store.isAiming;
    const moveSpeed = (this.isSprinting ? this.sprintSpeed : this.walkSpeed) *
      fatigueFactor *
      (this.isSwimming ? 0.55 : 1);

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
      const velocityBlend = 1 - Math.exp(-(this.isSprinting ? 17 : 14) * dt);
      this.velocity.x += (normX * speed - this.velocity.x) * velocityBlend;
      this.velocity.z += (normZ * speed - this.velocity.z) * velocityBlend;

      // Footstep audio
      if (this.isGrounded || this.isSwimming) {
        this.footstepTimer += dt * (this.isSwimming ? 1.2 : this.isSprinting ? 2.5 : 1.6);
        if (this.footstepTimer >= (this.isSwimming ? 0.8 : 0.5)) {
          this.footstepTimer = 0;
          if (this.isSwimming) audioManager.playWaterSplash();
          else audioManager.playFootstep();
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
    const jumpPressed = input.jump && !this.jumpWasDown;
    this.jumpWasDown = input.jump;
    if (jumpPressed && this.isGrounded) {
      this.velocity.y = this.jumpForce;
      this.isGrounded = false;
    }

    if (this.isSwimming) {
      const waterTarget = input.sprint ? -1.35 : -0.68;
      this.velocity.y += (waterTarget - this.position.y) * 3 * dt - this.velocity.y * 2.4 * dt;
      if (input.jump) this.velocity.y = Math.min(2.2, this.velocity.y + 1.4 * dt);
      this.velocity.y = THREE.MathUtils.clamp(this.velocity.y, -2.5, 2.2);
    } else {
      this.velocity.y += this.gravity * dt;
    }

    // Proposed new position
    const nextX = THREE.MathUtils.clamp(this.position.x + this.velocity.x * dt, -WORLD_RADIUS + 5, WORLD_RADIUS - 5);
    const nextZ = THREE.MathUtils.clamp(this.position.z + this.velocity.z * dt, -WORLD_RADIUS + 5, WORLD_RADIUS - 5);
    const nextY = this.position.y + this.velocity.y * dt;

    // Dynamic ground elevation from multi-floor buildings, elevators, and staircases
    const interiorGroundY = buildingInteriors.update(this.position, dt);
    const targetGroundY = interiorGroundY > 0
      ? interiorGroundY
      : getTerrainHeight(nextX, nextZ);
    this.currentGroundElevation = targetGroundY;

    // Horizontal Collision Check
    const playerRadius = 0.45;
    let allowedX = true;
    let allowedZ = true;
    const actorCollisionRadius = 0.95;
    for (const actorPosition of pedestrianPositions) {
      if (Math.hypot(nextX - actorPosition.x, this.position.z - actorPosition.z) < actorCollisionRadius) {
        allowedX = false;
      }
      if (Math.hypot(this.position.x - actorPosition.x, nextZ - actorPosition.z) < actorCollisionRadius) {
        allowedZ = false;
      }
    }

    for (const col of colliders) {
      if (col.type === 'water') continue;
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
    const fallSpeed = Math.max(0, -this.velocity.y);
    const landed = !this.isSwimming && nextY <= targetGroundY && !this.isGrounded && this.velocity.y < -2;
    if (this.isSwimming) {
      this.position.y = Math.max(-1.6, nextY);
      this.isGrounded = false;
    } else if (nextY <= targetGroundY) {
      this.position.y = targetGroundY;
      this.velocity.y = 0;
      this.isGrounded = true;
    } else {
      this.position.y = nextY;
      this.isGrounded = false;
    }
    if (landed) {
      this.landingRecovery = 0.55;
      if (fallSpeed > 12) store.damagePlayer(Math.min(45, (fallSpeed - 12) * 4));
    } else {
      this.landingRecovery = Math.max(0, this.landingRecovery - dt);
    }

    // Rig procedural animation & Arm Aiming Pose
    const currentSpeed = Math.hypot(this.velocity.x, this.velocity.z);
    const speedRatio = currentSpeed / this.walkSpeed;
    this.rig.animate(speedRatio, !this.isGrounded && !this.isSwimming, false, dt, {
      running: this.isSprinting,
      falling: !this.isGrounded && !this.isSwimming && this.velocity.y < -0.5,
      swimming: this.isSwimming,
      recovering: this.landingRecovery,
      fatigue: 1 - store.energy / 100
    });
    this.updateActiveWeaponMesh(store.currentWeapon, store.isAiming);
    if (this.attackTimer > 0) {
      this.attackTimer = Math.max(0, this.attackTimer - dt);
      const progress = 1 - this.attackTimer / this.attackDuration;
      if (this.meleeAttack) {
        const ease = (value: number) => value * value * (3 - 2 * value);
        let armSwing: number;
        if (progress < 0.28) {
          armSwing = 0.38 * ease(progress / 0.28);
        } else if (progress < 0.62) {
          armSwing = THREE.MathUtils.lerp(
            0.38,
            -1.18,
            ease((progress - 0.28) / 0.34)
          );
        } else {
          armSwing = THREE.MathUtils.lerp(
            -1.18,
            0,
            ease((progress - 0.62) / 0.38)
          );
        }
        this.rig.rightArm.rotation.x += armSwing;
        this.rig.rightElbow.rotation.x -= progress < 0.32 ? 0.28 : 0.08;
        this.rig.torso.rotation.y += progress < 0.28 ? -0.06 : 0.08;
        this.rig.firstPersonArms.rotation.x = armSwing * 0.16;
      } else {
        const recoil = Math.sin(Math.PI * progress);
        this.rig.firstPersonArms.rotation.x = recoil * 0.1;
      }
    } else {
      this.rig.firstPersonArms.rotation.x = 0;
    }
    if (this.hitReactionTimer > 0) {
      const impact = this.hitReactionTimer / 0.24;
      this.rig.torso.rotation.x += impact * 0.14;
      this.rig.rightArm.rotation.z -= impact * 0.1;
      this.hitReactionTimer = Math.max(0, this.hitReactionTimer - dt);
    }

    if (this.isGrounded && speedRatio < 0.05) {
      const leftFoot = this.group.localToWorld(new THREE.Vector3(-0.14, 0.06, 0.05));
      const rightFoot = this.group.localToWorld(new THREE.Vector3(0.14, 0.06, 0.05));
      this.rig.setFootTarget('left', leftFoot);
      this.rig.setFootTarget('right', rightFoot);
    }

    // Aiming arm pose override when holding weapon
    const meleeAttack = this.meleeAttack && this.attackTimer > 0;
    if (
      store.currentWeapon !== 'fists' &&
      !meleeAttack &&
      (store.isAiming || inputLen > 0.05)
    ) {
      this.rig.setHandTarget(
        'right',
        this.group.localToWorld(new THREE.Vector3(0.3, 1.2, 0.55))
      );
      this.rig.setHandTarget(
        'left',
        this.group.localToWorld(new THREE.Vector3(-0.25, 1.22, 0.45))
      );
    }

    // Update muzzle world position for bullet spawning
    this.group.getWorldPosition(this.muzzlePoint);
    this.muzzlePoint.y += 1.4;
  }

  public updateAppearance() {
    const store = useGameStore.getState();
    const app = store.appearance;
    (this.rig.torso.material as THREE.MeshStandardMaterial).color.setHex(app.jacketColor);
    for (const leg of [this.rig.leftLeg, this.rig.rightLeg]) {
      const thigh = leg.children[0] as THREE.Mesh;
      const knee = leg.children[1] as THREE.Group;
      const calf = knee.children[0] as THREE.Mesh;
      const shoe = knee.children[1] as THREE.Mesh;
      for (const garment of [thigh, calf]) {
        if (garment.material) (garment.material as THREE.MeshStandardMaterial).color.setHex(app.pantsColor);
      }
      if (shoe.material) (shoe.material as THREE.MeshStandardMaterial).color.setHex(app.shoesColor);
    }
    for (const index of [0, 2]) {
      const sleeve = this.rig.firstPersonArms.children[index] as THREE.Mesh;
      (sleeve.material as THREE.MeshStandardMaterial).color.setHex(app.jacketColor);
    }
  }

  public triggerAttack(melee: boolean) {
    this.attackTimer = this.attackDuration;
    this.meleeAttack = melee;
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
    this.rig.leftElbow.rotation.set(0, 0, 0);
    this.rig.rightElbow.rotation.set(0, 0, 0);
    this.rig.leftLeg.rotation.set(0, 0, 0);
    this.rig.rightLeg.rotation.set(0, 0, 0);
    this.rig.leftKnee.rotation.set(0, 0, 0);
    this.rig.rightKnee.rotation.set(0, 0, 0);
    this.landingRecovery = 0;
    this.hitReactionTimer = 0;
    this.attackTimer = 0;
    this.rig.firstPersonArms.rotation.set(0, 0, 0);
  }

  public respawn(pos: THREE.Vector3) {
    this.position.copy(pos);
    this.velocity.set(0, 0, 0);
    this.heading = 0;
    this.group.rotation.y = 0;
    this.currentVehicleIndex = null;
    this.isSwimming = false;
    this.isGrounded = true;
    this.jumpWasDown = false;
    this.lastHealth = useGameStore.getState().health;
    this.group.visible = true;
    this.resetPose();
  }
}
