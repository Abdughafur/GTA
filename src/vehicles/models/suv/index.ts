import * as THREE from 'three';
import { addBox, addCabin, addWheels, createVehicleBuildContext, finishVehicleModel } from '../shared';
import { VehicleMeshRig, VehicleRules } from '../../types';

export const rules: VehicleRules = {
  massKg: 2180, tireGrip: 0.92, suspensionTravel: 0.32,
  steeringResponse: 7, highSpeedSteering: 0.72, brakeMultiplier: 1.08, rollingResistance: 4.4,
  fuelMultiplier: 1.25, driftGrip: 0.78, collisionRadius: 2.35, wheelRadius: 0.46, suspension: 1.25
};

export function buildSuv(color: number): VehicleMeshRig {
  const ctx = createVehicleBuildContext('suv', color, {
    width: 2.25, length: 4.95, height: 1.88, wheelBase: 2.92, trackWidth: 1.98, wheelRadius: 0.46
  });
  const { width, length } = ctx.dimensions;
  addBox(ctx, ctx.body, [width, 0.67, length], [0, 0.62, 0], ctx.bodyMaterial);
  addBox(ctx, ctx.body, [width * 0.9, 0.18, 1.1], [0, 0.92, 1.62], ctx.bodyMaterial);
  addCabin(ctx, { width: 1.96, height: 0.78, length: 3.05, y: 1.42, z: -0.2 });
  addBox(ctx, ctx.body, [width * 0.82, 0.08, length * 0.58], [0, 1.9, -0.15], ctx.chromeMaterial);
  for (const x of [-0.78, 0.78]) {
    addBox(ctx, ctx.body, [0.07, 0.08, 2.7], [x, 1.96, -0.15], ctx.trimMaterial);
    addBox(ctx, ctx.body, [0.12, 0.46, 0.12], [x, 1.7, 0.85], ctx.chromeMaterial);
    addBox(ctx, ctx.body, [0.12, 0.46, 0.12], [x, 1.7, -1.15], ctx.chromeMaterial);
  }
  addBox(ctx, ctx.body, [1.0, 0.72, 0.14], [0, 0.9, -length * 0.52], ctx.trimMaterial);
  addWheels(ctx);

  return finishVehicleModel(ctx, ['raised ride height', 'reinforced bumpers', 'roof rack', 'rear cargo cabin', 'all-terrain wheels'], (dt, speed, input) => {
    ctx.body.rotation.z = THREE.MathUtils.damp(ctx.body.rotation.z, -input.steer * Math.min(Math.abs(speed) / 90, 0.09), 3, dt);
    if (ctx.steeringWheel) ctx.steeringWheel.rotation.z = -input.steer * 0.48;
  });
}
