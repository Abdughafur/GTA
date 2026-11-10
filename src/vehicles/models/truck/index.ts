import * as THREE from 'three';
import { addBox, addCabin, addVehicleBody, addWheels, createVehicleBuildContext, finishVehicleModel } from '../shared';
import { VehicleMeshRig, VehicleRules } from '../../types';

export const rules: VehicleRules = {
  massKg: 2860, tireGrip: 0.86, suspensionTravel: 0.38,
  steeringResponse: 5, highSpeedSteering: 0.78, brakeMultiplier: 1.3, rollingResistance: 5,
  fuelMultiplier: 1.6, driftGrip: 0.6, collisionRadius: 2.7, wheelRadius: 0.55, suspension: 1.5
};

export function buildTruck(color: number): VehicleMeshRig {
  const ctx = createVehicleBuildContext('truck', color, {
    width: 2.35, length: 6.4, height: 2.7, wheelBase: 3.75, trackWidth: 2.0, wheelRadius: 0.55
  });
  const { width, length } = ctx.dimensions;
  addVehicleBody(ctx, {
    bottomY: 0.325,
    topY: 1.075,
    length: 2.55,
    z: 1.55,
    wheelPositions: [[0, 1.28], [0, -0.72], [0, -1.65]]
  });
  addCabin(ctx, { width: 2.0, height: 1.0, length: 2.1, y: 1.48, z: 1.25 });
  const cargo = new THREE.Group();
  const cargoMaterial = new THREE.MeshStandardMaterial({ color: 0x657077, roughness: 0.78, metalness: 0.28 });
  addBox(ctx, cargo, [width * 0.94, 0.22, 3.45], [0, 0.52, -0.82], cargoMaterial);
  for (const side of [-1, 1]) {
    addBox(ctx, cargo, [0.12, 0.92, 3.5], [side * (width * 0.48), 1.05, -0.82], cargoMaterial);
    for (let rail = 0; rail < 4; rail++) {
      addBox(ctx, cargo, [0.14, 0.08, 3.5], [side * (width * 0.5), 0.7 + rail * 0.2, -0.82], ctx.chromeMaterial);
    }
  }
  addBox(ctx, cargo, [width * 0.94, 0.9, 0.12], [0, 1.0, -2.55], cargoMaterial);
  cargo.position.z = -0.38;
  ctx.body.add(cargo);
  addBox(ctx, ctx.body, [width * 0.92, 0.12, 0.32], [0, 0.3, length * 0.47], ctx.trimMaterial);
  addWheels(ctx, [
    [-1, 1.28], [1, 1.28],
    [-1, -0.72], [1, -0.72],
    [-1, -1.65], [1, -1.65]
  ]);
  return finishVehicleModel(ctx, ['heavy cargo bed', 'six-wheel chassis', 'reinforced cab', 'commercial interior and steering'], (dt, speed, input) => {
    ctx.body.rotation.z = THREE.MathUtils.damp(ctx.body.rotation.z, -input.steer * Math.min(Math.abs(speed) / 130, 0.07), 2.5, dt);
  });
}
