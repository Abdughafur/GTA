import * as THREE from 'three';
import { addBox, addCabin, addVehicleBody, addWheels, createVehicleBuildContext, finishVehicleModel } from '../shared';
import { VehicleMeshRig, VehicleRules } from '../../types';

export const rules: VehicleRules = {
  massKg: 2450, tireGrip: 0.88, suspensionTravel: 0.34,
  steeringResponse: 7, highSpeedSteering: 0.72, brakeMultiplier: 1.12, rollingResistance: 4,
  fuelMultiplier: 1.4, driftGrip: 0.7, collisionRadius: 2.45, wheelRadius: 0.42, suspension: 1.35
};

export function buildAmbulance(color: number): VehicleMeshRig {
  const ctx = createVehicleBuildContext('ambulance', color, {
    width: 2.12, length: 5.2, height: 2.28, wheelBase: 3.05, trackWidth: 1.84, wheelRadius: 0.42
  });
  const { width, length } = ctx.dimensions;
  const white = new THREE.MeshStandardMaterial({ color: 0xf2eee3, roughness: 0.48 });
  const red = new THREE.MeshStandardMaterial({ color: 0xc52c32, roughness: 0.4, metalness: 0.1 });
  addVehicleBody(ctx, { bottomY: 0.3, topY: 0.94, material: white });
  addBox(ctx, ctx.body, [width * 0.94, 1.42, 2.75], [0, 1.68, -0.72], white);
  addCabin(ctx, { width: 1.78, height: 0.68, length: 1.55, y: 1.14, z: 1.0 });
  for (const side of [-1, 1]) {
    addBox(ctx, ctx.body, [0.045, 0.2, 2.55], [side * (width * 0.48), 1.1, -0.68], red);
    addBox(ctx, ctx.body, [0.06, 0.46, 0.08], [side * (width * 0.51), 1.62, -0.6], ctx.chromeMaterial);
  }
  addBox(ctx, ctx.body, [0.46, 0.48, 0.06], [0, 1.68, -2.13], red);
  addBox(ctx, ctx.body, [0.12, 0.56, 0.07], [0, 1.68, -2.16], white);
  addWheels(ctx);

  const redLight = new THREE.Mesh(
    new THREE.BoxGeometry(0.36, 0.15, 0.24),
    new THREE.MeshStandardMaterial({ color: 0xff293a, emissive: 0xff1828, emissiveIntensity: 0.2 })
  );
  const blueLight = new THREE.Mesh(
    new THREE.BoxGeometry(0.36, 0.15, 0.24),
    new THREE.MeshStandardMaterial({ color: 0x338cff, emissive: 0x174dff, emissiveIntensity: 0.2 })
  );
  redLight.position.set(-0.28, 2.43, -0.7);
  blueLight.position.set(0.28, 2.43, -0.7);
  ctx.body.add(redLight, blueLight);

  return finishVehicleModel(ctx, ['medical transport cabin', 'rear treatment bay', 'emergency striping', 'roof-mounted warning lights'], (dt, speed, input) => {
    const flash = Math.sin(performance.now() * 0.02) > 0;
    (redLight.material as THREE.MeshStandardMaterial).emissiveIntensity = flash ? 3 : 0.2;
    (blueLight.material as THREE.MeshStandardMaterial).emissiveIntensity = flash ? 0.2 : 3;
  }, { red: redLight, blue: blueLight });
}
