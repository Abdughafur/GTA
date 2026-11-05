import * as THREE from 'three';
import { audioManager } from '../core/AudioManager';
import { useGameStore } from '../core/gameState';

export class TransitSystem {
  public rootGroup: THREE.Group = new THREE.Group();

  // Train system
  public trainGroup: THREE.Group = new THREE.Group();
  public trainPos: THREE.Vector3 = new THREE.Vector3(-140, 0.4, -140);
  public trainSpeed = 16.0; // m/s
  public trainProgress = 0; // 0..1 along loop
  public isPlayerRidingTrain = false;
  private trainTrackPoints: THREE.Vector3[] = [];
  private trainTrackCurve!: THREE.CatmullRomCurve3;
  private stationStopTimer = 0;
  private trainSoundTimer = 0;
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
  public planePos: THREE.Vector3 = new THREE.Vector3(-140, 0.6, -200);
  public planeVelocity: THREE.Vector3 = new THREE.Vector3();
  public planeSpeed = 0; // m/s (up to 70 m/s ~ 250 km/h)
  public planeHeading = Math.PI / 2; // Facing East down the runway
  public planePitch = 0;
  public planeRoll = 0;
  public isPlayerFlyingPlane = false;
  private planeSoundTimer = 0;
  private radarDish!: THREE.Mesh;

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
    // Railway loop along perimeter avenues
    const loopPoints = [
      new THREE.Vector3(-150, 0.2, -150),
      new THREE.Vector3(150, 0.2, -150),
      new THREE.Vector3(150, 0.2, 150),
      new THREE.Vector3(-150, 0.2, 150)
    ];
    this.trainTrackPoints = loopPoints;
    this.trainTrackCurve = new THREE.CatmullRomCurve3(loopPoints, true, 'catmullrom', 0.15);

    // Track ballast and rails
    const railMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9, roughness: 0.2 });
    const tieMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.8 });

    // Procedural Railway Ties around loop (200 cross-ties)
    const tieGeo = new THREE.BoxGeometry(3.2, 0.12, 0.4);
    for (let i = 0; i < 180; i++) {
      const t = i / 180;
      const pt = this.trainTrackCurve.getPointAt(t);
      const tangent = this.trainTrackCurve.getTangentAt(t);

      const tie = new THREE.Mesh(tieGeo, tieMat);
      tie.position.copy(pt);
      tie.rotation.y = Math.atan2(tangent.x, tangent.z) + Math.PI / 2;
      this.rootGroup.add(tie);
    }

    // Steel twin rails
    const railGeo = new THREE.TubeGeometry(this.trainTrackCurve, 240, 0.08, 6, true);
    const railL = new THREE.Mesh(railGeo, railMat);
    railL.position.y = 0.12;
    this.rootGroup.add(railL);

    // --- CENTRAL METRO STATION PLATFORM (At X: 150, Z: 0) ---
    const stationGroup = new THREE.Group();
    stationGroup.position.set(150, 0, 0);

    const platformMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5 });
    const canopyMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.6, roughness: 0.3 });

    // Platform Slab
    const platform = new THREE.Mesh(new THREE.BoxGeometry(8, 0.8, 48), platformMat);
    platform.position.set(-6, 0.4, 0);
    stationGroup.add(platform);

    // Canopy Pillars & Roof
    for (const z of [-18, -6, 6, 18]) {
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 4.2, 8), railMat);
      pillar.position.set(-6, 2.5, z);
      stationGroup.add(pillar);
    }
    const roof = new THREE.Mesh(new THREE.BoxGeometry(9.5, 0.25, 46), canopyMat);
    roof.position.set(-6, 4.6, 0);
    stationGroup.add(roof);

    // Station Sign
    const sign = new THREE.Mesh(
      new THREE.BoxGeometry(4.5, 0.8, 0.1),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, emissive: 0x0284c7, emissiveIntensity: 0.6 })
    );
    sign.position.set(-6, 3.8, 0);
    stationGroup.add(sign);

    this.rootGroup.add(stationGroup);
  }

  // --- 2. STREAMLINE METRO TRAIN ---
  private buildMetroTrain() {
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.7, roughness: 0.25 });
    const stripeMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.3, roughness: 0.4 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 0.5 });

    // Train Engine + 2 Cars
    for (let c = 0; c < 3; c++) {
      const car = new THREE.Group();
      car.position.z = -c * 12.5;

      // Car Body
      const body = new THREE.Mesh(new THREE.BoxGeometry(2.8, 2.6, 11.5), bodyMat);
      body.position.y = 1.6;

      // Blue Livery Stripe
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.85, 0.45, 11.6), stripeMat);
      stripe.position.y = 1.3;

      // Windows
      const winL = new THREE.Mesh(new THREE.BoxGeometry(2.88, 0.7, 9.5), glassMat);
      winL.position.y = 1.9;

      car.add(body, stripe, winL);

      // Front windshield & headlight on engine car (c = 0)
      if (c === 0) {
        const headlight = new THREE.Mesh(
          new THREE.CylinderGeometry(0.2, 0.2, 0.1, 12),
          new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff9e6, emissiveIntensity: 2.0 })
        );
        headlight.rotation.x = Math.PI / 2;
        headlight.position.set(0, 1.3, 5.8);
        car.add(headlight);
      }

      this.trainGroup.add(car);
    }

    this.rootGroup.add(this.trainGroup);
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

    const runwayMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.85 });
    const markMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const yellowMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
    const terminalMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3, metalness: 0.4 });
    const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x38bdf8, transmission: 0.8, transparent: true, opacity: 0.7 });

    // 1. Long Asphalt Runway (X: -190 to 50, Z: -200) -> 240m long, 24m wide
    const runway = new THREE.Mesh(new THREE.PlaneGeometry(240, 24), runwayMat);
    runway.rotation.x = -Math.PI / 2;
    runway.position.set(-70, 0.05, -200);
    ap.add(runway);

    // Centerline dashed stripes
    for (let x = -180; x <= 40; x += 18) {
      const stripe = new THREE.Mesh(new THREE.PlaneGeometry(10, 0.8), yellowMat);
      stripe.rotation.x = -Math.PI / 2;
      stripe.position.set(x, 0.06, -200);
      ap.add(stripe);
    }

    // Runway threshold piano keys (West & East ends)
    for (const rx of [-184, 44]) {
      for (let z = -209; z <= -191; z += 2.4) {
        const key = new THREE.Mesh(new THREE.PlaneGeometry(6, 1.2), markMat);
        key.rotation.x = -Math.PI / 2;
        key.position.set(rx, 0.06, z);
        ap.add(key);
      }
    }

    // Runway edge lights (Green approach, White sideline, Blue taxiway)
    const lightMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    for (let x = -188; x <= 48; x += 22) {
      const lightL = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.4, 6), lightMat);
      lightL.position.set(x, 0.2, -212);
      const lightR = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.4, 6), lightMat);
      lightR.position.set(x, 0.2, -188);
      ap.add(lightL, lightR);
    }

    // 2. Airport Passenger Terminal Building
    const terminal = new THREE.Mesh(new THREE.BoxGeometry(48, 12, 28), terminalMat);
    terminal.position.set(-70, 6, -168);
    terminal.castShadow = true;

    // Tinted glass front facade
    const termGlass = new THREE.Mesh(new THREE.BoxGeometry(46, 7, 0.2), glassMat);
    termGlass.position.set(-70, 6.5, -153.8);

    // Terminal Illuminated Sign
    const termSign = new THREE.Mesh(
      new THREE.BoxGeometry(32, 2.5, 0.2),
      new THREE.MeshStandardMaterial({ color: 0x0284c7, emissive: 0x0284c7, emissiveIntensity: 0.9 })
    );
    termSign.position.set(-70, 11, -153.7);

    ap.add(terminal, termGlass, termSign);

    // 3. Air Traffic Control Tower
    const towerShaft = new THREE.Mesh(
      new THREE.CylinderGeometry(2.4, 3.2, 34, 16),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.4 })
    );
    towerShaft.position.set(-30, 17, -168);

    const cab = new THREE.Mesh(new THREE.CylinderGeometry(4.5, 3.5, 4.5, 12), glassMat);
    cab.position.set(-30, 34, -168);

    // Rotating Radar Dish atop Control Tower
    this.radarDish = new THREE.Mesh(
      new THREE.BoxGeometry(4.2, 0.8, 0.2),
      new THREE.MeshStandardMaterial({ color: 0xdc2626, metalness: 0.8 })
    );
    this.radarDish.position.set(-30, 37.5, -168);
    ap.add(towerShaft, cab, this.radarDish);

    // 4. Aircraft Hangar
    const hangar = new THREE.Mesh(
      new THREE.BoxGeometry(34, 14, 26),
      new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5, metalness: 0.6 })
    );
    hangar.position.set(-120, 7, -168);
    ap.add(hangar);

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
    const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x143a55, roughness: 0.12, metalness: 0.35, clearcoat: 1 });
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
    fuselage.rotation.x = Math.PI / 2;
    fuselage.position.y = 1.55;
    fuselage.castShadow = true;

    const wings = makePlanform([
      [-10.2, -3.4], [-10.6, -4.2], [-2.1, -1.2], [-1.5, -0.7],
      [1.5, -0.7], [2.1, -1.2], [10.6, -4.2], [10.2, -3.4],
      [2.1, 2.3], [1.55, 2.65], [-1.55, 2.65], [-2.1, 2.3]
    ], 0.22, wingMat);
    wings.position.y = 1.55;

    const tailplane = makePlanform([
      [-4.3, -8.2], [-4.5, -8.8], [-1.25, -7.65], [1.25, -7.65],
      [4.5, -8.8], [4.3, -8.2], [1.2, -7.35], [-1.2, -7.35]
    ], 0.18, wingMat);
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
    fin.castShadow = true;

    const canopy = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), glassMat);
    canopy.scale.set(0.79, 0.43, 1.85);
    canopy.position.set(0, 2.56, 7.7);

    const windows: THREE.Mesh[] = [];
    for (const side of [-1, 1]) {
      for (let index = 0; index < 7; index++) {
        const z = -4.2 + index * 1.35;
        const window = new THREE.Mesh(
          new THREE.SphereGeometry(0.16, 12, 8),
          glassMat
        );
        window.scale.set(0.1, 0.14, 0.29);
        window.position.set(side * 1.28, 1.92, z);
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
      engine.add(nacelle, intake, exhaust);
      engine.position.set(side * 2.25, 1.25, -5.25);
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
      wingtipLights.push(light);
    }

    plane.add(fuselage, wings, tailplane, fin, canopy, ...windows, ...engines, ...gear, ...wingtipLights);
    this.rootGroup.add(plane);
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
  public update(playerPos: THREE.Vector3, input: { forward: number; strafe: number; ascend: boolean; descend: boolean }, dt: number) {
    const store = useGameStore.getState();

    this.updateBus(dt);

    // 1. Train Movement along Track Loop
    if (this.stationStopTimer > 0) {
      this.stationStopTimer -= dt;
    } else {
      this.trainProgress = (this.trainProgress + (this.trainSpeed * dt) / 600) % 1.0;

      // Station stop check (near X: 150, Z: 0 -> progress ~ 0.37)
      if (Math.abs(this.trainProgress - 0.37) < 0.005) {
        this.stationStopTimer = 6.0; // Stop for 6 seconds
        audioManager.playTrainHorn();
      }
    }

    const trainPt = this.trainTrackCurve.getPointAt(this.trainProgress);
    const trainTangent = this.trainTrackCurve.getTangentAt(this.trainProgress);
    this.trainGroup.position.copy(trainPt);
    this.trainGroup.rotation.y = Math.atan2(trainTangent.x, trainTangent.z);

    // Passenger Train Riding
    if (this.isPlayerRidingTrain) {
      playerPos.copy(this.trainGroup.position);
      playerPos.y = 1.8;
      this.trainSoundTimer += dt;
      if (this.trainSoundTimer > 0.45) {
        this.trainSoundTimer = 0;
        audioManager.playTrainRide();
      }
    }

    // 2. High-Altitude Sky Jet Orbit
    this.jetAngle += dt * 0.08;
    this.jetGroup.position.set(Math.sin(this.jetAngle) * 220, 110, Math.cos(this.jetAngle) * 220);
    this.jetGroup.rotation.y = this.jetAngle + Math.PI / 2;

    // 3. Airport Radar Dish Rotation
    if (this.radarDish) {
      this.radarDish.rotation.y += dt * 1.6;
    }

    // 4. Flyable Jet Airplane Flight Physics
    if (this.isPlayerFlyingPlane) {
      this.planeSoundTimer += dt;
      if (this.planeSoundTimer > 0.12) {
        this.planeSoundTimer = 0;
        audioManager.playPlaneTurbine(Math.max(0.3, this.planeSpeed / 75.0));
      }

      const isAirborne = this.planePos.y > 1.2;

      // Throttle acceleration / braking
      if (input.forward > 0) {
        this.planeSpeed = Math.min(75.0, this.planeSpeed + 19.0 * dt);
      } else if (input.forward < 0) {
        this.planeSpeed = Math.max(0, this.planeSpeed - 24.0 * dt);
      } else {
        this.planeSpeed = Math.max(0, this.planeSpeed - 2.8 * dt);
      }

      if (!isAirborne) {
        // Runway Taxi & Ground Roll
        this.planeHeading -= input.strafe * dt * 0.9;
        this.planeRoll = THREE.MathUtils.lerp(this.planeRoll, 0, dt * 8);
        this.planePitch = THREE.MathUtils.lerp(this.planePitch, 0, dt * 8);

        // Takeoff Lift off when speed > 22 and Ascend pressed
        if (input.ascend && this.planeSpeed > 22) {
          this.planeVelocity.y = 14.0;
          this.planePos.y += 0.8;
        }
      } else {
        // Airborne 3D Aerodynamics
        const pitchCmd = (input.ascend ? 1 : 0) - (input.descend ? 1 : 0);
        this.planePitch = THREE.MathUtils.lerp(this.planePitch, pitchCmd * 0.45, dt * 4.5);
        this.planeRoll = THREE.MathUtils.lerp(this.planeRoll, input.strafe * 0.75, dt * 5);

        // Banking turns heading
        this.planeHeading -= (input.strafe * 1.4 + this.planeRoll * 1.1) * dt;

        // Vertical thrust & gravity
        const lift = (this.planeSpeed / 30.0) * 11.0 + pitchCmd * 18.0;
        this.planeVelocity.y += (lift - 9.8) * dt;
        this.planeVelocity.y *= 0.96; // drag
      }

      // Forward flight velocity
      const fwd = new THREE.Vector3(Math.sin(this.planeHeading), 0, Math.cos(this.planeHeading));
      this.planeVelocity.x = fwd.x * this.planeSpeed;
      this.planeVelocity.z = fwd.z * this.planeSpeed;

      this.planePos.add(this.planeVelocity.clone().multiplyScalar(dt));

      // Ground clamp
      if (this.planePos.y < 0.6) {
        this.planePos.y = 0.6;
        this.planeVelocity.y = 0;
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
