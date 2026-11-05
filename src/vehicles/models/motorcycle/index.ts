import * as THREE from 'three';
import { addBox, addWheels, createVehicleBuildContext, finishVehicleModel } from '../shared';
import { VehicleMeshRig, VehicleRules } from '../../types';

export const rules: VehicleRules = {
  massKg: 245, tireGrip: 1.12, suspensionTravel: 0.26,
  steeringResponse: 13, highSpeedSteering: 0.42, brakeMultiplier: 0.8, rollingResistance: 2,
  fuelMultiplier: 0.55, driftGrip: 1.6, collisionRadius: 1.15, wheelRadius: 0.38, suspension: 0.35
};

export function buildMotorcycle(color: number): VehicleMeshRig {
  const ctx = createVehicleBuildContext('motorcycle', color, {
    width: 0.9, length: 2.55, height: 1.55, wheelBase: 1.75, trackWidth: 0.72, wheelRadius: 0.38
  });
  const { body, bodyMaterial, trimMaterial, chromeMaterial } = ctx;
  addBox(ctx, body, [0.48, 0.42, 1.0], [0, 0.9, 0.05], bodyMaterial);
  addBox(ctx, body, [0.52, 0.55, 0.62], [0, 1.18, 0.48], ctx.glassMaterial);
  addBox(ctx, body, [0.42, 0.14, 0.42], [0, 1.48, 0.38], bodyMaterial);
  addBox(ctx, body, [0.34, 0.16, 0.56], [0, 0.78, -0.42], ctx.interiorMaterial);

  const engine = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.31, 0.48, 12), chromeMaterial);
  engine.rotation.z = Math.PI / 2;
  engine.position.set(0, 0.62, -0.12);
  body.add(engine);
  const frame = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 1.2, 8), trimMaterial);
  frame.rotation.x = Math.PI / 2.5;
  frame.position.set(0, 0.82, 0.12);
  body.add(frame);

  const fork = new THREE.Group();
  for (const side of [-1, 1]) {
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 0.85, 8), chromeMaterial);
    tube.position.set(side * 0.16, 0.84, 0.78);
    tube.rotation.x = -0.18;
    fork.add(tube);
  }
  const handlebar = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.9, 8), trimMaterial);
  handlebar.rotation.z = Math.PI / 2;
  handlebar.position.set(0, 1.34, 0.72);
  fork.add(handlebar);
  fork.position.z = -0.05;
  body.add(fork);

  const windscreen = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.4, 0.08),
    new THREE.MeshPhysicalMaterial({ color: 0x68a1ad, roughness: 0.16, transparent: true, opacity: 0.68 })
  );
  windscreen.position.set(0, 1.52, 0.65);
  body.add(windscreen);
  addWheels(ctx, [[0, 0.89], [0, -0.86]]);

  const rig = finishVehicleModel(ctx, ['two-wheel chassis', 'steerable front fork', 'motorcycle cockpit', 'leaning corner animation']);
  rig.animate = (dt, speed, input) => {
    fork.rotation.y = THREE.MathUtils.damp(fork.rotation.y, -input.steer * 0.38, 7, dt);
    body.rotation.z = THREE.MathUtils.damp(body.rotation.z, -input.steer * Math.min(Math.abs(speed) / 42, 0.42), 4, dt);
  };
  return rig;
}
