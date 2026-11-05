import * as THREE from 'three';
import { addBox, addCabin, addWheels, createVehicleBuildContext, finishVehicleModel } from '../shared';
import { VehicleMeshRig, VehicleRules } from '../../types';

export const rules: VehicleRules = {
  massKg: 1420, tireGrip: 1.18, suspensionTravel: 0.18,
  steeringResponse: 12, highSpeedSteering: 0.52, brakeMultiplier: 1.1, rollingResistance: 2.2,
  fuelMultiplier: 1.3, driftGrip: 1.25, collisionRadius: 2.1, wheelRadius: 0.37, suspension: 0.7
};

export function buildSportsCar(color: number): VehicleMeshRig {
  const ctx = createVehicleBuildContext('sports', color, {
    width: 2.1, length: 4.7, height: 1.15, wheelBase: 2.75, trackWidth: 1.86, wheelRadius: 0.37
  });
  const { width, length } = ctx.dimensions;
  addBox(ctx, ctx.body, [width, 0.42, length], [0, 0.46, 0], ctx.bodyMaterial);
  addBox(ctx, ctx.body, [width * 0.9, 0.18, 1.25], [0, 0.7, 1.15], ctx.bodyMaterial);
  addCabin(ctx, { width: 1.58, height: 0.5, length: 2.12, y: 0.92, z: -0.22, roofColor: 0x18232b });
  addBox(ctx, ctx.body, [width * 1.02, 0.16, length * 0.68], [0, 0.28, 0], ctx.trimMaterial);
  addBox(ctx, ctx.body, [width * 0.94, 0.08, 0.48], [0, 0.92, -length * 0.47], ctx.trimMaterial);
  for (const x of [-0.56, 0.56]) {
    addBox(ctx, ctx.body, [0.07, 0.28, 0.07], [x, 0.77, -length * 0.43], ctx.chromeMaterial);
    addBox(ctx, ctx.body, [0.22, 0.08, 0.35], [x, 0.74, 0.1], ctx.trimMaterial);
  }
  addWheels(ctx);
  const spoiler = new THREE.Group();
  addBox(ctx, spoiler, [1.55, 0.07, 0.26], [0, 0.02, 0], ctx.trimMaterial);
  spoiler.position.set(0, 1.03, -length * 0.47);
  ctx.body.add(spoiler);

  return finishVehicleModel(ctx, ['aerodynamic body', 'sport suspension', 'cockpit interior', 'active rear spoiler'], (dt, speed, input) => {
    spoiler.rotation.x = THREE.MathUtils.damp(spoiler.rotation.x, Math.abs(speed) > 30 ? -0.12 : 0, 4, dt);
    if (ctx.steeringWheel) ctx.steeringWheel.rotation.z = -input.steer * 0.45;
  });
}
