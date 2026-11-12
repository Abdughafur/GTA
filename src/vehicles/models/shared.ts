import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
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
  interiorCameraPosition: THREE.Vector3;
  damageParts: {
    mirrors: THREE.Object3D[];
    windows: THREE.Mesh[];
  };
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
  speedNeedle?: THREE.Mesh;
  rpmNeedle?: THREE.Mesh;
}

const interiorAccentColors: Record<VehicleType, number> = {
  sports: 0xef5b43,
  sedan: 0x55b9d1,
  taxi: 0xd4a741,
  police: 0x4b9ee8,
  suv: 0xc3a77c,
  ambulance: 0xb9cbd0,
  truck: 0x8db3aa,
  motorcycle: 0xe7a83e
};
const interiorAccentMaterials = Object.fromEntries(
  Object.entries(interiorAccentColors).map(([type, color]) => [
    type,
    new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.25 })
  ])
) as Record<VehicleType, THREE.MeshStandardMaterial>;
const displayMaterial = new THREE.MeshStandardMaterial({
  color: 0x071827,
  emissive: 0x07384e,
  emissiveIntensity: 0.9,
  roughness: 0.24,
  metalness: 0.08
});
const interiorDetailGeometry = new THREE.BoxGeometry(1, 1, 1);

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
    interiorMaterial, tireMaterial, dimensions, headlights: [], taillights: [], wheels: [],
    interiorCameraPosition: new THREE.Vector3(0, 1.1, 0),
    damageParts: { mirrors: [], windows: [] }
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
  shell.userData.vehicleType = ctx.type;
  shell.userData.paintable = true;
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
  const grilleSlats = new THREE.InstancedMesh(
    new THREE.BoxGeometry(width * 0.28, 0.012, 0.012),
    ctx.chromeMaterial,
    4
  );
  const slatTransform = new THREE.Object3D();
  for (let index = 0; index < 4; index++) {
    slatTransform.position.set(
      0,
      bumperY + bodyHeight * 0.2 - 0.04 + index * 0.027,
      z + length * 0.505
    );
    slatTransform.updateMatrix();
    grilleSlats.setMatrixAt(index, slatTransform.matrix);
  }
  grilleSlats.castShadow = false;
  ctx.body.add(grilleSlats);

  addBox(
    ctx,
    ctx.body,
    [width * 0.9, 0.075, 0.12],
    [0, bottomY + bodyHeight * 0.1, z],
    ctx.trimMaterial
  );
  addBox(
    ctx,
    ctx.body,
    [width * 0.3, 0.12, 0.025],
    [0, bumperY + bodyHeight * 0.22, z - length * 0.48],
    ctx.trimMaterial
  );
  const doorSeams = new THREE.InstancedMesh(
    interiorDetailGeometry,
    ctx.trimMaterial,
    4
  );
  const seamTransform = new THREE.Object3D();
  let seamIndex = 0;
  for (const side of [-1, 1]) {
    for (const seamZ of [z + length * 0.08, z - length * 0.16]) {
      seamTransform.position.set(side * (width * 0.5 + 0.004), bottomY + bodyHeight * 0.55, seamZ);
      seamTransform.scale.set(0.012, bodyHeight * 0.54, 0.012);
      seamTransform.updateMatrix();
      doorSeams.setMatrixAt(seamIndex++, seamTransform.matrix);
    }
  }
  doorSeams.castShadow = false;
  ctx.body.add(doorSeams);

  for (const side of [-1, 1]) {
    const handle = addBox(
      ctx,
      ctx.body,
      [0.035, 0.045, Math.min(0.18, length * 0.045)],
      [side * (width * 0.49), bottomY + bodyHeight * 0.78, z - length * 0.06],
      ctx.chromeMaterial
    );
    handle.castShadow = false;
    const mirror = addBox(
      ctx,
      ctx.body,
      [0.16, 0.09, 0.19],
      [side * (width * 0.51), topY - bodyHeight * 0.08, z + length * 0.2],
      ctx.trimMaterial
    );
    mirror.name = 'vehicle-mirror';
    ctx.damageParts.mirrors.push(mirror);
    mirror.castShadow = false;
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
  glassMaterial.opacity = ctx.type === 'police' ? 0.3 : 0.16;
  glassMaterial.depthWrite = false;

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
    pane.name = 'vehicle-window';
    pane.castShadow = false;
    pane.receiveShadow = true;
    ctx.body.add(pane);
    ctx.damageParts.windows.push(pane);
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

  ctx.interiorCameraPosition.set(
    -width * 0.24,
    y + 0.12,
    z - length * 0.12 + 0.08
  );
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
  const seatWidthScale: Record<VehicleType, number> = {
    sports: 0.82,
    sedan: 1,
    taxi: 1,
    police: 0.95,
    suv: 1.12,
    ambulance: 1.04,
    truck: 1.14,
    motorcycle: 0.8
  };
  for (const x of [-width * 0.24, width * 0.24]) {
    const cushion = new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 0.2, 4, 8), seatMaterial);
    cushion.scale.set(1.35 * seatWidthScale[ctx.type], 0.65, 1.05);
    cushion.position.set(x, cabinY - 0.29, seatZ);
    ctx.body.add(cushion);

    const backrest = new THREE.Mesh(new THREE.CapsuleGeometry(0.14, 0.3, 4, 8), seatMaterial);
    backrest.scale.set(1.3 * seatWidthScale[ctx.type], ctx.type === 'sports' ? 0.95 : 0.82, 0.48);
    backrest.position.set(x, cabinY - 0.04, seatZ - 0.12);
    backrest.rotation.x = -0.08;
    ctx.body.add(backrest);

    const headrest = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.1, 3, 8), seatMaterial);
    headrest.scale.set(1.05, 0.75, 0.7);
    headrest.position.set(x, cabinY + 0.15, seatZ - 0.15);
    ctx.body.add(headrest);
  }

  const accent = interiorAccentMaterials[ctx.type];
  const dashZ = cabinZ + length * 0.37;
  addBox(ctx, ctx.body, [width * 0.9, 0.2, 0.24], [0, cabinY - 0.13, dashZ], ctx.trimMaterial);
  addBox(ctx, ctx.body, [width * 0.82, 0.055, 0.19], [0, cabinY - 0.27, dashZ - 0.025], ctx.interiorMaterial);

  const screenSize = ctx.type === 'truck' || ctx.type === 'police'
    ? [0.42, 0.2] as const
    : ctx.type === 'sports'
      ? [0.3, 0.16] as const
      : [0.36, 0.18] as const;
  const screenX = ctx.type === 'police' ? width * 0.14 : width * 0.12;
  const screen = addBox(
    ctx,
    ctx.body,
    [screenSize[0], screenSize[1], 0.018],
    [screenX, cabinY - 0.02, dashZ + 0.12],
    displayMaterial
  );
  screen.castShadow = false;
  const screenLines = new THREE.InstancedMesh(interiorDetailGeometry, accent, 3);
  const screenLineTransform = new THREE.Object3D();
  for (let index = 0; index < 3; index++) {
    screenLineTransform.position.set(
      screenX - screenSize[0] * 0.25,
      cabinY - 0.02 + screenSize[1] * (0.25 - index * 0.23),
      dashZ + 0.132
    );
    screenLineTransform.scale.set(screenSize[0] * (index === 0 ? 0.42 : 0.3), 0.008, 0.004);
    screenLineTransform.updateMatrix();
    screenLines.setMatrixAt(index, screenLineTransform.matrix);
  }
  screenLines.castShadow = false;
  ctx.body.add(screenLines);
  addBox(
    ctx,
    ctx.body,
    [0.3, 0.14, 0.018],
    [-width * 0.22, cabinY - 0.025, dashZ + 0.12],
    displayMaterial
  ).castShadow = false;
  const dialGeometry = new THREE.TorusGeometry(0.043, 0.004, 6, 16);
  const dialCenters = [-width * 0.28, -width * 0.16];
  const needles: THREE.Mesh[] = [];
  for (const dialX of dialCenters) {
    const dial = new THREE.Mesh(dialGeometry, accent);
    dial.position.set(dialX, cabinY - 0.025, dashZ + 0.132);
    dial.castShadow = false;
    ctx.body.add(dial);
    const needle = new THREE.Mesh(
      new THREE.BoxGeometry(0.008, 0.045, 0.006),
      accent
    );
    needle.position.set(dialX, cabinY - 0.025, dashZ + 0.14);
    needle.castShadow = false;
    ctx.body.add(needle);
    needles.push(needle);
  }
  ctx.speedNeedle = needles[0];
  ctx.rpmNeedle = needles[1];
  const dialTicks = new THREE.InstancedMesh(interiorDetailGeometry, accent, 12);
  const tickTransform = new THREE.Object3D();
  let tickIndex = 0;
  for (const dialX of dialCenters) {
    for (let index = 0; index < 6; index++) {
      const angle = THREE.MathUtils.lerp(-2.2, 2.2, index / 5);
      tickTransform.position.set(
        dialX + Math.sin(angle) * 0.035,
        cabinY - 0.025 + Math.cos(angle) * 0.035,
        dashZ + 0.14
      );
      tickTransform.rotation.z = -angle;
      tickTransform.scale.set(0.004, 0.012, 0.004);
      tickTransform.updateMatrix();
      dialTicks.setMatrixAt(tickIndex++, tickTransform.matrix);
    }
  }
  dialTicks.castShadow = false;
  ctx.body.add(dialTicks);
  for (const ventX of [-width * 0.36, width * 0.36]) {
    addBox(
      ctx,
      ctx.body,
      [0.16, 0.035, 0.02],
      [ventX, cabinY - 0.1, dashZ + 0.12],
      ctx.chromeMaterial
    ).castShadow = false;
  }
  const climateButtons = new THREE.InstancedMesh(interiorDetailGeometry, accent, 5);
  const buttonTransform = new THREE.Object3D();
  for (let index = 0; index < 5; index++) {
    buttonTransform.position.set(
      (index - 2) * 0.045,
      cabinY - 0.22,
      dashZ + 0.105
    );
    buttonTransform.scale.set(0.025, 0.018, 0.012);
    buttonTransform.updateMatrix();
    climateButtons.setMatrixAt(index, buttonTransform.matrix);
  }
  climateButtons.castShadow = false;
  ctx.body.add(climateButtons);

  addBox(
    ctx,
    ctx.body,
    [width * 0.22, 0.07, length * 0.26],
    [0, cabinY - 0.25, cabinZ + length * 0.08],
    ctx.interiorMaterial
  );
  addBox(
    ctx,
    ctx.body,
    [width * 0.26, 0.07, length * 0.1],
    [0, cabinY - 0.15, cabinZ - length * 0.04],
    seatMaterial
  );
  const cupHolders = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.04, 0.04, 0.012, 12),
    ctx.trimMaterial,
    2
  );
  const cupHolderTransform = new THREE.Object3D();
  for (let index = 0; index < 2; index++) {
    cupHolderTransform.position.set(
      index === 0 ? -0.06 : 0.06,
      cabinY - 0.205,
      cabinZ + length * 0.12
    );
    cupHolderTransform.updateMatrix();
    cupHolders.setMatrixAt(index, cupHolderTransform.matrix);
  }
  cupHolders.castShadow = false;
  ctx.body.add(cupHolders);
  const selector = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 0.15, 8), ctx.chromeMaterial);
  selector.position.set(ctx.type === 'sports' ? 0.06 : 0.08, cabinY - 0.15, cabinZ + length * 0.16);
  selector.rotation.x = -0.2;
  ctx.body.add(selector);
  addBox(
    ctx,
    ctx.body,
    [0.16, 0.025, 0.035],
    [0, cabinY - 0.12, cabinZ + length * 0.07],
    accent
  );

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
  for (const buttonX of [-1, 1]) {
    addBox(
      ctx,
      steering,
      [0.035, 0.026, 0.014],
      [buttonX * radius * 0.55, -radius * 0.08, tube * 0.45],
      accent
    );
  }
}

function addDoors(ctx: VehicleBuildContext, length: number, bottomY: number) {
  const doorLength = Math.min(1.25, length * 0.29);
  const doorHeight = 0.34;
  for (const side of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(side * ctx.dimensions.width * 0.5, bottomY + doorHeight * 0.52, 0.4);
    addBox(ctx, pivot, [0.065, doorHeight, doorLength], [side * 0.025, -0.12, -doorLength * 0.5], ctx.bodyMaterial);
    addBox(ctx, pivot, [0.025, doorHeight * 0.78, doorLength * 0.84], [-side * 0.018, -0.12, -doorLength * 0.5], ctx.interiorMaterial);
    addBox(ctx, pivot, [0.07, 0.045, doorLength * 0.4], [-side * 0.045, -0.17, -doorLength * 0.52], ctx.trimMaterial);
    addBox(ctx, pivot, [0.035, 0.035, 0.16], [-side * 0.045, -0.02, -doorLength * 0.32], ctx.chromeMaterial);
    addBox(ctx, pivot, [0.028, 0.014, 0.09], [-side * 0.045, -0.08, -doorLength * 0.68], ctx.chromeMaterial);
    ctx.body.add(pivot);
    if (side < 0) ctx.leftDoorPivot = pivot;
    else ctx.rightDoorPivot = pivot;
  }
}

export function addWheels(ctx: VehicleBuildContext, positions?: Array<[number, number]>) {
  const { wheelBase, wheelRadius, trackWidth } = ctx.dimensions;
  const wheelPositions = positions ?? [
    [-trackWidth / 2, wheelBase / 2],
    [trackWidth / 2, wheelBase / 2],
    [-trackWidth / 2, -wheelBase / 2],
    [trackWidth / 2, -wheelBase / 2]
  ];

  const tireGeo = new THREE.CylinderGeometry(wheelRadius, wheelRadius, 0.3, 24);
  tireGeo.rotateZ(Math.PI / 2);
  const rimGeo = new THREE.CylinderGeometry(wheelRadius * 0.66, wheelRadius * 0.66, 0.32, 20);
  rimGeo.rotateZ(Math.PI / 2);
  const hubGeo = new THREE.CylinderGeometry(wheelRadius * 0.19, wheelRadius * 0.19, 0.34, 12);
  hubGeo.rotateZ(Math.PI / 2);
  const spokeCountByType: Record<VehicleType, number> = {
    sports: 5,
    sedan: 8,
    taxi: 6,
    police: 6,
    suv: 6,
    ambulance: 6,
    truck: 8,
    motorcycle: 5
  };
  const spokeCount = spokeCountByType[ctx.type];
  const rimParts: THREE.BufferGeometry[] = [rimGeo];
  const spokeTransform = new THREE.Object3D();
  for (const side of [-1, 1]) {
    for (let index = 0; index < spokeCount; index++) {
      const angle = (index / spokeCount) * Math.PI * 2;
      const spokeGeo = new THREE.BoxGeometry(0.045, wheelRadius * 0.48, 0.035);
      spokeTransform.position.set(
        side * 0.16,
        Math.sin(angle) * wheelRadius * 0.38,
        Math.cos(angle) * wheelRadius * 0.38
      );
      spokeTransform.rotation.set(angle, 0, 0);
      spokeTransform.updateMatrix();
      spokeGeo.applyMatrix4(spokeTransform.matrix);
      rimParts.push(spokeGeo);
    }
  }
  const detailedRimGeo = mergeGeometries(rimParts, false);
  if (!detailedRimGeo) {
    throw new Error(`Could not build wheel geometry for "${ctx.type}"`);
  }
  for (const geometry of rimParts) {
    if (geometry !== detailedRimGeo) geometry.dispose();
  }

  for (const [x, z] of wheelPositions) {
    const wheel = new THREE.Group();
    const axle = new THREE.Group();
    const radius = wheelRadius;
    const tire = new THREE.Mesh(tireGeo, ctx.tireMaterial);
    tire.castShadow = true;
    axle.add(tire);

    axle.add(new THREE.Mesh(detailedRimGeo, ctx.chromeMaterial));
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
    emissiveIntensity: 0.9,
    roughness: 0.2
  });
  const taillightMat = new THREE.MeshStandardMaterial({
    color: 0x8c1720,
    emissive: 0xe5232d,
    emissiveIntensity: 0.55,
    roughness: 0.25
  });
  const reverseLightMat = new THREE.MeshStandardMaterial({
    color: 0xdde8e9,
    emissive: 0xb9d7de,
    emissiveIntensity: 0.2,
    roughness: 0.28
  });
  const housingBoxes: Array<{ size: [number, number, number]; position: [number, number, number] }> = [];
  const headlightBoxes: Array<{ size: [number, number, number]; position: [number, number, number] }> = [];
  const taillightBoxes: Array<{ size: [number, number, number]; position: [number, number, number] }> = [];
  const reverseLightBoxes: Array<{ size: [number, number, number]; position: [number, number, number] }> = [];
  for (const x of [-width * 0.38, width * 0.38]) {
    housingBoxes.push(
      { size: [0.36, 0.2, 0.06], position: [x, 0.5, length * 0.49] },
      { size: [0.36, 0.2, 0.06], position: [x, 0.53, -length * 0.49] }
    );
    headlightBoxes.push(
      { size: [0.3, 0.1, 0.035], position: [x, 0.51, length * 0.525] },
      { size: [0.26, 0.025, 0.02], position: [x, 0.43, length * 0.53] }
    );
    taillightBoxes.push({ size: [0.3, 0.12, 0.035], position: [x, 0.53, -length * 0.525] });
    reverseLightBoxes.push({ size: [0.12, 0.035, 0.02], position: [x, 0.51, -length * 0.53] });
  }

  const addLightInstances = (
    boxes: Array<{ size: [number, number, number]; position: [number, number, number] }>,
    material: THREE.Material
  ) => {
    const instances = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), material, boxes.length);
    const transform = new THREE.Object3D();
    boxes.forEach(({ size, position }, index) => {
      transform.position.set(...position);
      transform.scale.set(...size);
      transform.updateMatrix();
      instances.setMatrixAt(index, transform.matrix);
    });
    instances.castShadow = false;
    instances.receiveShadow = false;
    ctx.body.add(instances);
    return instances;
  };
  addLightInstances(housingBoxes, ctx.trimMaterial);
  ctx.headlights.push(addLightInstances(headlightBoxes, headlightMat));
  ctx.taillights.push(addLightInstances(taillightBoxes, taillightMat));
  addLightInstances(reverseLightBoxes, reverseLightMat);
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
    bodyMaterial: ctx.bodyMaterial,
    interiorCameraPosition: ctx.interiorCameraPosition,
    damageParts: ctx.damageParts,
    wheels: ctx.wheels,
    frontLeftWheel,
    frontRightWheel,
    headlights: ctx.headlights,
    taillights: ctx.taillights,
    leftDoorPivot: ctx.leftDoorPivot,
    rightDoorPivot: ctx.rightDoorPivot,
    sirenMeshes,
    steeringWheel: ctx.steeringWheel,
    speedNeedle: ctx.speedNeedle,
    rpmNeedle: ctx.rpmNeedle,
    features,
    animate
  };
}
