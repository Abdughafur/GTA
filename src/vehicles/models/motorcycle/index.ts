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
  ctx.interiorCameraPosition.set(0, 1.52, 0.3);
  const { body, bodyMaterial, trimMaterial, chromeMaterial } = ctx;
  const tank = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 12), bodyMaterial);
  tank.scale.set(0.52, 0.47, 0.95);
  tank.position.set(0, 1.02, 0.02);
  body.add(tank);

  const frontFairing = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 12), bodyMaterial);
  frontFairing.scale.set(0.48, 0.72, 0.46);
  frontFairing.position.set(0, 1.16, 0.52);
  body.add(frontFairing);

  const seat = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.19, 0.38, 4, 10),
    ctx.interiorMaterial
  );
  seat.rotation.z = Math.PI / 2;
  seat.scale.set(1, 0.68, 0.8);
  seat.position.set(0, 0.84, -0.45);
  body.add(seat);

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
  for (const side of [-1, 1]) {
    const mirrorStem = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.018, 0.22, 6), chromeMaterial);
    mirrorStem.position.set(side * 0.39, 1.47, 0.69);
    mirrorStem.rotation.z = side * 0.35;
    fork.add(mirrorStem);
    const mirror = new THREE.Mesh(new THREE.SphereGeometry(0.065, 8, 6), trimMaterial);
    mirror.scale.set(0.55, 1, 0.75);
    mirror.position.set(side * 0.43, 1.57, 0.66);
    mirror.name = 'vehicle-mirror';
    ctx.damageParts.mirrors.push(mirror);
    fork.add(mirror);
  }
  fork.position.z = -0.05;
  body.add(fork);

  const instrumentHousing = new THREE.Mesh(
    new THREE.BoxGeometry(0.28, 0.09, 0.08),
    trimMaterial
  );
  instrumentHousing.position.set(0, 1.32, 0.47);
  body.add(instrumentHousing);
  const instrumentScreen = new THREE.Mesh(
    new THREE.BoxGeometry(0.21, 0.055, 0.012),
    new THREE.MeshStandardMaterial({
      color: 0x071827,
      emissive: 0x07384e,
      emissiveIntensity: 0.9,
      roughness: 0.24
    })
  );
  instrumentScreen.position.set(0, 1.33, 0.516);
  body.add(instrumentScreen);
  const speedNeedle = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.035, 0.008), chromeMaterial);
  speedNeedle.position.set(0, 1.33, 0.525);
  body.add(speedNeedle);

  const windscreen = new THREE.Mesh(
    new THREE.SphereGeometry(0.5, 16, 12),
    new THREE.MeshPhysicalMaterial({ color: 0x68a1ad, roughness: 0.16, transparent: true, opacity: 0.68 })
  );
  windscreen.scale.set(0.32, 0.46, 0.08);
  windscreen.position.set(0, 1.5, 0.66);
  body.add(windscreen);
  addWheels(ctx, [[0, 0.89], [0, -0.86]]);

  const rig = finishVehicleModel(ctx, ['two-wheel chassis', 'steerable front fork', 'motorcycle cockpit', 'leaning corner animation']);
  rig.speedNeedle = speedNeedle;
  rig.animate = (dt, speed, input) => {
    fork.rotation.y = THREE.MathUtils.damp(fork.rotation.y, -input.steer * 0.38, 7, dt);
    body.rotation.z = THREE.MathUtils.damp(body.rotation.z, -input.steer * Math.min(Math.abs(speed) / 42, 0.42), 4, dt);
  };
  return rig;
}
