import * as THREE from 'three';
import { useGameStore, CameraViewMode } from '../core/gameState';
import { isInSwimmableWater } from '../world/CityGenerator';

export type CameraMode = 'onFoot' | 'vehicle' | 'cinematic';

export class CameraController {
  public camera: THREE.PerspectiveCamera;
  public mode: CameraMode = 'cinematic';

  // Orbit angles
  public yaw = 0; // Horizontal (radians)
  public pitch = 0.25; // Vertical (radians)
  public distance = 5.5;
  private vehicleLookYawOffset = 0;

  private targetPos = new THREE.Vector3();
  private currentCameraPos = new THREE.Vector3();
  private cinematicTimer = 0;

  constructor(fov = 65, aspect = 16 / 9) {
    this.camera = new THREE.PerspectiveCamera(fov, aspect, 0.1, 12000);
  }

  public update(
    playerPos: THREE.Vector3,
    vehiclePos: THREE.Vector3 | null,
    vehicleHeading: number,
    vehicleSpeed: number,
    dt: number,
    isAirplane = false,
    airplanePitch = 0,
    isTrain = false
  ) {
    const store = useGameStore.getState();
    const viewMode: CameraViewMode = store.cameraViewMode;
    const isPhoneOpen = store.isPhoneOpen;

    if (this.mode === 'cinematic') {
      // Cinematic slow sweep over Downtown & Bay
      this.cinematicTimer += dt * 0.18;
      const radius = 140;
      const camX = Math.sin(this.cinematicTimer) * radius - 10;
      const camZ = Math.cos(this.cinematicTimer) * radius - 40;
      const camY = 45 + Math.sin(this.cinematicTimer * 0.7) * 15;

      this.camera.position.set(camX, camY, camZ);
      this.camera.lookAt(-10, 20, -40);
      return;
    }

    // Offset camera framing when phone is open so player is never obstructed by the phone
    const framingSideOffset = isPhoneOpen ? 0.9 : 0;

    if (this.mode === 'vehicle' && vehiclePos) {
      // --- VEHICLE CAMERA MODES ---
      if (viewMode === 'first_person' || isTrain) {
        // 1. FIRST-PERSON INTERIOR COCKPIT VIEW ("inside card")
        // Keep the seat position fixed while allowing the view direction to turn.
        const viewHeading = vehicleHeading + this.vehicleLookYawOffset;
        const fwdDir = new THREE.Vector3(Math.sin(vehicleHeading), 0, Math.cos(vehicleHeading));
        const rightDir = new THREE.Vector3(Math.cos(vehicleHeading), 0, -Math.sin(vehicleHeading));
        const viewDir = new THREE.Vector3(Math.sin(viewHeading), 0, Math.cos(viewHeading));

        const cockpitPos = isTrain
          ? playerPos.clone().add(new THREE.Vector3(0, 1.28, 0))
          : isAirplane
          ? vehiclePos.clone()
            .add(new THREE.Vector3(0, 2.12, 0))
            .add(fwdDir.clone().multiplyScalar(6.7))
          : vehiclePos.clone()
            .add(new THREE.Vector3(0, 1.18, 0))
            .add(rightDir.clone().multiplyScalar(-0.35))
            .add(fwdDir.clone().multiplyScalar(0.2));

        this.camera.position.copy(cockpitPos);

        const lookDirection = isAirplane
          ? new THREE.Vector3(0, -Math.sin(airplanePitch), Math.cos(airplanePitch))
            .applyAxisAngle(new THREE.Vector3(0, 1, 0), viewHeading)
          : viewDir;
        const lookTarget = cockpitPos.clone()
          .add(lookDirection.multiplyScalar(isAirplane ? 80 : 20))
          .add(new THREE.Vector3(0, isAirplane ? -this.pitch * 1.5 : -this.pitch * 3, 0));

        this.camera.lookAt(lookTarget);
        this.camera.fov = isAirplane ? 82 : 75;
        this.camera.updateProjectionMatrix();
        return;
      }

      // 2. THIRD-PERSON VEHICLE CHASE (Standard or Close)
      const baseDist = viewMode === 'third_close' ? Math.min(5.2, this.distance) : this.distance + 2.3;
      const targetDist = baseDist + Math.min(4.0, (Math.abs(vehicleSpeed) / 30) * 4.0);
      const targetHeight = viewMode === 'third_close' ? 2.4 : 3.2;

      // Soft align yaw with vehicle rear
      const rearAngle = vehicleHeading + Math.PI + this.vehicleLookYawOffset;
      let diff = rearAngle - this.yaw;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      this.yaw += diff * Math.min(1.0, dt * 3.5);

      this.targetPos.copy(vehiclePos).add(new THREE.Vector3(0, 1.2, 0));

      const camOffset = new THREE.Vector3(
        Math.sin(this.yaw) * Math.cos(this.pitch) * targetDist,
        Math.sin(this.pitch) * targetDist + targetHeight,
        Math.cos(this.yaw) * Math.cos(this.pitch) * targetDist
      );

      const desiredCamPos = this.targetPos.clone().add(camOffset);
      this.currentCameraPos.lerp(desiredCamPos, Math.min(1.0, dt * 9));
      this.camera.position.copy(this.currentCameraPos);

      // Dynamic Speed FOV expansion (65 to 80)
      const targetFov = 65 + (Math.abs(vehicleSpeed) / 30) * 15;
      this.camera.fov += (targetFov - this.camera.fov) * Math.min(1.0, dt * 5);
      this.camera.updateProjectionMatrix();

      this.camera.lookAt(this.targetPos);
    } else {
      // --- ON-FOOT CAMERA MODES ---
      if (viewMode === 'first_person') {
        // 1. FIRST-PERSON EYE VIEW
        const isSwimming = isInSwimmableWater(playerPos.x, playerPos.z);
        const eyePos = playerPos.clone().add(new THREE.Vector3(0, isSwimming ? 1.05 : 1.72, 0));
        this.camera.position.copy(eyePos);

        const lookDir = new THREE.Vector3(
          -Math.sin(this.yaw) * Math.cos(this.pitch),
          -Math.sin(this.pitch),
          -Math.cos(this.yaw) * Math.cos(this.pitch)
        );

        this.camera.lookAt(eyePos.clone().add(lookDir.multiplyScalar(20)));
        this.camera.fov = 75;
        this.camera.updateProjectionMatrix();
        return;
      }

      // 2. THIRD-PERSON ON-FOOT (Chase / Over-The-Shoulder Close)
      const baseDist = viewMode === 'third_close' ? Math.min(3.4, this.distance) : this.distance;
      const camDist = store.isAiming ? 2.8 : baseDist;
      this.targetPos.copy(playerPos).add(new THREE.Vector3(0, 1.6, 0));

      // Right-shoulder offset when close/aiming or when phone is open
      const sideOffset = store.isAiming ? 0.45 : framingSideOffset;
      const rightX = Math.cos(this.yaw);
      const rightZ = -Math.sin(this.yaw);
      this.targetPos.x += rightX * sideOffset;
      this.targetPos.z += rightZ * sideOffset;

      this.pitch = Math.max(-0.4, Math.min(1.2, this.pitch));

      const camOffset = new THREE.Vector3(
        Math.sin(this.yaw) * Math.cos(this.pitch) * camDist,
        Math.sin(this.pitch) * camDist + 0.4,
        Math.cos(this.yaw) * Math.cos(this.pitch) * camDist
      );

      const desiredCamPos = this.targetPos.clone().add(camOffset);
      this.currentCameraPos.lerp(desiredCamPos, Math.min(1.0, dt * 14));
      this.camera.position.copy(this.currentCameraPos);

      // Aiming FOV zoom
      const targetFov = store.isAiming ? 50 : 65;
      this.camera.fov += (targetFov - this.camera.fov) * Math.min(1.0, dt * 8);
      this.camera.updateProjectionMatrix();

      this.camera.lookAt(this.targetPos);
    }
  }

  public handleMouseMove(deltaX: number, deltaY: number) {
    const sensitivity = 0.0035;
    if (this.mode === 'vehicle') {
      this.vehicleLookYawOffset = THREE.MathUtils.clamp(
        this.vehicleLookYawOffset - deltaX * sensitivity,
        -Math.PI,
        Math.PI
      );
    } else {
      this.yaw -= deltaX * sensitivity;
    }
    this.pitch += deltaY * sensitivity;
    this.pitch = THREE.MathUtils.clamp(this.pitch, -0.4, 1.2);
  }

  public handleZoom(delta: number) {
    this.distance = Math.max(2.5, Math.min(12.0, this.distance + delta * 0.005));
  }
}
