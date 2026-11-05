import * as THREE from 'three';
import { VehicleAnimationInput, VehicleMeshRig, VehicleType } from '../types';

export interface VehicleDimensions {
  width: number;
  length: number;
  height: number;
  wheelBase: number;
  trackWidth: number;
  wheelRadius: number;
}

export interface VehicleBuildContext {
  type: VehicleType;
  root: THREE.Group;
  body: THREE.Group;
  bodyMaterial: THREE.MeshStandardMaterial;
  glassMaterial: THREE.MeshPhysicalMaterial;
  trimMaterial: THREE.MeshStandardMaterial;
  chromeMaterial: THREE.MeshStandardMaterial;
  interiorMaterial: THREE.MeshStandardMaterial;
  tireMaterial: THREE.MeshStandardMaterial;
  dimensions: VehicleDimensions;
  headlights: THREE.Mesh[];
  taillights: THREE.Mesh[];
  wheels: THREE.Group[];
  leftDoorPivot?: THREE.Group;
  rightDoorPivot?: THREE.Group;
  steeringWheel?: THREE.Group;
}

const defaultDimensions: VehicleDimensions = {
  width: 2,
  length: 4.5,
  height: 1.4,
  wheelBase: 2.65,
  trackWidth: 1.75,
  wheelRadius: 0.39
};

export function createVehicleBuildContext(type: VehicleType, colorHex: number, overrides: Partial<VehicleDimensions> = {}): VehicleBuildContext {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const dimensions = { ...defaultDimensions, ...overrides };
  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: type === 'police' ? 0x18202b : type === 'ambulance' ? 0xf1eee5 : type === 'taxi' ? 0xf4c52f : colorHex,
    roughness: 0.24,
    metalness: 0.48
  });
  const glassMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x438092,
    roughness: 0.15,
    metalness: 0.16,
    transparent: true,
    opacity: 0.72,
    clearcoat: 0.9
  });
  const trimMaterial = new THREE.MeshStandardMaterial({ color: 0x20262c, roughness: 0.48, metalness: 0.38 });
  const chromeMaterial = new THREE.MeshStandardMaterial({ color: 0xc8d0d5, roughness: 0.2, metalness: 0.9 });
  const interiorMaterial = new THREE.MeshStandardMaterial({ color: 0x343a3d, roughness: 0.8 });
  const tireMaterial = new THREE.MeshStandardMaterial({ color: 0x171a1d, roughness: 0.9 });

  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(dimensions.width * 1.9, dimensions.length * 1.5),
    new THREE.MeshBasicMaterial({ color: 0x10151b, transparent: true, opacity: 0.2, depthWrite: false })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.025;
  root.add(shadow);

  return {
    type, root, body, bodyMaterial, glassMaterial, trimMaterial, chromeMaterial,
    interiorMaterial, tireMaterial, dimensions, headlights: [], taillights: [], wheels: []
  };
}

export function addBox(
  ctx: VehicleBuildContext,
  parent: THREE.Group,
  size: [number, number, number],
  position: [number, number, number],
  material: THREE.Material
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.userData.vehicleType = ctx.type;
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

export function addCabin(
  ctx: VehicleBuildContext,
  options: { width: number; height: number; length: number; y: number; z?: number; roofColor?: number }
) {
  const { width, height, length, y, z = -0.15 } = options;
  const cabin = addBox(ctx, ctx.body, [width, height, length], [0, y, z], ctx.glassMaterial);
  cabin.material = ctx.glassMaterial;

  const roofMaterial = options.roofColor === undefined
    ? ctx.bodyMaterial
    : new THREE.MeshStandardMaterial({ color: options.roofColor, roughness: 0.32, metalness: 0.28 });
  addBox(ctx, ctx.body, [width * 0.94, 0.12, length * 0.92], [0, y + height * 0.48, z], roofMaterial);

  addInterior(ctx, width, length, y, z);
  addDoors(ctx, length, y - height * 0.34);
}

function addInterior(ctx: VehicleBuildContext, width: number, length: number, cabinY: number, cabinZ: number) {
  const seatMaterial = new THREE.MeshStandardMaterial({ color: 0x282e32, roughness: 0.84 });
  const seatZ = cabinZ - length * 0.12;
  for (const x of [-width * 0.24, width * 0.24]) {
    addBox(ctx, ctx.body, [0.43, 0.42, 0.4], [x, cabinY - 0.16, seatZ], seatMaterial);
    addBox(ctx, ctx.body, [0.43, 0.5, 0.13], [x, cabinY + 0.1, seatZ - 0.12], seatMaterial);
  }

  addBox(ctx, ctx.body, [width * 0.82, 0.12, 0.16], [0, cabinY - 0.12, cabinZ + length * 0.37], ctx.trimMaterial);
  const steering = new THREE.Group();
  steering.position.set(-width * 0.2, cabinY - 0.03, cabinZ + length * 0.27);
  const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.025, 8, 20), ctx.trimMaterial);
  wheel.rotation.y = Math.PI / 2;
  steering.add(wheel);
  ctx.body.add(steering);
  ctx.steeringWheel = steering;
}

function addDoors(ctx: VehicleBuildContext, length: number, y: number) {
  const doorLength = Math.min(1.25, length * 0.29);
  const doorHeight = 0.5;
  for (const side of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(side * ctx.dimensions.width * 0.5, y, 0.4);
    addBox(ctx, pivot, [0.065, doorHeight, doorLength], [side * 0.025, 0, -doorLength * 0.5], ctx.bodyMaterial);
    addBox(ctx, pivot, [0.045, 0.3, doorLength * 0.76], [side * 0.02, doorHeight * 0.52, -doorLength * 0.5], ctx.glassMaterial);
    ctx.body.add(pivot);
    if (side < 0) ctx.leftDoorPivot = pivot;
    else ctx.rightDoorPivot = pivot;
  }
}

export function addWheels(ctx: VehicleBuildContext, positions?: Array<[number, number]>) {
  const { width, wheelBase, wheelRadius, trackWidth } = ctx.dimensions;
  const wheelPositions = positions ?? [
    [-trackWidth / 2, wheelBase / 2],
    [trackWidth / 2, wheelBase / 2],
    [-trackWidth / 2, -wheelBase / 2],
    [trackWidth / 2, -wheelBase / 2]
  ];

  for (const [x, z] of wheelPositions) {
    const wheel = new THREE.Group();
    const axle = new THREE.Group();
    const radius = wheelRadius;
    const tireGeo = new THREE.CylinderGeometry(radius, radius, 0.3, 20);
    tireGeo.rotateZ(Math.PI / 2);
    const tire = new THREE.Mesh(tireGeo, ctx.tireMaterial);
    tire.castShadow = true;
    axle.add(tire);

    const rimGeo = new THREE.CylinderGeometry(radius * 0.66, radius * 0.66, 0.32, 16);
    rimGeo.rotateZ(Math.PI / 2);
    axle.add(new THREE.Mesh(rimGeo, ctx.chromeMaterial));
    const hubGeo = new THREE.CylinderGeometry(radius * 0.19, radius * 0.19, 0.34, 12);
    hubGeo.rotateZ(Math.PI / 2);
    axle.add(new THREE.Mesh(hubGeo, ctx.trimMaterial));
    wheel.add(axle);
    wheel.position.set(x, radius, z);
    wheel.userData.baseRideHeight = radius;
    wheel.userData.frontAxle = z > 0;
    wheel.userData.side = Math.sign(x);
    ctx.root.add(wheel);
    ctx.wheels.push(wheel);
  }
}

export function addRoadLights(ctx: VehicleBuildContext) {
  const { width, length } = ctx.dimensions;
  const headlightMat = new THREE.MeshStandardMaterial({
    color: 0xfff8d9,
    emissive: 0xffedb5,
    emissiveIntensity: 1.2,
    roughness: 0.2
  });
  const taillightMat = new THREE.MeshStandardMaterial({
    color: 0x8c1720,
    emissive: 0xe5232d,
    emissiveIntensity: 0.65,
    roughness: 0.25
  });
  for (const x of [-width * 0.38, width * 0.38]) {
    const headlight = addBox(ctx, ctx.body, [0.3, 0.16, 0.08], [x, 0.48, length * 0.505], headlightMat);
    ctx.headlights.push(headlight);
    const taillight = addBox(ctx, ctx.body, [0.3, 0.16, 0.08], [x, 0.52, -length * 0.505], taillightMat);
    ctx.taillights.push(taillight);
  }
}

export function finishVehicleModel(
  ctx: VehicleBuildContext,
  features: readonly string[],
  animate?: (dt: number, speed: number, input: VehicleAnimationInput) => void,
  sirenMeshes?: VehicleMeshRig['sirenMeshes']
): VehicleMeshRig {
  addRoadLights(ctx);
  const frontWheels = ctx.wheels.filter((wheel) => wheel.userData.frontAxle);
  const frontLeftWheel = frontWheels[0] ?? ctx.wheels[0];
  const frontRightWheel = frontWheels[1] ?? frontLeftWheel;
  if (!frontLeftWheel) throw new Error(`Vehicle model "${ctx.type}" must define at least one wheel`);

  return {
    group: ctx.root,
    body: ctx.body,
    wheels: ctx.wheels,
    frontLeftWheel,
    frontRightWheel,
    headlights: ctx.headlights,
    taillights: ctx.taillights,
    leftDoorPivot: ctx.leftDoorPivot,
    rightDoorPivot: ctx.rightDoorPivot,
    sirenMeshes,
    steeringWheel: ctx.steeringWheel,
    features,
    animate
  };
}
