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

The project is a playable prototype, not a finished open-world production. It has a 100,000-by-100,000-meter terrain with streamed 200-meter districts around the player and simplified distant building LODs. Deterministic rolling hills, climbable terrain, sparse dirt roads, named rural villages, fenced home yards, gates, a few country castles, shops, bars, football pitches, and varied homes surround the central city's asphalt streets, skyline, beach, waterfront, and drivable harbor bridge. The phone map covers the full world. District styling and signage vary across the university, stadium, old market, military, villa, park, castle, mountain, countryside, and existing city areas. The game also has traffic and pedestrian AI, police pursuits, jobs, interiors, aircraft/transit, farm animals, weather/time controls, a phone, and browser autosave. Roads have batched lane markings and synchronized two-axis traffic signals that traffic AI obeys; rush hour changes traffic pacing. A scheduled spline-route city bus serves four shelters, alongside the existing spline-loop metro. Vehicle handling uses the custom fixed-step simulation rather than Rapier or a physics worker; supported classes include sports cars, sedans, SUVs, trucks, motorcycles, taxis, police cars, and ambulances. The handling model includes class-specific mass/grip/suspension, independent four-wheel spring and spin response with front-wheel steering, tire condition, ABS/ESP assists, and render interpolation. Characters have articulated elbows and knees, movement-state animation, limb IK targets, first-person hands and weapon views, a readable in-game watch, and swim/dive motion with splash audio. Pedestrians receive distinct generated appearances and profiles with names, ages, jobs, schedules, home districts, and personality traits. The inventory panel (`I`) shows the persistent wallet, city ID, phone collection, and keys. The phone inbox drives an eight-chapter story with sequential unlocks, a faction choice, pickup/drop-off missions, reputation, driving skill, achievements, and mission rewards that vary by time and district. Players can also buy a starter studio and pay for vehicle upgrades. Terrain-dependent traction, roundabouts, multi-storey parking, race-circuit facilities, and additional vehicle classes remain future work.
