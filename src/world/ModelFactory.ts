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
  animate: (speedRatio: number, isJumping: boolean, isSitting: boolean, dt: number) => void;
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
    }
  ): CharacterRig {
    const root = new THREE.Group();

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
    const hipWidth = appearance?.bodyShape === 'feminine' ? 0.46 : 0.42;
    const torsoWidth = appearance?.bodyShape === 'feminine' ? 0.43 : 0.48;
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
    const hair = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.1, 0.3), hairMat);
    hair.position.y = 1.92;
    root.add(hair);

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

      const hand = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.16, 0.12), skinMat);
      hand.position.y = -0.42;
      shoulderPivot.add(hand);

      return shoulderPivot;
    };

    const leftArm = createArm(true);
    const rightArm = createArm(false);
    root.add(leftArm, rightArm);

    // Legs
    const createLeg = (isLeft: boolean) => {
      const hipPivot = new THREE.Group();
      hipPivot.position.set(isLeft ? -0.14 : 0.14, 0.88, 0);

      const thigh = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.44, 0.18), pantsMat);
      thigh.position.y = -0.22;
      thigh.castShadow = true;
      hipPivot.add(thigh);

      const calf = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.4, 0.16), pantsMat);
      calf.position.y = -0.58;
      calf.castShadow = true;
      hipPivot.add(calf);

      const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.12, 0.28), shoeMat);
      shoe.position.set(0, -0.82, 0.05);
      hipPivot.add(shoe);

      return hipPivot;
    };

    const leftLeg = createLeg(true);
    const rightLeg = createLeg(false);
    root.add(leftLeg, rightLeg);

    let walkCycle = 0;

    const animate = (speedRatio: number, isJumping: boolean, isSitting: boolean, dt: number) => {
      if (isSitting) {
        // Sitting in car
        leftLeg.rotation.x = -Math.PI / 2.3;
        rightLeg.rotation.x = -Math.PI / 2.3;
        leftArm.rotation.x = -Math.PI / 3;
        rightArm.rotation.x = -Math.PI / 3;
        root.position.y = -0.35;
        return;
      }

      root.position.y = 0;

      if (isJumping) {
        leftLeg.rotation.x = -0.4;
        rightLeg.rotation.x = 0.3;
        leftArm.rotation.x = -1.2;
        rightArm.rotation.x = -1.2;
        return;
      }

      if (speedRatio > 0.05) {
        walkCycle += dt * speedRatio * 14;
        const swing = Math.sin(walkCycle) * 0.7 * Math.min(1.2, speedRatio);

        leftLeg.rotation.x = swing;
        rightLeg.rotation.x = -swing;
        leftArm.rotation.x = -swing * 0.9;
        rightArm.rotation.x = swing * 0.9;
        torso.position.y = 1.32 + Math.abs(Math.sin(walkCycle * 2)) * 0.04;
      } else {
        // Idle breathing
        const breathe = Math.sin(Date.now() * 0.003) * 0.02;
        leftLeg.rotation.x = 0;
        rightLeg.rotation.x = 0;
        leftArm.rotation.x = breathe;
        rightArm.rotation.x = breathe;
        torso.position.y = 1.32 + breathe;
      }
    };

    return {
      group: root,
      torso,
      head,
      leftArm,
      rightArm,
      leftLeg,
      rightLeg,
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
