import { buildAmbulance, rules as ambulanceRules } from './ambulance';
import { buildMotorcycle, rules as motorcycleRules } from './motorcycle';
import { buildPoliceCar, rules as policeRules } from './police';
import { buildSedan, rules as sedanRules } from './sedan';
import { buildSportsCar, rules as sportsRules } from './sports';
import { buildSuv, rules as suvRules } from './suv';
import { buildTaxi, rules as taxiRules } from './taxi';
import { buildTruck, rules as truckRules } from './truck';
import { VehicleModelModule, VehicleType } from '../types';

const models: Record<VehicleType, VehicleModelModule> = {
  sports: { build: buildSportsCar, rules: sportsRules },
  police: { build: buildPoliceCar, rules: policeRules },
  sedan: { build: buildSedan, rules: sedanRules },
  suv: { build: buildSuv, rules: suvRules },
  truck: { build: buildTruck, rules: truckRules },
  motorcycle: { build: buildMotorcycle, rules: motorcycleRules },
  ambulance: { build: buildAmbulance, rules: ambulanceRules },
  taxi: { build: buildTaxi, rules: taxiRules }
};

export function createVehicleModel(type: VehicleType, colorHex: number) {
  return models[type].build(colorHex);
}

export function getVehicleRules(type: VehicleType) {
  return models[type].rules;
}
