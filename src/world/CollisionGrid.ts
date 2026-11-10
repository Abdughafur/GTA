import { CollisionBox } from './CityGenerator';

export class CollisionGrid {
  private readonly cells = new Map<string, CollisionBox[]>();
  private readonly cellSize = 128;

  constructor(private readonly colliders: CollisionBox[]) {
    this.rebuild();
  }

  public rebuild() {
    this.cells.clear();
    for (const collider of this.colliders) {
      const minCellX = Math.floor(collider.minX / this.cellSize);
      const maxCellX = Math.floor(collider.maxX / this.cellSize);
      const minCellZ = Math.floor(collider.minZ / this.cellSize);
      const maxCellZ = Math.floor(collider.maxZ / this.cellSize);

      for (let x = minCellX; x <= maxCellX; x++) {
        for (let z = minCellZ; z <= maxCellZ; z++) {
          const key = `${x}:${z}`;
          let cell = this.cells.get(key);
          if (!cell) {
            cell = [];
            this.cells.set(key, cell);
          }
          cell.push(collider);
        }
      }
    }
  }

  public getNearby(x: number, z: number, radius: number): CollisionBox[] {
    const minCellX = Math.floor((x - radius) / this.cellSize);
    const maxCellX = Math.floor((x + radius) / this.cellSize);
    const minCellZ = Math.floor((z - radius) / this.cellSize);
    const maxCellZ = Math.floor((z + radius) / this.cellSize);
    const nearby: CollisionBox[] = [];
    const seen = new Set<CollisionBox>();

    for (let cellX = minCellX; cellX <= maxCellX; cellX++) {
      for (let cellZ = minCellZ; cellZ <= maxCellZ; cellZ++) {
        const cell = this.cells.get(`${cellX}:${cellZ}`);
        if (!cell) continue;
        for (const collider of cell) {
          if (seen.has(collider)) continue;
          seen.add(collider);
          nearby.push(collider);
        }
      }
    }

    return nearby;
  }
}
