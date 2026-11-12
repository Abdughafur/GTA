import * as THREE from 'three';
import { AIRPORT_CENTERS } from './CityGenerator';
import { audioManager } from '../core/AudioManager';
import { useGameStore } from '../core/gameState';
import { PedestrianAI } from '../ai/PedestrianAI';

interface MetroStation {
  name: string;
  progress: number;
  position: THREE.Vector3;
  platform: THREE.Group;
  display: {
    context: CanvasRenderingContext2D;
    texture: THREE.CanvasTexture;
  };
}

interface MetroTrain {
  group: THREE.Group;
  progress: number;
  speed: number;
  dwellTimer: number;
  stationIndex: number;
  doors: THREE.Mesh[];
  cabinLights: THREE.PointLight[];
  passengers: MetroPassenger[];
  stopPending: boolean;
}

interface MetroPassenger {
  pedestrian: PedestrianAI;
  destinationIndex: number;
  seat: THREE.Vector3;
  boardingPoint: THREE.Vector3;
  state: 'boarding' | 'riding';
}

export class TransitSystem {
  public rootGroup: THREE.Group = new THREE.Group();

  // Train system
  public trainGroup: THREE.Group = new THREE.Group();
  public trainPos: THREE.Vector3 = new THREE.Vector3(-140, 0.4, -140);
  public trainSpeed = 23.0; // m/s
  public trainProgress = 0; // 0..1 along loop
  public isPlayerRidingTrain = false;
  public currentTrainStationIndex = -1;
  public selectedMetroDestinationIndex = 1;
  public metroTicketDestinationIndex = -1;
  private metroJourneyDestinationIndex = -1;
  private trainTrackPoints: THREE.Vector3[] = [];
  private trainTrackCurve!: THREE.CatmullRomCurve3;
  private metroStationProgress: number[] = [];
  private metroStations: MetroStation[] = [];
  private metroTrains: MetroTrain[] = [];
  private stationLightMaterials: THREE.MeshStandardMaterial[] = [];
  private stationLights: THREE.PointLight[] = [];
  private playerTrainIndex = -1;
  private displayUpdateTimer = 0;
  private trainSoundTimer = 0;
  private readonly metroStationNames = [
    'Downtown Central',
    'Northgate',
    'Northgate Connector',
    'Eastport',
    'Southport',
    'Westhaven',
    'Westhaven North',
    'Downtown Market'
  ];
  private busGroup: THREE.Group = new THREE.Group();
  private busRouteCurve!: THREE.CatmullRomCurve3;
  private busProgress = 0;
  private busStopTimer = 0;
  private nextBusStop = 0;
  private readonly busStopProgress = [0.125, 0.375, 0.625, 0.875];

  // Helicopter system
  public heliGroup: THREE.Group = new THREE.Group();
  public heliMainRotor!: THREE.Group;
  public heliTailRotor!: THREE.Group;
  public heliPos: THREE.Vector3 = new THREE.Vector3(-10, 12.3, 10);
  public heliVelocity: THREE.Vector3 = new THREE.Vector3();
  public heliHeading = 0;
  public heliPitch = 0;
  public heliRoll = 0;
  public isPlayerFlyingHeli = false;
  private rotorRpm = 0;
  private rotorSoundTimer = 0;

  // Airport & Flyable Airplane System
  public airportGroup: THREE.Group = new THREE.Group();
  public planeGroup: THREE.Group = new THREE.Group();
  public planePos: THREE.Vector3 = new THREE.Vector3(-70, 0.05, -3400);
  public planeVelocity: THREE.Vector3 = new THREE.Vector3();
  public planeSpeed = 0; // m/s (up to 70 m/s ~ 250 km/h)
  public planeHeading = Math.PI / 2; // Facing East down the runway
  public planePitch = 0;
  public planeRoll = 0;
  public isPlayerFlyingPlane = false;
  public isPlaneAutopilot = false;
  public planeAutopilotSpeed = 36;
  private planeSoundTimer = 0;
  private radarDish!: THREE.Mesh;
  private airportLights: THREE.MeshStandardMaterial[] = [];
  private aircraftSignalLights: THREE.Mesh[] = [];
  private aircraftSignalTimer = 0;
  private aircraftSignalOn = true;
  private aircraftLandingLights: THREE.PointLight[] = [];

  // Commercial Sky Jet
  public jetGroup: THREE.Group = new THREE.Group();
  private jetAngle = 0;

  constructor() {
    this.buildTrainTracksAndStation();
    this.buildMetroTrain();
    this.buildBusRouteAndStops();
    this.buildHelicopter();
    this.buildAirport();
    this.buildFlyablePlane();
    this.buildSkyJet();
  }

  // --- 1. TRAIN TRACKS & STATION ---
  private buildTrainTracksAndStation() {
    // Keep the regional metro aligned with street and countryside-road corridors.
    const loopPoints = [
      new THREE.Vector3(-340, 0.2, -340),
      new THREE.Vector3(60, 0.2, -340),
      new THREE.Vector3(60, 0.2, -2140),
      new THREE.Vector3(60, 0.2, -1940),
      new THREE.Vector3(2060, 0.2, -1940),
      new THREE.Vector3(2060, 0.2, 60),
      new THREE.Vector3(2060, 0.2, 2060),
      new THREE.Vector3(60, 0.2, 2060),
      new THREE.Vector3(-1940, 0.2, 2060),
      new THREE.Vector3(-1940, 0.2, 60),
      new THREE.Vector3(-1940, 0.2, -1940),
      new THREE.Vector3(-1940, 0.2, -340)
    ];
    this.trainTrackPoints = loopPoints;
    this.trainTrackCurve = new THREE.CatmullRomCurve3(loopPoints, true, 'catmullrom', 0.15);
    const stationTargets = [
      loopPoints[0],
      loopPoints[2],
      new THREE.Vector3(1060, 0.2, -1940),
      loopPoints[5],
      loopPoints[7],
      loopPoints[9],
      new THREE.Vector3(-1940, 0.2, -940),
      new THREE.Vector3(-940, 0.2, -340)
    ];
    this.metroStationProgress = stationTargets.map((target) => {
      let nearestProgress = 0;
      let nearestDistance = Infinity;
      for (let sample = 0; sample <= 1024; sample++) {
        const progress = sample / 1024;
        const distance = this.trainTrackCurve.getPointAt(progress).distanceToSquared(target);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestProgress = progress;
        }
      }
      return nearestProgress;
    });

    const railMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9, roughness: 0.2 });
    const tieMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.82 });
    const railOffset = 0.82;
    for (const side of [-1, 1]) {
      const points: THREE.Vector3[] = [];
      for (let index = 0; index <= 240; index++) {
        const progress = index / 240;
        const point = this.trainTrackCurve.getPointAt(progress);
        const tangent = this.trainTrackCurve.getTangentAt(progress);
        point.add(new THREE.Vector3(tangent.z, 0, -tangent.x).multiplyScalar(side * railOffset));
        points.push(point);
      }
      const railCurve = new THREE.CatmullRomCurve3(points, false, 'centripetal');
      this.rootGroup.add(new THREE.Mesh(new THREE.TubeGeometry(railCurve, 480, 0.075, 6, false), railMat));
    }

    for (let index = 0; index < 280; index++) {
      const progress = index / 280;
      const point = this.trainTrackCurve.getPointAt(progress);
      const tangent = this.trainTrackCurve.getTangentAt(progress);
      const tie = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.12, 0.36), tieMat);
      tie.position.copy(point);
      tie.rotation.y = Math.atan2(tangent.x, tangent.z) + Math.PI / 2;
      this.rootGroup.add(tie);
    }

    const platformMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5 });
    const canopyMat = new THREE.MeshStandardMaterial({
      color: 0x075985,
      metalness: 0.58,
      roughness: 0.28,
      emissive: 0x0284c7,
      emissiveIntensity: 0.08
    });
    const steelMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.78, roughness: 0.25 });
    const lightMat = new THREE.MeshStandardMaterial({
      color: 0xfff1c2,
      emissive: 0xffd166,
      emissiveIntensity: 0.12
    });
    this.stationLightMaterials.push(lightMat);

    for (let index = 0; index < this.metroStationNames.length; index++) {
      const progress = this.metroStationProgress[index];
      if (progress === undefined) throw new Error(`Missing metro route position for ${this.metroStationNames[index]}.`);
      const position = this.trainTrackCurve.getPointAt(progress);
      const tangent = this.trainTrackCurve.getTangentAt(progress);
      const side = new THREE.Vector3(tangent.z, 0, -tangent.x);
      const stationGroup = new THREE.Group();
      stationGroup.position.copy(position).addScaledVector(side, 5);
      stationGroup.rotation.y = Math.atan2(tangent.x, tangent.z);

      const platform = new THREE.Mesh(new THREE.BoxGeometry(10, 0.65, 46), platformMat);
      platform.position.y = 0.33;
      stationGroup.add(platform);
      const tactileEdge = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.06, 43),
        new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.55 })
      );
      tactileEdge.position.set(-4.55, 0.7, 0);
      stationGroup.add(tactileEdge);

      for (const z of [-19, -7, 7, 19]) {
        const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.22, 4.1, 0.22), steelMat);
        pillar.position.set(4.8, 2.65, z);
        const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.12, 3.4), lightMat);
        lamp.position.set(1.6, 4.55, z);
        stationGroup.add(pillar, lamp);
      }
      const stationLight = new THREE.PointLight(0xffe6ad, 0.12, 24, 2);
      stationLight.position.set(1.6, 4.2, 0);
      stationGroup.add(stationLight);
      this.stationLights.push(stationLight);

      const roof = new THREE.Mesh(new THREE.BoxGeometry(10.7, 0.3, 45), canopyMat);
      roof.position.set(1, 4.8, 0);
      stationGroup.add(roof);
      const benchMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.42, roughness: 0.48 });
      for (const z of [-12, 12]) {
        const bench = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.14, 3.8), benchMat);
        bench.position.set(2.4, 1.05, z);
        const back = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.9, 3.8), benchMat);
        back.position.set(3.05, 1.45, z);
        stationGroup.add(bench, back);
      }

      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 192;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Unable to create metro station display.');
      const texture = new THREE.CanvasTexture(canvas);
      const display = new THREE.Mesh(
        new THREE.BoxGeometry(3.2, 1.15, 0.16),
        new THREE.MeshStandardMaterial({ color: 0x07111d, emissive: 0x0c2434, emissiveIntensity: 0.5, map: texture })
      );
      display.position.set(1.6, 3.55, 0);
      stationGroup.add(display);

      const sign = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.75, 0.16), canopyMat);
      sign.position.set(1.6, 5.42, 0);
      stationGroup.add(sign);
      const signTextureCanvas = document.createElement('canvas');
      signTextureCanvas.width = 512;
      signTextureCanvas.height = 128;
      const signContext = signTextureCanvas.getContext('2d');
      if (!signContext) throw new Error('Unable to create metro station sign.');
      signContext.fillStyle = '#06283b';
      signContext.fillRect(0, 0, 512, 128);
      signContext.fillStyle = '#f8fafc';
      signContext.font = 'bold 43px Arial';
      signContext.textAlign = 'center';
      signContext.fillText(this.metroStationNames[index].toUpperCase(), 256, 83);
      const signTexture = new THREE.CanvasTexture(signTextureCanvas);
      sign.material = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0x0284c7,
        emissiveIntensity: 0.18,
        map: signTexture
      });

      const entrance = new THREE.Mesh(
        new THREE.BoxGeometry(3.6, 2.8, 2.2),
        new THREE.MeshPhysicalMaterial({
          color: 0x38bdf8,
          roughness: 0.16,
          metalness: 0.12,
          transparent: true,
          opacity: 0.34
        })
      );
      entrance.position.set(4.8, 1.75, -20.5);
      stationGroup.add(entrance);
      const entranceCanopy = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.22, 2.8), canopyMat);
      entranceCanopy.position.set(4.8, 3.2, -20.5);
      stationGroup.add(entranceCanopy);

      this.rootGroup.add(stationGroup);
      this.metroStations.push({
        name: this.metroStationNames[index],
        progress,
        position: stationGroup.position.clone(),
        platform: stationGroup,
        display: { context, texture }
      });
    }
    this.updateMetroDisplays();
  }

  // --- 2. STREAMLINE METRO TRAIN ---
  private buildMetroTrain() {
    const createTrain = (): MetroTrain => {
      const group = new THREE.Group();
      const bodyMat = new THREE.MeshStandardMaterial({ color: 0xe7edf4, metalness: 0.58, roughness: 0.26 });
      const stripeMat = new THREE.MeshStandardMaterial({
        color: 0x0284c7,
        metalness: 0.32,
        roughness: 0.35,
        emissive: 0x0369a1,
        emissiveIntensity: 0.12
      });
      const glassMat = new THREE.MeshPhysicalMaterial({
        color: 0x59bad2,
        roughness: 0.14,
        metalness: 0.12,
        transparent: true,
        opacity: 0.42,
        depthWrite: false,
        emissive: 0x075985,
        emissiveIntensity: 0.1
      });
      const interiorMat = new THREE.MeshStandardMaterial({ color: 0x354858, roughness: 0.72 });
      const seatMat = new THREE.MeshStandardMaterial({ color: 0x0f766e, roughness: 0.74 });
      const trimMat = new THREE.MeshStandardMaterial({ color: 0xb9c8d2, metalness: 0.72, roughness: 0.28 });
      const ceilingLightMat = new THREE.MeshStandardMaterial({
        color: 0xfff1c2,
        emissive: 0xffd166,
        emissiveIntensity: 0.55
      });
      const doors: THREE.Mesh[] = [];
      const cabinLights: THREE.PointLight[] = [];

      for (let carIndex = 0; carIndex < 3; carIndex++) {
        const car = new THREE.Group();
        car.position.z = -carIndex * 12.5;
        const floor = new THREE.Mesh(new THREE.BoxGeometry(2.58, 0.18, 11.3), interiorMat);
        floor.position.y = 0.62;
        const roof = new THREE.Mesh(new THREE.BoxGeometry(2.75, 0.22, 11.6), bodyMat);
        roof.position.y = 3.05;
        const underbody = new THREE.Mesh(new THREE.BoxGeometry(2.42, 0.48, 9.8), trimMat);
        underbody.position.y = 0.34;
        const sideSkirt = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.34, 11.55), stripeMat);
        sideSkirt.position.y = 1.12;
        car.add(floor, roof, underbody, sideSkirt);

        for (const side of [-1, 1]) {
          const wallRail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.22, 11.5), bodyMat);
          wallRail.position.set(side * 1.3, 2.87, 0);
          car.add(wallRail);
          const windowBand = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.92, 11.2), glassMat);
          windowBand.position.set(side * 1.345, 2.12, 0);
          car.add(windowBand);

          for (const z of [-4.25, -2.35, 2.35, 4.25]) {
            const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.2, 0.16), bodyMat);
            pillar.position.set(side * 1.35, 2.1, z);
            car.add(pillar);
          }

          const seatRail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.95, 10.9), bodyMat);
          seatRail.position.set(side * 1.26, 1.74, 0);
          car.add(seatRail);
          for (const z of [-4.2, -2.1, 2.1, 4.2]) {
            const cushion = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.16, 1.5), seatMat);
            cushion.position.set(side * 0.78, 0.82, z);
            const back = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.85, 1.5), seatMat);
            back.position.set(side * 1.05, 1.28, z);
            car.add(cushion, back);
          }
        }

        for (const z of [-3.6, -1.8, 1.8, 3.6]) {
          const grabPole = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 1.6, 8), trimMat);
          grabPole.position.set(0, 2.1, z);
          const overheadHandle = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.025, 6, 10), trimMat);
          overheadHandle.rotation.x = Math.PI / 2;
          overheadHandle.position.set(0, 2.65, z);
          car.add(grabPole, overheadHandle);
        }

        const centerDoor = new THREE.Mesh(new THREE.BoxGeometry(0.09, 2.05, 0.62), bodyMat);
        centerDoor.position.set(1.31, 1.82, -0.39);
        const secondDoor = centerDoor.clone();
        secondDoor.position.z = 0.39;
        const oppositeDoor = centerDoor.clone();
        oppositeDoor.position.x = -1.31;
        const oppositeSecondDoor = secondDoor.clone();
        oppositeSecondDoor.position.x = -1.31;
        for (const door of [centerDoor, secondDoor, oppositeDoor, oppositeSecondDoor]) {
          door.userData.closedZ = door.position.z;
          door.userData.slideDirection = door.position.z < 0 ? -1 : 1;
          doors.push(door);
        }
        car.add(centerDoor, secondDoor, oppositeDoor, oppositeSecondDoor);

        for (const side of [-1, 1]) {
          const lightStrip = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.08, 9.6), ceilingLightMat);
          lightStrip.position.set(side * 0.82, 2.9, 0);
          car.add(lightStrip);
        }
        const cabinLight = new THREE.PointLight(0xffe6ad, 0.72, 15, 2);
        cabinLight.position.set(0, 2.75, 0);
        car.add(cabinLight);
        cabinLights.push(cabinLight);

        if (carIndex === 0) {
          const nose = new THREE.Mesh(new THREE.BoxGeometry(2.55, 0.58, 0.5), bodyMat);
          nose.position.set(0, 1.78, 5.7);
          const windshield = new THREE.Mesh(new THREE.BoxGeometry(2.16, 0.9, 0.06), glassMat);
          windshield.position.set(0, 2.28, 5.47);
          const headlights = new THREE.Mesh(
            new THREE.BoxGeometry(1.8, 0.18, 0.08),
            new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff6d5, emissiveIntensity: 2.4 })
          );
          headlights.position.set(0, 1.4, 5.93);
          car.add(nose, windshield, headlights);
        }
        group.add(car);
      }
      const headCar = group.children[0];
      headCar.add(new THREE.PointLight(0xdff6ff, 2.6, 28, 2));
      const tailLight = new THREE.Mesh(
        new THREE.BoxGeometry(1.25, 0.12, 0.08),
        new THREE.MeshStandardMaterial({ color: 0xf87171, emissive: 0xdc2626, emissiveIntensity: 1.7 })
      );
      tailLight.position.set(0, 1.35, -30.95);
      group.add(tailLight);
      return {
        group,
        progress: 0,
        speed: 0,
        dwellTimer: 0,
        stationIndex: -1,
        doors,
        cabinLights,
        passengers: [],
        stopPending: false
      };
    };

    const trainStartProgress = [0, 0.28, 0.53, 0.78];
    this.metroTrains = Array.from({ length: trainStartProgress.length }, (_, index) => {
    const train = createTrain();
    train.progress = trainStartProgress[index];
      if (index === 0) {
        train.stationIndex = 0;
      train.dwellTimer = 4.5;
      train.stopPending = true;
      }
      this.rootGroup.add(train.group);
      return train;
    });
    this.trainGroup = this.metroTrains[0].group;
  }

  public getNearbyMetroStationIndex(position: THREE.Vector3, maxDistance = 24): number {
    let nearestIndex = -1;
    let nearestDistance = maxDistance;
    for (let index = 0; index < this.metroStations.length; index++) {
      const distance = position.distanceTo(this.metroStations[index].platform.position);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    }
    return nearestIndex;
  }

  public getMetroStationName(index: number): string {
    return this.metroStations[index]?.name ?? 'Unknown Station';
  }

  public getMetroTicketDestinationName(): string | null {
    return this.metroTicketDestinationIndex < 0
      ? null
      : this.getMetroStationName(this.metroTicketDestinationIndex);
  }

  public getMetroJourneyDestinationName(): string | null {
    return this.metroJourneyDestinationIndex < 0
      ? null
      : this.getMetroStationName(this.metroJourneyDestinationIndex);
  }

  public getSelectedMetroDestinationName(): string {
    return this.getMetroStationName(this.selectedMetroDestinationIndex);
  }

  public cycleMetroDestination(stationIndex: number) {
    for (let attempt = 0; attempt < this.metroStations.length; attempt++) {
      this.selectedMetroDestinationIndex =
        (this.selectedMetroDestinationIndex + 1) % this.metroStations.length;
      if (this.selectedMetroDestinationIndex !== stationIndex) break;
    }
    useGameStore.getState().showNotification(
      `Metro destination: ${this.getSelectedMetroDestinationName()} · $25 ticket`
    );
  }

  public buyMetroTicket(stationIndex: number): boolean {
    const store = useGameStore.getState();
    if (this.metroTicketDestinationIndex >= 0) {
      store.showNotification(
        `You already have a ticket to ${this.getMetroTicketDestinationName()}.`
      );
      return false;
    }
    if (stationIndex === this.selectedMetroDestinationIndex) {
      store.showNotification('Choose a different destination with [Q] before buying a ticket.');
      return false;
    }
    if (!store.spendCash(25, `Metro ticket: ${this.getMetroStationName(stationIndex)} to ${this.getSelectedMetroDestinationName()}`)) {
      store.showNotification('Not enough cash for a $25 metro ticket.');
      return false;
    }
    this.metroTicketDestinationIndex = this.selectedMetroDestinationIndex;
    store.showNotification(
      `Ticket purchased: ${this.getMetroStationName(stationIndex)} → ${this.getMetroTicketDestinationName()}.`
    );
    return true;
  }

  public getTrainStoppedAtStation(stationIndex: number): number {
    return this.metroTrains.findIndex(
      (train) => train.stationIndex === stationIndex && train.dwellTimer > 0
    );
  }

  public getPlayerTrainGroup(): THREE.Group {
    return this.metroTrains[this.playerTrainIndex]?.group ?? this.trainGroup;
  }

  public boardMetroTrain(trainIndex: number, stationIndex: number): boolean {
    if (
      this.metroTicketDestinationIndex < 0 ||
      trainIndex < 0 ||
      this.metroTrains[trainIndex]?.stationIndex !== stationIndex
    ) {
      return false;
    }
    this.playerTrainIndex = trainIndex;
    this.currentTrainStationIndex = stationIndex;
    this.isPlayerRidingTrain = true;
    this.metroJourneyDestinationIndex = this.metroTicketDestinationIndex;
    this.metroTicketDestinationIndex = -1;
    useGameStore.getState().setIsInTrain(true);
    return true;
  }

  public alightMetroTrain(playerPos: THREE.Vector3): boolean {
    if (!this.isPlayerRidingTrain || this.currentTrainStationIndex < 0) return false;
    const station = this.metroStations[this.currentTrainStationIndex];
    const train = this.metroTrains[this.playerTrainIndex];
    if (!train || train.stationIndex !== this.currentTrainStationIndex || train.dwellTimer <= 0) {
      return false;
    }
    const tangent = this.trainTrackCurve.getTangentAt(station.progress);
    const platformSide = new THREE.Vector3(tangent.z, 0, -tangent.x);
    playerPos.copy(station.platform.position).addScaledVector(platformSide, -1.5);
    playerPos.y = 0;
    this.isPlayerRidingTrain = false;
    this.currentTrainStationIndex = -1;
    this.playerTrainIndex = -1;
    this.metroJourneyDestinationIndex = -1;
    useGameStore.getState().setIsInTrain(false);
    return true;
  }

  public getMetroArrivalSeconds(stationIndex: number): number {
    const targetProgress = this.metroStations[stationIndex]?.progress;
    if (targetProgress === undefined) return 0;
    const routeLength = this.trainTrackCurve.getLength();
    let shortestSeconds = Number.POSITIVE_INFINITY;
    for (const train of this.metroTrains) {
      if (train.stationIndex === stationIndex && train.dwellTimer > 0) return 0;
      const distance = (targetProgress - train.progress + 1) % 1;
      const nextStopDistance = distance < 1 / routeLength ? 1 : distance;
      shortestSeconds = Math.min(
        shortestSeconds,
        (nextStopDistance * this.trainTrackCurve.getLength()) / this.trainSpeed + train.dwellTimer
      );
    }
    return Number.isFinite(shortestSeconds) ? shortestSeconds : 0;
  }

  private updateMetroDisplays() {
    for (let index = 0; index < this.metroStations.length; index++) {
      const station = this.metroStations[index];
      const context = station.display.context;
      const arrival = this.getMetroArrivalSeconds(index);
      const minutes = Math.floor(arrival / 60).toString().padStart(2, '0');
      const seconds = Math.floor(arrival % 60).toString().padStart(2, '0');
      context.clearRect(0, 0, 512, 192);
      context.fillStyle = '#07111d';
      context.fillRect(0, 0, 512, 192);
      context.fillStyle = '#38bdf8';
      context.font = 'bold 25px Arial';
      context.textAlign = 'left';
      context.fillText(`${station.name.toUpperCase()}  ·  LINE A`, 24, 42);
      context.fillStyle = '#f8fafc';
      context.font = 'bold 44px Arial';
      context.fillText(
        arrival < 1 ? 'TRAIN NOW' : `NEXT TRAIN  ${minutes}:${seconds}`,
        24,
        105
      );
      context.fillStyle = '#94a3b8';
      context.font = '22px Arial';
      context.fillText(`8 STOPS  ·  ${Math.round(this.trainSpeed * 3.6)} KM/H`, 24, 153);
      station.display.texture.needsUpdate = true;
    }
  }

  private handleMetroStop(
    train: MetroTrain,
    stationIndex: number,
    pedestrians: PedestrianAI[],
    scene: THREE.Scene
  ) {
    const station = this.metroStations[stationIndex];
    const tangent = this.trainTrackCurve.getTangentAt(station.progress);
    const platformSide = new THREE.Vector3(tangent.z, 0, -tangent.x);
    const exitPoint = station.platform.position.clone().addScaledVector(platformSide, -1.5);
    const heading = Math.atan2(tangent.x, tangent.z);

    for (let index = train.passengers.length - 1; index >= 0; index--) {
      const passenger = train.passengers[index];
      if (passenger.destinationIndex !== stationIndex) continue;
      passenger.pedestrian.alightMetro(scene, exitPoint, heading);
      train.passengers.splice(index, 1);
    }

    const capacity = 8;
    const availableSeats = capacity - train.passengers.length;
    if (availableSeats <= 0) return;
    const candidates = pedestrians
      .filter(
        (pedestrian) =>
          !pedestrian.isDead &&
          !pedestrian.isInMetro &&
          !pedestrian.isBoardingMetro &&
          pedestrian.position.distanceTo(station.platform.position) < 22
      )
      .sort(
        (first, second) =>
          first.position.distanceToSquared(station.platform.position) -
          second.position.distanceToSquared(station.platform.position)
      )
      .slice(0, Math.min(availableSeats, 3));

    for (const pedestrian of candidates) {
      let destinationIndex = Math.floor(Math.random() * this.metroStations.length);
      while (destinationIndex === stationIndex) {
        destinationIndex = Math.floor(Math.random() * this.metroStations.length);
      }
      const passengerIndex = train.passengers.length;
      const carIndex = Math.floor(passengerIndex / 4);
      const seatIndex = passengerIndex % 4;
      const seat = new THREE.Vector3(
        seatIndex % 2 === 0 ? 0.78 : -0.78,
        0.96,
        -carIndex * 12.5 + (seatIndex < 2 ? -3.4 : 3.4)
      );
      pedestrian.isInMetro = true;
      pedestrian.velocity.set(0, 0, 0);
      train.passengers.push({
        pedestrian,
        destinationIndex,
        seat,
        boardingPoint: station.platform.position.clone().addScaledVector(platformSide, -1.6),
        state: 'boarding'
      });
      pedestrian.isBoardingMetro = true;
    }
  }

  private updateMetroPassengers(train: MetroTrain, dt: number, scene: THREE.Scene) {
    const station = train.stationIndex >= 0 ? this.metroStations[train.stationIndex] : null;
    for (let index = train.passengers.length - 1; index >= 0; index--) {
      const passenger = train.passengers[index];
      if (passenger.pedestrian.isDead) {
        passenger.pedestrian.isInMetro = false;
        passenger.pedestrian.isBoardingMetro = false;
        const worldPosition = passenger.pedestrian.group.getWorldPosition(new THREE.Vector3());
        passenger.pedestrian.group.removeFromParent();
        scene.add(passenger.pedestrian.group);
        passenger.pedestrian.position.copy(worldPosition);
        train.passengers.splice(index, 1);
        continue;
      }
      if (passenger.state === 'boarding') {
        if (!station || train.dwellTimer <= 0) {
          passenger.pedestrian.alightMetro(scene, passenger.boardingPoint, 0);
          train.passengers.splice(index, 1);
          continue;
        }
        const remaining = passenger.pedestrian.position.distanceTo(passenger.boardingPoint);
        if (remaining <= 0.55) {
          passenger.pedestrian.boardMetro(train.group, passenger.seat);
          passenger.state = 'riding';
          continue;
        }
        const step = Math.min(remaining, 1.8 * dt);
        const direction = passenger.boardingPoint.clone().sub(passenger.pedestrian.position).normalize();
        passenger.pedestrian.position.addScaledVector(direction, step);
        passenger.pedestrian.heading = Math.atan2(direction.x, direction.z);
        passenger.pedestrian.group.rotation.y = passenger.pedestrian.heading;
        passenger.pedestrian.rig.animate(0.65, false, false, dt);
      }
    }
  }

  private buildBusRouteAndStops() {
    const points = [
      [-140, 0.06, -140], [-40, 0.06, -140], [60, 0.06, -140], [148, 0.06, -140],
      [160, 0.06, -128], [160, 0.06, -40], [160, 0.06, 60], [160, 0.06, 148],
      [148, 0.06, 160], [60, 0.06, 160], [-40, 0.06, 160], [-148, 0.06, 160],
      [-160, 0.06, 148], [-160, 0.06, 60], [-160, 0.06, -40], [-160, 0.06, -128]
    ].map(([x, y, z]) => new THREE.Vector3(x, y, z));
    this.busRouteCurve = new THREE.CatmullRomCurve3(points, true, 'centripetal');

    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xf0b429, roughness: 0.42, metalness: 0.16 });
    const windowMat = new THREE.MeshPhysicalMaterial({
      color: 0x4a8290, roughness: 0.18, metalness: 0.08, transparent: true, opacity: 0.76
    });
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x171a1d, roughness: 0.86 });
    const busBody = new THREE.Mesh(new THREE.BoxGeometry(2.35, 2.45, 7.8), bodyMat);
    busBody.position.y = 1.3;
    this.busGroup.add(busBody);
    const windows = new THREE.Mesh(new THREE.BoxGeometry(2.38, 0.88, 5.9), windowMat);
    windows.position.set(0, 1.75, -0.15);
    this.busGroup.add(windows);
    for (const z of [-2.7, 2.7]) {
      for (const x of [-1.22, 1.22]) {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.22, 14), tireMat);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(x, 0.47, z);
        this.busGroup.add(wheel);
      }
    }
    this.rootGroup.add(this.busGroup);

    const stopMat = new THREE.MeshStandardMaterial({
      color: 0x123c4a, roughness: 0.52, metalness: 0.25, emissive: 0x064e5b, emissiveIntensity: 0.35
    });
    const stopPosts = new THREE.MeshStandardMaterial({ color: 0xd7e2e8, metalness: 0.72, roughness: 0.3 });
    for (const progress of this.busStopProgress) {
      const position = this.busRouteCurve.getPointAt(progress);
      const tangent = this.busRouteCurve.getTangentAt(progress);
      const shelter = new THREE.Group();
      const side = new THREE.Vector3(tangent.z, 0, -tangent.x).normalize();
      shelter.position.copy(position).addScaledVector(side, 8);
      shelter.rotation.y = Math.atan2(tangent.x, tangent.z);
      const roof = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.12, 1.7), stopMat);
      roof.position.y = 2.7;
      const sign = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.9, 0.12), stopMat);
      sign.position.set(-1.25, 2.05, 0);
      const bench = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.12, 0.42), stopPosts);
      bench.position.set(0.1, 0.8, 0.28);
      shelter.add(roof, sign, bench);
      for (const x of [-1.2, 1.2]) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.09, 2.55, 0.09), stopPosts);
        post.position.set(x, 1.35, 0);
        shelter.add(post);
      }
      this.rootGroup.add(shelter);
    }
    this.updateBus(0);
  }

  private updateBus(dt: number) {
    if (this.busStopTimer > 0) {
      this.busStopTimer = Math.max(0, this.busStopTimer - dt);
    } else {
      this.busProgress = (this.busProgress + dt * 13 / this.busRouteCurve.getLength()) % 1;
      const stopProgress = this.busStopProgress[this.nextBusStop];
      const distanceToStop = (stopProgress - this.busProgress + 1) % 1;
      if (distanceToStop < 0.0012) {
        this.busStopTimer = 4;
        this.nextBusStop = (this.nextBusStop + 1) % this.busStopProgress.length;
      }
    }
    const point = this.busRouteCurve.getPointAt(this.busProgress);
    const tangent = this.busRouteCurve.getTangentAt(this.busProgress);
    this.busGroup.position.copy(point);
    this.busGroup.rotation.y = Math.atan2(tangent.x, tangent.z);
  }

  // --- 3. FLYABLE V-BAY MAVERICK HELICOPTER ---
  private buildHelicopter() {
    const heli = this.heliGroup;
    heli.position.copy(this.heliPos);

    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, metalness: 0.6, roughness: 0.3 });
    const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x0284c7, transmission: 0.8, transparent: true, opacity: 0.7 });
    const bladeMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.85, roughness: 0.1 });
    const skidMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.9, roughness: 0.2 });

    // Fuselage Cabin
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.6, 3.8), bodyMat);
    cabin.position.y = 1.1;

    // Cockpit Bubble Glass Nose
    const nose = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.3, 1.4), glassMat);
    nose.position.set(0, 1.0, 2.2);

    // Tail Boom
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.45, 4.5), bodyMat);
    tail.position.set(0, 1.4, -3.8);

    // Vertical Stabilizer
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.2, 0.6), bodyMat);
    fin.position.set(0, 1.8, -5.8);

    // Landing Skids
    for (const sx of [-0.9, 0.9]) {
      const skid = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 4.2), skidMat);
      skid.position.set(sx, 0.1, 0);
      const str1 = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.6), skidMat);
      str1.position.set(sx, 0.4, 1.0);
      const str2 = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.6), skidMat);
      str2.position.set(sx, 0.4, -1.0);
      heli.add(skid, str1, str2);
    }

    // Main Rotor Mast & Blades
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.7, 8), skidMat);
    mast.position.set(0, 2.1, 0.2);
    this.heliMainRotor = new THREE.Group();
    this.heliMainRotor.position.set(0, 2.45, 0.2);

    const bladeGeo = new THREE.BoxGeometry(0.2, 0.03, 8.2);
    const blade1 = new THREE.Mesh(bladeGeo, bladeMat);
    const blade2 = new THREE.Mesh(bladeGeo, bladeMat);
    blade2.rotation.y = Math.PI / 2;
    this.heliMainRotor.add(blade1, blade2);

    // Tail Rotor
    this.heliTailRotor = new THREE.Group();
    this.heliTailRotor.position.set(0.18, 1.8, -5.8);
    const tailBlade = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.4, 0.02), bladeMat);
    this.heliTailRotor.add(tailBlade);

    heli.add(cabin, nose, tail, fin, mast, this.heliMainRotor, this.heliTailRotor);
    this.rootGroup.add(heli);
  }

  // --- 4. VICE BAY INTERNATIONAL AIRPORT (VBX) ---
  private buildAirport() {
    const ap = this.airportGroup;
    ap.position.set(AIRPORT_CENTERS[0].x + 70, 0, AIRPORT_CENTERS[0].z + 200);

    const runwayMat = new THREE.MeshStandardMaterial({ color: 0x222a31, roughness: 0.82 });
    const markMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const yellowMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
    const terminalMat = new THREE.MeshStandardMaterial({ color: 0x182637, roughness: 0.3, metalness: 0.48 });
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x5ca8c5,
      roughness: 0.14,
      metalness: 0.14,
      transmission: 0.55,
      transparent: true,
      opacity: 0.72,
      clearcoat: 1
    });

    // Extend the original runway and apron while keeping the existing aircraft and airport location.
    const runway = new THREE.Mesh(new THREE.PlaneGeometry(560, 42), runwayMat);
    runway.rotation.x = -Math.PI / 2;
    runway.position.set(-70, 0.05, -200);
    ap.add(runway);

    // Centerline dashed stripes
    for (let x = -338; x <= 198; x += 22) {
      const stripe = new THREE.Mesh(new THREE.PlaneGeometry(13, 0.9), markMat);
      stripe.rotation.x = -Math.PI / 2;
      stripe.position.set(x, 0.06, -200);
      ap.add(stripe);
    }

    // Runway threshold piano keys (West & East ends)
    for (const rx of [-342, 202]) {
      for (let z = -218; z <= -182; z += 3) {
        const key = new THREE.Mesh(new THREE.PlaneGeometry(8, 1.5), markMat);
        key.rotation.x = -Math.PI / 2;
        key.position.set(rx, 0.06, z);
        ap.add(key);
      }
    }

    const lightMat = new THREE.MeshStandardMaterial({
      color: 0x7dd3fc,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.08,
      roughness: 0.3
    });
    this.airportLights.push(lightMat);
    for (let x = -340; x <= 200; x += 18) {
      for (const z of [-222, -178]) {
        const light = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 0.32, 8), lightMat);
        light.position.set(x, 0.2, z);
        ap.add(light);
      }
    }

    // Expanded, lit terminal apron with five matching private jets.
    const apron = new THREE.Mesh(
      new THREE.PlaneGeometry(270, 125),
      new THREE.MeshStandardMaterial({ color: 0x78838a, roughness: 0.78 })
    );
    apron.rotation.x = -Math.PI / 2;
    apron.position.set(-70, 0.035, -104);
    ap.add(apron);

    for (const x of [-192, -152, -112, -72, -32, 8, 48]) {
      const stand = new THREE.Mesh(new THREE.PlaneGeometry(2, 42), yellowMat);
      stand.rotation.x = -Math.PI / 2;
      stand.position.set(x, 0.055, -107);
      ap.add(stand);
      const stopLine = new THREE.Mesh(new THREE.PlaneGeometry(13, 0.65), markMat);
      stopLine.rotation.x = -Math.PI / 2;
      stopLine.position.set(x, 0.056, -88);
      ap.add(stopLine);
    }

    const terminal = new THREE.Mesh(
      new THREE.BoxGeometry(150, 20, 34),
      terminalMat
    );
    terminal.position.set(-70, 10, -166);
    terminal.castShadow = true;

    const termGlass = new THREE.Mesh(new THREE.BoxGeometry(142, 10, 0.35), glassMat);
    termGlass.position.set(-70, 9.5, -148.8);

    const canopy = new THREE.Mesh(
      new THREE.BoxGeometry(166, 1.2, 48),
      new THREE.MeshStandardMaterial({ color: 0xd7e3e8, roughness: 0.32, metalness: 0.28 })
    );
    canopy.position.set(-70, 20.4, -159);

    const terminalSign = new THREE.Mesh(
      new THREE.BoxGeometry(48, 3.2, 0.5),
      new THREE.MeshStandardMaterial({
        color: 0x0e7490,
        emissive: 0x0e7490,
        emissiveIntensity: 0.9,
        metalness: 0.35
      })
    );
    terminalSign.position.set(-70, 16, -148);
    ap.add(terminal, termGlass, canopy, terminalSign);

    for (const x of [-140, -105, -70, -35, 0]) {
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.35, 0.5, 6, 10),
        new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.62, roughness: 0.28 })
      );
      post.position.set(x, 3, -137);
      ap.add(post);
    }

    for (const [x, z] of [[-198, -138], [58, -138], [-198, -65], [58, -65]]) {
      const mast = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.18, 10, 8),
        new THREE.MeshStandardMaterial({ color: 0xaab7c1, metalness: 0.65, roughness: 0.35 })
      );
      mast.position.set(x, 5, z);
      const lamp = new THREE.Mesh(
        new THREE.BoxGeometry(2.4, 0.18, 0.65),
        new THREE.MeshStandardMaterial({
          color: 0xfff0c2,
          emissive: 0xffd98a,
          emissiveIntensity: 0.08
        })
      );
      lamp.position.set(x, 10.1, z);
      this.airportLights.push(lamp.material as THREE.MeshStandardMaterial);
      ap.add(mast, lamp);
    }

    // Control tower, glazed cab and rotating radar.
    const tower = new THREE.Group();
    const towerShaft = new THREE.Mesh(
      new THREE.BoxGeometry(12, 44, 12),
      new THREE.MeshStandardMaterial({ color: 0xd9e1e4, roughness: 0.48 })
    );
    towerShaft.position.y = 22;
    const cab = new THREE.Mesh(new THREE.BoxGeometry(23, 9, 23), glassMat);
    cab.position.y = 47;
    const roof = new THREE.Mesh(
      new THREE.BoxGeometry(27, 1.2, 27),
      new THREE.MeshStandardMaterial({ color: 0xe7edf0, roughness: 0.42, metalness: 0.22 })
    );
    roof.position.y = 52.1;
    this.radarDish = new THREE.Mesh(
      new THREE.BoxGeometry(5, 0.65, 0.2),
      new THREE.MeshStandardMaterial({ color: 0xdc2626, emissive: 0xdc2626, emissiveIntensity: 0.35, metalness: 0.7 })
    );
    this.radarDish.position.set(0, 54, 0);
    tower.add(towerShaft, cab, roof, this.radarDish);
    tower.position.set(42, 0, -157);
    ap.add(tower);

    const hangar = new THREE.Mesh(
      new THREE.BoxGeometry(58, 18, 40),
      new THREE.MeshStandardMaterial({ color: 0x344557, roughness: 0.5, metalness: 0.55 })
    );
    hangar.position.set(-220, 9, -156);
    ap.add(hangar);

    const hangarDoor = new THREE.Mesh(
      new THREE.BoxGeometry(48, 14, 0.4),
      new THREE.MeshStandardMaterial({ color: 0x81909b, metalness: 0.62, roughness: 0.38 })
    );
    hangarDoor.position.set(-220, 7, -135.8);
    ap.add(hangarDoor);

    this.rootGroup.add(ap);
  }

  // --- 5. FLYABLE LUXURY PRIVATE JET ---
  private buildFlyablePlane() {
    const plane = this.planeGroup;
    plane.position.copy(this.planePos);
    plane.rotation.y = this.planeHeading;

    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.24, metalness: 0.38 });
    const wingMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.32, metalness: 0.42, side: THREE.DoubleSide });
    const navyMat = new THREE.MeshStandardMaterial({ color: 0x12345a, roughness: 0.28, metalness: 0.42, side: THREE.DoubleSide });
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x4b8aa5,
      roughness: 0.12,
      metalness: 0.12,
      transparent: true,
      opacity: 0.38,
      depthWrite: false,
      clearcoat: 1
    });
    const engineMat = new THREE.MeshStandardMaterial({ color: 0x253545, roughness: 0.3, metalness: 0.78 });
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x171b20, roughness: 0.88 });
    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.2, metalness: 0.9 });

    const makePlanform = (points: [number, number][], depth: number, material: THREE.Material) => {
      const shape = new THREE.Shape();
      points.forEach(([x, z], index) => {
        if (index === 0) shape.moveTo(x, z);
        else shape.lineTo(x, z);
      });
      shape.closePath();

      const geometry = new THREE.ExtrudeGeometry(shape, {
        depth,
        bevelEnabled: true,
        bevelSegments: 2,
        bevelSize: 0.08,
        bevelThickness: 0.06
      });
      geometry.translate(0, 0, -depth / 2);
      geometry.rotateX(Math.PI / 2);
      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      return mesh;
    };

    const fuselageProfile = [
      new THREE.Vector2(0, -10.8),
      new THREE.Vector2(0.55, -10.5),
      new THREE.Vector2(0.9, -8.2),
      new THREE.Vector2(1.15, -5),
      new THREE.Vector2(1.35, -1),
      new THREE.Vector2(1.5, 3.8),
      new THREE.Vector2(1.45, 7.2),
      new THREE.Vector2(1.2, 9.5),
      new THREE.Vector2(0.78, 11),
      new THREE.Vector2(0.32, 11.9),
      new THREE.Vector2(0, 12.2)
    ];
    const fuselage = new THREE.Mesh(
      new THREE.LatheGeometry(fuselageProfile, 32),
      bodyMat
    );
    fuselage.name = 'plane-fuselage';
    fuselage.rotation.x = Math.PI / 2;
    fuselage.position.y = 1.55;
    fuselage.castShadow = true;

    const wings = makePlanform([
      [-10.2, -3.4], [-10.6, -4.2], [-2.1, -1.2], [-1.5, -0.7],
      [1.5, -0.7], [2.1, -1.2], [10.6, -4.2], [10.2, -3.4],
      [2.1, 2.3], [1.55, 2.65], [-1.55, 2.65], [-2.1, 2.3]
    ], 0.22, wingMat);
    wings.name = 'plane-wings';
    wings.position.y = 1.55;

    const tailplane = makePlanform([
      [-4.3, -8.2], [-4.5, -8.8], [-1.25, -7.65], [1.25, -7.65],
      [4.5, -8.8], [4.3, -8.2], [1.2, -7.35], [-1.2, -7.35]
    ], 0.18, wingMat);
    tailplane.name = 'plane-tailplane';
    tailplane.position.y = 3.05;

    const finShape = new THREE.Shape();
    finShape.moveTo(10.1, 1.7);
    finShape.lineTo(7.1, 1.7);
    finShape.lineTo(7.6, 3.4);
    finShape.lineTo(8.7, 4.65);
    finShape.lineTo(9.4, 4.65);
    finShape.closePath();
    const finGeometry = new THREE.ExtrudeGeometry(finShape, {
      depth: 0.16,
      bevelEnabled: true,
      bevelSegments: 2,
      bevelSize: 0.06,
      bevelThickness: 0.04
    });
    finGeometry.translate(0, 0, -0.08);
    finGeometry.rotateY(Math.PI / 2);
    const fin = new THREE.Mesh(finGeometry, navyMat);
    fin.name = 'plane-tail-fin';
    fin.castShadow = true;

    const canopy = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), glassMat);
    canopy.scale.set(0.79, 0.43, 1.85);
    canopy.position.set(0, 2.56, 7.7);
    canopy.name = 'plane-cockpit-glass';

    const cockpitInterior = new THREE.Group();
    const cockpitDark = new THREE.MeshStandardMaterial({ color: 0x17232e, roughness: 0.68, metalness: 0.18 });
    const instrumentMat = new THREE.MeshStandardMaterial({
      color: 0x1d3442,
      emissive: 0x0c5d76,
      emissiveIntensity: 0.65,
      roughness: 0.36
    });
    const cockpitFloor = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.08, 3.6), cockpitDark);
    cockpitFloor.position.set(0, 1.45, 7.7);
    const dashboard = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.28, 0.42), cockpitDark);
    dashboard.position.set(0, 2.12, 7.15);
    dashboard.rotation.x = -0.12;
    const display = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.16, 0.025), instrumentMat);
    display.position.set(0, 2.28, 7.28);
    cockpitInterior.add(cockpitFloor, dashboard, display);
    for (const x of [-0.62, 0.04, 0.4]) {
      const instrument = new THREE.Mesh(
        new THREE.BoxGeometry(x === 0.4 ? 0.22 : 0.34, 0.12, 0.025),
        instrumentMat
      );
      instrument.position.set(x, 2.14, 7.22);
      cockpitInterior.add(instrument);
    }
    const controlColumn = new THREE.Mesh(
      new THREE.CylinderGeometry(0.035, 0.05, 0.52, 8),
      chromeMat
    );
    controlColumn.position.set(-0.32, 1.87, 6.95);
    const controlYoke = new THREE.Group();
    const yokeRing = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.024, 8, 20), chromeMat);
    const yokeBar = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.035, 0.045), chromeMat);
    yokeBar.position.y = -0.02;
    controlYoke.add(yokeRing, yokeBar);
    controlYoke.position.set(-0.32, 2.08, 6.91);
    const throttleLever = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.03, 0.26, 8),
      chromeMat
    );
    throttleLever.position.set(0.18, 1.78, 6.88);
    cockpitInterior.add(controlColumn, controlYoke, throttleLever);
    for (const x of [-0.32, 0.32]) {
      const seatBase = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.16, 0.55), cockpitDark);
      seatBase.position.set(x, 1.6, 6.45);
      const seatBack = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.62, 0.15), cockpitDark);
      seatBack.position.set(x, 1.92, 6.18);
      const headrest = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.16, 0.14), cockpitDark);
      headrest.position.set(x, 2.3, 6.16);
      cockpitInterior.add(seatBase, seatBack, headrest);
    }

    const windows: THREE.Mesh[] = [];
    for (const side of [-1, 1]) {
      for (let index = 0; index < 7; index++) {
        const z = -4.2 + index * 1.35;
        const window = new THREE.Mesh(
          new THREE.SphereGeometry(0.16, 12, 8),
          glassMat
        );
        window.scale.set(0.13, 0.2, 0.38);
        window.position.set(side * 1.27, 1.98, z);
        windows.push(window);
      }
    }

    const engines: THREE.Group[] = [];
    for (const side of [-1, 1]) {
      const engine = new THREE.Group();
      const nacelle = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.52, 3.6, 24), engineMat);
      nacelle.rotation.x = Math.PI / 2;
      const intake = new THREE.Mesh(
        new THREE.TorusGeometry(0.51, 0.075, 10, 24),
        chromeMat
      );
      intake.position.z = 1.78;
      const exhaust = new THREE.Mesh(
        new THREE.CircleGeometry(0.38, 20),
        new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.6, metalness: 0.6 })
      );
      exhaust.position.z = -1.81;
      const pylon = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.82, 0.72), wingMat);
      pylon.position.set(0, 0.72, 0.15);
      engine.add(nacelle, intake, exhaust, pylon);
      engine.position.set(side * 5.6, 0.42, -0.85);
      engines.push(engine);
    }

    const gear: THREE.Group[] = [];
    const addGear = (x: number, z: number, radius: number) => {
      const assembly = new THREE.Group();
      const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.11, 0.95, 10), chromeMat);
      strut.position.y = 0.9;
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 0.2, 16), tireMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.y = 0.4;
      assembly.add(strut, wheel);
      assembly.position.set(x, 0, z);
      gear.push(assembly);
    };
    addGear(0, 8.1, 0.3);
    addGear(-1.25, -1.5, 0.39);
    addGear(1.25, -1.5, 0.39);

    const wingtipLights: THREE.Mesh[] = [];
    for (const side of [-1, 1]) {
      const light = new THREE.Mesh(
        new THREE.SphereGeometry(0.13, 12, 8),
        new THREE.MeshStandardMaterial({
          color: side < 0 ? 0xef4444 : 0x22c55e,
          emissive: side < 0 ? 0xef4444 : 0x22c55e,
          emissiveIntensity: 0.75
        })
      );
      light.position.set(side * 10.05, 1.55, -3.25);
      light.userData.aircraftSignalLight = true;
      wingtipLights.push(light);
    }

    const tailBeacon = new THREE.Mesh(
      new THREE.SphereGeometry(0.14, 10, 8),
      new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xef4444, emissiveIntensity: 1.4 })
    );
    tailBeacon.position.set(0, 3.4, -9.1);
    tailBeacon.userData.aircraftSignalLight = true;
    const liveryStripe = new THREE.Mesh(
      new THREE.BoxGeometry(0.055, 0.16, 14),
      navyMat
    );
    liveryStripe.name = 'plane-livery-stripe';
    liveryStripe.position.set(1.34, 1.72, -0.5);
    const oppositeStripe = liveryStripe.clone();
    oppositeStripe.position.x = -1.34;
    plane.add(fuselage, wings, tailplane, fin, canopy, cockpitInterior, liveryStripe, oppositeStripe, ...windows, ...engines, ...gear, ...wingtipLights, tailBeacon);
    for (const side of [-1, 1]) {
      const landingLight = new THREE.PointLight(0xffedc2, 0, 22, 2);
      landingLight.position.set(side * 0.42, 1.15, 11.6);
      plane.add(landingLight);
      this.aircraftLandingLights.push(landingLight);
    }

    const liveries = [
      { body: 0xe7edf5, stripe: 0x148b83 },
      { body: 0xf0e3c2, stripe: 0xc85736 },
      { body: 0xdbeafe, stripe: 0x3256a8 },
      { body: 0xe9e5d7, stripe: 0x6f4a91 }
    ];
    const parkedPositions = [
      new THREE.Vector3(-174, 0.05, -107),
      new THREE.Vector3(-124, 0.05, -107),
      new THREE.Vector3(-74, 0.05, -107),
      new THREE.Vector3(-24, 0.05, -107)
    ];
    for (let index = 0; index < liveries.length; index++) {
      const parkedPlane = plane.clone(true);
      parkedPlane.position.copy(parkedPositions[index]);
      parkedPlane.rotation.set(0, Math.PI / 2, 0);
      parkedPlane.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        if (object.name === 'plane-fuselage') {
          object.material = new THREE.MeshStandardMaterial({
            color: liveries[index].body,
            roughness: 0.24,
            metalness: 0.38
          });
        } else if (object.name === 'plane-wings' || object.name === 'plane-tailplane') {
          object.material = new THREE.MeshStandardMaterial({
            color: liveries[index].body,
            roughness: 0.32,
            metalness: 0.42,
            side: THREE.DoubleSide
          });
        } else if (object.name === 'plane-tail-fin') {
          object.material = new THREE.MeshStandardMaterial({
            color: liveries[index].stripe,
            roughness: 0.28,
            metalness: 0.42,
            side: THREE.DoubleSide
          });
        } else if (object.name === 'plane-livery-stripe') {
          object.material = new THREE.MeshStandardMaterial({
            color: liveries[index].stripe,
            roughness: 0.28,
            metalness: 0.42
          });
        }
      });
      this.rootGroup.add(parkedPlane);
    }

    plane.traverse((object) => {
      if (object instanceof THREE.Mesh && object.userData.aircraftSignalLight) {
        this.aircraftSignalLights.push(object);
      }
    });
    this.rootGroup.add(plane);
  }

  public togglePlaneAutopilot() {
    this.isPlaneAutopilot = !this.isPlaneAutopilot;
    useGameStore.getState().showNotification(
      this.isPlaneAutopilot
        ? `Autopilot engaged · ${Math.round(this.planeAutopilotSpeed * 1.94)} knots · press G to change cruise speed`
        : 'Autopilot disengaged · manual flight controls active'
    );
  }

  public getPlaneCockpitCameraPosition() {
    return this.planeGroup.localToWorld(new THREE.Vector3(-0.32, 2.4, 6.55));
  }

  public getPlaneEntryPosition() {
    return this.planeGroup.localToWorld(new THREE.Vector3(-1.65, 0.15, 6.6));
  }

  public cyclePlaneAutopilotSpeed() {
    this.planeAutopilotSpeed = this.planeAutopilotSpeed < 45 ? 54 : 36;
    useGameStore.getState().showNotification(
      `Autopilot cruise speed set to ${Math.round(this.planeAutopilotSpeed * 1.94)} knots`
    );
  }

  // --- 6. COMMERCIAL SKY JET ---
  private buildSkyJet() {
    const jetMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.6, roughness: 0.3 });
    const blueMat = new THREE.MeshStandardMaterial({ color: 0x0284c7 });

    const fuselage = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 16, 12), jetMat);
    fuselage.rotation.x = Math.PI / 2;

    const wings = new THREE.Mesh(new THREE.BoxGeometry(18, 0.15, 3.2), jetMat);
    wings.position.y = -0.2;

    const tailFin = new THREE.Mesh(new THREE.BoxGeometry(0.2, 3.5, 2.2), blueMat);
    tailFin.position.set(0, 2.0, -6.5);

    this.jetGroup.add(fuselage, wings, tailFin);
    this.jetGroup.position.set(0, 95, 0);
    this.rootGroup.add(this.jetGroup);
  }

  // --- UPDATE LOOPS ---
  public update(
    playerPos: THREE.Vector3,
    input: { forward: number; strafe: number; ascend: boolean; descend: boolean },
    dt: number,
    pedestrians: PedestrianAI[],
    scene: THREE.Scene
  ) {
    const store = useGameStore.getState();

    this.updateBus(dt);
    const isNight = store.timeOfDay < 5.5 || store.timeOfDay > 19.5 || store.weather === 'night';
    for (const material of this.stationLightMaterials) {
      material.emissiveIntensity = isNight ? 1.7 : 0.12;
    }
    for (const light of this.stationLights) {
      light.intensity = isNight ? 2.2 : 0.12;
    }

    const routeLength = this.trainTrackCurve.getLength();
    for (const train of this.metroTrains) {
      if (train.dwellTimer > 0) {
        train.speed = 0;
        train.dwellTimer = Math.max(0, train.dwellTimer - dt);
      } else {
        train.stationIndex = -1;
        let nextStation = -1;
        let nextDistance = Number.POSITIVE_INFINITY;
        for (let index = 0; index < this.metroStations.length; index++) {
          const progressDistance = (this.metroStations[index].progress - train.progress + 1) % 1;
          const distance = progressDistance * routeLength;
          if (distance < 1) continue;
          if (distance < nextDistance) {
            nextDistance = distance;
            nextStation = index;
          }
        }

        if (nextStation >= 0 && nextDistance <= Math.max(6, train.speed * dt + 1)) {
          train.progress = this.metroStations[nextStation].progress;
          train.speed = 0;
          train.stationIndex = nextStation;
          train.dwellTimer = 4.5;
          train.stopPending = true;
          audioManager.playTrainHorn();
        } else {
          const brakingDistance = (train.speed * train.speed) / 8;
          if (nextStation >= 0 && nextDistance < brakingDistance + 4) {
            train.speed = Math.max(0, train.speed - 4 * dt);
          } else {
            train.speed = Math.min(this.trainSpeed, train.speed + 2.8 * dt);
          }
          train.progress = (train.progress + (train.speed * dt) / routeLength) % 1;
        }
      }

      const point = this.trainTrackCurve.getPointAt(train.progress);
      const tangent = this.trainTrackCurve.getTangentAt(train.progress);
      train.group.position.copy(point);
      train.group.rotation.y = Math.atan2(tangent.x, tangent.z);
      const doorsOpen = train.stationIndex >= 0 && train.dwellTimer > 0;
      for (const door of train.doors) {
        const closedZ = door.userData.closedZ as number;
        const slideDirection = door.userData.slideDirection as number;
        door.position.z = closedZ + (doorsOpen ? slideDirection * 0.43 : 0);
      }
      for (const light of train.cabinLights) {
        light.intensity = isNight ? 1.2 : 0.22;
      }
      if (train.stopPending && train.stationIndex >= 0) {
        train.stopPending = false;
        this.handleMetroStop(train, train.stationIndex, pedestrians, scene);
      }
      this.updateMetroPassengers(train, dt, scene);
    }
    this.trainProgress = this.metroTrains[0]?.progress ?? this.trainProgress;

    if (this.isPlayerRidingTrain) {
      const train = this.metroTrains[this.playerTrainIndex];
      if (
        train &&
        train.stationIndex >= 0 &&
        train.stationIndex === this.metroJourneyDestinationIndex
      ) {
        this.currentTrainStationIndex = train.stationIndex;
        this.alightMetroTrain(playerPos);
        store.showNotification(`Arrived at ${this.getMetroStationName(train.stationIndex)}. Your journey ends here.`);
      }
      if (this.isPlayerRidingTrain && train) {
        const seatedPosition = train.group.localToWorld(new THREE.Vector3(0.76, 0.42, -10.4));
        playerPos.copy(seatedPosition);
        this.currentTrainStationIndex = train.stationIndex;
        this.trainSoundTimer += dt;
        if (this.trainSoundTimer > 0.45) {
          this.trainSoundTimer = 0;
          audioManager.playTrainRide();
        }
      }
    }

    this.displayUpdateTimer += dt;
    if (this.displayUpdateTimer >= 1) {
      this.displayUpdateTimer %= 1;
      this.updateMetroDisplays();
    }

    // 2. High-Altitude Sky Jet Orbit
    this.jetAngle += dt * 0.08;
    this.jetGroup.position.set(Math.sin(this.jetAngle) * 220, 110, Math.cos(this.jetAngle) * 220);
    this.jetGroup.rotation.y = this.jetAngle + Math.PI / 2;

    // Airport lighting and aircraft position beacons follow night operations.
    if (this.radarDish) {
      this.radarDish.rotation.y += dt * 1.6;
    }
    this.aircraftSignalTimer += dt;
    if (this.aircraftSignalTimer >= 0.45) {
      this.aircraftSignalTimer %= 0.45;
      this.aircraftSignalOn = !this.aircraftSignalOn;
    }
    const airportNight = store.timeOfDay < 5.5 || store.timeOfDay > 19.5 || store.weather === 'night';
    const runwayIntensity = airportNight ? 2.8 : 0.04;
    for (const lightMaterial of this.airportLights) {
      lightMaterial.emissiveIntensity = runwayIntensity;
    }
    for (const signal of this.aircraftSignalLights) {
      const material = signal.material as THREE.MeshStandardMaterial;
      material.emissiveIntensity = this.aircraftSignalOn ? 2.2 : 0.08;
    }
    const landingLightIntensity = airportNight && this.planeSpeed > 3 ? 5 : 0;
    for (const landingLight of this.aircraftLandingLights) {
      landingLight.intensity = landingLightIntensity;
    }

    // 4. Flyable Jet Airplane Flight Physics
    if (this.isPlayerFlyingPlane) {
      this.planeSoundTimer += dt;
      if (this.planeSoundTimer > 0.12) {
        this.planeSoundTimer = 0;
        audioManager.playPlaneTurbine(Math.max(0.3, this.planeSpeed / 75.0));
      }

      let isAirborne = this.planePos.y > 1.2;
      let throttle = input.forward;
      let pitchCommand = (input.ascend ? 1 : 0) - (input.descend ? 1 : 0);

      if (this.isPlaneAutopilot) {
        const speedError = this.planeAutopilotSpeed - this.planeSpeed;
        throttle = Math.abs(speedError) > 0.8 ? Math.sign(speedError) : 0;
        if (isAirborne) {
          const altitudeError = 58 - this.planePos.y;
          const liftTrim = (40 - this.planeSpeed) / 40;
          pitchCommand = THREE.MathUtils.clamp(
            altitudeError * 0.025 - this.planeVelocity.y * 0.12 + liftTrim,
            -0.65,
            0.65
          );
        } else {
          pitchCommand = 0;
        }
      }

      // Throttle acceleration / braking
      if (throttle > 0) {
        this.planeSpeed = Math.min(75.0, this.planeSpeed + 19.0 * dt);
      } else if (throttle < 0) {
        this.planeSpeed = Math.max(0, this.planeSpeed - 24.0 * dt);
      } else {
        this.planeSpeed = Math.max(0, this.planeSpeed - 2.8 * dt);
      }

      if (!isAirborne) {
        // Runway Taxi & Ground Roll
        this.planeHeading -= (this.isPlaneAutopilot ? 0 : input.strafe) * dt * 0.9;
        this.planeRoll = THREE.MathUtils.lerp(this.planeRoll, 0, dt * 8);
        this.planePitch = THREE.MathUtils.lerp(this.planePitch, 0, dt * 8);

        // Space rotates the nose up; autopilot performs the same rotation at takeoff speed.
        if ((input.ascend || this.isPlaneAutopilot) && this.planeSpeed > 24) {
          this.planeVelocity.y = Math.max(this.planeVelocity.y, 4.5);
          this.planePos.y = 1.25;
          isAirborne = true;
        }
      } else {
        // Airborne 3D Aerodynamics
        this.planePitch = THREE.MathUtils.lerp(this.planePitch, -pitchCommand * 0.42, dt * 2.8);
        const bankInput = this.isPlaneAutopilot ? 0 : input.strafe;
        this.planeRoll = THREE.MathUtils.lerp(this.planeRoll, bankInput * 0.75, dt * 5);

        // Banking turns heading
        this.planeHeading -= (bankInput * 1.4 + this.planeRoll * 1.1) * dt;

        const lift = (this.planeSpeed / 40.0) * 9.81;
        this.planeVelocity.y += (lift + pitchCommand * 13.0 - 9.81) * dt;
        this.planeVelocity.y *= Math.exp(-0.5 * dt);
      }

      // Forward flight velocity
      const fwd = new THREE.Vector3(Math.sin(this.planeHeading), 0, Math.cos(this.planeHeading));
      this.planeVelocity.x = fwd.x * this.planeSpeed;
      this.planeVelocity.z = fwd.z * this.planeSpeed;

      this.planePos.add(this.planeVelocity.clone().multiplyScalar(dt));

      // Ground clamp
      if (this.planePos.y < 0.05) {
        this.planePos.y = 0.05;
        this.planeVelocity.y = 0;
        this.planePitch = THREE.MathUtils.lerp(this.planePitch, 0, dt * 8);
        this.planeRoll = THREE.MathUtils.lerp(this.planeRoll, 0, dt * 8);
      }

      this.planeSpeed = THREE.MathUtils.clamp(this.planeSpeed, 0, 72);
      this.planeVelocity.x = THREE.MathUtils.clamp(this.planeVelocity.x, -90, 90);
      this.planeVelocity.y = THREE.MathUtils.clamp(this.planeVelocity.y, -30, 30);
      this.planeVelocity.z = THREE.MathUtils.clamp(this.planeVelocity.z, -90, 90);
      if (!Number.isFinite(this.planeSpeed) || !this.planeVelocity.lengthSq()) {
        this.planeSpeed = 0;
        this.planeVelocity.set(0, 0, 0);
      }

      this.planeGroup.position.copy(this.planePos);
      this.planeGroup.rotation.y = this.planeHeading;
      this.planeGroup.rotation.x = this.planePitch;
      this.planeGroup.rotation.z = this.planeRoll;

      playerPos.copy(this.planePos);
      store.setVehicleStats(Math.round(this.planeSpeed * 1.94), 100, 1, 5500);
    }

    // 5. Helicopter Flight Simulation
    if (this.isPlayerFlyingHeli) {
      this.rotorRpm = Math.min(1.0, this.rotorRpm + dt * 0.8);
      this.rotorSoundTimer += dt;
      if (this.rotorSoundTimer > 0.09) {
        this.rotorSoundTimer = 0;
        audioManager.playHelicopterRotor();
      }

      // Flight Controls
      const pitchInput = input.forward; // W forward / S backward
      const yawInput = input.strafe;    // A / D yaw turn
      const liftInput = (input.ascend ? 1 : 0) - (input.descend ? 1 : 0);

      // Yaw rotation
      this.heliHeading -= yawInput * dt * 1.8;
      this.heliGroup.rotation.y = this.heliHeading;

      // Collective Vertical Thrust
      const liftForce = liftInput * 12.0;
      this.heliVelocity.y += (liftForce - 9.8) * dt;
      this.heliVelocity.y *= 0.96; // Air drag

      // Forward / Backward translation based on pitch
      this.heliPitch = THREE.MathUtils.lerp(this.heliPitch, -pitchInput * 0.35, dt * 5);
      this.heliRoll = THREE.MathUtils.lerp(this.heliRoll, yawInput * 0.25, dt * 5);
      this.heliGroup.rotation.x = this.heliPitch;
      this.heliGroup.rotation.z = this.heliRoll;

      const fwdVec = new THREE.Vector3(Math.sin(this.heliHeading), 0, Math.cos(this.heliHeading));
      const flightSpeed = -pitchInput * 28.0;
      this.heliVelocity.x = THREE.MathUtils.lerp(this.heliVelocity.x, fwdVec.x * flightSpeed, dt * 3);
      this.heliVelocity.z = THREE.MathUtils.lerp(this.heliVelocity.z, fwdVec.z * flightSpeed, dt * 3);

      this.heliPos.add(this.heliVelocity.clone().multiplyScalar(dt));

      // Ground / Rooftop ceiling clamp
      if (this.heliPos.y < 0.5) {
        this.heliPos.y = 0.5;
        this.heliVelocity.y = 0;
      }
      this.heliGroup.position.copy(this.heliPos);

      // Keep player position anchored to helicopter
      playerPos.copy(this.heliPos);
    } else {
      // Parked: spin down rotor
      this.rotorRpm = Math.max(0, this.rotorRpm - dt * 0.5);
    }

    // Spin Rotor Blades
    this.heliMainRotor.rotation.y += this.rotorRpm * 35.0 * dt;
    this.heliTailRotor.rotation.x += this.rotorRpm * 50.0 * dt;
  }
}

export const transitSystem = new TransitSystem();
