import * as THREE from 'three';

/**
 * FurnitureFactory for GTA Block
 * Generates composite multi-part geometric 3D furniture, appliances,
 * hospital equipment, elevator cabins, and staircases.
 */

export class FurnitureFactory {
  // Reusable Materials
  private woodMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.7, metalness: 0.1 });
  private darkWoodMat = new THREE.MeshStandardMaterial({ color: 0x2d1e17, roughness: 0.6, metalness: 0.1 });
  private leatherMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.8, metalness: 0.2 });
  private clothMat = new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.9, metalness: 0.05 });
  private whiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3, metalness: 0.1 });
  private chromeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.15, metalness: 0.9 });
  private glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x38bdf8,
    transmission: 0.85,
    transparent: true,
    opacity: 0.6,
    roughness: 0.1
  });
  private screenMat = new THREE.MeshBasicMaterial({ color: 0x0284c7 });

  // --- 1. BEDROOM FURNITURE ---
  public createLuxuryBed(): THREE.Group {
    const bed = new THREE.Group();

    // Wooden Frame Base
    const frame = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.35, 2.8), this.darkWoodMat);
    frame.position.y = 0.175;
    bed.add(frame);

    // Headboard
    const headboard = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1.4, 0.25), this.leatherMat);
    headboard.position.set(0, 0.7, -1.3);
    bed.add(headboard);

    // Thick Plush Mattress
    const mattress = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.45, 2.5), this.whiteMat);
    mattress.position.set(0, 0.52, 0.1);
    bed.add(mattress);

    // Blanket / Duvet (Silk Blue)
    const duvet = new THREE.Mesh(new THREE.BoxGeometry(2.24, 0.1, 1.8), this.clothMat);
    duvet.position.set(0, 0.75, 0.4);
    bed.add(duvet);

    // Pillows (2 plush pillows)
    for (const px of [-0.6, 0.6]) {
      const pillow = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.18, 0.45), this.whiteMat);
      pillow.rotation.x = 0.2;
      pillow.position.set(px, 0.85, -0.9);
      bed.add(pillow);
    }

    return bed;
  }

  public createNightstand(): THREE.Group {
    const stand = new THREE.Group();
    const table = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.65, 0.6), this.woodMat);
    table.position.y = 0.325;
    stand.add(table);

    // Table Lamp with warm emissive shade
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 0.08, 12), this.chromeMat);
    base.position.set(0, 0.69, 0);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.35, 8), this.chromeMat);
    pole.position.set(0, 0.85, 0);
    const shade = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.26, 0.28, 12),
      new THREE.MeshStandardMaterial({ color: 0xffedd5, emissive: 0xffedd5, emissiveIntensity: 0.8 })
    );
    shade.position.set(0, 1.05, 0);
    stand.add(base, pole, shade);

    return stand;
  }

  // --- 2. LIVING ROOM FURNITURE ---
  public createSectionalSofa(): THREE.Group {
    const sofa = new THREE.Group();

    // Main Seating Base
    const base = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.38, 1.1), this.leatherMat);
    base.position.set(0, 0.19, 0);
    sofa.add(base);

    // Chaise extension
    const chaise = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.38, 1.4), this.leatherMat);
    chaise.position.set(1.05, 0.19, 1.2);
    sofa.add(chaise);

    // Backrest
    const back = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.65, 0.3), this.leatherMat);
    back.position.set(0, 0.65, -0.4);
    sofa.add(back);

    // Armrest
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.55, 1.1), this.leatherMat);
    arm.position.set(-1.45, 0.55, 0);
    sofa.add(arm);

    // Accent Pillows
    const pMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.8 });
    const p1 = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 0.12), pMat);
    p1.position.set(-1.1, 0.55, -0.2);
    p1.rotation.y = 0.2;
    sofa.add(p1);

    return sofa;
  }

  public createEntertainmentCenter(): THREE.Group {
    const unit = new THREE.Group();

    // Wooden Console Table
    const table = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.5, 0.6), this.darkWoodMat);
    table.position.y = 0.25;
    unit.add(table);

    // Widescreen 65" TV
    const tvStand = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.08, 0.35), this.chromeMat);
    tvStand.position.set(0, 0.54, 0);
    const tvFrame = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.25, 0.08), this.leatherMat);
    tvFrame.position.set(0, 1.2, 0);
    const tvScreen = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 1.15), this.screenMat);
    tvScreen.position.set(0, 1.2, 0.045);
    unit.add(tvStand, tvFrame, tvScreen);

    // Soundbar
    const soundbar = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.1, 0.12), this.leatherMat);
    soundbar.position.set(0, 0.56, 0.18);
    unit.add(soundbar);

    return unit;
  }

  public createCoffeeTable(): THREE.Group {
    const ct = new THREE.Group();
    const legs = [
      [-0.6, -0.3],
      [0.6, -0.3],
      [-0.6, 0.3],
      [0.6, 0.3]
    ];
    legs.forEach(([lx, lz]) => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.42, 8), this.chromeMat);
      leg.position.set(lx, 0.21, lz);
      ct.add(leg);
    });

    const glassTop = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.05, 0.8), this.glassMat);
    glassTop.position.y = 0.44;
    ct.add(glassTop);

    return ct;
  }

  // --- 3. KITCHEN APPLIANCES ---
  public createKitchenBar(): THREE.Group {
    const kitchen = new THREE.Group();

    // Granite Countertop Island
    const base = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.9, 1.0), this.whiteMat);
    base.position.set(0, 0.45, 0);
    const top = new THREE.Mesh(
      new THREE.BoxGeometry(2.7, 0.08, 1.1),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.2, metalness: 0.3 })
    );
    top.position.set(0, 0.94, 0);
    kitchen.add(base, top);

    // Stainless Steel Refrigerator
    const fridge = new THREE.Mesh(new THREE.BoxGeometry(1.0, 2.1, 0.9), this.chromeMat);
    fridge.position.set(-1.8, 1.05, 0);
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.6, 0.06), this.leatherMat);
    handle.position.set(-1.35, 1.2, 0.48);
    kitchen.add(fridge, handle);

    // Bar Stools (2 round stools)
    for (const sx of [-0.6, 0.6]) {
      const stool = new THREE.Group();
      const sLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.7, 8), this.chromeMat);
      sLeg.position.y = 0.35;
      const sSeat = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.1, 16), this.leatherMat);
      sSeat.position.y = 0.72;
      stool.add(sLeg, sSeat);
      stool.position.set(sx, 0, 0.85);
      kitchen.add(stool);
    }

    return kitchen;
  }

  // --- 4. LUXURY BATHROOM SHOWER ---
  public createShowerCabin(): THREE.Group {
    const shower = new THREE.Group();

    // Tile Floor Pan
    const tray = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.1, 1.4), this.whiteMat);
    tray.position.y = 0.05;
    shower.add(tray);

    // Glass Walls
    const wall1 = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.2, 0.05), this.glassMat);
    wall1.position.set(0, 1.15, -0.68);
    const wall2 = new THREE.Mesh(new THREE.BoxGeometry(0.05, 2.2, 1.4), this.glassMat);
    wall2.position.set(-0.68, 1.15, 0);
    shower.add(wall1, wall2);

    // Chrome Showerhead
    const head = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.04, 12), this.chromeMat);
    head.position.set(0, 2.1, 0);
    shower.add(head);

    return shower;
  }

  // --- 5. HOSPITAL CLINIC FURNITURE ---
  public createHospitalBed(): THREE.Group {
    const bed = new THREE.Group();

    // Wheeled Metal Frame
    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.45, 2.2), this.chromeMat);
    frame.position.y = 0.25;
    bed.add(frame);

    // Medical Mattress
    const mat = new THREE.Mesh(
      new THREE.BoxGeometry(1.15, 0.25, 2.1),
      new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.5 })
    );
    mat.position.y = 0.55;
    bed.add(mat);

    // Bed Rails
    const railL = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.45, 1.6), this.chromeMat);
    railL.position.set(-0.6, 0.7, 0);
    const railR = railL.clone();
    railR.position.x = 0.6;
    bed.add(railL, railR);

    // IV Drip Pole
    const iv = new THREE.Group();
    iv.position.set(0.85, 0, -0.9);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.9, 8), this.chromeMat);
    pole.position.y = 0.95;
    const bag = new THREE.Mesh(
      new THREE.BoxGeometry(0.15, 0.25, 0.08),
      new THREE.MeshPhysicalMaterial({ color: 0xffffff, transmission: 0.8, transparent: true, opacity: 0.7 })
    );
    bag.position.set(0, 1.8, 0.1);
    iv.add(pole, bag);
    bed.add(iv);

    return bed;
  }

  // --- 6. FUNCTIONAL ELEVATOR CABIN ---
  public createElevatorCabin(): {
    cabin: THREE.Group;
    doorLeft: THREE.Mesh;
    doorRight: THREE.Mesh;
    buttonPanel: THREE.Mesh;
    floorMesh: THREE.Mesh;
  } {
    const cabin = new THREE.Group();

    // Floor Platform
    const floorGeo = new THREE.BoxGeometry(3.0, 0.2, 3.0);
    const floorMesh = new THREE.Mesh(
      floorGeo,
      new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.3, metalness: 0.5 })
    );
    floorMesh.position.y = 0.1;
    cabin.add(floorMesh);

    // Ceiling with recessed warm light
    const ceiling = new THREE.Mesh(
      new THREE.BoxGeometry(3.0, 0.2, 3.0),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 })
    );
    ceiling.position.y = 2.9;
    const ceilingLight = new THREE.Mesh(
      new THREE.PlaneGeometry(1.2, 1.2),
      new THREE.MeshBasicMaterial({ color: 0xfffbeb, side: THREE.DoubleSide })
    );
    ceilingLight.rotation.x = Math.PI / 2;
    ceilingLight.position.y = 2.78;
    cabin.add(ceiling, ceilingLight);

    // Side and Back Metallic Walls
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.4, metalness: 0.7 });

    const backWall = new THREE.Mesh(new THREE.BoxGeometry(3.0, 2.8, 0.1), wallMat);
    backWall.position.set(0, 1.5, -1.45);

    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.8, 3.0), wallMat);
    leftWall.position.set(-1.45, 1.5, 0);

    const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.8, 3.0), wallMat);
    rightWall.position.set(1.45, 1.5, 0);

    cabin.add(backWall, leftWall, rightWall);

    // Sliding Front Doors (Left & Right)
    const doorMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.3, metalness: 0.85 });
    const doorGeo = new THREE.BoxGeometry(0.72, 2.7, 0.08);

    const doorLeft = new THREE.Mesh(doorGeo, doorMat);
    doorLeft.position.set(-0.38, 1.45, 1.45);

    const doorRight = new THREE.Mesh(doorGeo, doorMat);
    doorRight.position.set(0.38, 1.45, 1.45);

    cabin.add(doorLeft, doorRight);

    // Button Panel on Right Wall
    const panelMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.2, metalness: 0.9 });
    const buttonPanel = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.9, 0.35), panelMat);
    buttonPanel.position.set(1.38, 1.5, 0.4);
    cabin.add(buttonPanel);

    return { cabin, doorLeft, doorRight, buttonPanel, floorMesh };
  }

  // --- 7. ARCHITECTURAL MULTI-FLOOR STAIRCASES ---
  public createStaircase(width = 2.4, height = 6.0, depth = 8.0): THREE.Group {
    const stairs = new THREE.Group();
    const stepCount = 18;
    const stepHeight = height / stepCount;
    const stepDepth = depth / stepCount;

    const stepMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.5, metalness: 0.3 });
    const railMat = new THREE.MeshStandardMaterial({ color: 0xd1d5db, roughness: 0.2, metalness: 0.9 });

    // Step geometry
    for (let i = 0; i < stepCount; i++) {
      const step = new THREE.Mesh(new THREE.BoxGeometry(width, stepHeight, stepDepth * 1.1), stepMat);
      step.position.set(0, (i + 0.5) * stepHeight, (i + 0.5) * stepDepth - depth * 0.5);
      stairs.add(step);
    }

    // Handrail Posts & Bar
    for (const rx of [-width * 0.48, width * 0.48]) {
      const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, Math.hypot(height, depth), 8), railMat);
      rail.rotation.x = -Math.atan2(height, depth);
      rail.position.set(rx, height * 0.5 + 0.9, 0);
      stairs.add(rail);
    }

    return stairs;
  }

  // --- 8. ATM BANK MACHINE ---
  public createATM(): THREE.Group {
    const atm = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 1.8, 0.8),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4, metalness: 0.6 })
    );
    body.position.y = 0.9;

    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(0.55, 0.4),
      new THREE.MeshBasicMaterial({ color: 0x10b981 })
    );
    screen.position.set(0, 1.25, 0.41);

    const keypad = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.15, 0.15),
      new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.8 })
    );
    keypad.position.set(0, 0.95, 0.45);

    atm.add(body, screen, keypad);
    return atm;
  }

  // --- 9. GAS PUMP STATION ---
  public createGasPump(): THREE.Group {
    const pump = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(1.0, 2.2, 0.8),
      new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.3, metalness: 0.4 })
    );
    body.position.y = 1.1;

    const display = new THREE.Mesh(
      new THREE.PlaneGeometry(0.65, 0.45),
      new THREE.MeshBasicMaterial({ color: 0x0284c7 })
    );
    display.position.set(0, 1.45, 0.41);

    const nozzle = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.4, 0.15), this.chromeMat);
    nozzle.position.set(0.52, 1.2, 0);

    pump.add(body, display, nozzle);
    return pump;
  }
}

export const furnitureFactory = new FurnitureFactory();
