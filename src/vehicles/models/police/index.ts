import * as THREE from 'three';
import { addBox, addCabin, addWheels, createVehicleBuildContext, finishVehicleModel } from '../shared';
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
  addBox(ctx, ctx.body, [width, 0.53, length], [0, 0.5, 0], white);
  addBox(ctx, ctx.body, [width * 0.9, 0.22, 2.2], [0, 0.79, 0.75], ctx.bodyMaterial);
  addCabin(ctx, { width: 1.78, height: 0.62, length: 2.4, y: 1.03, z: -0.16, roofColor: 0x20252c });
  for (const side of [-1, 1]) {
    addBox(ctx, ctx.body, [0.04, 0.28, 1.8], [side * (width * 0.51), 0.68, -0.2], ctx.bodyMaterial);
  }
  addBox(ctx, ctx.body, [width * 0.78, 0.24, 0.18], [0, 0.42, length * 0.52], ctx.chromeMaterial);
  addWheels(ctx);

  const lightbar = new THREE.Group();
  const red = new THREE.Mesh(
    new THREE.BoxGeometry(0.42, 0.15, 0.2),
    new THREE.MeshStandardMaterial({ color: 0xff263a, emissive: 0xff1025, emissiveIntensity: 0.15 })
  );
  const blue = new THREE.Mesh(
    new THREE.BoxGeometry(0.42, 0.15, 0.2),
    new THREE.MeshStandardMaterial({ color: 0x2488ff, emissive: 0x124cff, emissiveIntensity: 0.15 })
  );
  red.position.x = -0.25;
  blue.position.x = 0.25;
  lightbar.add(red, blue);
  lightbar.position.set(0, 1.42, -0.12);
  ctx.body.add(lightbar);
  const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.03, 0.62, 6), ctx.trimMaterial);
  antenna.position.set(-0.68, 1.47, -1.6);
  ctx.body.add(antenna);

  return finishVehicleModel(ctx, ['reinforced patrol chassis', 'alternating emergency lightbar', 'radio antenna', 'police cabin and controls'], (dt, speed, input) => {
    const flash = Math.sin(performance.now() * 0.018) > 0;
    (red.material as THREE.MeshStandardMaterial).emissiveIntensity = flash ? 3 : 0.15;
    (blue.material as THREE.MeshStandardMaterial).emissiveIntensity = flash ? 0.15 : 3;
    if (ctx.steeringWheel) ctx.steeringWheel.rotation.z = -input.steer * 0.42;
  }, { red, blue });
}
