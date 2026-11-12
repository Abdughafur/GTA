import * as THREE from 'three';

export type VehicleType =
  | 'sports'
  | 'police'
  | 'sedan'
  | 'suv'
  | 'truck'
  | 'motorcycle'
  | 'ambulance'
  | 'taxi';

export interface VehicleConfig {
  name: string;
  type: VehicleType;
  colorHex: number;
  maxSpeed: number;
  acceleration: number;
  brakeForce: number;
  steerAngleMax: number;
  handling: number;
  healthMax: number;
}

export interface VehicleRules {
  massKg: number;
  tireGrip: number;
  suspensionTravel: number;
  steeringResponse: number;
  highSpeedSteering: number;
  brakeMultiplier: number;
  rollingResistance: number;
  fuelMultiplier: number;
  driftGrip: number;
  collisionRadius: number;
  wheelRadius: number;
  suspension: number;
}

export interface VehicleModelModule {
  build: (colorHex: number) => VehicleMeshRig;
  rules: VehicleRules;
}

export interface VehicleAnimationInput {
  throttle: number;
  brake: number;
  steer: number;
  handbrake: boolean;
}

export interface VehicleMeshRig {
  group: THREE.Group;
  body: THREE.Group;
  bodyMaterial: THREE.MeshStandardMaterial;
  interiorCameraPosition: THREE.Vector3;
  damageParts: {
    mirrors: THREE.Object3D[];
    windows: THREE.Mesh[];
  };
  wheels: THREE.Group[];
  frontLeftWheel: THREE.Group;
  frontRightWheel: THREE.Group;
  headlights: THREE.Mesh[];
  taillights: THREE.Mesh[];
  leftDoorPivot?: THREE.Group;
  rightDoorPivot?: THREE.Group;
  sirenMeshes?: { red: THREE.Mesh; blue: THREE.Mesh };
  steeringWheel?: THREE.Group;
  speedNeedle?: THREE.Mesh;
  rpmNeedle?: THREE.Mesh;
  features: readonly string[];
  animate?: (dt: number, speed: number, input: VehicleAnimationInput) => void;
}
