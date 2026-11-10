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
    color: type === 'police' ? 0x060b12 : 0x438092,
    roughness: 0.15,
    metalness: type === 'police' ? 0.32 : 0.16,
    transparent: true,
    opacity: type === 'police' ? 0.9 : 0.72,
    clearcoat: 0.9
  });
  const trimMaterial = new THREE.MeshStandardMaterial({ color: 0x20262c, roughness: 0.48, metalness: 0.38 });
  const chromeMaterial = new THREE.MeshStandardMaterial({ color: 0xc8d0d5, roughness: 0.2, metalness: 0.9 });
  const interiorMaterial = new THREE.MeshStandardMaterial({ color: 0x343a3d, roughness: 0.8 });
  const tireMaterial = new THREE.MeshStandardMaterial({ color: 0x171a1d, roughness: 0.9 });
  const interiorColors: Record<VehicleType, number> = {
    sports: 0x171a20,
    sedan: 0x323840,
    taxi: 0x34312a,
    police: 0x20262d,
    suv: 0x51483e,
    ambulance: 0x55514b,
    truck: 0x3e4543,
    motorcycle: 0x29221e
  };
  interiorMaterial.color.setHex(interiorColors[type]);

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

export function addVehicleBody(
  ctx: VehicleBuildContext,
  options: {
    bottomY: number;
    topY: number;
    length?: number;
    z?: number;
    material?: THREE.Material;
    wheelPositions?: Array<[number, number]>;
  }
) {
  const { width, length: fullLength } = ctx.dimensions;
  const length = options.length ?? fullLength;
  const z = options.z ?? 0;
  const bottomY = options.bottomY;
  const topY = options.topY;
  const bodyHeight = topY - bottomY;
  const shape = new THREE.Shape();
  shape.moveTo(length * 0.5, bottomY + bodyHeight * 0.1);
  shape.quadraticCurveTo(
    length * 0.5,
    bottomY + bodyHeight * 0.32,
    length * 0.4,
    bottomY + bodyHeight * 0.4
  );
  shape.quadraticCurveTo(
    length * 0.32,
    bottomY + bodyHeight * 0.52,
    length * 0.2,
    topY - bodyHeight * 0.12
  );
  shape.lineTo(length * 0.12, topY);
  shape.lineTo(-length * 0.22, topY);
  shape.quadraticCurveTo(
    -length * 0.34,
    topY,
    -length * 0.38,
    bottomY + bodyHeight * 0.68
  );
  shape.lineTo(-length * 0.48, bottomY + bodyHeight * 0.34);
  shape.quadraticCurveTo(-length * 0.5, bottomY + bodyHeight * 0.22, -length * 0.5, bottomY + bodyHeight * 0.1);
  shape.lineTo(-length * 0.48, bottomY);
  shape.lineTo(length * 0.48, bottomY);
  shape.closePath();

  const wheelPositions = options.wheelPositions ?? [
    [-ctx.dimensions.wheelBase / 2, ctx.dimensions.trackWidth / 2],
    [ctx.dimensions.wheelBase / 2, ctx.dimensions.trackWidth / 2]
  ];
  const wheelArches = [...new Set(wheelPositions.map(([, wheelZ]) => wheelZ))];
  for (const wheelZ of wheelArches) {
    const arch = new THREE.Path();
    arch.absarc(wheelZ - z, ctx.dimensions.wheelRadius, ctx.dimensions.wheelRadius * 1.18, 0, Math.PI * 2, true);
    shape.holes.push(arch);
  }

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: width - 0.08,
    bevelEnabled: true,
    bevelSegments: 3,
    bevelSize: 0.045,
    bevelThickness: 0.045,
    steps: 1
  });
  geometry.rotateY(-Math.PI / 2);
  geometry.translate((width - 0.08) / 2, 0, z);
  const shell = new THREE.Mesh(geometry, options.material ?? ctx.bodyMaterial);
  shell.castShadow = true;
  shell.receiveShadow = true;
  ctx.body.add(shell);

  const bumperY = bottomY + bodyHeight * 0.12;
  addBox(ctx, ctx.body, [width * 0.88, 0.12, 0.16], [0, bumperY, z + length * 0.49], ctx.trimMaterial);
  addBox(ctx, ctx.body, [width * 0.88, 0.12, 0.16], [0, bumperY, z - length * 0.49], ctx.trimMaterial);

  const grille = addBox(
    ctx,
    ctx.body,
    [width * 0.32, bodyHeight * 0.22, 0.035],
    [0, bumperY + bodyHeight * 0.2, z + length * 0.495],
    ctx.trimMaterial
  );
  grille.castShadow = false;

  for (const side of [-1, 1]) {
    const handle = addBox(
      ctx,
      ctx.body,
      [0.035, 0.045, Math.min(0.18, length * 0.045)],
      [side * (width * 0.49), bottomY + bodyHeight * 0.78, z - length * 0.06],
      ctx.chromeMaterial
    );
    handle.castShadow = false;
  }
}

export function addCabin(
  ctx: VehicleBuildContext,
  options: { width: number; height: number; length: number; y: number; z?: number; roofColor?: number }
) {
  const { width, height, length, y, z = -0.15 } = options;
  const bottomY = y - height * 0.34;
  const roofY = y + height * 0.48;
  const glassMaterial = ctx.glassMaterial.clone();
  glassMaterial.side = THREE.DoubleSide;
  glassMaterial.opacity = ctx.type === 'police' ? 0.88 : 0.4;

  const roofMaterial = options.roofColor === undefined
    ? ctx.bodyMaterial
    : new THREE.MeshStandardMaterial({ color: options.roofColor, roughness: 0.32, metalness: 0.28 });
  addBox(ctx, ctx.body, [width * 0.88, 0.12, length * 0.74], [0, roofY, z - length * 0.02], roofMaterial);

  const addPane = (vertices: THREE.Vector3[]) => {
    const geometry = new THREE.BufferGeometry();
    geometry.setFromPoints(vertices);
    geometry.setIndex([0, 1, 2, 0, 2, 3]);
    geometry.computeVertexNormals();
    const pane = new THREE.Mesh(geometry, glassMaterial);
    pane.castShadow = false;
    pane.receiveShadow = true;
    ctx.body.add(pane);
  };

  const bottomHalfWidth = width * 0.48;
  const topHalfWidth = width * 0.4;
  const frontBottom = z + length * 0.48;
  const frontTop = z + length * 0.31;
  const rearBottom = z - length * 0.48;
  const rearTop = z - length * 0.34;
  addPane([
    new THREE.Vector3(-bottomHalfWidth, bottomY, frontBottom),
    new THREE.Vector3(bottomHalfWidth, bottomY, frontBottom),
    new THREE.Vector3(topHalfWidth, roofY - 0.06, frontTop),
    new THREE.Vector3(-topHalfWidth, roofY - 0.06, frontTop)
  ]);
  addPane([
    new THREE.Vector3(bottomHalfWidth, bottomY, rearBottom),
    new THREE.Vector3(-bottomHalfWidth, bottomY, rearBottom),
    new THREE.Vector3(-topHalfWidth, roofY - 0.06, rearTop),
    new THREE.Vector3(topHalfWidth, roofY - 0.06, rearTop)
  ]);

  for (const side of [-1, 1]) {
    const x = side * (width * 0.48 + 0.008);
    for (const [front, back] of [
      [frontBottom - 0.08, z + length * 0.04],
      [z - length * 0.04, rearBottom + 0.08]
    ]) {
      addPane([
        new THREE.Vector3(x, bottomY + 0.02, front),
        new THREE.Vector3(x, bottomY + 0.02, back),
        new THREE.Vector3(side * (topHalfWidth + 0.008), roofY - 0.07, back - length * 0.04),
        new THREE.Vector3(side * (topHalfWidth + 0.008), roofY - 0.07, front + length * 0.04)
      ]);
    }

    addBeam(ctx, side, bottomY, z + length * 0.42, roofY - 0.02, z + length * 0.25, width * 0.035);
    addBeam(ctx, side, bottomY, z - length * 0.42, roofY - 0.02, z - length * 0.28, width * 0.035);
    addBeam(ctx, side, bottomY, z + length * 0.04, roofY - 0.02, z + length * 0.04, width * 0.028);
  }

  addInterior(ctx, width, length, y, z);
  addDoors(ctx, length, bottomY);
}

function addBeam(
  ctx: VehicleBuildContext,
  side: number,
  startY: number,
  startZ: number,
  endY: number,
  endZ: number,
  thickness: number
) {
  const start = new THREE.Vector3(side * (ctx.dimensions.width * 0.49), startY, startZ);
  const end = new THREE.Vector3(side * (ctx.dimensions.width * 0.4), endY, endZ);
  const direction = end.clone().sub(start);
  const beam = new THREE.Mesh(
    new THREE.BoxGeometry(thickness, direction.length(), thickness),
    ctx.trimMaterial
  );
  beam.position.copy(start).add(end).multiplyScalar(0.5);
  beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  beam.castShadow = true;
  ctx.body.add(beam);
}

function addInterior(ctx: VehicleBuildContext, width: number, length: number, cabinY: number, cabinZ: number) {
  const seatMaterial = ctx.interiorMaterial;
  const seatZ = cabinZ - length * 0.12;
  for (const x of [-width * 0.24, width * 0.24]) {
    const cushion = new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 0.2, 4, 8), seatMaterial);
    cushion.scale.set(1.35, 0.65, 1.05);
    cushion.position.set(x, cabinY - 0.29, seatZ);
    ctx.body.add(cushion);

    const backrest = new THREE.Mesh(new THREE.CapsuleGeometry(0.14, 0.3, 4, 8), seatMaterial);
    backrest.scale.set(1.3, 0.82, 0.48);
    backrest.position.set(x, cabinY - 0.04, seatZ - 0.12);
    backrest.rotation.x = -0.08;
    ctx.body.add(backrest);

    const headrest = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 10), seatMaterial);
    headrest.scale.set(1.25, 1.05, 0.65);
    headrest.position.set(x, cabinY + 0.15, seatZ - 0.15);
    ctx.body.add(headrest);
  }

  addBox(ctx, ctx.body, [width * 0.82, 0.12, 0.16], [0, cabinY - 0.12, cabinZ + length * 0.34], ctx.trimMaterial);
  addBox(ctx, ctx.body, [0.18, 0.15, length * 0.32], [0, cabinY - 0.18, cabinZ - length * 0.02], ctx.interiorMaterial);
  const rearCushion = new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 0.34, 4, 10), seatMaterial);
  rearCushion.rotation.z = Math.PI / 2;
  rearCushion.scale.set(1.2, 0.75, 1);
  rearCushion.position.set(0, cabinY - 0.28, cabinZ - length * 0.34);
  ctx.body.add(rearCushion);

  const rearBackrest = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.36, 4, 10), seatMaterial);
  rearBackrest.rotation.z = Math.PI / 2;
  rearBackrest.scale.set(1.1, 0.8, 0.55);
  rearBackrest.position.set(0, cabinY - 0.08, cabinZ - length * 0.4);
  ctx.body.add(rearBackrest);
  const steering = new THREE.Group();
  steering.position.set(-width * 0.2, cabinY - 0.03, cabinZ + length * 0.28);
  const wheelStyle: Record<VehicleType, { radius: number; tube: number; spokes: number }> = {
    sports: { radius: 0.145, tube: 0.026, spokes: 3 },
    sedan: { radius: 0.16, tube: 0.022, spokes: 3 },
    taxi: { radius: 0.16, tube: 0.024, spokes: 3 },
    police: { radius: 0.165, tube: 0.026, spokes: 3 },
    suv: { radius: 0.18, tube: 0.028, spokes: 4 },
    ambulance: { radius: 0.17, tube: 0.028, spokes: 4 },
    truck: { radius: 0.21, tube: 0.032, spokes: 4 },
    motorcycle: { radius: 0.13, tube: 0.022, spokes: 2 }
  };
  const { radius, tube, spokes } = wheelStyle[ctx.type];
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(radius, tube, 10, ctx.type === 'sports' ? 28 : 20),
    ctx.trimMaterial
  );
  steering.add(rim);

  const hub = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.22, radius * 0.22, 0.045, 12),
    ctx.chromeMaterial
  );
  hub.rotation.x = Math.PI / 2;
  steering.add(hub);

  for (let index = 0; index < spokes; index++) {
    const angle = (index / spokes) * Math.PI * 2;
    const spoke = new THREE.Mesh(
      new THREE.BoxGeometry(tube * 0.82, radius * 0.82, tube * 0.9),
      ctx.chromeMaterial
    );
    spoke.position.set(Math.sin(angle) * radius * 0.48, Math.cos(angle) * radius * 0.48, 0);
    spoke.rotation.z = -angle;
    steering.add(spoke);
  }

  ctx.body.add(steering);
  ctx.steeringWheel = steering;
  addBox(ctx, ctx.body, [width * 0.74, 0.16, 0.16], [0, cabinY - 0.32, cabinZ + length * 0.36], ctx.trimMaterial);
}

function addDoors(ctx: VehicleBuildContext, length: number, bottomY: number) {
  const doorLength = Math.min(1.25, length * 0.29);
  const doorHeight = 0.34;
  for (const side of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(side * ctx.dimensions.width * 0.5, bottomY + doorHeight * 0.52, 0.4);
    addBox(ctx, pivot, [0.065, doorHeight, doorLength], [side * 0.025, -0.12, -doorLength * 0.5], ctx.bodyMaterial);
    addBox(ctx, pivot, [0.035, 0.035, 0.16], [side * 0.045, -0.02, -doorLength * 0.32], ctx.chromeMaterial);
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
