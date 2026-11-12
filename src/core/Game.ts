import * as THREE from 'three';
import { cityGenerator, CityData, getDistrictName } from '../world/CityGenerator';
import { EnvironmentSystem } from '../world/Environment';
import { Player } from '../player/Player';
import { Vehicle, VehicleConfig } from '../vehicles/Vehicle';
import { TrafficManager, TrafficCarAI } from '../ai/TrafficManager';
import { PedestrianManager } from '../ai/PedestrianAI';
import { FarmAnimalManager } from '../ai/FarmAnimalAI';
import { PoliceSystem } from '../ai/PoliceAI';
import { MissionManager } from '../missions/MissionManager';
import { CameraController } from '../camera/CameraController';
import { audioManager } from './AudioManager';
import { useGameStore, JobType } from './gameState';
import { buildingInteriors } from '../world/BuildingInteriors';
import { furnitureFactory } from '../world/FurnitureFactory';
import { transitSystem } from '../world/TransitSystem';
import { WorldChunkStreamer } from '../world/WorldChunkStreamer';
import { CollisionGrid } from '../world/CollisionGrid';

export class CanvasWorld {
  public scene: THREE.Scene;
  public cameraController: CameraController;
  public renderer: THREE.WebGLRenderer;
  private environmentSystem!: EnvironmentSystem;
  private cityData!: CityData;
  private worldChunkStreamer!: WorldChunkStreamer;
  private collisionGrid!: CollisionGrid;

  public player!: Player;
  public vehicles: Vehicle[] = [];
  public currentVehicle: Vehicle | null = null;
  public trafficManager!: TrafficManager;
  public pedestrianManager!: PedestrianManager;
  public farmAnimalManager!: FarmAnimalManager;
  public policeSystem!: PoliceSystem;
  public missionManager!: MissionManager;
  public bulletTracers: { line: THREE.Line; age: number }[] = [];

  // Jobs System state
  private jobTimer = 0;
  private jobMarker: THREE.Group | null = null;

  // Animation & Loop
  private animFrameId = 0;
  private lastTime = 0;
  private simulationTime = 0;
  private worldTimeAccumulator = 0;
  private currentDistrict = '';
  private simulationAccumulator = 0;
  private customizedVehicle: Vehicle | null = null;
  private appliedCustomizationKey = '';
  private appliedGraphicsQuality: 'low' | 'medium' | 'high' | 'ultra' | null = null;
  private appliedTouchMode: boolean | null = null;
  private waterUpdateAccumulator = 0;
  private touchCameraPointerId: number | null = null;
  private lastTouchCameraPosition = new THREE.Vector2();
  private readonly fixedStep = 1 / 60;
  private isRunning = false;
  private isSoftwareGl = false;
  private lastRenderTime = 0;
  private firstPersonViewmodelRoot = new THREE.Group();
  private chunkGenerationBudget = 0;
  private readonly lowPowerDevice: boolean;

  // Backward-compatible alias for older imports.
  static readonly Game = CanvasWorld;

  // Input states
  public keys: { [key: string]: boolean } = {};
  public touchInput = {
    forward: 0,
    strafe: 0,
    sprint: false,
    jump: false,
    throttle: 0,
    brake: 0,
    steer: 0,
    handbrake: false
  };

  private container: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;

    // Detect software WebGL as per Three.js skill
    this.isSoftwareGl = (() => {
      try {
        const gl = document.createElement('canvas').getContext('webgl2');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return false;
      }
    })();
    const hardwareConcurrency = navigator.hardwareConcurrency || 0;
    const deviceMemory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
    this.lowPowerDevice = this.isSoftwareGl ||
      (hardwareConcurrency > 0 && hardwareConcurrency <= 4) ||
      (deviceMemory !== undefined && deviceMemory <= 4);
    if (this.lowPowerDevice && useGameStore.getState().graphicsQuality !== 'low') {
      useGameStore.getState().setGraphicsQuality('low');
    }

    // 1. Renderer Setup
    const initialQuality = useGameStore.getState().graphicsQuality;
    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl && initialQuality !== 'low',
      powerPreference: initialQuality === 'low' ? 'low-power' : 'high-performance'
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.setPixelRatio(
      this.isSoftwareGl
        ? 1
        : Math.min(window.devicePixelRatio || 1, initialQuality === 'low' ? 0.75 : 1.25)
    );
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.domElement.style.touchAction = 'none';
    container.appendChild(this.renderer.domElement);

    // 2. Scene & Camera
    this.scene = new THREE.Scene();
    this.cameraController = new CameraController(65, container.clientWidth / container.clientHeight);
    this.scene.add(this.cameraController.camera);
    this.cameraController.yaw = useGameStore.getState().playerHeading;

    // 3. Initialize Game Systems
    this.initSystems();
    this.applyAdaptivePerformancePreset();
    this.applyGraphicsQuality();

    // 4. Bind Events
    this.bindInputs();
    window.addEventListener('resize', this.onResize);
    this.container.addEventListener('pointerdown', this.onTouchCameraStart);
    this.container.addEventListener('pointermove', this.onTouchCameraMove);
    this.container.addEventListener('pointerup', this.onTouchCameraEnd);
    this.container.addEventListener('pointercancel', this.onTouchCameraEnd);
  }

  private onTouchCameraStart = (event: PointerEvent) => {
    if (
      event.pointerType !== 'touch' ||
      !useGameStore.getState().touchMode ||
      useGameStore.getState().screen !== 'playing' ||
      useGameStore.getState().isPhoneOpen ||
      event.target !== this.renderer.domElement
    ) return;
    this.touchCameraPointerId = event.pointerId;
    this.lastTouchCameraPosition.set(event.clientX, event.clientY);
    this.renderer.domElement.setPointerCapture(event.pointerId);
  };

  private onTouchCameraMove = (event: PointerEvent) => {
    if (event.pointerId !== this.touchCameraPointerId) return;
    const deltaX = event.clientX - this.lastTouchCameraPosition.x;
    const deltaY = event.clientY - this.lastTouchCameraPosition.y;
    this.lastTouchCameraPosition.set(event.clientX, event.clientY);
    this.cameraController.handleMouseMove(deltaX, deltaY);
  };

  private onTouchCameraEnd = (event: PointerEvent) => {
    if (event.pointerId === this.touchCameraPointerId) {
      this.touchCameraPointerId = null;
    }
  };

  public triggerContextAction() {
    if (transitSystem.isPlayerFlyingPlane) {
      transitSystem.togglePlaneAutopilot();
      return;
    }
    const previousInterior = useGameStore.getState().currentInterior;
    buildingInteriors.triggerActiveAction(this.player.position);
    const currentInterior = useGameStore.getState().currentInterior;
    if (currentInterior !== previousInterior) {
      this.player.velocity.set(0, 0, 0);
      this.player.isGrounded = true;
      this.player.currentGroundElevation = currentInterior === 'supermarket' ? 300 : 0;
    }
  }

  private initSystems() {
    const store = useGameStore.getState();
    store.setLoading(20, 'Generating City Districts & Road Grids...');

    // Environment & Reflections
    this.environmentSystem = new EnvironmentSystem(this.scene, this.renderer);

    // City & Colliders
    this.cityData = cityGenerator.generateCity();
    this.scene.add(this.cityData.cityGroup);

    // Multi-Floor Building Interiors (Safehouse, Penthouse, Elevator, Hospital)
    this.scene.add(buildingInteriors.rootGroup);
    this.cityData.colliders.push(...buildingInteriors.colliders);
    this.collisionGrid = new CollisionGrid(this.cityData.colliders);
    this.worldChunkStreamer = new WorldChunkStreamer(
      this.scene,
      this.cityData.colliders,
      () => this.collisionGrid.rebuild()
    );
    store.setLoading(45, 'Synthesizing PBR Textures & Multi-Floor Interiors...');
    this.farmAnimalManager = new FarmAnimalManager(
      this.scene,
      this.cityData.farmBounds,
      this.cityData.colliders
    );

    // Elevated & Ground Railway Tracks, Metro Central Station, Train, Chopper, Sky Jet
    this.scene.add(transitSystem.rootGroup);

    // Gas Station Fuel Pumps (X: -10, Z: 105)
    const pump1 = furnitureFactory.createGasPump();
    pump1.position.set(-12, 0, 105);
    const pump2 = furnitureFactory.createGasPump();
    pump2.position.set(-8, 0, 105);
    this.scene.add(pump1, pump2);

    // ATM Machine at Safehouse lobby exterior
    const safehouseAtm = furnitureFactory.createATM();
    safehouseAtm.position.set(-8, 0, 22);
    this.scene.add(safehouseAtm);

    // Player Spawn
    this.player = new Player(new THREE.Vector3(...store.playerPos));
    this.scene.add(this.player.group);
    this.firstPersonViewmodelRoot.add(this.player.rig.firstPersonArms);
    this.scene.add(this.firstPersonViewmodelRoot);
    this.currentDistrict = getDistrictName(this.player.position.x, this.player.position.z);
    store.setLoading(60, 'Assembling High-Performance Vehicle Rigs...');

    // Spawn Starter Sports Car right next to safehouse
    const starterCarConfig: VehicleConfig = {
      name: 'Infernus GT Supercar',
      type: 'sports',
      colorHex: 0xdc2626, // Crimson red
      maxSpeed: 38.0, // ~137 km/h
      acceleration: 19.0,
      brakeForce: 28.0,
      steerAngleMax: 0.52,
      handling: 1.25,
      healthMax: 100
    };
    const starterCar = new Vehicle(
      starterCarConfig,
      new THREE.Vector3(-14, 0, 25),
      Math.PI / 2
    );
    this.vehicles.push(starterCar);
    this.scene.add(starterCar.group);

    // Spawn Luxury Showroom Supercar at Dealership
    const showroomCarConfig: VehicleConfig = {
      name: 'Turismo Carbon Edition',
      type: 'sports',
      colorHex: 0xf59e0b, // Amber Gold
      maxSpeed: 42.0,
      acceleration: 22.0,
      brakeForce: 30.0,
      steerAngleMax: 0.54,
      handling: 1.35,
      healthMax: 120
    };
    const showroomCar = new Vehicle(
      showroomCarConfig,
      this.cityData.spawnPoints.dealership,
      0
    );
    this.vehicles.push(showroomCar);
    this.scene.add(showroomCar.group);

    // Spawn Hospital Ambulance
    const ambulanceConfig: VehicleConfig = {
      name: 'VCPD Emergency Ambulance',
      type: 'ambulance',
      colorHex: 0xf8fafc,
      maxSpeed: 36.0,
      acceleration: 18.0,
      brakeForce: 28.0,
      steerAngleMax: 0.5,
      handling: 1.2,
      healthMax: 150
    };
    const hospitalAmbulance = new Vehicle(
      ambulanceConfig,
      new THREE.Vector3(110, 0, -116),
      0
    );
    this.vehicles.push(hospitalAmbulance);
    this.scene.add(hospitalAmbulance.group);

    store.setLoading(80, 'Configuring Traffic Grid & Pedestrians...');

    // Traffic & Pedestrians
    this.trafficManager = new TrafficManager(
      this.scene,
      this.cityData.roadNodes,
      this.cityData.trafficSignals,
      this.collisionGrid
    );
    this.pedestrianManager = new PedestrianManager(this.scene, this.cityData.colliders, this.collisionGrid);
    this.policeSystem = new PoliceSystem(this.scene, this.collisionGrid);

    // Missions
    this.missionManager = new MissionManager(this.scene);

    store.setLoading(100, 'Ready to enter Vice Bay!');
  }

  private bindInputs() {
    window.addEventListener('keydown', (e) => {
      const store = useGameStore.getState();
      if (store.supermarketOpen) {
        this.keys[e.code] = false;
        if (e.code === 'Escape') {
          store.closeSupermarket();
          e.preventDefault();
          e.stopImmediatePropagation();
        }
        return;
      }

      if (store.isInventoryOpen && e.code !== 'KeyI' && e.code !== 'Escape') return;
      if (store.isInventoryOpen && e.code === 'Escape') {
        store.setInventoryOpen(false);
        e.preventDefault();
        return;
      }

      this.keys[e.code] = true;

      if (e.code === 'KeyI' && !e.repeat && !store.isPhoneOpen) {
        store.toggleInventory();
      }

      // Enter / Exit Vehicle on 'E'
      if (e.code === 'KeyE' && !e.repeat) {
        this.toggleVehicle();
      }

      if (e.code === 'KeyQ' && !e.repeat && !transitSystem.isPlayerRidingTrain) {
        const stationIndex = transitSystem.getNearbyMetroStationIndex(this.player.position);
        if (stationIndex >= 0) {
          transitSystem.cycleMetroDestination(stationIndex);
        }
      }

      // Seatbelt Toggle on 'KeyB'
      if (e.code === 'KeyB') {
        const store = useGameStore.getState();
        store.toggleSeatbelt();
        audioManager.playDoorSlam();
      }

      // Context Action Key 'KeyF'
      if (e.code === 'KeyF' && !e.repeat) {
        this.triggerContextAction();
      }

      if (e.code === 'KeyG' && !e.repeat && transitSystem.isPlayerFlyingPlane && transitSystem.isPlaneAutopilot) {
        transitSystem.cyclePlaneAutopilotSpeed();
      }

      // Smartphone on 'KeyP' or 'ArrowUp'
      if (e.code === 'KeyP' || e.code === 'ArrowUp') {
        const store = useGameStore.getState();
        if (store.screen === 'playing') {
          if (store.isPhoneOpen) {
            store.closePhone();
          } else {
            store.openPhone();
            audioManager.playPhoneBeep();
          }
        }
      }

      // Camera View Mode Cycle on 'KeyC'
      if (e.code === 'KeyC') {
        const store = useGameStore.getState();
        store.cycleCameraMode();
        audioManager.playPhoneBeep();
      }

      // Quick Weapon Hotkeys [1] - [4]
      if (e.code === 'Digit1') useGameStore.getState().selectWeapon('fists');
      if (e.code === 'Digit2') useGameStore.getState().selectWeapon('knife');
      if (e.code === 'Digit3') useGameStore.getState().selectWeapon('pistol');
      if (e.code === 'Digit4') useGameStore.getState().selectWeapon('smg');
      if (e.code === 'Digit5') useGameStore.getState().selectWeapon('rifle');
      if (e.code === 'Digit6') useGameStore.getState().selectWeapon('sniper');

      // Radio Station on 'KeyR' in Vehicle / Weapon Reload on Foot
      if (e.code === 'KeyR') {
        const store = useGameStore.getState();
        if (this.currentVehicle) {
          store.nextRadioStation();
          audioManager.startRadio(useGameStore.getState().radioStation);
        } else {
          this.reload();
        }
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });

    // Right-click context menu prevention to toggle weapon aim
    this.container.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      const store = useGameStore.getState();
      if (store.screen === 'playing' && !store.isPhoneOpen) {
        this.toggleAim();
      }
    });

    // Mouse camera look and left-click weapon firing
    this.container.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        const store = useGameStore.getState();
        if (store.screen === 'playing' && !store.isPhoneOpen) {
          this.shootWeapon();
          if (document.pointerLockElement !== this.container) {
            this.container.requestPointerLock();
          }
        }
      }
    });
    window.addEventListener('mousemove', (e) => {
      const store = useGameStore.getState();
      if (store.isPhoneOpen || store.screen !== 'playing') return;
      if (document.pointerLockElement === this.container) {
        this.cameraController.handleMouseMove(e.movementX, e.movementY);
      }
    });

    this.container.addEventListener('wheel', (e) => {
      this.cameraController.handleZoom(e.deltaY);
    });
  }

  public toggleVehicle() {
    const store = useGameStore.getState();

    // 0. Airplane Exit
    if (transitSystem.isPlayerFlyingPlane) {
      if (transitSystem.planePos.y > 0.8 || transitSystem.planeSpeed > 5) {
        store.showNotification('Land on the runway and stop the aircraft before exiting.');
        return;
      }
      transitSystem.isPlayerFlyingPlane = false;
      transitSystem.isPlaneAutopilot = false;
      store.setIsInPlane(false);
      const exitPos = transitSystem.planePos.clone();
      exitPos.x += Math.cos(transitSystem.planeHeading) * 4.5;
      exitPos.z -= Math.sin(transitSystem.planeHeading) * 4.5;
      exitPos.y = 0;
      this.player.position.copy(exitPos);
      this.player.group.visible = true;
      this.cameraController.mode = 'onFoot';
      audioManager.playDoorClose();
      store.showNotification('Disembarked Luxor Jet Airliner');
      return;
    }

    // 0B. Train Exit
    if (transitSystem.isPlayerRidingTrain) {
      const stationIndex = transitSystem.currentTrainStationIndex;
      if (!transitSystem.alightMetroTrain(this.player.position)) {
        store.showNotification('Wait until the train reaches a station and opens its doors.');
        return;
      }
      this.player.group.visible = true;
      this.cameraController.mode = 'onFoot';
      audioManager.playDoorClose();
      store.showNotification(`Exited at ${transitSystem.getMetroStationName(stationIndex)}.`);
      return;
    }

    const stationIndex = transitSystem.getNearbyMetroStationIndex(this.player.position);
    if (stationIndex >= 0) {
      if (transitSystem.metroTicketDestinationIndex < 0) {
        transitSystem.buyMetroTicket(stationIndex);
        return;
      }

      const trainIndex = transitSystem.getTrainStoppedAtStation(stationIndex);
      if (trainIndex < 0) {
        const arrival = Math.ceil(transitSystem.getMetroArrivalSeconds(stationIndex));
        store.showNotification(
          `Ticket ready for ${transitSystem.getMetroTicketDestinationName()}. Next train in ${arrival}s.`
        );
        return;
      }
      if (transitSystem.boardMetroTrain(trainIndex, stationIndex)) {
        this.player.group.visible = true;
        this.player.heading = transitSystem.getPlayerTrainGroup().rotation.y + Math.PI / 2;
        this.player.group.rotation.y = this.player.heading;
        this.player.rig.animate(0, false, true, 0.016);
        this.cameraController.mode = 'vehicle';
        audioManager.playTrainRide();
        store.showNotification(
          `Boarded Line A. Destination: ${transitSystem.getMetroStationName(transitSystem.selectedMetroDestinationIndex)}.`
        );
      }
      return;
    }

    // 1. Helicopter Exit
    if (transitSystem.isPlayerFlyingHeli) {
      transitSystem.isPlayerFlyingHeli = false;
      store.setHelicopterInFlight(false);
      const exitPos = transitSystem.heliPos.clone();
      exitPos.x += 2.2;
      exitPos.y = Math.max(0, exitPos.y);
      this.player.position.copy(exitPos);
      this.player.group.visible = true;
      this.cameraController.mode = 'onFoot';
      audioManager.playDoorClose();
      store.showNotification('Disembarked V-Bay Maverick Chopper');
      return;
    }

    // 2. Car Exit
    if (this.currentVehicle) {
      const exitPos = this.currentVehicle.position.clone();
      const leftVec = new THREE.Vector3(
        Math.cos(this.currentVehicle.heading),
        0,
        -Math.sin(this.currentVehicle.heading)
      );
      exitPos.add(leftVec.multiplyScalar(2.2));
      exitPos.y = 0;

      // Animate door opening
      this.currentVehicle.openDoor('left');
      audioManager.playDoorOpen();

      this.player.position.copy(exitPos);
      this.player.currentVehicleIndex = null;
      this.player.group.visible = true;

      const leavingVeh = this.currentVehicle;
      leavingVeh.isPlayerDriving = false;
      leavingVeh.isParked = leavingVeh.config.type === 'police' &&
        this.policeSystem.cruisers.some((cruiser) =>
          cruiser.vehicle === leavingVeh && cruiser.hasDeployedOfficers
        );
      this.currentVehicle = null;

      store.setIsInVehicle(false);
      this.cameraController.mode = 'onFoot';
      audioManager.stopEngine();

      setTimeout(() => {
        leavingVeh.closeDoor('left');
        audioManager.playDoorClose();
      }, 350);
      return;
    }

    // Board at the aircraft's side door rather than measuring from its center.
    const planeDist = this.player.position.distanceTo(transitSystem.getPlaneEntryPosition());
    if (planeDist < 4.5) {
      transitSystem.isPlayerFlyingPlane = true;
      store.setIsInPlane(true);
      this.player.group.visible = false;
      this.cameraController.mode = 'vehicle';
      audioManager.playDoorClose();
      audioManager.playPlaneTurbine(0.4);
      store.showNotification('Piloting Luxor Jet · [W/S] Throttle · [Space/Shift] Pitch · [A/D] Bank · [F] Autopilot');
      return;
    }

    // 3C. Helicopter Entry Check (< 5.0m)
    const heliDist = this.player.position.distanceTo(transitSystem.heliPos);
    if (heliDist < 5.0) {
      transitSystem.isPlayerFlyingHeli = true;
      store.setHelicopterInFlight(true);
      this.player.group.visible = false;
      this.cameraController.mode = 'vehicle';
      audioManager.playDoorClose();
      audioManager.playHelicopterRotor();
      store.showNotification('Piloting V-Bay Maverick Chopper! [W/S] Pitch · [A/D] Turn · [Space] Ascend · [Shift] Descend');
      return;
    }

    // 4. Carjacking Check: Traffic car with driver within 4.5m
    const trafficCar = this.trafficManager.trafficCars.find(
      (c: TrafficCarAI) =>
        c.vehicle.position.distanceTo(this.player.position) < 3.6 &&
        c.hasDriver &&
        !c.vehicle.isDestroyed
    );

    if (trafficCar) {
      // Grand Theft Auto Carjacking Sequence
      store.setIsCarjacking(true);
      trafficCar.vehicle.openDoor('left');
      audioManager.playDoorOpen();
      audioManager.playCarjackYank();

      // Yank driver out onto pavement
      trafficCar.carjack();

      // Enter vehicle
      this.currentVehicle = trafficCar.vehicle;
      this.currentVehicle.isPlayerDriving = true;
      this.player.currentVehicleIndex = 0;
      this.player.group.visible = false;

      store.setIsInVehicle(true, trafficCar.vehicle.config.name);
      this.cameraController.mode = 'vehicle';
      store.triggerCrime(3);
      store.showNotification('Grand Theft Auto! Yanked civilian driver out of vehicle! +3 Stars');

      setTimeout(() => {
        store.setIsCarjacking(false);
        if (this.currentVehicle) {
          this.currentVehicle.closeDoor('left');
          audioManager.playDoorClose();
          audioManager.startEngine();
        }
      }, 450);
      return;
    }

    // 5. Normal Empty Car Entry Check (< 4.5m)
    let closestVeh: Vehicle | null = null;
    let minDist = 3.6;

    const allVehicles = [
      ...this.vehicles,
      ...this.trafficManager.vehicles,
      ...this.policeSystem.cruisers.map((cruiser) => cruiser.vehicle)
    ];
    for (const veh of allVehicles) {
      if (veh.isDestroyed) continue;
      const dist = this.player.position.distanceTo(veh.position);
      if (dist < minDist) {
        minDist = dist;
        closestVeh = veh;
      }
    }

    if (closestVeh) {
      closestVeh.openDoor('left');
      audioManager.playDoorOpen();
      this.currentVehicle = closestVeh;
      this.currentVehicle.isPlayerDriving = true;
      this.currentVehicle.isParked = false;
      this.player.currentVehicleIndex = 0;
      this.player.group.visible = false;

      store.setIsInVehicle(true, closestVeh.config.name);
      this.cameraController.mode = 'vehicle';

      setTimeout(() => {
        if (this.currentVehicle) {
          this.currentVehicle.closeDoor('left');
          audioManager.playDoorClose();
          audioManager.startEngine();
        }
      }, 350);
    }
  }

  public toggleAim() {
    const store = useGameStore.getState();
    store.setAiming(!store.isAiming);
  }

  public reload() {
    const store = useGameStore.getState();
    if (store.currentWeapon === 'fists' || store.currentWeapon === 'knife') return;
    store.reloadWeapon();
    audioManager.playGunReload();
    store.showNotification(`Reloaded ${store.weapons[store.currentWeapon].name}`);
  }

  public shootWeapon() {
    const store = useGameStore.getState();
    if (store.screen !== 'playing') return;

    // In vehicle or helicopter: no shooting on foot
    if (this.currentVehicle || transitSystem.isPlayerFlyingHeli) {
      return;
    }

    const canFire = store.fireWeapon();
    if (!canFire) {
      if (store.currentWeapon !== 'fists') {
        const wep = store.weapons[store.currentWeapon];
        if (wep.clip === 0 && wep.reserve > 0) {
          this.reload();
        }
      }
      return;
    }

    const currentWep = store.currentWeapon;

    // A. MELEE / FISTS COMBAT
    if (currentWep === 'fists' || currentWep === 'knife') {
      audioManager.playBulletImpact();
      this.player.triggerAttack(true);
      this.cameraController.applyRecoil(0.035);
      let hit = false;
      const meleeDamage = currentWep === 'knife' ? 45 : 35;
      const meleeRange = currentWep === 'knife' ? 2.4 : 2.8;
      // 1. Police officers
      for (const cruiser of this.policeSystem.cruisers) {
        for (const officer of cruiser.officers) {
          if (officer.isDeployed && !officer.isDead && officer.position.distanceTo(this.player.position) < meleeRange) {
            const killed = officer.takeDamage(meleeDamage);
            if (killed) {
              store.addCash(140);
              store.showNotification('Police Officer knocked down! +$140 cash');
              store.triggerCrime(3);
            }
            hit = true;
            break;
          }
        }
        if (hit) break;
      }

      // 2. Pedestrians
      if (!hit) {
        for (const ped of this.pedestrianManager.pedestrians) {
          if (!ped.isDead && ped.position.distanceTo(this.player.position) < meleeRange) {
            const killed = ped.takeDamage(meleeDamage);
            ped.triggerPanic(this.player.position);
            if (killed) {
              store.addCash(50);
              store.showNotification('Civilian knocked out! +$50 cash');
              store.triggerCrime(2);
            }
            break;
          }
        }
      }
      return;
    }

    // B. FIREARMS (PISTOL, SMG, RIFLE)
    let damage = 40;
    if (currentWep === 'pistol') {
      audioManager.playPistolShot();
      damage = 40;
    } else if (currentWep === 'smg') {
      audioManager.playSmgShot();
      damage = 25;
    } else if (currentWep === 'rifle') {
      audioManager.playRifleShot();
      damage = 65;
    } else if (currentWep === 'sniper') {
      audioManager.playRifleShot();
      damage = 100;
    }
    this.player.triggerAttack(false);
    this.cameraController.applyRecoil(
      currentWep === 'rifle' ? 0.075 : currentWep === 'pistol' ? 0.045 : 0.025
    );

    // Camera center crosshair raycast into 3D world
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(0, 0), this.cameraController.camera);
    const vehicleHits = raycaster.intersectObjects(
      this.getAllVehicles().map((vehicle) => vehicle.group),
      true
    );
    const vehicleOcclusionDistance = vehicleHits[0]?.distance ?? Number.POSITIVE_INFINITY;

    const muzzlePos = this.player.position.clone().add(new THREE.Vector3(0, 1.45, 0));
    let hitPoint: THREE.Vector3 | null = null;

    // 1. Check Police Officers
    for (const cruiser of this.policeSystem.cruisers) {
      for (const officer of cruiser.officers) {
        if (!officer.isDeployed || officer.isDead) continue;
        const hits = raycaster.intersectObject(officer.group, true);
        const weaponRange = currentWep === 'sniper' ? 260 : 90;
        if (hits.length > 0 && hits[0].distance < weaponRange && hits[0].distance < vehicleOcclusionDistance) {
          hitPoint = hits[0].point;
          const killed = officer.takeDamage(damage);
          audioManager.playBulletImpact();
          if (killed) {
            store.addCash(150);
            store.showNotification('VCPD Officer neutralized! +$150 cash collected');
            store.triggerCrime(3);
          }
          break;
        }
      }
      if (hitPoint) break;
    }

    // 2. Check Pedestrians
    if (!hitPoint) {
      for (const ped of this.pedestrianManager.pedestrians) {
        if (ped.isDead) continue;
        const hits = raycaster.intersectObject(ped.group, true);
        const weaponRange = currentWep === 'sniper' ? 260 : 90;
        if (hits.length > 0 && hits[0].distance < weaponRange && hits[0].distance < vehicleOcclusionDistance) {
          hitPoint = hits[0].point;
          const killed = ped.takeDamage(damage);
          audioManager.playBulletImpact();
          ped.triggerPanic(this.player.position);
          if (killed) {
            store.addCash(55);
            store.showNotification('Civilian neutralized! +$55 cash collected');
            store.triggerCrime(2);
          }
          break;
        }
      }
    }

    // 3. Check Vehicles
    if (!hitPoint) {
      const allVehicles = this.getAllVehicles();
      for (const veh of allVehicles) {
        const hits = raycaster.intersectObject(veh.group, true);
        if (hits.length > 0 && hits[0].distance < (currentWep === 'sniper' ? 260 : 90)) {
          hitPoint = hits[0].point;
          veh.applyDamage(damage * 0.4);
          audioManager.playBulletImpact();
          break;
        }
      }
    }

    // If no geometry hit, line travels 70m down the sightline
    if (!hitPoint) {
      hitPoint = raycaster.ray.origin.clone().add(raycaster.ray.direction.clone().multiplyScalar(70));
    }

    // Bullet Tracer
    this.spawnBulletTracer(muzzlePos, hitPoint);

    // Alert nearby crowd & trigger crime heat
    this.pedestrianManager.panicNearby(this.player.position, 40);
    store.triggerCrime(1);
  }

  public spawnBulletTracer(from: THREE.Vector3, to: THREE.Vector3) {
    const geo = new THREE.BufferGeometry().setFromPoints([from, to]);
    const mat = new THREE.LineBasicMaterial({
      color: 0xfef08a,
      transparent: true,
      opacity: 0.95
    });
    const line = new THREE.Line(geo, mat);
    this.scene.add(line);
    this.bulletTracers.push({ line, age: 0 });
  }

  public spawnPurchasedCar(type: 'sports' | 'suv' | 'sedan' | 'taxi' | 'ambulance', colorHex: number) {
    const spawnPos = this.currentVehicle
      ? this.currentVehicle.position.clone().add(new THREE.Vector3(5, 0, 0))
      : this.player.position.clone().add(new THREE.Vector3(4, 0, 4));

    let name = 'Infernus Spyder Custom';
    let maxSpeed = 44.0;
    let acceleration = 22.0;

    if (type === 'suv') {
      name = 'Mammoth Patriot AWD';
      maxSpeed = 32.0;
      acceleration = 14.0;
    } else if (type === 'sedan') {
      name = 'V-Bay Executive Limousine';
      maxSpeed = 34.0;
      acceleration = 16.0;
    } else if (type === 'taxi') {
      name = 'Vice Bay Taxi Cruiser';
      maxSpeed = 36.0;
      acceleration = 17.0;
    } else if (type === 'ambulance') {
      name = 'VCPD Paramedic Ambulance';
      maxSpeed = 38.0;
      acceleration = 19.0;
    }

    const config: VehicleConfig = {
      name,
      type,
      colorHex,
      maxSpeed,
      acceleration,
      brakeForce: 28.0,
      steerAngleMax: 0.52,
      handling: 1.3,
      healthMax: 120
    };

    const newCar = new Vehicle(config, spawnPos, this.player.heading);
    this.vehicles.push(newCar);
    this.scene.add(newCar.group);
    audioManager.playCashRegister();
  }

  public start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    this.loop();
  }

  public stop() {
    this.isRunning = false;
    cancelAnimationFrame(this.animFrameId);
    clearTimeout(this.animFrameId);
  }

  private afterDraw(cb: () => void) {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (!this.isRunning) {
        if (sync) gl.deleteSync(sync);
        return;
      }
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.animFrameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.animFrameId = window.setTimeout(cb, 80);
      }
    };
    this.animFrameId = window.setTimeout(poll, 5);
  }

  private loop = () => {
    if (!this.isRunning) return;
    const now = performance.now();
    const rawDt = (now - this.lastTime) / 1000;
    this.lastTime = now;
    this.simulationAccumulator += Math.min(rawDt, 0.1);
    this.chunkGenerationBudget = 1;
    this.applyGraphicsQuality();
    let steps = 0;
    while (this.simulationAccumulator >= this.fixedStep && steps < 6) {
      this.tick(this.fixedStep);
      this.simulationTime += this.fixedStep;
      this.simulationAccumulator -= this.fixedStep;
      steps++;
    }
    if (steps === 6) {
      this.simulationAccumulator = Math.min(this.simulationAccumulator, this.fixedStep);
    }
    this.updateCityMotion(Math.min(rawDt, 0.1));
    const renderAlpha = this.simulationAccumulator / this.fixedStep;
    for (const vehicle of this.getAllVehicles()) {
      vehicle.setRenderAlpha(renderAlpha);
    }
    const quality = useGameStore.getState().graphicsQuality;
    const renderInterval = quality === 'low' ? 1 / 30 : quality === 'medium' ? 1 / 45 : 0;
    if (!renderInterval || now - this.lastRenderTime >= renderInterval * 1000) {
      this.renderer.render(this.scene, this.cameraController.camera);
      this.lastRenderTime = now;
    }

    if (this.isSoftwareGl) {
      this.afterDraw(this.loop);
    } else {
      this.animFrameId = requestAnimationFrame(this.loop);
    }
  };

  private updateCityMotion(dt: number) {
    for (const object of this.cityData.motion.windSwayObjects) {
      const phase = object.userData.windPhase as number;
      object.rotation.z = Math.sin(this.simulationTime * 0.55 + phase) * 0.035;
      object.rotation.x = Math.cos(this.simulationTime * 0.38 + phase) * 0.018;
    }

    this.waterUpdateAccumulator += dt;
    if (this.waterUpdateAccumulator < 1 / 15) return;
    this.waterUpdateAccumulator %= 1 / 15;

    const position = this.cityData.motion.oceanGeometry.attributes.position as THREE.BufferAttribute;
    const heights = position.array as Float32Array;
    const base = this.cityData.motion.oceanBaseHeights;
    for (let i = 0; i < heights.length; i += 3) {
      const x = base[i];
      const z = base[i + 2];
      heights[i + 1] = base[i + 1] +
        Math.sin(x * 0.022 + this.simulationTime * 0.75) * 0.16 +
        Math.sin(z * 0.072 - this.simulationTime * 1.1 + x * 0.009) * 0.08;
    }
    position.needsUpdate = true;
    this.cityData.motion.oceanGeometry.computeVertexNormals();
  }

  private applyAdaptivePerformancePreset() {
    const store = useGameStore.getState();
    if (this.isSoftwareGl) {
      store.setGraphicsQuality('low');
      return;
    }

    const lowPower = (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) ||
      ((navigator as Navigator & { deviceMemory?: number }).deviceMemory !== undefined &&
        (navigator as Navigator & { deviceMemory?: number }).deviceMemory! <= 6) ||
      window.innerWidth <= 1280;

    if (lowPower && store.graphicsQuality === 'high') {
      store.setGraphicsQuality('low');
    }
  }

  private applyGraphicsQuality() {
    const quality = useGameStore.getState().graphicsQuality;
    const touchMode = useGameStore.getState().touchMode;
    if (quality === this.appliedGraphicsQuality && touchMode === this.appliedTouchMode) return;

    const pixelRatioCaps = { low: 0.75, medium: 1, high: 1.35, ultra: 1.6 };
    const shadowSizes = touchMode
      ? { low: 0, medium: 384, high: 768, ultra: 1024 }
      : { low: 0, medium: 512, high: 1024, ultra: 1536 };
    this.renderer.setPixelRatio(
      this.isSoftwareGl
        ? 1
        : Math.min(window.devicePixelRatio || 1, pixelRatioCaps[quality], touchMode ? 1 : 1.6)
    );
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.shadowMap.enabled = !this.isSoftwareGl && quality !== 'low';
    if (this.environmentSystem) {
      this.environmentSystem.dirLight.shadow.mapSize.set(shadowSizes[quality], shadowSizes[quality]);
      this.environmentSystem.dirLight.shadow.needsUpdate = true;
      this.environmentSystem.setPerformanceQuality(quality);
    }
    this.appliedGraphicsQuality = quality;
    this.appliedTouchMode = touchMode;
  }

  private tick(dt: number) {
    const store = useGameStore.getState();

    // 0. Handle WASTED Death State
    if (store.isWasted) {
      this.player.collapseRagdoll(dt);
      const remaining = store.wastedTimer - dt;
      store.setWastedTimer(remaining);
      if (remaining <= 0) {
        this.handleRespawn();
      }
      this.cameraController.update(this.player.position, null, this.player.heading, 0, dt);
      return;
    }

    if (store.supermarketOpen) {
      this.environmentSystem.update(store.timeOfDay, store.weather, this.player.position, dt);
      this.updateStreetLights(store.timeOfDay < 5.5 || store.timeOfDay > 19.5 || store.weather === 'night');
      this.cameraController.update(this.player.position, null, this.player.heading, 0, dt);
      return;
    }

    // 0B. Check if Player Health drops to 0
    if (store.health <= 0) {
      store.triggerWasted();
      audioManager.playWastedSound();
      if (this.currentVehicle) {
        this.currentVehicle.isPlayerDriving = false;
        this.currentVehicle = null;
        store.setIsInVehicle(false);
        this.player.currentVehicleIndex = null;
        this.player.group.visible = true;
      }
      if (transitSystem.isPlayerFlyingPlane) {
        transitSystem.isPlayerFlyingPlane = false;
        store.setIsInPlane(false);
        this.player.group.visible = true;
      }
      if (transitSystem.isPlayerRidingTrain) {
        transitSystem.isPlayerRidingTrain = false;
        store.setIsInTrain(false);
        this.player.group.visible = true;
      }
      if (transitSystem.isPlayerFlyingHeli) {
        transitSystem.isPlayerFlyingHeli = false;
        store.setHelicopterInFlight(false);
        this.player.group.visible = true;
      }
      this.cameraController.mode = 'onFoot';
      return;
    }

    // 1. Title / Cinematic Mode
    if (store.screen === 'title' || store.screen === 'loading') {
      this.cameraController.mode = 'cinematic';
      this.cameraController.update(this.player.position, null, 0, 0, dt);
      this.environmentSystem.update(store.timeOfDay, store.weather, this.player.position, dt);
      this.updateStreetLights(store.timeOfDay < 5.5 || store.timeOfDay > 19.5 || store.weather === 'night');
      this.updateWorldChunks(
        this.player.position,
        store.timeOfDay < 5.5 || store.timeOfDay > 19.5 || store.weather === 'night'
      );
      return;
    }

    // 2. Playing Mode - Read Keyboard & Touch Inputs
    const isForward = !store.isInventoryOpen && (this.keys['KeyW'] || this.keys['ArrowUp'] || this.touchInput.forward > 0);
    const isBackward = !store.isInventoryOpen && (this.keys['KeyS'] || this.keys['ArrowDown'] || this.touchInput.forward < 0);
    const isLeft = !store.isInventoryOpen && (this.keys['KeyA'] || this.keys['ArrowLeft'] || this.touchInput.strafe < 0);
    const isRight = !store.isInventoryOpen && (this.keys['KeyD'] || this.keys['ArrowRight'] || this.touchInput.strafe > 0);
    const isSprint = !store.isInventoryOpen && (this.keys['ShiftLeft'] || this.keys['ShiftRight'] || this.touchInput.sprint);
    const isJump = !store.isInventoryOpen && (this.keys['Space'] || this.touchInput.jump);
    const isHandbrake = (this.currentVehicle && this.keys['Space']) || this.touchInput.handbrake;

    // 3. Update Player, Vehicle, Plane, Train, or Helicopter
    if (transitSystem.isPlayerFlyingPlane) {
      this.cameraController.mode = 'vehicle';
      const flightInput = {
        forward: (isForward ? 1 : 0) - (isBackward ? 1 : 0),
        strafe: (isRight ? 1 : 0) - (isLeft ? 1 : 0),
        ascend: isJump,
        descend: isSprint
      };
      transitSystem.update(this.player.position, flightInput, dt, this.pedestrianManager.pedestrians, this.scene);
      const planeKts = Math.round(transitSystem.planeSpeed * 1.94);
      store.setVehicleStats(planeKts, 100, 1, 4800);
      this.player.position.copy(transitSystem.planePos);
    } else if (transitSystem.isPlayerRidingTrain) {
      this.cameraController.mode = 'vehicle';
      transitSystem.update(
        this.player.position,
        { forward: 0, strafe: 0, ascend: false, descend: false },
        dt,
        this.pedestrianManager.pedestrians,
        this.scene
      );
      if (transitSystem.isPlayerRidingTrain) {
        const train = transitSystem.getPlayerTrainGroup();
        this.player.heading = train.rotation.y + Math.PI / 2;
        this.player.group.rotation.y = this.player.heading;
        this.player.group.visible = true;
        this.player.rig.animate(0, false, true, dt);
        store.setVehicleStats(40, 100, 1, 2800);
      } else {
        this.player.group.visible = true;
        this.cameraController.mode = 'onFoot';
      }
    } else if (transitSystem.isPlayerFlyingHeli) {
      this.cameraController.mode = 'vehicle';
      const flightInput = {
        forward: (isForward ? 1 : 0) - (isBackward ? 1 : 0),
        strafe: (isRight ? 1 : 0) - (isLeft ? 1 : 0),
        ascend: isJump,
        descend: isSprint
      };
      transitSystem.update(this.player.position, flightInput, dt, this.pedestrianManager.pedestrians, this.scene);

      const heliSpeedKts = Math.round(transitSystem.heliVelocity.length() * 1.94);
      store.setVehicleStats(heliSpeedKts, 100, 1, 4000);
    } else {
      transitSystem.update(
        this.player.position,
        { forward: 0, strafe: 0, ascend: false, descend: false },
        dt,
        this.pedestrianManager.pedestrians,
        this.scene
      );

      if (this.currentVehicle) {
        this.cameraController.mode = 'vehicle';
        const customization = store.vehicleCustomization;
        const customizationKey = `${customization.turboLevel}:${customization.neonUnderglow}:${customization.neonColor}`;
        if (this.customizedVehicle !== this.currentVehicle || this.appliedCustomizationKey !== customizationKey) {
          this.currentVehicle.applyCustomization({
            turboLevel: customization.turboLevel,
            neonUnderglow: customization.neonUnderglow,
            neonColor: customization.neonColor
          });
          this.customizedVehicle = this.currentVehicle;
          this.appliedCustomizationKey = customizationKey;
        }
        let throttle = 0;
        let brake = 0;
        let steer = 0;

        if (isForward) throttle = 1.0;
        if (isBackward) brake = 1.0;
        if (isLeft) steer = 1.0;
        if (isRight) steer = -1.0;

        this.currentVehicle.update(
          { throttle, brake, steer, handbrake: isHandbrake },
          this.collisionGrid.getNearby(this.currentVehicle.position.x, this.currentVehicle.position.z, 8),
          dt,
          this.getAllVehicles().filter((vehicle) => vehicle !== this.currentVehicle)
        );

        // Keep player position anchored to car
        this.player.position.copy(this.currentVehicle.position);

        // Update store stats for HUD speedometer, fuel, odometer
        const mph = Math.round(Math.abs(this.currentVehicle.speed) * 2.237);
        store.setVehicleStats(
          mph,
          Math.round(this.currentVehicle.health),
          this.currentVehicle.currentGear,
          this.currentVehicle.rpm
        );
        store.updateVehicleFuelAndOdometer(dt, mph);

        // --- REALISTIC VEHICULAR ROADKILL / HOMICIDE COLLISION ---
        const vSpeed = Math.abs(this.currentVehicle.speed);
        if (vSpeed > 4.5) {
          const forwardVec = new THREE.Vector3(
            -Math.sin(this.currentVehicle.heading),
            0,
            -Math.cos(this.currentVehicle.heading)
          );

          // 1. Run over civilians / pedestrians
          for (const ped of this.pedestrianManager.pedestrians) {
            if (ped.isDead) continue;
            const dist = ped.position.distanceTo(this.currentVehicle.position);
            if (dist < 3.2) {
              const toPed = ped.position.clone().sub(this.currentVehicle.position).normalize();
              if (forwardVec.dot(toPed) > 0.2 || dist < 2.0) {
                const knockback = forwardVec.clone().multiplyScalar(vSpeed * 0.75).add(new THREE.Vector3(0, vSpeed * 0.35, 0));
                const killed = ped.takeDamage(100, knockback);
                audioManager.playHeavyCrash();
                audioManager.playCitizenScream();
                this.currentVehicle.speed *= 0.88;
                if (killed) {
                  store.addCash(65);
                  store.triggerCrime(3);
                  store.showNotification('Vehicular homicide! Civilian struck down! +$65');
                }
              }
            }
          }

          // 2. Run over police officers
          for (const cruiser of this.policeSystem.cruisers) {
            for (const officer of cruiser.officers) {
              if (!officer.isDeployed || officer.isDead) continue;
              const dist = officer.position.distanceTo(this.currentVehicle.position);
              if (dist < 3.2) {
                const toOff = officer.position.clone().sub(this.currentVehicle.position).normalize();
                if (forwardVec.dot(toOff) > 0.2 || dist < 2.0) {
                  const knockback = forwardVec.clone().multiplyScalar(vSpeed * 0.75).add(new THREE.Vector3(0, vSpeed * 0.35, 0));
                  const killed = officer.takeDamage(100, knockback);
                  audioManager.playHeavyCrash();
                  audioManager.playCitizenScream();
                  this.currentVehicle.speed *= 0.88;
                  if (killed) {
                    store.addCash(160);
                    store.triggerCrime(4);
                    store.showNotification('VCPD Officer hit by vehicle! +$160');
                  }
                }
              }
            }
          }
        }
      } else {
        this.cameraController.mode = 'onFoot';
        const forwardInput = (isForward ? 1 : 0) - (isBackward ? 1 : 0);
        const strafeInput = (isRight ? 1 : 0) - (isLeft ? 1 : 0);

        this.player.update(
          { forward: forwardInput, strafe: strafeInput, sprint: isSprint, jump: isJump },
          this.cameraController.yaw,
          this.collisionGrid.getNearby(this.player.position.x, this.player.position.z, 4),
          dt,
          this.pedestrianManager.pedestrians
            .filter((pedestrian) => !pedestrian.isDead)
            .map((pedestrian) => pedestrian.position)
        );
      }
    }

    // 4. Update Camera
    if (transitSystem.isPlayerFlyingPlane) {
      this.cameraController.update(
        transitSystem.planePos,
        transitSystem.planePos,
        transitSystem.planeHeading,
        transitSystem.planeSpeed * 2.2,
        dt,
        true,
        transitSystem.planePitch,
        false,
        transitSystem.getPlaneCockpitCameraPosition()
      );
    } else if (transitSystem.isPlayerRidingTrain) {
      const train = transitSystem.getPlayerTrainGroup();
      this.cameraController.update(
        this.player.position,
        train.position,
        train.rotation.y,
        transitSystem.trainSpeed,
        dt,
        false,
        0,
        true
      );
    } else if (transitSystem.isPlayerFlyingHeli) {
      this.cameraController.update(
        transitSystem.heliPos,
        transitSystem.heliPos,
        transitSystem.heliHeading,
        transitSystem.heliVelocity.length() * 2.2,
        dt
      );
    } else {
      this.cameraController.update(
        this.player.position,
        this.currentVehicle ? this.currentVehicle.position : null,
        this.currentVehicle ? this.currentVehicle.heading : this.player.heading,
        this.currentVehicle ? this.currentVehicle.speed : 0,
        dt,
        false,
        0,
        false,
        this.currentVehicle ? this.currentVehicle.getInteriorCameraPosition() : null
      );
    }

    const isOnFoot =
      !store.isInVehicle &&
      !transitSystem.isPlayerFlyingPlane &&
      !transitSystem.isPlayerRidingTrain &&
      !transitSystem.isPlayerFlyingHeli &&
      !store.isWasted;
    const firstPersonOnFoot = isOnFoot && store.cameraViewMode === 'first_person';
    this.firstPersonViewmodelRoot.position.copy(this.cameraController.camera.position);
    this.firstPersonViewmodelRoot.quaternion.copy(this.cameraController.camera.quaternion);
    if (isOnFoot) {
      this.player.group.visible = !firstPersonOnFoot;
    }
    this.player.rig.firstPersonArms.visible = firstPersonOnFoot;
    this.player.rig.updateWatch(store.timeOfDay);

    // 5. Update AI Systems
    const nonTrafficVehicles = [
      ...this.vehicles,
      ...this.policeSystem.cruisers.map((cruiser) => cruiser.vehicle)
    ];
    this.trafficManager.update(this.player.position, !!this.currentVehicle, dt, nonTrafficVehicles);
    this.farmAnimalManager.update(dt);
    this.pedestrianManager.update(
      this.player.position,
      this.currentVehicle ? Math.abs(this.currentVehicle.speed) : 0,
      dt
    );
    this.policeSystem.update(this.player.position, !!this.currentVehicle, dt, [
      ...this.vehicles,
      ...this.trafficManager.vehicles
    ]);
    for (const vehicle of this.getAllVehicles()) {
      vehicle.updateDamageEffects(dt);
    }

    // Fade and remove player bullet tracers
    for (let i = this.bulletTracers.length - 1; i >= 0; i--) {
      const tr = this.bulletTracers[i];
      tr.age += dt;
      if (tr.age > 0.08) {
        this.scene.remove(tr.line);
        this.bulletTracers.splice(i, 1);
      }
    }

    // 6. Update Missions & GPS
    this.missionManager.update(this.player.position, dt);

    // 7. Update Interactive Jobs System (Taxi, Courier, Paramedic, Mechanic)
    this.updateJobsSystem(dt);

    // 8. Update Environment
    this.worldTimeAccumulator += dt;
    if (this.worldTimeAccumulator >= 1) {
      store.setTimeOfDay((store.timeOfDay + this.worldTimeAccumulator / 60) % 24);
      this.worldTimeAccumulator %= 1;
    }
    const timeOfDay = useGameStore.getState().timeOfDay;
    const isNight = timeOfDay < 5.5 || timeOfDay > 19.5 || store.weather === 'night';
    this.environmentSystem.update(timeOfDay, store.weather, this.player.position, dt);
    this.updateStreetLights(isNight);
    this.updateWorldChunks(this.player.position, isNight);

    // 9. Interactive Location Triggers (Pay 'n' Spray, Dealership, Fast Food, Gas Station, Safehouse)
    this.checkInteractiveZones();

    // 10. Sync store player position for Minimap and Smartphone Map
    if (
      store.currentInterior === 'outdoor' &&
      !transitSystem.isPlayerFlyingPlane &&
      !transitSystem.isPlayerRidingTrain &&
      !transitSystem.isPlayerFlyingHeli
    ) {
      const district = getDistrictName(this.player.position.x, this.player.position.z);
      if (district !== this.currentDistrict) {
        this.currentDistrict = district;
        store.showNotification(district);
      }
      store.setPlayerWorldTransform(
        [this.player.position.x, this.player.position.y, this.player.position.z],
        this.cameraController.yaw
      );
    }
  }

  // --- INTERACTIVE JOBS SYSTEM ---
  private getAllVehicles(): Vehicle[] {
    return [
      ...new Set([
        ...this.vehicles,
        ...this.trafficManager.vehicles,
        ...this.policeSystem.cruisers.map((cruiser) => cruiser.vehicle)
      ])
    ];
  }

  private updateWorldChunks(position: THREE.Vector3, isNight: boolean) {
    const createdChunk = this.worldChunkStreamer.update(
      position,
      isNight,
      this.chunkGenerationBudget > 0
    );
    if (createdChunk) this.chunkGenerationBudget--;
  }

  private updateStreetLights(isNight: boolean) {
    for (const lamp of this.cityData.streetLamps) {
      const bulb = lamp.userData.bulb as THREE.Mesh | undefined;
      if (bulb) {
        const flicker = 3.75 + Math.sin(this.simulationTime * 19 + lamp.position.x * 2.1) * 0.18;
        (bulb.material as THREE.MeshStandardMaterial).emissiveIntensity = isNight ? flicker : 0.05;
      }
    }
  }

  private updateJobsSystem(dt: number) {
    const store = useGameStore.getState();
    if (store.activeJob === 'none') {
      if (this.jobMarker) {
        this.scene.remove(this.jobMarker);
        this.jobMarker = null;
      }
      return;
    }

    // If no active passenger, generate one periodically
    if (!store.activePassenger) {
      this.jobTimer += dt;
      if (this.jobTimer >= 3.5) {
        this.jobTimer = 0;
        const stops: [number, number, number][] = [
          [110, 0, -68], // Dealership
          [110, 0, 28],  // Pay 'n' Spray
          [-10, 0, 105], // Marina Promenade
          [-80, 0, 90],  // Industrial Docks
          [20, 0, -10],  // Downtown Bank
          [-10, 0, -40]  // Grand Tower Safehouse
        ];
        const pIdx = Math.floor(Math.random() * stops.length);
        let dIdx = (pIdx + 1 + Math.floor(Math.random() * (stops.length - 1))) % stops.length;
        const names = ['Sofia Martinez', 'Tony Vance', 'Marcus Cole', 'Dr. Rachel Vance', 'Officer Kowalski', 'Chloe Price'];
        const name = names[Math.floor(Math.random() * names.length)];
        const fare = 480 + Math.floor(Math.random() * 520);

        store.setPassenger({
          name,
          pickupPos: stops[pIdx],
          dropPos: stops[dIdx],
          fare,
          isPickedUp: false,
          timeRemaining: 120
        });
        store.showNotification(`New Dispatch: Pickup ${name} ($${fare} fare)`);
        audioManager.playPhoneBeep();
      }
      return;
    }

    // Active Passenger Navigation
    const p = store.activePassenger;
    const targetPos = p.isPickedUp ? p.dropPos : p.pickupPos;

    // Create or update 3D Glowing Beacon Marker in scene
    if (!this.jobMarker) {
      this.jobMarker = new THREE.Group();
      const ringGeo = new THREE.RingGeometry(1.6, 2.2, 32);
      ringGeo.rotateX(-Math.PI / 2);
      const ringMat = new THREE.MeshBasicMaterial({ color: 0xfacc15, side: THREE.DoubleSide });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.y = 0.15;

      const pillarGeo = new THREE.CylinderGeometry(0.8, 0.8, 14, 16, 1, true);
      const pillarMat = new THREE.MeshBasicMaterial({
        color: 0xfacc15,
        transparent: true,
        opacity: 0.35,
        side: THREE.DoubleSide
      });
      const pillar = new THREE.Mesh(pillarGeo, pillarMat);
      pillar.position.y = 7;

      this.jobMarker.add(ring, pillar);
      this.scene.add(this.jobMarker);
    }

    this.jobMarker.position.set(targetPos[0], targetPos[1], targetPos[2]);
    this.jobMarker.rotation.y += dt * 1.5;

    // Distance calculation
    const dist = Math.hypot(this.player.position.x - targetPos[0], this.player.position.z - targetPos[2]);
    store.setDistanceToObjective(Math.round(dist));

    if (!p.isPickedUp) {
      if (dist < 6.5) {
        p.isPickedUp = true;
        store.setPassenger({ ...p, isPickedUp: true });
        store.showNotification(`Passenger ${p.name} boarded! Drive to destination.`);
        audioManager.playDoorSlam();
      }
    } else {
      if (dist < 6.5) {
        store.completeJobFare(p.fare);
        audioManager.playCashRegister();
        store.showNotification(`Fare complete! Earned $${p.fare}. Next dispatch queued.`);
        store.setPassenger(null);
        if (this.jobMarker) {
          this.scene.remove(this.jobMarker);
          this.jobMarker = null;
        }
        this.jobTimer = 0;
      }
    }
  }

  private checkInteractiveZones() {
    const store = useGameStore.getState();
    const pPos = this.player.position;

    // A. Pay 'n' Spray Garage (X: 110, Z: 28)
    const garageDist = Math.hypot(pPos.x - 110, pPos.z - 28);
    if (garageDist < 10 && this.currentVehicle) {
      store.setInteractionPrompt("Press [F] - Pay 'n' Spray Repair & Respray ($100)");
      if (this.keys['KeyF']) {
        if (store.spendCash(100)) {
          const neonColors = [0xef4444, 0x3b82f6, 0x10b981, 0xf59e0b, 0x8b5cf6, 0xec4899];
          const newColor = neonColors[Math.floor(Math.random() * neonColors.length)];
          this.currentVehicle.repair(newColor);
          store.clearWantedLevel();
          audioManager.playDoorSlam();
          audioManager.playCashRegister();
        }
      }
      return;
    }

    // B. Gas Station Refueling (X: -10, Z: 105)
    const gasDist = Math.hypot(pPos.x - -10, pPos.z - 105);
    if (gasDist < 9 && this.currentVehicle) {
      store.setInteractionPrompt("Press [F] - Vice Bay Gas Station - Refuel to 100% ($40)");
      if (this.keys['KeyF']) {
        if (store.spendCash(40)) {
          store.refuelVehicle();
          store.showNotification('Vehicle Fuel Tank Refueled to 100% Full!');
          audioManager.playCashRegister();
        }
      }
      return;
    }

    // C. Dealership Showroom (X: 110, Z: -68)
    const dealerDist = Math.hypot(pPos.x - 110, pPos.z - -68);
    if (dealerDist < 12) {
      store.setInteractionPrompt('Press [F] or Open Phone to Browse Legendary Motorsport');
      if (this.keys['KeyF']) {
        store.openPhone('browser');
      }
      return;
    }

    // D. Cluckin' Bell Fast Food (X: -10, Z: 125)
    const foodDist = Math.hypot(pPos.x - -10, pPos.z - 125);
    if (foodDist < 9) {
      store.setInteractionPrompt("Press [F] - Cluckin' Bell Meal - Restore Hunger & Health ($25)");
      if (this.keys['KeyF']) {
        if (store.spendCash(25)) {
          store.eatFood(50);
          store.healPlayer(100);
          audioManager.playCashRegister();
        }
      }
      return;
    }

    // E. Safehouse Grand Tower ATM (X: -8, Z: 22)
    const atmDist = Math.hypot(pPos.x - -8, pPos.z - 22);
    if (atmDist < 3.5 && !this.currentVehicle) {
      store.setInteractionPrompt("Press [F] - Maze Bank ATM - View Account & Pay Fines");
      if (this.keys['KeyF']) {
        store.openPhone('bank');
      }
      return;
    }

    // Nearby Aircraft & Train prompts
    if (!this.currentVehicle && !transitSystem.isPlayerFlyingHeli && !transitSystem.isPlayerFlyingPlane && !transitSystem.isPlayerRidingTrain) {
      const planeDist = this.player.position.distanceTo(transitSystem.getPlaneEntryPosition());
      if (planeDist < 4.5) {
        store.setInteractionPrompt('Press [E] to pilot Luxor Jet · [F] autopilot · [G] cruise speed');
        return;
      }
      const stationIndex = transitSystem.getNearbyMetroStationIndex(this.player.position);
      if (stationIndex >= 0) {
        const stoppedTrain = transitSystem.getTrainStoppedAtStation(stationIndex);
        const ticketDestination = transitSystem.getMetroTicketDestinationName();
        const arrival = Math.ceil(transitSystem.getMetroArrivalSeconds(stationIndex));
        if (ticketDestination && stoppedTrain >= 0) {
          store.setInteractionPrompt(
            `Press [E] to board Line A · ticket to ${ticketDestination}`
          );
        } else if (ticketDestination) {
          store.setInteractionPrompt(
            `Ticket to ${ticketDestination} · next train in ${arrival}s`
          );
        } else {
          store.setInteractionPrompt(
            `[Q] Destination: ${transitSystem.getSelectedMetroDestinationName()} · [E] Buy ticket $25 · train ${arrival}s`
          );
        }
        return;
      }
      const heliDist = this.player.position.distanceTo(transitSystem.heliPos);
      if (heliDist < 5.0) {
        store.setInteractionPrompt('Press [E] to Pilot V-Bay Maverick Helicopter');
        return;
      }
    } else if (transitSystem.isPlayerFlyingPlane) {
      if (transitSystem.planePos.y < 3 && transitSystem.planeSpeed < 8) {
        store.setInteractionPrompt(
          '[E] Exit Jet Airliner · [F] Autopilot · [G] cruise speed'
        );
      } else {
        store.setInteractionPrompt(null);
      }
      return;
    } else if (transitSystem.isPlayerRidingTrain) {
      if (transitSystem.currentTrainStationIndex >= 0) {
        store.setInteractionPrompt(
          `At ${transitSystem.getMetroStationName(transitSystem.currentTrainStationIndex)} · Press [E] to exit`
        );
      } else {
        store.setInteractionPrompt(null);
      }
      return;
    } else if (transitSystem.isPlayerFlyingHeli) {
      if (transitSystem.heliPos.y < 3.5 && transitSystem.heliVelocity.length() < 2) {
        store.setInteractionPrompt('Press [E] to Land & Exit Helicopter');
      } else {
        store.setInteractionPrompt(null);
      }
      return;
    }

    // Nearby Car or Carjack prompt
    if (!this.currentVehicle) {
      const trafficCar = this.trafficManager.trafficCars.find(
        (c: TrafficCarAI) => c.vehicle.position.distanceTo(this.player.position) < 3.6 && c.hasDriver
      );
      if (trafficCar) {
        store.setInteractionPrompt('Press [E] to Carjack Civilian Vehicle');
        return;
      }

      let nearCar = false;
      const allVehicles = [...this.vehicles, ...this.trafficManager.vehicles];
      for (const veh of allVehicles) {
        if (this.player.position.distanceTo(veh.position) < 3.6) {
          nearCar = true;
          break;
        }
      }
      if (nearCar) {
        store.setInteractionPrompt('Press [E] to Enter Vehicle');
        return;
      }
    } else {
      const brakePressed = this.keys['KeyS'] ||
        this.keys['ArrowDown'] ||
        this.keys['Space'] ||
        this.touchInput.forward < 0 ||
        this.touchInput.handbrake;
      if (Math.abs(this.currentVehicle.speed) < 1.2 || brakePressed) {
        store.setInteractionPrompt('Press [E] Exit Vehicle · [R] Radio · [B] Seatbelt');
      } else {
        store.setInteractionPrompt(null);
      }
      return;
    }

    // Interior triggers already set interaction prompt via buildingInteriors.update
    if (store.currentInterior === 'outdoor') {
      store.setInteractionPrompt(null);
    }
  }

  public handleRespawn() {
    const store = useGameStore.getState();
    const hospitalRespawn = new THREE.Vector3(-60, 0, -40);
    this.player.respawn(hospitalRespawn);
    store.clearWasted();
    store.spendCash(200);
    store.clearWantedLevel();
    store.showNotification('Discharged from Vice Bay General Hospital (-$200 Medical Expenses)');
  }

  private onResize = () => {
    if (!this.container) return;
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.cameraController.camera.aspect = w / h;
    this.cameraController.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  public destroy() {
    this.stop();
    window.removeEventListener('resize', this.onResize);
    this.container.removeEventListener('pointerdown', this.onTouchCameraStart);
    this.container.removeEventListener('pointermove', this.onTouchCameraMove);
    this.container.removeEventListener('pointerup', this.onTouchCameraEnd);
    this.container.removeEventListener('pointercancel', this.onTouchCameraEnd);
    audioManager.stopEngine();
    audioManager.stopRadio();
    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
    this.renderer.dispose();
  }
}

export { CanvasWorld as Game };
