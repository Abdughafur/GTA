import * as THREE from 'three';
import { addBox, addCabin, addWheels, createVehicleBuildContext, finishVehicleModel } from '../shared';
import { VehicleMeshRig, VehicleRules } from '../../types';

export const rules: VehicleRules = {
  massKg: 1640, tireGrip: 1, suspensionTravel: 0.24,
  steeringResponse: 9, highSpeedSteering: 0.62, brakeMultiplier: 1, rollingResistance: 3.5,
  fuelMultiplier: 0.9, driftGrip: 1, collisionRadius: 2.1, wheelRadius: 0.39, suspension: 1
};

export function buildSedan(color: number): VehicleMeshRig {
  const ctx = createVehicleBuildContext('sedan', color, {
    width: 2.02, length: 4.65, height: 1.48, wheelBase: 2.72, trackWidth: 1.78, wheelRadius: 0.39
  });
  const { width, length } = ctx.dimensions;
  addBox(ctx, ctx.body, [width, 0.48, length], [0, 0.48, 0], ctx.bodyMaterial);
  addBox(ctx, ctx.body, [width * 0.94, 0.24, 1.0], [0, 0.69, 1.35], ctx.bodyMaterial);
  addBox(ctx, ctx.body, [width * 0.95, 0.22, 0.78], [0, 0.64, -1.65], ctx.bodyMaterial);
  addCabin(ctx, { width: 1.7, height: 0.62, length: 2.35, y: 1.0, z: -0.12 });
  addBox(ctx, ctx.body, [0.12, 0.1, 0.35], [0, 0.27, length * 0.51], ctx.chromeMaterial);
  addBox(ctx, ctx.body, [0.12, 0.1, 0.35], [0, 0.29, -length * 0.51], ctx.chromeMaterial);
  addWheels(ctx);

  return finishVehicleModel(ctx, ['four-door cabin', 'independent front steering', 'detailed interior', 'responsive road suspension'], (dt, speed, input) => {
    if (ctx.steeringWheel) ctx.steeringWheel.rotation.z = THREE.MathUtils.damp(ctx.steeringWheel.rotation.z, -input.steer * 0.4, 8, dt);
    ctx.body.position.y = Math.sin(performance.now() * 0.008) * Math.min(Math.abs(speed) / 1600, 0.018);
  });
}
