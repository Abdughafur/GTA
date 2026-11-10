import * as THREE from 'three';
import { textureFactory } from './TextureGenerator';
import { createVehicleModel } from '../vehicles/models';
import { VehicleMeshRig, VehicleType } from '../vehicles/types';
export type { VehicleMeshRig } from '../vehicles/types';

/**
 * Composite 3-12 Part Procedural Model Factory
 * Adheres strictly to the Three.js skill:
 * - Multi-part hierarchical groups with varied roughness/metalness
 * - Bottom-center grounding pivots with soft radial contact shadows
 * - Zero external files
 */

export interface CharacterRig {
  group: THREE.Group;
  torso: THREE.Mesh;
  head: THREE.Mesh;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  leftElbow: THREE.Group;
  rightElbow: THREE.Group;
  leftKnee: THREE.Group;
  rightKnee: THREE.Group;
  firstPersonArms: THREE.Group;
  updateWatch: (timeOfDay: number) => void;
  setHandTarget: (side: 'left' | 'right', target: THREE.Vector3 | null) => void;
  setFootTarget: (side: 'left' | 'right', target: THREE.Vector3 | null) => void;
  animate: (
    speedRatio: number,
    isJumping: boolean,
    isSitting: boolean,
    dt: number,
    state?: { running?: boolean; falling?: boolean; swimming?: boolean; recovering?: number; fatigue?: number }
  ) => void;
}

export class ModelFactory {
  private contactShadowGeo = new THREE.PlaneGeometry(3.5, 5.5);
  private contactShadowMat = new THREE.MeshBasicMaterial({
    map: textureFactory.getRadialContactShadowTexture(),
    transparent: true,
    opacity: 0.65,
    depthWrite: false
  });

  // --- 1. PROCEDURAL VEHICLES ---
  public createVehicle(
    type: VehicleType,
    bodyColorHex = 0xe74c3c
  ): VehicleMeshRig {
    return createVehicleModel(type, bodyColorHex);
  }

  // --- 2. ARTICULATED HUMANOID CHARACTER ---
  public createCharacter(
    outfitColor = 0x2563eb,
    skinTone = 0xf5d0b0,
    appearance?: {
      pantsColor?: number;
      shoesColor?: number;
      hairColor?: number;
      glasses?: boolean;
      hat?: boolean;
      watch?: boolean;
      bodyShape?: 'masculine' | 'feminine';
      isElderly?: boolean;
      height?: number;
      build?: number;
      hairStyle?: number;
      facialHair?: boolean;
    }
  ): CharacterRig {
    const root = new THREE.Group();
    root.scale.set(0.9 + (appearance?.build ?? 1) * 0.1, appearance?.height ?? 1, 0.9 + (appearance?.build ?? 1) * 0.1);

    // Contact shadow
    const shadowGeo = new THREE.PlaneGeometry(1.2, 1.2);
    const shadow = new THREE.Mesh(shadowGeo, this.contactShadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.02;
    root.add(shadow);

    const skinMat = new THREE.MeshStandardMaterial({ color: skinTone, roughness: 0.8, metalness: 0.05 });
    const clothMat = new THREE.MeshStandardMaterial({ color: outfitColor, roughness: 0.7, metalness: 0.1 });
    const pantsMat = new THREE.MeshStandardMaterial({
      color: appearance?.pantsColor ?? 0x1e293b,
      roughness: 0.8,
      metalness: 0.1
    });
    const shoeMat = new THREE.MeshStandardMaterial({
      color: appearance?.shoesColor ?? 0xffffff,
      roughness: 0.5,
      metalness: 0.2
    });
    const hairMat = new THREE.MeshStandardMaterial({
      color: appearance?.hairColor ?? (appearance?.isElderly ? 0x9ca3af : 0x1f2937),
      roughness: 0.9,
      metalness: 0.05
    });

    // Hips / Pelvis
    const build = appearance?.build ?? 1;
    const hipWidth = (appearance?.bodyShape === 'feminine' ? 0.46 : 0.42) * build;
    const torsoWidth = (appearance?.bodyShape === 'feminine' ? 0.43 : 0.48) * build;
    const hips = new THREE.Mesh(new THREE.BoxGeometry(hipWidth, 0.22, 0.26), pantsMat);
    hips.position.y = 0.92;
    root.add(hips);

    // Torso (Jacket)
    const torso = new THREE.Mesh(new THREE.BoxGeometry(torsoWidth, 0.58, 0.28), clothMat);
    torso.position.y = 1.32;
    torso.castShadow = true;
    root.add(torso);

    // Head
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.28, 0.28), skinMat);
    head.position.y = 1.78;
    head.castShadow = true;
    root.add(head);

    // Hair / Cap
    const hairStyle = appearance?.hairStyle ?? 0;
    if (hairStyle !== 4) {
      const hairHeight = hairStyle === 1 ? 0.04 : hairStyle === 2 || hairStyle === 5 ? 0.16 : 0.1;
      const hair = new THREE.Mesh(new THREE.BoxGeometry(0.28, hairHeight, 0.3), hairMat);
      hair.position.y = 1.92 + (hairHeight - 0.1) / 2;
      root.add(hair);
      if (hairStyle === 2 || hairStyle === 5) {
        for (const side of [-1, 1]) {
          const lock = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.3, 0.1), hairMat);
          lock.position.set(side * 0.13, 1.78, -0.02);
          root.add(lock);
        }
      }
      if (hairStyle === 3 || hairStyle === 5) {
        for (const side of [-1, 1]) {
          const braid = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.025, 0.34, 6), hairMat);
          braid.position.set(side * 0.15, 1.61, -0.04);
          root.add(braid);
        }
      }
    }
    if (appearance?.facialHair) {
      const beard = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.1, 0.2), hairMat);
      beard.position.set(0, 1.66, 0.1);
      root.add(beard);
    }

    // Sunglasses
    if (appearance?.glasses !== false) {
      const glasses = new THREE.Mesh(
        new THREE.BoxGeometry(0.24, 0.06, 0.06),
        new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.1, metalness: 0.9 })
      );
      glasses.position.set(0, 1.8, 0.15);
      root.add(glasses);
    }

    // Hat / Fedora / Cap
    if (appearance?.hat) {
      const hatBrim = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.04, 16), clothMat);
      hatBrim.position.y = 1.96;
      const hatTop = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.15, 16), clothMat);
      hatTop.position.y = 2.05;
      root.add(hatBrim, hatTop);
    }

    // Arms
    const createArm = (isLeft: boolean) => {
      const shoulderPivot = new THREE.Group();
      shoulderPivot.position.set(isLeft ? -0.32 : 0.32, 1.54, 0);

      const upperArm = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.34, 0.14), clothMat);
      upperArm.position.y = -0.17;
      upperArm.castShadow = true;
      shoulderPivot.add(upperArm);

      const elbowPivot = new THREE.Group();
      elbowPivot.position.y = -0.34;
      const lowerArm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.32, 0.12), clothMat);
      lowerArm.position.y = -0.16;
      lowerArm.castShadow = true;
      elbowPivot.add(lowerArm);
      const hand = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.16, 0.12), skinMat);
      hand.position.y = -0.37;
      elbowPivot.add(hand);
      shoulderPivot.add(elbowPivot);

      return { shoulder: shoulderPivot, elbow: elbowPivot };
    };

    const leftArmParts = createArm(true);
    const rightArmParts = createArm(false);
    const leftArm = leftArmParts.shoulder;
    const rightArm = rightArmParts.shoulder;
    const leftElbow = leftArmParts.elbow;
    const rightElbow = rightArmParts.elbow;
    root.add(leftArm, rightArm);

    // Legs
    const createLeg = (isLeft: boolean) => {
      const hipPivot = new THREE.Group();
      hipPivot.position.set(isLeft ? -0.14 : 0.14, 0.88, 0);

      const thigh = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.44, 0.18), pantsMat);
      thigh.position.y = -0.22;
      thigh.castShadow = true;
      hipPivot.add(thigh);

      const kneePivot = new THREE.Group();
      kneePivot.position.y = -0.44;
      const calf = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.4, 0.16), pantsMat);
      calf.position.y = -0.2;
      calf.castShadow = true;
      kneePivot.add(calf);

      const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.12, 0.28), shoeMat);
      shoe.position.set(0, -0.42, 0.05);
      kneePivot.add(shoe);
      hipPivot.add(kneePivot);

      return { hip: hipPivot, knee: kneePivot };
    };

    const leftLegParts = createLeg(true);
    const rightLegParts = createLeg(false);
    const leftLeg = leftLegParts.hip;
    const rightLeg = rightLegParts.hip;
    const leftKnee = leftLegParts.knee;
    const rightKnee = rightLegParts.knee;
    root.add(leftLeg, rightLeg);

    const firstPersonArms = new THREE.Group();
    firstPersonArms.position.set(0, -0.1, -0.8);
    const viewmodelSleeveMat = clothMat.clone();
    const viewmodelHandMat = skinMat.clone();
    for (const side of [-1, 1]) {
      const forearm = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.48, 0.13), viewmodelSleeveMat);
      forearm.position.set(side * 0.2, -0.2, -0.08);
      forearm.rotation.x = -0.65;
      firstPersonArms.add(forearm);
      const palm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.13, 0.12), viewmodelHandMat);
      palm.position.set(side * 0.2, -0.02, -0.23);
      firstPersonArms.add(palm);
    }
    let watchTexture: THREE.CanvasTexture | null = null;
    if (appearance?.watch) {
      const watch = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, 0.07, 0.12),
        new THREE.MeshStandardMaterial({ color: 0x111827, metalness: 0.8, roughness: 0.25 })
      );
      watch.position.set(-0.2, -0.14, -0.18);
      firstPersonArms.add(watch);
      const displayCanvas = document.createElement('canvas');
      displayCanvas.width = 128;
      displayCanvas.height = 64;
      watchTexture = new THREE.CanvasTexture(displayCanvas);
      const display = new THREE.Mesh(
        new THREE.PlaneGeometry(0.082, 0.042),
        new THREE.MeshBasicMaterial({ map: watchTexture })
      );
      display.position.set(-0.2, -0.14, -0.244);
      firstPersonArms.add(display);
    }
    const updateWatch = (timeOfDay: number) => {
      if (!watchTexture) return;
      const canvas = watchTexture.image as HTMLCanvasElement;
      const context = canvas.getContext('2d');
      if (!context) return;
      const hours = Math.floor(timeOfDay) % 24;
      const minutes = Math.floor((timeOfDay - Math.floor(timeOfDay)) * 60);
      const currentMinute = hours * 60 + minutes;
      if (currentMinute === lastWatchMinute) return;
      lastWatchMinute = currentMinute;
      context.fillStyle = '#07111a';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = '#5ef7c2';
      context.font = 'bold 38px monospace';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText(`${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`, 64, 34);
      watchTexture.needsUpdate = true;
    };

    let walkCycle = 0;
    let blend = 0;
    let lastWatchMinute = -1;
    const baseRootHeight = 0;
    const setLimbTarget = (
      side: 'left' | 'right',
      target: THREE.Vector3 | null,
      isArm: boolean
    ) => {
      const pivot = isArm ? (side === 'left' ? leftArm : rightArm) : (side === 'left' ? leftLeg : rightLeg);
      const joint = isArm ? (side === 'left' ? leftElbow : rightElbow) : (side === 'left' ? leftLegParts.knee : rightLegParts.knee);
      if (!target) {
        pivot.rotation.x = 0;
        joint.rotation.x = 0;
        return;
      }

      root.updateMatrixWorld(true);
      const localTarget = root.worldToLocal(target.clone());
      const originY = isArm ? 1.54 : 0.88;
      const dx = localTarget.x - pivot.position.x;
      const dy = localTarget.y - originY;
      const dz = localTarget.z;
      const upperLength = isArm ? 0.34 : 0.44;
      const lowerLength = isArm ? 0.32 : 0.4;
      const distance = THREE.MathUtils.clamp(Math.hypot(dx, dy, dz), 0.05, upperLength + lowerLength - 0.001);
      const cosine = THREE.MathUtils.clamp(
        (upperLength ** 2 + lowerLength ** 2 - distance ** 2) / (2 * upperLength * lowerLength),
        -1,
        1
      );
      const flexion = Math.PI - Math.acos(cosine);
      pivot.rotation.x = Math.atan2(-dz, -dy);
      pivot.rotation.z = Math.atan2(dx, Math.max(0.001, -dy)) * (side === 'left' ? 1 : -1);
      joint.rotation.x = isArm ? -flexion : flexion;
    };

    const setHandTarget = (side: 'left' | 'right', target: THREE.Vector3 | null) =>
      setLimbTarget(side, target, true);
    const setFootTarget = (side: 'left' | 'right', target: THREE.Vector3 | null) =>
      setLimbTarget(side, target, false);

    const animate = (
      speedRatio: number,
      isJumping: boolean,
      isSitting: boolean,
      dt: number,
      state: { running?: boolean; falling?: boolean; swimming?: boolean; recovering?: number; fatigue?: number } = {}
    ) => {
      const fatigue = THREE.MathUtils.clamp(state.fatigue ?? 0, 0, 1);
      const moving = THREE.MathUtils.clamp(speedRatio, 0, 1.8);
      const targetBlend = isSitting ? 0 : moving;
      blend += (targetBlend - blend) * Math.min(1, dt * 9);
      walkCycle += dt * (state.running ? 16 : 11) * Math.max(0.15, moving);

      const stride = Math.sin(walkCycle) * 0.66 * blend;
      const kneeFlex = Math.max(0, Math.sin(walkCycle)) * 0.72 * blend;
      const breathe = Math.sin(walkCycle * 0.18) * (0.012 + fatigue * 0.02);
      root.position.y = baseRootHeight + (isSitting ? -0.35 : state.swimming ? -0.42 : 0);
      root.rotation.x = state.falling ? 0.12 : state.swimming ? -0.12 : 0;
      torso.position.y = 1.32 + breathe + (blend > 0.05 ? Math.abs(Math.sin(walkCycle * 2)) * 0.025 : 0);
      leftArm.rotation.z = rightArm.rotation.z = 0;
      leftLeg.rotation.z = rightLeg.rotation.z = 0;

      if (isSitting) {
        leftLeg.rotation.x = rightLeg.rotation.x = -Math.PI / 2.3;
        leftArm.rotation.x = rightArm.rotation.x = -Math.PI / 3;
        leftElbow.rotation.x = rightElbow.rotation.x = -0.25;
        leftKnee.rotation.x = rightKnee.rotation.x = 0;
      } else if (state.swimming) {
        leftLeg.rotation.x = 0.55 + Math.sin(walkCycle) * 0.38;
        rightLeg.rotation.x = 0.55 - Math.sin(walkCycle) * 0.38;
        leftKnee.rotation.x = rightKnee.rotation.x = 0.45;
        leftArm.rotation.x = -1.25 + Math.sin(walkCycle) * 0.35;
        rightArm.rotation.x = -1.25 - Math.sin(walkCycle) * 0.35;
        leftElbow.rotation.x = rightElbow.rotation.x = -0.6;
      } else if (isJumping || state.falling) {
        leftLeg.rotation.x = -0.4;
        rightLeg.rotation.x = 0.3;
        leftKnee.rotation.x = 0.35;
        rightKnee.rotation.x = 0.5;
        leftArm.rotation.x = rightArm.rotation.x = -1.2;
        leftElbow.rotation.x = rightElbow.rotation.x = -0.35;
      } else if ((state.recovering ?? 0) > 0) {
        const recovery = THREE.MathUtils.clamp((state.recovering ?? 0) / 0.55, 0, 1);
        leftLeg.rotation.x = rightLeg.rotation.x = -0.2 * recovery;
        leftKnee.rotation.x = rightKnee.rotation.x = 0.4 * recovery;
        leftArm.rotation.x = rightArm.rotation.x = -0.75 * recovery;
        leftElbow.rotation.x = rightElbow.rotation.x = -0.3 * recovery;
      } else {
        leftLeg.rotation.x = stride;
        rightLeg.rotation.x = -stride;
        leftKnee.rotation.x = kneeFlex;
        rightKnee.rotation.x = Math.max(0, -Math.sin(walkCycle)) * 0.72 * blend;
        leftArm.rotation.x = -stride * 0.7 + breathe;
        rightArm.rotation.x = stride * 0.7 + breathe;
        leftElbow.rotation.x = -0.08 - kneeFlex * 0.35;
        rightElbow.rotation.x = -0.08 - Math.max(0, -Math.sin(walkCycle)) * 0.25;
      }

      firstPersonArms.position.y = -0.1 + Math.sin(walkCycle * 2) * 0.012 * blend;
    };

    return {
      group: root,
      torso,
      head,
      leftArm,
      rightArm,
      leftLeg,
      rightLeg,
      leftElbow,
      rightElbow,
      leftKnee: leftLegParts.knee,
      rightKnee: rightLegParts.knee,
      firstPersonArms,
      updateWatch,
      setHandTarget,
      setFootTarget,
      animate
    };
  }

  // --- 3. STREET PROPS & ARCHITECTURE ---
  public createPalmTree(): THREE.Group {
    const tree = new THREE.Group();
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x5a4a38, roughness: 0.9 });
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.6, side: THREE.DoubleSide });

    // Curved Trunk (3 segments)
    const trunkSeg1 = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.32, 2.5, 8), woodMat);
    trunkSeg1.position.y = 1.25;
    trunkSeg1.castShadow = true;
    tree.add(trunkSeg1);

    const trunkSeg2 = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 2.5, 8), woodMat);
    trunkSeg2.position.set(0.15, 3.6, 0.1);
    trunkSeg2.rotation.z = -0.08;
    trunkSeg2.castShadow = true;
    tree.add(trunkSeg2);

    const trunkSeg3 = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 2.5, 8), woodMat);
    trunkSeg3.position.set(0.4, 5.9, 0.25);
    trunkSeg3.rotation.z = -0.14;
    trunkSeg3.castShadow = true;
    tree.add(trunkSeg3);

    // Palm Fronds (8 fan leaves)
    const crown = new THREE.Group();
    crown.position.set(0.55, 7.1, 0.35);
    crown.userData.windSway = true;
    crown.userData.windPhase = Math.random() * Math.PI * 2;

    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const frond = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.04, 2.6), leafMat);
      frond.rotation.y = angle;
      frond.rotation.x = 0.45;
      frond.position.set(Math.sin(angle) * 1.1, -0.3, Math.cos(angle) * 1.1);
      frond.castShadow = true;
      crown.add(frond);
    }
    tree.add(crown);

    return tree;
  }

  public createStreetLamp(): THREE.Group {
    const lamp = new THREE.Group();
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.4, metalness: 0.8 });

    // Base collar
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.38, 0.6, 8), poleMat);
    base.position.y = 0.3;
    lamp.add(base);

    // Vertical pole
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.16, 5.5, 8), poleMat);
    pole.position.y = 3.25;
    pole.castShadow = true;
    lamp.add(pole);

    // Curved Arm
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.8, 8), poleMat);
    arm.rotation.z = Math.PI / 3;
    arm.position.set(0.7, 6.2, 0);
    lamp.add(arm);

    // Lantern Head
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.2, 0.35), poleMat);
    head.position.set(1.4, 6.6, 0);
    lamp.add(head);

    // Emissive Light bulb
    const bulbMat = new THREE.MeshStandardMaterial({
      color: 0xfff3b0,
      emissive: 0xffe066,
      emissiveIntensity: 1.5
    });
    const bulb = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.06, 0.28), bulbMat);
    bulb.position.set(1.4, 6.48, 0);
    lamp.userData.bulb = bulb;
    lamp.add(bulb);

    return lamp;
  }

  public createTrafficLight(): THREE.Group {
    const tl = new THREE.Group();
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5, metalness: 0.6 });

    // Mast Pole
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 6.0, 8), metalMat);
    pole.position.y = 3.0;
    tl.add(pole);

    // Overhead Arm
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 4.5, 8), metalMat);
    arm.rotation.z = Math.PI / 2;
    arm.position.set(2.2, 5.8, 0);
    tl.add(arm);

    // Signal Housing
    const housing = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.1, 0.35), metalMat);
    housing.position.set(3.2, 5.4, 0);
    tl.add(housing);

    // Red, Yellow, Green lenses
    const redLens = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.1, 0.06, 12),
      new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 1.2 })
    );
    redLens.rotation.x = Math.PI / 2;
    redLens.position.set(3.2, 5.75, 0.18);

    const yellowLens = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.1, 0.06, 12),
      new THREE.MeshStandardMaterial({ color: 0x332200, emissive: 0x000000 })
    );
    yellowLens.rotation.x = Math.PI / 2;
    yellowLens.position.set(3.2, 5.4, 0.18);

    const greenLens = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.1, 0.06, 12),
      new THREE.MeshStandardMaterial({ color: 0x003311, emissive: 0x000000 })
    );
    greenLens.rotation.x = Math.PI / 2;
    greenLens.position.set(3.2, 5.05, 0.18);

    tl.add(redLens, yellowLens, greenLens);
    tl.userData.signalLenses = { redLens, yellowLens, greenLens };
    return tl;
  }
}

export const modelFactory = new ModelFactory();
