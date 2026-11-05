import * as THREE from 'three';
import { addBox, addCabin, addWheels, createVehicleBuildContext, finishVehicleModel } from '../shared';
import { VehicleMeshRig, VehicleRules } from '../../types';

export const rules: VehicleRules = {
  massKg: 1580, tireGrip: 0.98, suspensionTravel: 0.22,
  steeringResponse: 9, highSpeedSteering: 0.65, brakeMultiplier: 1, rollingResistance: 3.4,
  fuelMultiplier: 0.8, driftGrip: 1, collisionRadius: 2.1, wheelRadius: 0.39, suspension: 1
};

export function buildTaxi(color: number): VehicleMeshRig {
  const ctx = createVehicleBuildContext('taxi', color, {
    width: 2.02, length: 4.65, height: 1.48, wheelBase: 2.72, trackWidth: 1.78, wheelRadius: 0.39
  });
  const { width, length } = ctx.dimensions;
  addBox(ctx, ctx.body, [width, 0.48, length], [0, 0.48, 0], ctx.bodyMaterial);
  addBox(ctx, ctx.body, [width * 0.94, 0.24, 1.05], [0, 0.69, 1.35], ctx.bodyMaterial);
  addCabin(ctx, { width: 1.7, height: 0.62, length: 2.35, y: 1.0, z: -0.12 });

  const checkerMaterial = new THREE.MeshStandardMaterial({ color: 0x202327, roughness: 0.75 });
  for (const side of [-1, 1]) {
    for (let tile = 0; tile < 5; tile++) {
      if (tile % 2 === 0) {
        addBox(ctx, ctx.body, [0.035, 0.13, 0.23], [side * (width * 0.51), 0.77, -0.7 + tile * 0.25], checkerMaterial);
      }
    }
  }

  const roofSign = new THREE.Group();
  addBox(ctx, roofSign, [0.68, 0.16, 0.28], [0, 0.08, 0], checkerMaterial);
  addBox(ctx, roofSign, [0.6, 0.2, 0.22], [0, 0.23, 0], new THREE.MeshStandardMaterial({
    color: 0xffe28a, emissive: 0xd79c36, emissiveIntensity: 0.45
  }));
  roofSign.position.set(0, 1.43, -0.1);
  ctx.body.add(roofSign);
  addWheels(ctx);

  return finishVehicleModel(ctx, ['commercial four-door interior', 'roof taxi sign', 'checker livery', 'passenger-ready rear seats'], (dt, speed, input) => {
    roofSign.rotation.z = Math.sin(performance.now() * 0.003) * 0.015;
    if (ctx.steeringWheel) ctx.steeringWheel.rotation.z = -input.steer * 0.4;
  });
}
