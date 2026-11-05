import * as THREE from 'three';
import { CollisionBox } from '../world/CityGenerator';
import { createFarmAnimal, FarmAnimalKind, FarmAnimalRig } from '../world/AnimalFactory';

export interface FarmBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

class FarmAnimal {
  public rig: FarmAnimalRig;
  private position: THREE.Vector3;
  private target = new THREE.Vector3();
  private colliders: CollisionBox[];
  private bounds: FarmBounds;
  private kind: FarmAnimalKind;
  private speed: number;
  private animationTime = Math.random() * Math.PI * 2;
  private grazeTimer = Math.random() * 4;

  constructor(
    scene: THREE.Scene,
    kind: FarmAnimalKind,
    variant: number,
    bounds: FarmBounds,
    colliders: CollisionBox[]
  ) {
    this.kind = kind;
    this.speed = kind === 'cow' ? 0.65 : 0.9;
    this.bounds = bounds;
    this.colliders = colliders;
    this.rig = createFarmAnimal(kind, variant);
    this.position = this.rig.group.position;
    this.position.copy(this.randomOpenPoint());
    scene.add(this.rig.group);
    this.chooseTarget();
  }

  public update(dt: number) {
    this.animationTime += dt;
    this.grazeTimer = Math.max(0, this.grazeTimer - dt);
    const toTarget = this.target.clone().sub(this.position);
    const distance = toTarget.length();

    if (this.grazeTimer === 0 && distance < 1.2) {
      this.grazeTimer = 1.5 + Math.random() * 3;
      this.chooseTarget();
    } else if (this.grazeTimer === 0) {
      const direction = toTarget.normalize();
      const nextX = this.position.x + direction.x * this.speed * dt;
      const nextZ = this.position.z + direction.z * this.speed * dt;
      const outsidePen =
        nextX < this.bounds.minX + 1 ||
        nextX > this.bounds.maxX - 1 ||
        nextZ < this.bounds.minZ + 1 ||
        nextZ > this.bounds.maxZ - 1;
      const blocked = outsidePen || this.colliders.some((collider) =>
        nextX > collider.minX &&
        nextX < collider.maxX &&
        nextZ > collider.minZ &&
        nextZ < collider.maxZ
      );

      if (blocked) {
        this.chooseTarget();
      } else {
        this.position.x = nextX;
        this.position.z = nextZ;
        this.rig.group.rotation.y = Math.atan2(direction.x, direction.z);
        const gait = Math.sin(this.animationTime * (this.kind === 'cow' ? 4 : 5));
        this.rig.legs.forEach((leg, index) => {
          leg.rotation.x = gait * (index % 2 === 0 ? 0.18 : -0.18);
        });
      }
    }

    this.rig.head.rotation.x = this.grazeTimer > 0
      ? 0.28 + Math.sin(this.animationTime * 2.4) * 0.06
      : Math.sin(this.animationTime * 1.8) * 0.04;
    this.rig.tail.rotation.y = Math.sin(this.animationTime * 2.8) * 0.35;
  }

  private chooseTarget() {
    this.target.copy(this.randomOpenPoint());
  }

  private randomOpenPoint() {
    for (let attempt = 0; attempt < 20; attempt++) {
      const x = THREE.MathUtils.randFloat(this.bounds.minX + 2, this.bounds.maxX - 2);
      const z = THREE.MathUtils.randFloat(this.bounds.minZ + 2, this.bounds.maxZ - 2);
      const blocked = this.colliders.some((collider) =>
        x > collider.minX &&
        x < collider.maxX &&
        z > collider.minZ &&
        z < collider.maxZ
      );
      if (!blocked) {
        return new THREE.Vector3(x, 0, z);
      }
    }

    return new THREE.Vector3(
      (this.bounds.minX + this.bounds.maxX) / 2,
      0,
      (this.bounds.minZ + this.bounds.maxZ) / 2
    );
  }
}

export class FarmAnimalManager {
  private animals: FarmAnimal[] = [];

  constructor(scene: THREE.Scene, bounds: FarmBounds, colliders: CollisionBox[]) {
    for (let i = 0; i < 10; i++) {
      this.animals.push(new FarmAnimal(
        scene,
        i < 4 ? 'cow' : 'sheep',
        i,
        bounds,
        colliders
      ));
    }
  }

  public update(dt: number) {
    for (const animal of this.animals) {
      animal.update(dt);
    }
  }
}
