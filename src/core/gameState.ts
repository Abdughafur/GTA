import { create } from 'zustand';
import { createJSONStorage, persist, StateStorage } from 'zustand/middleware';

export type GameScreen = 'loading' | 'title' | 'playing' | 'paused' | 'gameover' | 'credits';
export type WeatherType = 'sunny' | 'sunset' | 'night' | 'rain';
export type PhoneAppType =
  | 'home'
  | 'map'
  | 'messages'
  | 'contacts'
  | 'browser'
  | 'bank'
  | 'jobs'
  | 'garage'
  | 'music'
  | 'weather'
  | 'camera'
  | 'settings';

export type JobType = 'none' | 'taxi' | 'delivery' | 'paramedic' | 'mechanic';
export type InteriorType = 'outdoor' | 'apartment' | 'hospital' | 'mall' | 'garage' | 'bank';
export type WeaponType = 'fists' | 'knife' | 'pistol' | 'smg' | 'rifle';
export type CameraViewMode = 'third_chase' | 'third_close' | 'first_person';

export interface WeaponData {
  name: string;
  type: WeaponType;
  damage: number;
  fireRate: number; // shots per sec
  clip: number;
  maxClip: number;
  reserve: number;
  iconName: string;
}

export interface MissionData {
  id: string;
  title: string;
  client: string;
  description: string;
  reward: number;
  targetPos: [number, number, number];
  type: 'reach' | 'race' | 'steal' | 'evade' | 'delivery' | 'job';
  timeLimit?: number; // seconds
  damageLimit?: number; // %
  currentCheckpoint?: number;
  totalCheckpoints?: number;
  checkpoints?: [number, number, number][];
  storyChapter?: number;
  pickupPos?: [number, number, number];
  isPackagePickedUp?: boolean;
}

export interface MessageData {
  id: string;
  sender: string;
  avatar: string;
  text: string;
  time: string;
  missionId?: string;
  storyChapter?: number;
  read: boolean;
}

export interface BankTransaction {
  id: string;
  description: string;
  amount: number;
  type: 'credit' | 'debit';
  date: string;
}

export interface VehicleCustomization {
  paintColor: number;
  wheelType: number; // 0: alloy, 1: deep dish chrome, 2: carbon sport
  spoiler: boolean;
  neonUnderglow: boolean;
  neonColor: number;
  turboLevel: number; // 0, 1, 2
  tintLevel: number; // 0..1
}

export interface CharacterAppearance {
  jacketColor: number;
  pantsColor: number;
  shoesColor: number;
  hairStyle: number; // 0: crew, 1: fade, 2: slick, 3: dreads
  hairColor: number;
  glasses: boolean;
  hat: boolean;
  watch: boolean;
}

export interface JobPassenger {
  name: string;
  pickupPos: [number, number, number];
  dropPos: [number, number, number];
  fare: number;
  isPickedUp: boolean;
  timeRemaining: number;
}

export interface GameState {
  // Game lifecycle
  screen: GameScreen;
  setScreen: (screen: GameScreen) => void;
  loadingProgress: number;
  loadingMessage: string;
  setLoading: (progress: number, message: string) => void;

  // Player stats & Life Simulation
  health: number;
  maxHealth: number;
  armor: number;
  cash: number;
  reputation: number;
  drivingSkill: number;
  ownedProperties: string[];
  completedStoryMissions: string[];
  achievements: string[];
  storyChapter: number;
  factionStanding: { harbor: number; civic: number };
  pendingStoryChoice: { missionId: string; prompt: string } | null;
  chooseStoryPath: (choice: 'harbor' | 'civic') => void;
  purchaseProperty: (propertyId: string, price: number) => boolean;
  energy: number; // 0 to 100
  hunger: number; // 0 to 100 (100 is full, 0 is starving)
  thirst: number; // 0 to 100
  isSleeping: boolean;
  setHealth: (h: number) => void;
  damagePlayer: (amount: number) => void;
  healPlayer: (amount: number) => void;
  addCash: (amount: number) => void;
  spendCash: (amount: number) => boolean;
  sleep: (hours?: number) => void;
  eatFood: (amount?: number) => void;
  drinkBeverage: (amount?: number) => void;
  takeShower: () => void;
  updateNeeds: (dt: number) => void;

  // Character Customization
  appearance: CharacterAppearance;
  setAppearance: (updates: Partial<CharacterAppearance>) => void;
  isWardrobeOpen: boolean;
  setWardrobeOpen: (open: boolean) => void;

  // Driving & Vehicle System
  isInVehicle: boolean;
  currentVehicleName: string;
  vehicleSpeed: number; // MPH
  vehicleHealth: number;
  vehicleGear: number;
  vehicleRpm: number;
  vehicleFuel: number; // 0 to 100%
  vehicleOdometer: number; // Miles
  vehicleEngineTemp: number; // °F
  seatbeltFastened: boolean;
  vehicleCustomization: VehicleCustomization;
  setIsInVehicle: (inVeh: boolean, name?: string) => void;
  setVehicleStats: (speed: number, health: number, gear: number, rpm: number) => void;
  updateVehicleFuelAndOdometer: (dt: number, speed: number) => void;
  refuelVehicle: () => void;
  toggleSeatbelt: () => void;
  customizeVehicle: (updates: Partial<VehicleCustomization>) => void;

  // Police, Fines & Citations
  wantedLevel: number; // 0 to 5
  isEscapingHeat: boolean;
  heatCooldown: number; // seconds remaining
  unpaidFines: number;
  setWantedLevel: (level: number) => void;
  triggerCrime: (severity: number) => void;
  clearWantedLevel: () => void;
  addFine: (amount: number, reason: string) => void;
  payFines: () => boolean;

  // World, Weather & Interiors
  timeOfDay: number; // 0 to 24 hours
  weather: WeatherType;
  currentInterior: InteriorType;
  currentFloor: number;
  setTimeOfDay: (time: number) => void;
  setWeather: (w: WeatherType) => void;
  setCurrentInterior: (interior: InteriorType, floor?: number) => void;

  // Functional Elevator System
  elevatorFloor: number;
  elevatorTargetFloor: number;
  isElevatorMoving: boolean;
  elevatorDoorState: 'closed' | 'open' | 'opening' | 'closing';
  callElevator: (floor: number) => void;
  selectElevatorFloor: (floor: number) => void;
  setElevatorState: (floor: number, target: number, moving: boolean, doors: 'closed' | 'open' | 'opening' | 'closing') => void;

  // GPS & Navigation
  customWaypoint: [number, number, number] | null;
  setCustomWaypoint: (pos: [number, number, number] | null) => void;
  distanceToObjective: number;
  setDistanceToObjective: (dist: number) => void;

  // Active Mission & Jobs
  activeMission: MissionData | null;
  missionTimer: number; // seconds
  missionStatus: 'none' | 'active' | 'success' | 'failed';
  activeJob: JobType;
  jobScore: number;
  activePassenger: JobPassenger | null;
  startMission: (mission: MissionData) => void;
  updateMissionTimer: (dt: number) => void;
  completeMission: () => void;
  failMission: (reason?: string) => void;
  startJob: (job: JobType) => void;
  stopJob: () => void;
  setPassenger: (p: JobPassenger | null) => void;
  completeJobFare: (bonus?: number) => void;

  // AbduPhone 16 Pro System
  isPhoneOpen: boolean;
  activePhoneApp: PhoneAppType;
  phoneBattery: number; // 0 to 100%
  isPhoneCharging: boolean;
  isBatterySaver: boolean;
  isSilentMode: boolean;
  isPhoneLocked: boolean;
  wallpaper: 'sunset' | 'neon' | 'cyber' | 'downtown';
  ringtone: 'classic' | 'chime' | 'vibes' | 'synth';
  unreadMessagesCount: number;
  messages: MessageData[];
  transactions: BankTransaction[];
  openPhone: (app?: PhoneAppType) => void;
  closePhone: () => void;
  setPhoneApp: (app: PhoneAppType) => void;
  toggleBatterySaver: () => void;
  setPhoneCharging: (charging: boolean) => void;
  updatePhoneBattery: (dt: number) => void;
  setWallpaper: (wp: 'sunset' | 'neon' | 'cyber' | 'downtown') => void;
  setRingtone: (rt: 'classic' | 'chime' | 'vibes' | 'synth') => void;
  toggleSilentMode: () => void;
  setPhoneLocked: (locked: boolean) => void;
  receiveMessage: (msg: Omit<MessageData, 'id' | 'read' | 'time'>) => void;
  markMessagesRead: () => void;

  // Radio Station
  radioStation: number;
  radioStationNames: string[];
  nextRadioStation: () => void;

  // Audio & Settings
  isMuted: boolean;
  soundVolume: number;
  musicVolume: number;
  graphicsQuality: 'low' | 'medium' | 'high' | 'ultra';
  setMuted: (m: boolean) => void;
  setSoundVolume: (v: number) => void;
  setMusicVolume: (v: number) => void;
  setGraphicsQuality: (q: 'low' | 'medium' | 'high' | 'ultra') => void;

  // Interaction prompt & Notification toast
  interactionPrompt: string | null;
  notificationToast: string | null;
  setInteractionPrompt: (prompt: string | null) => void;
  showNotification: (msg: string) => void;

  // Stored player pos for UI sync (minimap/phone)
  playerPos: [number, number, number];
  playerHeading: number;
  setPlayerWorldTransform: (pos: [number, number, number], heading: number) => void;

  // Weapons, Combat & Camera View Mode
  currentWeapon: WeaponType;
  weapons: Record<WeaponType, WeaponData>;
  isAiming: boolean;
  damageVignette: number;
  cameraViewMode: CameraViewMode;
  helicopterInFlight: boolean;
  isInPlane: boolean;
  isInTrain: boolean;
  isCarjacking: boolean;
  isWasted: boolean;
  wastedTimer: number;
  selectWeapon: (w: WeaponType) => void;
  fireWeapon: () => boolean;
  reloadWeapon: () => void;
  setAiming: (aim: boolean) => void;
  triggerDamageFlash: () => void;
  cycleCameraMode: () => void;
  setHelicopterInFlight: (inFlight: boolean) => void;
  setIsInPlane: (inPlane: boolean) => void;
  setIsInTrain: (inTrain: boolean) => void;
  setIsCarjacking: (jacking: boolean) => void;
  triggerWasted: () => void;
  clearWasted: () => void;
  setWastedTimer: (t: number) => void;
}

let pendingSave: { name: string; value: string } | null = null;
let saveTimer: ReturnType<typeof setTimeout> | null = null;

const flushPendingSave = () => {
  if (!pendingSave) return;
  try {
    localStorage.setItem(pendingSave.name, pendingSave.value);
    pendingSave = null;
    saveTimer = null;
  } catch (error) {
    console.error('Unable to save BlockGTA progress to local storage.', error);
  }
};

const saveStorage: StateStorage = {
  getItem: (name) => localStorage.getItem(name),
  setItem: (name, value) => {
    pendingSave = { name, value };
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(flushPendingSave, 750);
  },
  removeItem: (name) => {
    if (saveTimer) clearTimeout(saveTimer);
    pendingSave = null;
    saveTimer = null;
    localStorage.removeItem(name);
  }
};

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', flushPendingSave);
}

export const useGameStore = create<GameState>()(persist((set, get) => ({
  screen: 'loading',
  setScreen: (screen) => set({ screen }),
  loadingProgress: 0,
  loadingMessage: 'Initializing GTA Block 3D Engine...',
  setLoading: (loadingProgress, loadingMessage) => set({ loadingProgress, loadingMessage }),

  // Player stats & Life simulation
  health: 100,
  maxHealth: 100,
  armor: 50,
  cash: 2500,
  reputation: 0,
  drivingSkill: 0,
  ownedProperties: [],
  completedStoryMissions: [],
  achievements: [],
  storyChapter: 1,
  factionStanding: { harbor: 0, civic: 0 },
  pendingStoryChoice: null,
  chooseStoryPath: (choice) => {
    const state = get();
    if (!state.pendingStoryChoice) return;
    const factionStanding = { ...state.factionStanding, [choice]: state.factionStanding[choice] + 1 };
    const pathName = choice === 'harbor' ? 'Harbor Crew' : 'Civic Office';
    set({ factionStanding, pendingStoryChoice: null });
    get().showNotification(`You backed the ${pathName}. Your contacts will remember.`);
  },
  purchaseProperty: (propertyId, price) => {
    if (get().ownedProperties.includes(propertyId)) return true;
    if (!get().spendCash(price)) return false;
    set((state) => ({ ownedProperties: [...state.ownedProperties, propertyId] }));
    get().showNotification('Property deed secured. A safe place in Vice Bay is yours.');
    return true;
  },
  energy: 100,
  hunger: 90,
  thirst: 90,
  isSleeping: false,
  setHealth: (health) => set({ health: Math.max(0, Math.min(100, health)) }),
  damagePlayer: (amount) => {
    const { health, armor, isWasted } = get();
    if (isWasted) return;
    get().triggerDamageFlash();
    let newHealth = health;
    if (armor > 0) {
      const remainingDamage = Math.max(0, amount - armor);
      newHealth = Math.max(0, health - remainingDamage);
      set({ armor: Math.max(0, armor - amount), health: newHealth });
    } else {
      newHealth = Math.max(0, health - amount);
      set({ health: newHealth });
    }
    if (newHealth <= 0) {
      get().triggerWasted();
    }
  },
  healPlayer: (amount) => set((s) => ({ health: Math.min(s.maxHealth, s.health + amount) })),
  addCash: (amount) =>
    set((s) => {
      const newCash = s.cash + amount;
      const newTx: BankTransaction = {
        id: Math.random().toString(36).substring(2, 9),
        description: amount > 0 ? 'Payout / Income' : 'Expense',
        amount,
        type: 'credit',
        date: 'Just now'
      };
      return { cash: newCash, transactions: [newTx, ...s.transactions] };
    }),
  spendCash: (amount) => {
    const { cash, transactions } = get();
    if (cash >= amount) {
      const newTx: BankTransaction = {
        id: Math.random().toString(36).substring(2, 9),
        description: 'Payment / Purchase',
        amount: -amount,
        type: 'debit',
        date: 'Just now'
      };
      set({ cash: cash - amount, transactions: [newTx, ...transactions] });
      return true;
    }
    return false;
  },

  sleep: (hours = 8) => {
    const s = get();
    const newTime = (s.timeOfDay + hours) % 24;
    set({
      isSleeping: true,
      timeOfDay: newTime,
      energy: 100,
      hunger: Math.max(20, s.hunger - 25),
      thirst: Math.max(20, s.thirst - 30)
    });
    setTimeout(() => {
      set({ isSleeping: false });
    }, 1500);
  },

  eatFood: (amount = 40) => {
    set((s) => ({
      hunger: Math.min(100, s.hunger + amount),
      health: Math.min(100, s.health + amount * 0.5)
    }));
  },

  drinkBeverage: (amount = 50) => {
    set((s) => ({
      thirst: Math.min(100, s.thirst + amount)
    }));
  },

  takeShower: () => {
    set((s) => ({
      energy: Math.min(100, s.energy + 15),
      health: Math.min(100, s.health + 10)
    }));
  },

  updateNeeds: (dt: number) => {
    set((s) => {
      // Energy drains faster while sprinting/driving
      const energyRate = 0.015;
      const hungerRate = 0.02;
      const thirstRate = 0.03;

      const newEnergy = Math.max(0, s.energy - energyRate * dt);
      const newHunger = Math.max(0, s.hunger - hungerRate * dt);
      const newThirst = Math.max(0, s.thirst - thirstRate * dt);

      // Starvation or severe dehydration slightly depletes health
      let healthDecay = 0;
      if (newHunger <= 0 || newThirst <= 0) {
        healthDecay = 0.5 * dt;
      }

      return {
        energy: newEnergy,
        hunger: newHunger,
        thirst: newThirst,
        health: Math.max(5, s.health - healthDecay)
      };
    });
  },

  // Character appearance
  appearance: {
    jacketColor: 0x2563eb,
    pantsColor: 0x1e293b,
    shoesColor: 0xffffff,
    hairStyle: 0,
    hairColor: 0x1f2937,
    glasses: true,
    hat: false,
    watch: true
  },
  setAppearance: (updates) =>
    set((s) => ({
      appearance: { ...s.appearance, ...updates }
    })),
  isWardrobeOpen: false,
  setWardrobeOpen: (isWardrobeOpen) => set({ isWardrobeOpen }),

  // Driving & Vehicle
  isInVehicle: false,
  currentVehicleName: 'Infernus GT',
  vehicleSpeed: 0,
  vehicleHealth: 100,
  vehicleGear: 1,
  vehicleRpm: 1000,
  vehicleFuel: 92,
  vehicleOdometer: 14.8,
  vehicleEngineTemp: 195,
  seatbeltFastened: true,
  vehicleCustomization: {
    paintColor: 0xdc2626,
    wheelType: 0,
    spoiler: true,
    neonUnderglow: false,
    neonColor: 0x38bdf8,
    turboLevel: 1,
    tintLevel: 0.5
  },
  setIsInVehicle: (isInVehicle, currentVehicleName = 'Infernus GT') => set({ isInVehicle, currentVehicleName }),
  setVehicleStats: (vehicleSpeed, vehicleHealth, vehicleGear, vehicleRpm) =>
    set({ vehicleSpeed, vehicleHealth, vehicleGear, vehicleRpm }),

  updateVehicleFuelAndOdometer: (dt: number, speedMph: number) => {
    set((s) => {
      if (!s.isInVehicle || Math.abs(speedMph) < 0.5) return {};
      // Fuel consumption formula
      const fuelBurn = (0.04 + (s.vehicleRpm / 6500) * 0.12) * dt;
      const newFuel = Math.max(0, s.vehicleFuel - fuelBurn);

      // Odometer accumulation
      const milesTraveled = (Math.abs(speedMph) / 3600) * dt;
      const newOdo = s.vehicleOdometer + milesTraveled;

      return {
        vehicleFuel: newFuel,
        vehicleOdometer: Math.round(newOdo * 10) / 10
      };
    });
  },

  refuelVehicle: () => {
    set({ vehicleFuel: 100 });
  },

  toggleSeatbelt: () => set((s) => ({ seatbeltFastened: !s.seatbeltFastened })),

  customizeVehicle: (updates) =>
    set((s) => ({
      vehicleCustomization: { ...s.vehicleCustomization, ...updates }
    })),

  // Police & Fines
  wantedLevel: 0,
  isEscapingHeat: false,
  heatCooldown: 0,
  unpaidFines: 0,
  setWantedLevel: (wantedLevel) => set({ wantedLevel: Math.max(0, Math.min(5, wantedLevel)) }),
  triggerCrime: (severity) => {
    const current = get().wantedLevel;
    const next = Math.min(5, Math.max(current + 1, severity));
    set({ wantedLevel: next, isEscapingHeat: false, heatCooldown: 20 });
  },
  clearWantedLevel: () => set({ wantedLevel: 0, isEscapingHeat: false, heatCooldown: 0 }),
  addFine: (amount, reason) =>
    set((s) => {
      const nextFines = s.unpaidFines + amount;
      s.showNotification(`Traffic Citation: ${reason} (+$${amount})`);
      return { unpaidFines: nextFines };
    }),
  payFines: () => {
    const { unpaidFines, cash } = get();
    if (unpaidFines > 0 && cash >= unpaidFines) {
      get().spendCash(unpaidFines);
      set({ unpaidFines: 0 });
      get().showNotification('All outstanding traffic fines paid!');
      return true;
    }
    return false;
  },

  // World & Interiors
  timeOfDay: 14.5,
  weather: 'sunny',
  currentInterior: 'outdoor',
  currentFloor: 1,
  setTimeOfDay: (timeOfDay) => set({ timeOfDay }),
  setWeather: (weather) => set({ weather }),
  setCurrentInterior: (currentInterior, currentFloor = 1) => set({ currentInterior, currentFloor }),

  // Elevator System
  elevatorFloor: 1,
  elevatorTargetFloor: 1,
  isElevatorMoving: false,
  elevatorDoorState: 'closed',
  callElevator: (floor) => {
    const { elevatorFloor, elevatorDoorState } = get();
    if (elevatorFloor === floor) {
      set({ elevatorDoorState: 'open' });
      setTimeout(() => set({ elevatorDoorState: 'closed' }), 4000);
      return;
    }
    set({
      elevatorTargetFloor: floor,
      isElevatorMoving: true,
      elevatorDoorState: 'closed'
    });
  },
  selectElevatorFloor: (floor) => {
    set({
      elevatorTargetFloor: floor,
      isElevatorMoving: true,
      elevatorDoorState: 'closed'
    });
  },
  setElevatorState: (elevatorFloor, elevatorTargetFloor, isElevatorMoving, elevatorDoorState) =>
    set({ elevatorFloor, elevatorTargetFloor, isElevatorMoving, elevatorDoorState }),

  // GPS & Waypoint
  customWaypoint: null,
  setCustomWaypoint: (customWaypoint) => set({ customWaypoint }),
  distanceToObjective: 0,
  setDistanceToObjective: (distanceToObjective) => set({ distanceToObjective }),

  // Missions & Jobs
  activeMission: null,
  missionTimer: 0,
  missionStatus: 'none',
  activeJob: 'none',
  jobScore: 0,
  activePassenger: null,
  startMission: (mission) =>
    set({
      activeMission: mission,
      missionTimer: mission.timeLimit || 0,
      missionStatus: 'active',
      customWaypoint: null
    }),
  updateMissionTimer: (dt) => {
    const { activeMission, missionTimer } = get();
    if (activeMission && activeMission.timeLimit && missionTimer > 0) {
      const next = Math.max(0, missionTimer - dt);
      set({ missionTimer: next });
      if (next <= 0) {
        get().failMission('Time expired!');
      }
    }
  },
  completeMission: () => {
    const { activeMission } = get();
    if (activeMission) {
      const state = get();
      const [x, , z] = activeMission.targetPos;
      const rushHour = (state.timeOfDay >= 7 && state.timeOfDay <= 9) ||
        (state.timeOfDay >= 16 && state.timeOfDay <= 18);
      const districtBonus = x < -50 && z > 60 ? 1.08 : x > 40 && z < -20 ? 1.05 : 1;
      const alignedStanding = /Mika Reyes|Rafi Cole/.test(activeMission.client)
        ? state.factionStanding.harbor
        : /Nora Vale|Old Ben Carter/.test(activeMission.client)
          ? state.factionStanding.civic
          : Math.max(state.factionStanding.harbor, state.factionStanding.civic);
      const factionBonus = alignedStanding * 0.05;
      const payout = Math.round(activeMission.reward * districtBonus * (rushHour ? 1.08 : 1) * (1 + factionBonus));
      get().addCash(payout);

      const updates: Partial<GameState> = { missionStatus: 'success', activeMission: null };
      if (activeMission.storyChapter !== undefined) {
        const completedStoryMissions = state.completedStoryMissions.includes(activeMission.id)
          ? state.completedStoryMissions
          : [...state.completedStoryMissions, activeMission.id];
        const achievements = new Set(state.achievements);
        achievements.add('first-contract');
        if (completedStoryMissions.length >= 3) achievements.add('vice-bay-regular');
        if (completedStoryMissions.length >= 8) achievements.add('vice-bay-legend');
        updates.completedStoryMissions = completedStoryMissions;
        updates.achievements = [...achievements];
        updates.reputation = state.reputation + 10 + activeMission.storyChapter * 2;
        updates.storyChapter = Math.max(state.storyChapter, activeMission.storyChapter + 1);
        if (activeMission.type === 'race') {
          updates.drivingSkill = Math.min(100, state.drivingSkill + 5);
        }
        if (activeMission.storyChapter === 3) {
          updates.pendingStoryChoice = {
            missionId: activeMission.id,
            prompt: 'The ledger proves both the harbor union and the city contractor made illegal deals. Who gets your trust?'
          };
        }
      } else if (activeMission.type === 'race') {
        updates.drivingSkill = Math.min(100, state.drivingSkill + 3);
      }

      set(updates);
      get().showNotification(`Mission complete · +$${payout.toLocaleString()} · Reputation +${activeMission.storyChapter === undefined ? 0 : 10 + activeMission.storyChapter * 2}`);
    }
  },
  failMission: (_reason) => {
    set({ missionStatus: 'failed', activeMission: null });
    get().showNotification('Mission Failed!');
  },

  startJob: (job) => {
    set({ activeJob: job, activeMission: null });
    const jobTitles: Record<JobType, string> = {
      none: 'Off Duty',
      taxi: 'Taxi Driver',
      delivery: 'Fast Courier',
      paramedic: 'Emergency Paramedic',
      mechanic: 'Mobile Mechanic'
    };
    get().showNotification(`Clocked in as: ${jobTitles[job]}`);
  },
  stopJob: () => {
    set({ activeJob: 'none', activePassenger: null });
    get().showNotification('Clocked out from job.');
  },
  setPassenger: (activePassenger) => set({ activePassenger }),
  completeJobFare: (bonus = 0) => {
    const { activePassenger, jobScore } = get();
    if (activePassenger) {
      const totalFare = activePassenger.fare + bonus;
      get().addCash(totalFare);
      set({
        activePassenger: null,
        jobScore: jobScore + 1
      });
      get().showNotification(`Fare Completed! +$${totalFare} (Ratings: 5.0 ★)`);
    }
  },

  // AbduPhone 16 Pro
  isPhoneOpen: false,
  activePhoneApp: 'home',
  phoneBattery: 95,
  isPhoneCharging: false,
  isBatterySaver: false,
  isSilentMode: false,
  isPhoneLocked: false,
  wallpaper: 'sunset',
  ringtone: 'classic',
  unreadMessagesCount: 2,
  messages: [
    {
      id: 'm1',
      sender: 'Vinnie (The Fixer)',
      avatar: 'V',
      text: 'Yo, welcome to Vice Bay. Downtown is packed with opportunity. Check your map and head over to the safehouse when ready.',
      time: '12:04 PM',
      read: false
    },
    {
      id: 'm2',
      sender: 'T-Bone Racing',
      avatar: 'T',
      text: 'Got a fast set of wheels? Meet me at the Grand Financial Plaza for the Neon Sprint race. Cash reward guaranteed.',
      time: '12:15 PM',
      missionId: 'm_race',
      read: false
    },
    {
      id: 's1',
      sender: 'Mika Reyes',
      avatar: 'M',
      text: 'I know a place by the plaza fountain. Come alone; I have a lead that could keep you afloat.',
      time: '1:08 PM',
      missionId: 'story_01',
      storyChapter: 1,
      read: false
    },
    {
      id: 's2',
      sender: 'Mika Reyes',
      avatar: 'M',
      text: 'The harbor office needs its ledger back before shift change. Keep it dry and keep moving.',
      time: '1:22 PM',
      missionId: 'story_02',
      storyChapter: 2,
      read: false
    },
    {
      id: 's3',
      sender: 'Rafi Cole',
      avatar: 'R',
      text: 'The crate is ready for the service bay. There is a duplicate ledger page tucked inside; it could implicate both sides.',
      time: '8:40 PM',
      missionId: 'story_03',
      storyChapter: 3,
      read: false
    },
    {
      id: 's4',
      sender: 'Nora Vale',
      avatar: 'N',
      text: 'Night shift at the airport. Meet me by the terminal; the envelope cannot wait until morning.',
      time: '10:15 PM',
      missionId: 'story_04',
      storyChapter: 4,
      read: false
    },
    {
      id: 's5',
      sender: 'Old Ben Carter',
      avatar: 'B',
      text: 'The animals are wandering near the south fence again. Could you check the gate for me?',
      time: '6:10 AM',
      missionId: 'story_05',
      storyChapter: 5,
      read: false
    },
    {
      id: 's6',
      sender: 'T-Bone Racing',
      avatar: 'T',
      text: 'Low tide, clear road. Four checkpoints around the marina. Bring me the timing chip.',
      time: '11:30 PM',
      missionId: 'story_06',
      storyChapter: 6,
      read: false
    },
    {
      id: 's7',
      sender: 'Mika Reyes',
      avatar: 'M',
      text: 'Nora’s envelope names the people behind the harbor deal. Bring it to the old courthouse archive; keep it out of the wrong hands.',
      time: '12:02 AM',
      missionId: 'story_07',
      storyChapter: 7,
      read: false
    },
    {
      id: 's8',
      sender: 'Nora Vale',
      avatar: 'N',
      text: 'The broadcast tower goes live at dawn. Get the evidence there before the city can bury it.',
      time: '5:32 AM',
      missionId: 'story_08',
      storyChapter: 8,
      read: false
    }
  ],
  transactions: [
    { id: 't1', description: 'Starting Capital', amount: 2500, type: 'credit', date: 'Today' }
  ],
  openPhone: (app = 'home') => set({ isPhoneOpen: true, activePhoneApp: app }),
  closePhone: () => set({ isPhoneOpen: false, activePhoneApp: 'home' }),
  setPhoneApp: (activePhoneApp) => set({ activePhoneApp }),
  toggleBatterySaver: () => set((s) => ({ isBatterySaver: !s.isBatterySaver })),
  setPhoneCharging: (isPhoneCharging) => set({ isPhoneCharging }),
  updatePhoneBattery: (dt: number) => {
    set((s) => {
      if (s.isPhoneCharging) {
        return { phoneBattery: Math.min(100, s.phoneBattery + dt * 2.5) };
      }
      const drainMultiplier = s.isBatterySaver ? 0.008 : 0.018;
      const activeDrain = s.isPhoneOpen ? drainMultiplier * 1.8 : drainMultiplier;
      return { phoneBattery: Math.max(0, s.phoneBattery - activeDrain * dt) };
    });
  },
  setWallpaper: (wallpaper) => set({ wallpaper }),
  setRingtone: (ringtone) => set({ ringtone }),
  toggleSilentMode: () => set((s) => ({ isSilentMode: !s.isSilentMode })),
  setPhoneLocked: (isPhoneLocked) => set({ isPhoneLocked }),
  receiveMessage: (msg) => {
    const newMsg: MessageData = {
      ...msg,
      id: Math.random().toString(36).substring(2, 9),
      time: 'Just now',
      read: false
    };
    set((s) => ({
      messages: [newMsg, ...s.messages],
      unreadMessagesCount: s.unreadMessagesCount + 1
    }));
  },
  markMessagesRead: () =>
    set((s) => ({
      unreadMessagesCount: 0,
      messages: s.messages.map((m) => ({ ...m, read: true }))
    })),

  // Radio Station
  radioStation: 0,
  radioStationNames: [
    'Flash FM (Pop & Synth)',
    'Wave 103 (80s Retrowave)',
    'K-JAH Bay (Dub & Reggae)',
    'Radio Los Santos (Hip-Hop)',
    'Off'
  ],
  nextRadioStation: () =>
    set((s) => ({
      radioStation: (s.radioStation + 1) % s.radioStationNames.length
    })),

  // Audio & Settings
  isMuted: false,
  soundVolume: 0.8,
  musicVolume: 0.6,
  graphicsQuality: 'high',
  setMuted: (isMuted) => set({ isMuted }),
  setSoundVolume: (soundVolume) => set({ soundVolume }),
  setMusicVolume: (musicVolume) => set({ musicVolume }),
  setGraphicsQuality: (graphicsQuality) => set({ graphicsQuality }),

  interactionPrompt: null,
  notificationToast: null,
  setInteractionPrompt: (interactionPrompt) => set({ interactionPrompt }),
  showNotification: (notificationToast) => {
    set({ notificationToast });
    setTimeout(() => {
      if (get().notificationToast === notificationToast) {
        set({ notificationToast: null });
      }
    }, 3200);
  },

  playerPos: [-10, 0, 25],
  playerHeading: 0,
  setPlayerWorldTransform: (playerPos, playerHeading) => set({ playerPos, playerHeading }),

  // Weapons, Combat & Camera View Mode
  currentWeapon: 'pistol',
  weapons: {
    fists: {
      name: 'Unarmed / Fists',
      type: 'fists',
      damage: 25,
      fireRate: 2.2,
      clip: 1,
      maxClip: 1,
      reserve: 0,
      iconName: 'hand'
    },
    knife: {
      name: 'Combat Knife',
      type: 'knife',
      damage: 45,
      fireRate: 1.8,
      clip: 1,
      maxClip: 1,
      reserve: 0,
      iconName: 'sword'
    },
    pistol: {
      name: '9mm Combat Pistol',
      type: 'pistol',
      damage: 38,
      fireRate: 3.5,
      clip: 15,
      maxClip: 15,
      reserve: 90,
      iconName: 'crosshair'
    },
    smg: {
      name: 'Micro SMG 9mm',
      type: 'smg',
      damage: 26,
      fireRate: 8.5,
      clip: 30,
      maxClip: 30,
      reserve: 180,
      iconName: 'zap'
    },
    rifle: {
      name: 'Assault Carbine',
      type: 'rifle',
      damage: 55,
      fireRate: 6.0,
      clip: 30,
      maxClip: 30,
      reserve: 120,
      iconName: 'shield'
    }
  },
  isAiming: false,
  damageVignette: 0,
  cameraViewMode: 'third_chase',
  helicopterInFlight: false,

  selectWeapon: (w) => set({ currentWeapon: w }),
  fireWeapon: () => {
    const { currentWeapon, weapons } = get();
    const cur = weapons[currentWeapon];
    if (currentWeapon === 'fists' || currentWeapon === 'knife') return true;

    if (cur.clip > 0) {
      const nextWeapons = {
        ...weapons,
        [currentWeapon]: { ...cur, clip: cur.clip - 1 }
      };
      set({ weapons: nextWeapons });
      return true;
    } else {
      // Auto-reload if clip is 0 and reserve > 0
      get().reloadWeapon();
      return false;
    }
  },
  reloadWeapon: () => {
    const { currentWeapon, weapons } = get();
    const cur = weapons[currentWeapon];
    if (cur.clip >= cur.maxClip || cur.reserve <= 0) return;

    const needed = cur.maxClip - cur.clip;
    const toLoad = Math.min(needed, cur.reserve);
    const nextWeapons = {
      ...weapons,
      [currentWeapon]: {
        ...cur,
        clip: cur.clip + toLoad,
        reserve: cur.reserve - toLoad
      }
    };
    set({ weapons: nextWeapons });
  },
  setAiming: (isAiming) => set({ isAiming }),
  triggerDamageFlash: () => {
    set({ damageVignette: 1.0 });
    setTimeout(() => set({ damageVignette: 0 }), 300);
  },
  cycleCameraMode: () => {
    const modes: CameraViewMode[] = ['third_chase', 'third_close', 'first_person'];
    const curIdx = modes.indexOf(get().cameraViewMode);
    const nextMode = modes[(curIdx + 1) % modes.length];
    set({ cameraViewMode: nextMode });
  },
  isInPlane: false,
  isInTrain: false,
  isCarjacking: false,
  isWasted: false,
  wastedTimer: 0,
  setIsInPlane: (isInPlane) => set({ isInPlane }),
  setIsInTrain: (isInTrain) => set({ isInTrain }),
  setIsCarjacking: (isCarjacking) => set({ isCarjacking }),
  triggerWasted: () => {
    set({ isWasted: true, wastedTimer: 3.0 });
  },
  clearWasted: () => {
    set({ isWasted: false, health: 100, armor: 0, wantedLevel: 0, cash: Math.max(0, get().cash - 200) });
  },
  setWastedTimer: (wastedTimer) => set({ wastedTimer }),
  setHelicopterInFlight: (helicopterInFlight) => set({ helicopterInFlight })
}), {
  name: 'blockgta-save',
  version: 1,
  storage: createJSONStorage(() => saveStorage),
  partialize: (state) => ({
    health: state.health,
    armor: state.armor,
    cash: state.cash,
    energy: state.energy,
    hunger: state.hunger,
    thirst: state.thirst,
    appearance: state.appearance,
    vehicleCustomization: state.vehicleCustomization,
    timeOfDay: state.timeOfDay,
    weather: state.weather,
    playerPos: state.playerPos,
    playerHeading: state.playerHeading,
    graphicsQuality: state.graphicsQuality,
    soundVolume: state.soundVolume,
    musicVolume: state.musicVolume,
    isMuted: state.isMuted,
    transactions: state.transactions,
    reputation: state.reputation,
    drivingSkill: state.drivingSkill,
    ownedProperties: state.ownedProperties,
    completedStoryMissions: state.completedStoryMissions,
    achievements: state.achievements,
    storyChapter: state.storyChapter,
    factionStanding: state.factionStanding,
    pendingStoryChoice: state.pendingStoryChoice
  })
}));
