import * as THREE from 'three';
import { addBox, addCabin, addVehicleBody, addWheels, createVehicleBuildContext, finishVehicleModel } from '../shared';
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
  const { width } = ctx.dimensions;
  addVehicleBody(ctx, { bottomY: 0.24, topY: 0.72 });
  addCabin(ctx, { width: 1.7, height: 0.62, length: 2.35, y: 1.0, z: -0.12 });
  addWheels(ctx);

  return finishVehicleModel(ctx, ['four-door cabin', 'independent front steering', 'detailed interior', 'responsive road suspension'], (dt, speed, input) => {
    ctx.body.position.y = Math.sin(performance.now() * 0.008) * Math.min(Math.abs(speed) / 1600, 0.018);
  });
}
