import * as THREE from 'three';
import { furnitureFactory } from './FurnitureFactory';
import { CollisionBox } from './CityGenerator';
import { useGameStore, InteriorType } from '../core/gameState';
import { audioManager } from '../core/AudioManager';

export interface StaircaseRamp {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  startY: number;
  endY: number;
  direction: 'z' | 'x';
}

export interface InteractiveProp {
  id: string;
  name: string;
  position: THREE.Vector3;
  radius: number;
  prompt: string;
  action: () => void;
}

export class BuildingInteriorsManager {
  public rootGroup: THREE.Group = new THREE.Group();
  public colliders: CollisionBox[] = [];
  public staircases: StaircaseRamp[] = [];
  public interactiveProps: InteractiveProp[] = [];

  // Elevator system state
  public elevatorCabin: THREE.Group;
  public elevatorDoorL: THREE.Mesh;
  public elevatorDoorR: THREE.Mesh;
  public elevatorY = 0;
  public elevatorTargetY = 0;
  public elevatorFloor = 1;
  public elevatorTargetFloor = 1;
  public isElevatorMoving = false;
  public doorOpenProgress = 0; // 0: closed, 1: open
  public doorState: 'closed' | 'open' | 'opening' | 'closing' = 'closed';
  private doorTimer = 0;

  // Floor levels
  public readonly floorY = [0, 6.0, 12.0];

  constructor() {
    // 1. Build Elevator Cabin
    const elev = furnitureFactory.createElevatorCabin();
    this.elevatorCabin = elev.cabin;
    this.elevatorDoorL = elev.doorLeft;
    this.elevatorDoorR = elev.doorRight;
    this.elevatorCabin.position.set(-16, 0, 18);
    this.rootGroup.add(this.elevatorCabin);

    // 2. Build Safehouse & Luxury Penthouse Apartments (Floors 1, 2, 3)
    this.buildApartmentBuilding();

    // 3. Build Vice Bay General Hospital (Floors 1, 2)
    this.buildHospitalInterior();
  }

  // --- 1. APARTMENT BUILDING (LOBBY + PENTHOUSE + ROOFTOP HELIPAD) ---
  private buildApartmentBuilding() {
    const aptGroup = new THREE.Group();
    aptGroup.position.set(-10, 0, 10);

    const wallMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.6 });
    const floorTileMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.3, metalness: 0.1 });
    const woodFloorMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.5 });
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x38bdf8,
      transmission: 0.85,
      transparent: true,
      opacity: 0.5
    });

    // --- FLOOR 1: RECEPTION LOBBY (y = 0 to 6) ---
    // Floor Slab
    const f1Floor = new THREE.Mesh(new THREE.BoxGeometry(26, 0.2, 24), floorTileMat);
    f1Floor.position.set(0, 0.1, 0);
    aptGroup.add(f1Floor);

    // Reception Desk
    const desk = new THREE.Mesh(new THREE.BoxGeometry(3.5, 1.1, 1.2), this.createMarbleMaterial());
    desk.position.set(0, 0.55, -7);
    aptGroup.add(desk);

    // Lobby Sofa & Coffee Table
    const lobbySofa = furnitureFactory.createSectionalSofa();
    lobbySofa.position.set(6, 0, 2);
    lobbySofa.rotation.y = -Math.PI / 2;
    const lobbyTable = furnitureFactory.createCoffeeTable();
    lobbyTable.position.set(4, 0, 2);
    aptGroup.add(lobbySofa, lobbyTable);

    // Entrance Glass Doors at Front (z = 12)
    const doorPostL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 3.2, 0.2), wallMat);
    doorPostL.position.set(-2, 1.6, 11.9);
    const doorPostR = doorPostL.clone();
    doorPostR.position.x = 2;
    const doorLintel = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.2, 0.2), wallMat);
    doorLintel.position.set(0, 3.1, 11.9);
    const doors = new THREE.Mesh(new THREE.BoxGeometry(3.8, 3.0, 0.1), glassMat);
    doors.position.set(0, 1.5, 11.9);
    aptGroup.add(doorPostL, doorPostR, doorLintel, doors);

    const apartmentWalls = [
      { size: [0.2, 6, 24] as [number, number, number], position: [-12.9, 3, 0] as [number, number, number] },
      { size: [0.2, 6, 24] as [number, number, number], position: [12.9, 3, 0] as [number, number, number] },
      { size: [26, 6, 0.2] as [number, number, number], position: [0, 3, -11.9] as [number, number, number] },
      { size: [11, 6, 0.2] as [number, number, number], position: [-7.5, 3, 11.9] as [number, number, number] },
      { size: [11, 6, 0.2] as [number, number, number], position: [7.5, 3, 11.9] as [number, number, number] }
    ];
    for (const wall of apartmentWalls) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(...wall.size), wallMat);
      mesh.position.set(wall.position[0], wall.position[1], wall.position[2]);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      aptGroup.add(mesh);
    }

    this.colliders.push(
      { minX: -23, maxX: -22.8, minZ: -2, maxZ: 22, type: 'interiorWall' },
      { minX: 2.8, maxX: 3, minZ: -2, maxZ: 22, type: 'interiorWall' },
      { minX: -23, maxX: 3, minZ: -2, maxZ: -1.8, type: 'interiorWall' },
      { minX: -23, maxX: -12.1, minZ: 21.8, maxZ: 22, type: 'interiorWall' },
      { minX: -7.9, maxX: 3, minZ: 21.8, maxZ: 22, type: 'interiorWall' }
    );

    // Interactive Front Entrance Trigger
    this.interactiveProps.push({
      id: 'apt_door_in',
      name: 'Grand Tower Entrance',
      position: new THREE.Vector3(-10, 0, 22),
      radius: 3.5,
      prompt: 'Grand Tower Apartments Lobby',
      action: () => {
        useGameStore.getState().setCurrentInterior('apartment', 1);
      }
    });

    // Staircase Flight from Floor 1 to Floor 2
    const stairsF1 = furnitureFactory.createStaircase(2.4, 6.0, 8.0);
    stairsF1.position.set(8.5, 0, -4);
    aptGroup.add(stairsF1);

    // Staircase Collision Ramp for Floor 1 -> Floor 2
    this.staircases.push({
      minX: -10 + 8.5 - 1.4,
      maxX: -10 + 8.5 + 1.4,
      minZ: 10 - 4 - 4.2,
      maxZ: 10 - 4 + 4.2,
      startY: 0,
      endY: 6.0,
      direction: 'z'
    });

    // --- FLOOR 2: LUXURY PENTHOUSE (y = 6.0 to 12.0) ---
    // Floor Slab
    const f2Floor = new THREE.Mesh(new THREE.BoxGeometry(26, 0.25, 24), woodFloorMat);
    f2Floor.position.set(0, 6.0, 0);
    aptGroup.add(f2Floor);

    // Ceiling of Floor 1 / Floor of Floor 2
    const ceilingMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 });
    const f1Ceiling = new THREE.Mesh(new THREE.BoxGeometry(26, 0.15, 24), ceilingMat);
    f1Ceiling.position.set(0, 5.9, 0);
    aptGroup.add(f1Ceiling);

    for (const wall of [
      { size: [0.2, 6, 24], position: [-12.9, 9, 0] },
      { size: [0.2, 6, 24], position: [12.9, 9, 0] },
      { size: [26, 6, 0.2], position: [0, 9, -11.9] },
      { size: [11, 6, 0.2], position: [-7.5, 9, 11.9] },
      { size: [11, 6, 0.2], position: [7.5, 9, 11.9] }
    ] as const) {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(wall.size[0], wall.size[1], wall.size[2]),
        wallMat
      );
      mesh.position.set(wall.position[0], wall.position[1], wall.position[2]);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      aptGroup.add(mesh);
    }

    // Master Bedroom: Bed, Nightstands, Wardrobe
    const bed = furnitureFactory.createLuxuryBed();
    bed.position.set(-6.5, 6.0, -6.5);
    const nightstandL = furnitureFactory.createNightstand();
    nightstandL.position.set(-8.2, 6.0, -7.5);
    const nightstandR = furnitureFactory.createNightstand();
    nightstandR.position.set(-4.8, 6.0, -7.5);
    aptGroup.add(bed, nightstandL, nightstandR);

    // Bed Interactive Sleep Trigger
    this.interactiveProps.push({
      id: 'bed_sleep',
      name: 'Luxury Bed',
      position: new THREE.Vector3(-10 - 6.5, 6.0, 10 - 6.5),
      radius: 2.8,
      prompt: 'Press [F] - Sleep & Restore 100% Energy (Advances 8h)',
      action: () => {
        audioManager.playSleep();
        useGameStore.getState().sleep(8);
        useGameStore.getState().showNotification('Woke up feeling well rested! Energy 100%');
      }
    });

    // Wardrobe / Customizer Mirror
    const wardrobeMesh = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 2.5, 0.6),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.3, metalness: 0.6 })
    );
    wardrobeMesh.position.set(-9.5, 7.25, 0);
    wardrobeMesh.rotation.y = Math.PI / 2;
    aptGroup.add(wardrobeMesh);

    this.interactiveProps.push({
      id: 'wardrobe_customizer',
      name: 'Wardrobe Mirror',
      position: new THREE.Vector3(-10 - 8.5, 6.0, 10),
      radius: 2.5,
      prompt: 'Press [F] - Wardrobe: Customize Outfit & Appearance',
      action: () => {
        useGameStore.getState().setWardrobeOpen(true);
      }
    });

    // Living Room: Sectional Sofa, Coffee Table, 65" TV Entertainment Center
    const penthouseSofa = furnitureFactory.createSectionalSofa();
    penthouseSofa.position.set(3.5, 6.0, -3);
    const penthouseTable = furnitureFactory.createCoffeeTable();
    penthouseTable.position.set(1.5, 6.0, -3);
    const entertainmentCenter = furnitureFactory.createEntertainmentCenter();
    entertainmentCenter.position.set(1.5, 6.0, -7.5);
    aptGroup.add(penthouseSofa, penthouseTable, entertainmentCenter);

    // Sofa Interactive Relax Trigger
    this.interactiveProps.push({
      id: 'sofa_relax',
      name: 'Leather Sectional Sofa',
      position: new THREE.Vector3(-10 + 3.5, 6.0, 10 - 3),
      radius: 2.5,
      prompt: 'Press [F] - Sit & Relax on Sofa',
      action: () => {
        audioManager.playDoorSlam();
        useGameStore.getState().healPlayer(15);
        useGameStore.getState().showNotification('Relaxing on sofa... Stress relieved!');
      }
    });

    // TV Interactive Watch Trigger
    this.interactiveProps.push({
      id: 'tv_watch',
      name: 'OLED TV',
      position: new THREE.Vector3(-10 + 1.5, 6.0, 10 - 6.5),
      radius: 2.5,
      prompt: 'Press [F] - Watch Weazel News Broadcast',
      action: () => {
        audioManager.playPhoneBeep();
        useGameStore.getState().showNotification('Watching Weazel TV: "Police cracking down on street races!"');
      }
    });

    // Designer Kitchen & Bar: Island Counter, Refrigerator, Barstools
    const kitchen = furnitureFactory.createKitchenBar();
    kitchen.position.set(3.0, 6.0, 4.5);
    aptGroup.add(kitchen);

    // Kitchen Fridge Interactive Eat & Drink Trigger
    this.interactiveProps.push({
      id: 'kitchen_fridge',
      name: 'Refrigerator & Pantry',
      position: new THREE.Vector3(-10 + 1.2, 6.0, 10 + 4.5),
      radius: 2.6,
      prompt: 'Press [F] - Eat Meal & Drink Cold Beverage',
      action: () => {
        audioManager.playEat();
        setTimeout(() => audioManager.playDrink(), 300);
        useGameStore.getState().eatFood(45);
        useGameStore.getState().drinkBeverage(50);
        useGameStore.getState().showNotification('Ate a gourmet snack and drank chilled water!');
      }
    });

    // Bathroom: Walk-in Shower
    const shower = furnitureFactory.createShowerCabin();
    shower.position.set(-8.5, 6.0, 6.5);
    aptGroup.add(shower);

    this.interactiveProps.push({
      id: 'bathroom_shower',
      name: 'Walk-in Shower',
      position: new THREE.Vector3(-10 - 8.5, 6.0, 10 + 6.5),
      radius: 2.2,
      prompt: 'Press [F] - Take Hot Refreshing Shower',
      action: () => {
        audioManager.playDrink();
        useGameStore.getState().takeShower();
        useGameStore.getState().showNotification('Took a hot shower! Energy & Comfort boosted.');
      }
    });

    // Balcony Overlook with Glass Railing (z = 10 to 12)
    const railing = new THREE.Mesh(new THREE.BoxGeometry(16, 1.1, 0.1), glassMat);
    railing.position.set(0, 6.6, 11.5);
    aptGroup.add(railing);

    // Staircase Flight from Floor 2 to Floor 3
    const stairsF2 = furnitureFactory.createStaircase(2.4, 6.0, 8.0);
    stairsF2.position.set(8.5, 6.0, -4);
    aptGroup.add(stairsF2);

    this.staircases.push({
      minX: -10 + 8.5 - 1.4,
      maxX: -10 + 8.5 + 1.4,
      minZ: 10 - 4 - 4.2,
      maxZ: 10 - 4 + 4.2,
      startY: 6.0,
      endY: 12.0,
      direction: 'z'
    });

    // --- FLOOR 3: ROOFTOP HELIPAD & LOUNGE (y = 12.0) ---
    const f3Floor = new THREE.Mesh(new THREE.BoxGeometry(26, 0.3, 24), wallMat);
    f3Floor.position.set(0, 12.0, 0);

    // Helipad 'H' Marking on Roof
    const helipadRing = new THREE.Mesh(
      new THREE.RingGeometry(4.2, 4.8, 32),
      new THREE.MeshBasicMaterial({ color: 0xfacc15, side: THREE.DoubleSide })
    );
    helipadRing.rotation.x = -Math.PI / 2;
    helipadRing.position.set(0, 12.2, 0);

    const hBar1 = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 4.2), new THREE.MeshBasicMaterial({ color: 0xfacc15 }));
    hBar1.rotation.x = -Math.PI / 2;
    hBar1.position.set(-1.2, 12.21, 0);

    const hBar2 = hBar1.clone();
    hBar2.position.x = 1.2;

    const hCross = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.7), new THREE.MeshBasicMaterial({ color: 0xfacc15 }));
    hCross.rotation.x = -Math.PI / 2;
    hCross.position.set(0, 12.21, 0);

    aptGroup.add(f3Floor, helipadRing, hBar1, hBar2, hCross);

    // Rooftop Safety Guardrails
    const roofRailN = new THREE.Mesh(new THREE.BoxGeometry(26, 1.2, 0.1), glassMat);
    roofRailN.position.set(0, 12.6, -11.9);
    const roofRailS = roofRailN.clone();
    roofRailS.position.z = 11.9;
    const roofRailW = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.2, 24), glassMat);
    roofRailW.position.set(-12.9, 12.6, 0);
    const roofRailE = roofRailW.clone();
    roofRailE.position.x = 12.9;
    aptGroup.add(roofRailN, roofRailS, roofRailW, roofRailE);

    this.rootGroup.add(aptGroup);

    // Register Elevator Call Buttons at each floor
    [1, 2, 3].forEach((fl) => {
      const yPos = this.floorY[fl - 1];
      this.interactiveProps.push({
        id: `elev_call_${fl}`,
        name: `Floor ${fl} Elevator Call Button`,
        position: new THREE.Vector3(-14, yPos, 18),
        radius: 2.2,
        prompt: `Press [F] - Call Elevator to Floor ${fl}`,
        action: () => {
          this.callElevatorToFloor(fl);
        }
      });
    });

    // Elevator Inside Floor Selection Triggers
    this.interactiveProps.push({
      id: 'elev_inside_buttons',
      name: 'Elevator Floor Panel',
      position: new THREE.Vector3(-16, 0, 18), // Updates dynamically with elevatorY
      radius: 2.4,
      prompt: 'Elevator Floor [1: Lobby · 2: Penthouse · 3: Rooftop]',
      action: () => {
        const next = this.elevatorFloor === 1 ? 2 : this.elevatorFloor === 2 ? 3 : 1;
        this.selectFloor(next);
      }
    });
  }

  // --- 2. VICE BAY GENERAL HOSPITAL INTERIOR ---
  private buildHospitalInterior() {
    const hospGroup = new THREE.Group();
    hospGroup.position.set(90, 0, -140);

    const whiteTileMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.2 });
    const wallMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.4 });
    const blueTrimMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.3 });

    // Ground Floor Slab
    const floor = new THREE.Mesh(new THREE.BoxGeometry(28, 0.2, 26), whiteTileMat);
    floor.position.set(0, 0.1, 0);
    hospGroup.add(floor);

    // Reception Counter
    const desk = new THREE.Mesh(new THREE.BoxGeometry(5.0, 1.1, 1.2), blueTrimMat);
    desk.position.set(0, 0.55, -6);
    hospGroup.add(desk);

    // 3 Recovery Patient Beds
    for (let i = 0; i < 3; i++) {
      const hBed = furnitureFactory.createHospitalBed();
      hBed.position.set(-8 + i * 4.5, 0, 4);
      hospGroup.add(hBed);
    }

    // Medical Care Interactive Healing Trigger
    this.interactiveProps.push({
      id: 'hospital_care',
      name: 'Hospital Medical Bay',
      position: new THREE.Vector3(90, 0, -140 + 4),
      radius: 4.5,
      prompt: 'Press [F] - Medical Care: Restore 100% Health & Clear Injuries ($50)',
      action: () => {
        const store = useGameStore.getState();
        if (store.spendCash(50)) {
          audioManager.playCashRegister();
          store.healPlayer(100);
          store.showNotification('Medical treatment received! Health fully restored.');
        } else {
          store.showNotification('Need $50 for hospital treatment!');
        }
      }
    });

    this.rootGroup.add(hospGroup);
  }

  private createMarbleMaterial(): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.2,
      metalness: 0.3
    });
  }

  // --- ELEVATOR PHYSICS & MOVEMENT ---
  public callElevatorToFloor(targetFloor: number) {
    if (this.elevatorFloor === targetFloor && !this.isElevatorMoving) {
      this.openDoors();
      audioManager.playElevatorDing();
      return;
    }
    this.elevatorTargetFloor = targetFloor;
    this.elevatorTargetY = this.floorY[targetFloor - 1];
    this.isElevatorMoving = true;
    this.closeDoors();
    audioManager.playDoorSlam();
    useGameStore.getState().setElevatorState(this.elevatorFloor, targetFloor, true, 'closed');
  }

  public selectFloor(floor: number) {
    this.callElevatorToFloor(floor);
  }

  private openDoors() {
    this.doorState = 'opening';
    this.doorTimer = 0;
  }

  private closeDoors() {
    this.doorState = 'closing';
    this.doorTimer = 0;
  }

  public update(playerPos: THREE.Vector3, dt: number): number {
    const store = useGameStore.getState();

    // 1. Elevator Vertical Physics Update
    if (this.isElevatorMoving) {
      const speed = 3.2; // 3.2 m/s elevator travel speed
      const diffY = this.elevatorTargetY - this.elevatorY;

      if (Math.abs(diffY) > 0.05) {
        this.elevatorY += Math.sign(diffY) * Math.min(Math.abs(diffY), speed * dt);
      } else {
        // Arrived at floor!
        this.elevatorY = this.elevatorTargetY;
        this.elevatorFloor = this.elevatorTargetFloor;
        this.isElevatorMoving = false;
        audioManager.playElevatorDing();
        this.openDoors();
        store.setElevatorState(this.elevatorFloor, this.elevatorFloor, false, 'open');
        store.showNotification(`Elevator arrived at Floor ${this.elevatorFloor}`);
      }
      this.elevatorCabin.position.y = this.elevatorY;
    }

    // 2. Elevator Sliding Doors Animation
    if (this.doorState === 'opening') {
      this.doorOpenProgress = Math.min(1.0, this.doorOpenProgress + dt * 2.0);
      if (this.doorOpenProgress >= 1.0) {
        this.doorState = 'open';
        this.doorTimer = 0;
      }
    } else if (this.doorState === 'open') {
      this.doorTimer += dt;
      if (this.doorTimer > 3.5 && !this.isElevatorMoving) {
        this.closeDoors();
      }
    } else if (this.doorState === 'closing') {
      this.doorOpenProgress = Math.max(0, this.doorOpenProgress - dt * 2.0);
      if (this.doorOpenProgress <= 0) {
        this.doorState = 'closed';
      }
    }

    // Slide doors visually (0 to 0.65m separation)
    this.elevatorDoorL.position.x = -0.38 - this.doorOpenProgress * 0.65;
    this.elevatorDoorR.position.x = 0.38 + this.doorOpenProgress * 0.65;

    // 3. Platform Elevation & Staircase Detection
    let calculatedGroundY = 0;

    // A. Check if Player is standing inside the moving Elevator Car
    const inElevatorX = playerPos.x >= -17.5 && playerPos.x <= -14.5;
    const inElevatorZ = playerPos.z >= 16.5 && playerPos.z <= 19.5;

    if (inElevatorX && inElevatorZ) {
      calculatedGroundY = this.elevatorY;
    } else {
      // B. Check Staircase Ramps
      for (const stairs of this.staircases) {
        if (
          playerPos.x >= stairs.minX &&
          playerPos.x <= stairs.maxX &&
          playerPos.z >= stairs.minZ &&
          playerPos.z <= stairs.maxZ
        ) {
          const progress = (playerPos.z - stairs.minZ) / (stairs.maxZ - stairs.minZ);
          calculatedGroundY = stairs.startY + progress * (stairs.endY - stairs.startY);
          break;
        }
      }

      // C. Upper Floor Slabs (Floor 2 Penthouse: y = 6.0, Floor 3 Rooftop: y = 12.0)
      if (calculatedGroundY === 0) {
        const inAptBounds = playerPos.x >= -23 && playerPos.x <= 3 && playerPos.z >= -2 && playerPos.z <= 22;
        if (inAptBounds) {
          if (playerPos.y >= 10.5) calculatedGroundY = 12.0;
          else if (playerPos.y >= 4.5) calculatedGroundY = 6.0;
        }
      }
    }

    // 4. Check Nearest Interactive Prop Prompt
    let activePrompt: string | null = null;
    let closestDist = 999;
    let activeAction: (() => void) | null = null;

    for (const prop of this.interactiveProps) {
      const d = Math.hypot(playerPos.x - prop.position.x, playerPos.z - prop.position.z);
      const dy = Math.abs(playerPos.y - prop.position.y);
      if (d < prop.radius && dy < 2.5 && d < closestDist) {
        closestDist = d;
        activePrompt = prop.prompt;
        activeAction = prop.action;
      }
    }

    if (activePrompt) {
      store.setInteractionPrompt(activePrompt);
    }

    return calculatedGroundY;
  }

  public triggerActiveAction(playerPos: THREE.Vector3) {
    for (const prop of this.interactiveProps) {
      const d = Math.hypot(playerPos.x - prop.position.x, playerPos.z - prop.position.z);
      const dy = Math.abs(playerPos.y - prop.position.y);
      if (d < prop.radius && dy < 2.5) {
        prop.action();
        return;
      }
    }
  }
}

export const buildingInteriors = new BuildingInteriorsManager();
