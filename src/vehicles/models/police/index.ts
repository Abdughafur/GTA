import * as THREE from 'three';
import { addBox, addCabin, addVehicleBody, addWheels, createVehicleBuildContext, finishVehicleModel } from '../shared';
import { VehicleMeshRig, VehicleRules } from '../../types';

export const rules: VehicleRules = {
  massKg: 1770, tireGrip: 1.08, suspensionTravel: 0.2,
  steeringResponse: 11, highSpeedSteering: 0.6, brakeMultiplier: 1.2, rollingResistance: 3.2,
  fuelMultiplier: 1.1, driftGrip: 1, collisionRadius: 2.2, wheelRadius: 0.4, suspension: 0.9
};

export function buildPoliceCar(color: number): VehicleMeshRig {
  const ctx = createVehicleBuildContext('police', color, {
    width: 2.08, length: 4.8, height: 1.5, wheelBase: 2.82, trackWidth: 1.84, wheelRadius: 0.4
  });
  const { width, length } = ctx.dimensions;
  const white = new THREE.MeshStandardMaterial({ color: 0xe9e9df, roughness: 0.32, metalness: 0.2 });
  const navy = new THREE.MeshStandardMaterial({ color: 0x101b2a, roughness: 0.28, metalness: 0.42 });
  const stripe = new THREE.MeshStandardMaterial({ color: 0x284d73, roughness: 0.36, metalness: 0.35 });
  const screen = new THREE.MeshStandardMaterial({
    color: 0x7dd3fc,
    emissive: 0x147ba3,
    emissiveIntensity: 1.1,
    roughness: 0.22
  });
  const gold = new THREE.MeshStandardMaterial({ color: 0xd5b85a, roughness: 0.32, metalness: 0.78 });

  addVehicleBody(ctx, { bottomY: 0.235, topY: 0.765, material: white });
  addBox(ctx, ctx.body, [width * 0.88, 0.075, 1.35], [0, 0.79, 1.43], navy);
  addBox(ctx, ctx.body, [width * 0.86, 0.07, 0.62], [0, 0.78, -1.86], navy);
  addCabin(ctx, { width: 1.78, height: 0.62, length: 2.4, y: 1.03, z: -0.16, roofColor: 0x111a26 });

  for (const side of [-1, 1]) {
    addBox(ctx, ctx.body, [0.045, 0.09, 2.16], [side * (width * 0.51), 0.59, -0.12], stripe);
    addBox(ctx, ctx.body, [0.07, 0.24, 0.18], [side * (width * 0.52), 0.83, 0.55], navy);
    addBox(ctx, ctx.body, [0.2, 0.12, 0.32], [side * 1.05, 0.97, 0.55], navy);

    const emblem = new THREE.Mesh(new THREE.CircleGeometry(0.19, 8), gold);
    emblem.position.set(side * (width * 0.51 + 0.012), 0.75, -0.32);
    emblem.rotation.y = side * Math.PI / 2;
    ctx.body.add(emblem);
    const emblemCenter = new THREE.Mesh(new THREE.CircleGeometry(0.105, 8), navy);
    emblemCenter.position.copy(emblem.position);
    emblemCenter.position.x += side * 0.008;
    emblemCenter.rotation.copy(emblem.rotation);
    ctx.body.add(emblemCenter);
  }

  addBox(ctx, ctx.body, [width * 0.78, 0.18, 0.055], [0, 0.52, length * 0.505], navy);
  for (const y of [0.49, 0.55, 0.61]) {
    addBox(ctx, ctx.body, [width * 0.34, 0.018, 0.025], [0, y, length * 0.54], ctx.chromeMaterial);
  }
  addBox(ctx, ctx.body, [width * 0.9, 0.11, 0.12], [0, 0.3, length * 0.52], navy);
  addBox(ctx, ctx.body, [width * 0.9, 0.11, 0.12], [0, 0.3, -length * 0.52], navy);
  addWheels(ctx);

  const cabinY = 1.03;
  const cabinZ = -0.16;
  addBox(ctx, ctx.body, [1.32, 0.12, 0.16], [0, 0.77, cabinZ + 0.72], ctx.trimMaterial);
  addBox(ctx, ctx.body, [0.36, 0.19, 0.045], [0, 0.88, cabinZ + 0.76], screen);
  addBox(ctx, ctx.body, [0.38, 0.15, 0.32], [0, 0.61, cabinZ + 0.18], ctx.trimMaterial);
  const gearStem = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 0.18, 8), ctx.chromeMaterial);
  gearStem.position.set(-0.2, 0.72, cabinZ + 0.16);
  gearStem.rotation.x = -0.2;
  ctx.body.add(gearStem);
  const gearKnob = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), navy);
  gearKnob.position.set(-0.2, 0.82, cabinZ + 0.14);
  ctx.body.add(gearKnob);

  addBox(ctx, ctx.body, [0.22, 0.12, 0.1], [0.27, 0.82, cabinZ + 0.47], navy);
  addBox(ctx, ctx.body, [0.15, 0.07, 0.025], [0.27, 0.86, cabinZ + 0.53], screen);
  for (let index = 0; index < 3; index++) {
    addBox(ctx, ctx.body, [0.035, 0.025, 0.025], [0.21 + index * 0.06, 0.76, cabinZ + 0.53], gold);
  }

  for (let index = 0; index < 3; index++) {
    const pedal = addBox(
      ctx,
      ctx.body,
      [0.09, 0.12, 0.035],
      [-0.42 + index * 0.13, 0.42, cabinZ + 1.02],
      ctx.trimMaterial
    );
    pedal.rotation.x = -0.2;
  }

  addBox(ctx, ctx.body, [0.42, 0.055, 0.1], [0, cabinY + 0.22, cabinZ + 0.78], navy);
  addBox(ctx, ctx.body, [1.35, 0.035, 0.04], [0, 0.75, cabinZ - 0.55], ctx.chromeMaterial);
  for (const x of [-0.62, -0.3, 0, 0.3, 0.62]) {
    addBox(ctx, ctx.body, [0.025, 0.36, 0.025], [x, 0.94, cabinZ - 0.55], ctx.trimMaterial);
  }

  const lightbar = new THREE.Group();
  const lightbarBase = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.1, 0.28), navy);
  const red = new THREE.Mesh(
    new THREE.BoxGeometry(0.38, 0.17, 0.2),
    new THREE.MeshStandardMaterial({ color: 0xff263a, emissive: 0xff1025, emissiveIntensity: 0.15 })
  );
  const blue = new THREE.Mesh(
    new THREE.BoxGeometry(0.38, 0.17, 0.2),
    new THREE.MeshStandardMaterial({ color: 0x2488ff, emissive: 0x124cff, emissiveIntensity: 0.15 })
  );
  red.position.x = -0.25;
  blue.position.x = 0.25;
  red.position.y = 0.11;
  blue.position.y = 0.11;
  lightbar.add(lightbarBase, red, blue);
  lightbar.position.set(0, 1.42, -0.12);
  ctx.body.add(lightbar);
  const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.03, 0.62, 6), ctx.trimMaterial);
  antenna.position.set(-0.68, 1.47, -1.6);
  ctx.body.add(antenna);

  return finishVehicleModel(ctx, [
    'reinforced patrol chassis',
    'black privacy glass',
    'detailed police cockpit and controls',
    'alternating emergency lightbar',
    'radio antenna and door insignias'
  ], (dt, speed, input) => {
    const flash = Math.sin(performance.now() * 0.018) > 0;
    (red.material as THREE.MeshStandardMaterial).emissiveIntensity = flash ? 3 : 0.15;
    (blue.material as THREE.MeshStandardMaterial).emissiveIntensity = flash ? 0.15 : 3;
  }, { red, blue });
}
