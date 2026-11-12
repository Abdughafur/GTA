import * as THREE from 'three';
import { MissionData, useGameStore } from '../core/gameState';
import { audioManager } from '../core/AudioManager';

export class MissionManager {
  private scene: THREE.Scene;
  private waypointGroup: THREE.Group;
  private beaconMesh: THREE.Mesh;
  private ringMesh: THREE.Mesh;

  public availableMissions: MissionData[] = [
    {
      id: 'm_welcome',
      title: 'Welcome to Vice Bay',
      client: 'Vinnie (The Fixer)',
      description: 'Grab a fast ride and report to the Downtown Plaza safehouse.',
      reward: 1200,
      targetPos: [-10, 0, -40],
      type: 'reach'
    },
    {
      id: 'm_race',
      title: 'Neon Sprint Grand Prix',
      client: 'T-Bone Racing',
      description: 'Hit all 5 checkpoints across the city before time runs out!',
      reward: 2800,
      targetPos: [-10, 0, -140],
      type: 'race',
      timeLimit: 75,
      currentCheckpoint: 0,
      totalCheckpoints: 5,
      checkpoints: [
        [-10, 0, -140],
        [140, 0, -140],
        [140, 0, 60],
        [-160, 0, 60],
        [-10, 0, -40]
      ]
    },
    {
      id: 'm_steal',
      title: 'Showroom Heist',
      client: 'Agent Miller',
      description: 'Infiltrate Legendary Motors, grab the sports car, and deliver it to the Docks.',
      reward: 4500,
      targetPos: [-110, 0, 160],
      type: 'steal',
      damageLimit: 40
    },
    {
      id: 'm_evade',
      title: 'Outrun the Heat',
      client: 'Anonymous Caller',
      description: 'Survive the 3-star police manhunt and reach Pay & Spray to clear heat.',
      reward: 3500,
      targetPos: [110, 0, 28],
      type: 'evade',
      timeLimit: 60
    },
    {
      id: 'story_01',
      title: 'A Favor at First Light',
      client: 'Mika Reyes',
      description: 'Meet Mika beside the Grand Financial Plaza fountain. She has a lead on steady work.',
      reward: 900,
      targetPos: [128, 0, 10],
      type: 'reach',
      storyChapter: 1
    },
    {
      id: 'story_02',
      title: 'The Harbor Ledger',
      client: 'Mika Reyes',
      description: 'Take the ledger to the dock office before the night shift changes.',
      reward: 1400,
      targetPos: [-110, 0, 160],
      type: 'delivery',
      timeLimit: 150,
      pickupPos: [128, 0, 10],
      storyChapter: 2
    },
    {
      id: 'story_03',
      title: 'Parts After Dark',
      client: 'Rafi Cole',
      description: 'Deliver the boxed garage parts to Pay ‘n’ Spray. A duplicate ledger page hidden in the crate could implicate both sides.',
      reward: 1100,
      targetPos: [110, 0, 28],
      type: 'delivery',
      timeLimit: 120,
      pickupPos: [-110, 0, 160],
      storyChapter: 3
    },
    {
      id: 'story_04',
      title: 'Runway Frequency',
      client: 'Nora Vale',
      description: 'Meet the night dispatcher at Northgate International Airport and collect the flight envelope.',
      reward: 1700,
      targetPos: [0, 0, -3366],
      type: 'reach',
      storyChapter: 4
    },
    {
      id: 'story_05',
      title: 'County Line',
      client: 'Old Ben Carter',
      description: 'Check the farm gate and make sure Ben’s livestock made it back to the barn.',
      reward: 1250,
      targetPos: [332, 0, 125],
      type: 'reach',
      timeLimit: 180,
      storyChapter: 5
    },
    {
      id: 'story_06',
      title: 'Low Tide, High Stakes',
      client: 'T-Bone Racing',
      description: 'Run the marina route. Hit each checkpoint cleanly and bring back the timing chip.',
      reward: 3200,
      targetPos: [90, 0, 180],
      type: 'race',
      timeLimit: 120,
      currentCheckpoint: 0,
      totalCheckpoints: 4,
      checkpoints: [
        [90, 0, 180],
        [160, 0, 160],
        [160, 0, 260],
        [20, 0, 260]
      ],
      storyChapter: 6
    },
    {
      id: 'story_07',
      title: 'The Names on the Wall',
      client: 'Mika Reyes',
      description: 'Bring the airport envelope to the old courthouse archive and learn who ordered the harbor deal.',
      reward: 2100,
      targetPos: [48, 0, 40],
      type: 'delivery',
      timeLimit: 150,
      pickupPos: [0, 0, -3366],
      storyChapter: 7
    },
    {
      id: 'story_08',
      title: 'Vice Bay, Your Call',
      client: 'Nora Vale',
      description: 'Beat the dawn traffic to the broadcast tower. Get the evidence on air before it disappears.',
      reward: 4200,
      targetPos: [128, 0, 10],
      type: 'race',
      timeLimit: 150,
      currentCheckpoint: 0,
      totalCheckpoints: 4,
      checkpoints: [
        [128, 0, 10],
        [110, 0, 28],
        [-110, 0, 160],
        [48, 0, 40]
      ],
      storyChapter: 8
    }
  ];

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    // 3D Waypoint Visual Marker (Glowing transparent cylinder + pulsating ground ring)
    this.waypointGroup = new THREE.Group();

    const beaconGeo = new THREE.CylinderGeometry(2.5, 2.5, 32, 16, 1, true);
    const beaconMat = new THREE.MeshBasicMaterial({
      color: 0xfacc15,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    this.beaconMesh = new THREE.Mesh(beaconGeo, beaconMat);
    this.beaconMesh.position.y = 16;
    this.waypointGroup.add(this.beaconMesh);

    const ringGeo = new THREE.RingGeometry(3.0, 4.2, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xfacc15,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide
    });
    this.ringMesh = new THREE.Mesh(ringGeo, ringMat);
    this.ringMesh.rotation.x = -Math.PI / 2;
    this.ringMesh.position.y = 0.08;
    this.waypointGroup.add(this.ringMesh);

    this.waypointGroup.visible = false;
    this.scene.add(this.waypointGroup);
  }

  public update(playerPos: THREE.Vector3, dt: number) {
    const store = useGameStore.getState();
    const active = store.activeMission;
    const customWaypoint = store.customWaypoint;

    // Determine target position: Active mission target OR Custom GPS waypoint
    let target: [number, number, number] | null = null;
    let targetColor = 0xfacc15; // Yellow for missions

    if (active) {
      if (active.type === 'delivery' && active.pickupPos && !active.isPackagePickedUp) {
        target = active.pickupPos;
      } else if (active.type === 'race' && active.checkpoints && active.currentCheckpoint !== undefined) {
        target = active.checkpoints[active.currentCheckpoint];
      } else {
        target = active.targetPos;
      }
      targetColor = 0xfacc15;
    } else if (customWaypoint) {
      target = customWaypoint;
      targetColor = 0x38bdf8; // Cyan for custom GPS
    }

    if (!target) {
      this.waypointGroup.visible = false;
      store.setDistanceToObjective(0);
      return;
    }

    this.waypointGroup.visible = true;
    this.waypointGroup.position.set(target[0], 0, target[2]);

    (this.beaconMesh.material as THREE.MeshBasicMaterial).color.setHex(targetColor);
    (this.ringMesh.material as THREE.MeshBasicMaterial).color.setHex(targetColor);

    // Rotate and pulse
    this.beaconMesh.rotation.y += dt * 1.5;
    const pulse = 1.0 + Math.sin(Date.now() * 0.006) * 0.15;
    this.ringMesh.scale.set(pulse, pulse, pulse);

    // Calculate distance
    const dist = Math.hypot(playerPos.x - target[0], playerPos.z - target[2]);
    store.setDistanceToObjective(Math.round(dist));

    // Update mission timer
    store.updateMissionTimer(dt);

    // Checkpoint / Objective Reach Detection (< 8m)
    if (dist < 8.0) {
      if (active) {
        if (active.type === 'delivery' && active.pickupPos && !active.isPackagePickedUp) {
          useGameStore.setState({ activeMission: { ...active, isPackagePickedUp: true } });
          store.showNotification('Package collected. Deliver it to the marked drop-off.');
          audioManager.playPhoneBeep();
        } else if (active.type === 'race' && active.checkpoints && active.currentCheckpoint !== undefined) {
          active.currentCheckpoint++;
          audioManager.playCashRegister();
          if (active.currentCheckpoint >= active.checkpoints.length) {
            // Race finished!
            store.completeMission();
            audioManager.playCashRegister();
          } else {
            // Next checkpoint
            useGameStore.setState({ activeMission: { ...active } });
          }
        } else {
          // Objective completed!
          store.completeMission();
          audioManager.playCashRegister();
        }
      } else if (customWaypoint) {
        // Reached custom GPS waypoint
        store.setCustomWaypoint(null);
        audioManager.playPhoneBeep();
      }
    }
  }

  public startMissionById(id: string) {
    const mission = this.availableMissions.find((m) => m.id === id);
    const store = useGameStore.getState();
    if (mission && mission.storyChapter !== undefined && mission.storyChapter > store.storyChapter) {
      store.showNotification(`Complete Chapter ${store.storyChapter} first to unlock this lead.`);
      return;
    }
    if (mission && store.pendingStoryChoice) {
      store.showNotification('Choose who to trust before taking the next story lead.');
      return;
    }
    if (mission && store.completedStoryMissions.includes(mission.id)) {
      store.showNotification('This story lead is already behind you. Check your next unlocked message.');
      return;
    }
    if (mission && !store.activeMission) {
      store.startMission({ ...mission, isPackagePickedUp: false });
      audioManager.playCashRegister();
      if (mission.type === 'evade') {
        store.triggerCrime(3);
      }
    } else if (mission) {
      store.showNotification('Finish or abandon your active mission before taking another contract.');
    }
  }
}
