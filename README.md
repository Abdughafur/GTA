# BlockGTA

A 3D open-world action game built with React, TypeScript, Three.js, and Vite.

## Requirements

- Node.js 20.19+ or 22.12+
- npm

## Run locally

```bash
npm install
npm run dev
```

## Checks

```bash
npm run lint
npm run build
```

## Architecture

- `src/core/Game.ts` owns the Three.js renderer, the fixed-step simulation loop, input, and system updates.
- `src/core/gameState.ts` is the Zustand state store. A versioned, debounced browser save keeps player needs, cash, appearance, world time/weather, settings, and last position between visits.
- `src/world/` builds the city, interiors, environment, procedural assets, and transit.
- `src/vehicles/` contains vehicle rules, simulation, and per-class procedural models.
- `src/ai/` contains traffic, pedestrian, police, and farm-animal simulation.
- `src/missions/` contains mission objectives and waypoint handling.
- `src/ui/` contains the HUD, pause menu, and in-game phone.

The simulation advances in 1/60-second steps, capped at six catch-up steps per rendered frame. Graphics presets control render resolution and shadow availability; software renderers keep shadows disabled.

## Current scope

The project is a playable prototype, not a finished open-world production. It currently has a compact city, traffic and pedestrian AI, police pursuits, jobs, interiors, aircraft/transit, farm animals, weather/time controls, a phone, and browser autosave. Roads have batched lane markings and synchronized two-axis traffic signals that traffic AI obeys; rush hour changes traffic pacing. A scheduled spline-route city bus serves four shelters, alongside the existing spline-loop metro. Vehicle handling uses the custom fixed-step simulation rather than Rapier or a physics worker; supported classes include sports cars, sedans, SUVs, trucks, motorcycles, taxis, police cars, and ambulances. The handling model includes class-specific mass/grip/suspension, independent four-wheel spring and spin response with front-wheel steering, tire condition, ABS/ESP assists, and render interpolation. The phone inbox drives an eight-chapter story with sequential unlocks, a faction choice, pickup/drop-off missions, reputation, driving skill, achievements, and mission rewards that vary by time and district. Players can also buy a starter studio and pay for vehicle upgrades. Full terrain-dependent grip, roundabouts, functional ramps/bridges, multi-storey parking, race-circuit facilities, additional vehicle classes, and a large streamed world remain future work.
