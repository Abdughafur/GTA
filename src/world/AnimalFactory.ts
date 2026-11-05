import * as THREE from 'three';

export type FarmAnimalKind = 'cow' | 'sheep';

export interface FarmAnimalRig {
  group: THREE.Group;
  head: THREE.Group;
  tail: THREE.Group;
  legs: THREE.Group[];
}

export function createFarmAnimal(kind: FarmAnimalKind, variant: number): FarmAnimalRig {
  const group = new THREE.Group();
  const legs: THREE.Group[] = [];
  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: kind === 'cow' ? (variant % 2 ? 0xf3efe4 : 0x7d4a2d) : 0xe7dfca,
    roughness: 0.93
  });
  const darkMaterial = new THREE.MeshStandardMaterial({
    color: kind === 'cow' ? 0x25231f : 0x49382f,
    roughness: 0.88
  });
  const skinMaterial = new THREE.MeshStandardMaterial({ color: 0xc98e72, roughness: 0.86 });
  const eyeMaterial = new THREE.MeshStandardMaterial({ color: 0x171717, roughness: 0.35 });

  const body = new THREE.Mesh(
    new THREE.SphereGeometry(kind === 'cow' ? 0.8 : 0.72, 18, 14),
    bodyMaterial
  );
  body.scale.set(1, kind === 'cow' ? 0.67 : 0.82, 0.7);
  body.position.y = 0.94;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  if (kind === 'cow') {
    for (const [x, z, scale] of [[-0.42, 0.18, 0.22], [0.36, -0.08, 0.2], [0.05, 0.36, 0.16]] as const) {
      const patch = new THREE.Mesh(new THREE.SphereGeometry(0.65, 12, 10), darkMaterial);
      patch.scale.set(scale, scale * 0.75, 0.035);
      patch.position.set(x, 1.0, z);
      group.add(patch);
    }
  } else {
    for (const [x, z] of [[-0.42, 0], [0.4, 0.05], [0, -0.38], [0, 0.36]] as const) {
      const fleece = new THREE.Mesh(new THREE.SphereGeometry(0.34, 12, 10), bodyMaterial);
      fleece.position.set(x, 1.22, z);
      fleece.castShadow = true;
      group.add(fleece);
    }
  }

  const head = new THREE.Group();
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.34, 16, 12), bodyMaterial);
  skull.scale.set(0.82, 1, 0.9);
  skull.castShadow = true;
  head.add(skull);

  const muzzle = new THREE.Mesh(
    new THREE.SphereGeometry(kind === 'cow' ? 0.22 : 0.15, 12, 10),
    kind === 'cow' ? skinMaterial : darkMaterial
  );
  muzzle.scale.set(1.05, 0.68, 0.72);
  muzzle.position.set(0, -0.14, 0.25);
  head.add(muzzle);

  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), eyeMaterial);
    eye.position.set(side * 0.2, 0.06, 0.23);
    head.add(eye);
    const ear = new THREE.Mesh(
      new THREE.SphereGeometry(kind === 'cow' ? 0.13 : 0.16, 8, 8),
      kind === 'cow' ? darkMaterial : skinMaterial
    );
    ear.scale.set(1.5, 0.48, 0.65);
    ear.position.set(side * 0.29, 0.12, -0.02);
    ear.rotation.z = side * -0.24;
    head.add(ear);

    if (kind === 'cow') {
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.28, 8), skinMaterial);
      horn.position.set(side * 0.19, 0.36, -0.02);
      horn.rotation.z = side * -0.22;
      head.add(horn);
    }
  }
  head.position.set(0, 1.2, 0.63);
  group.add(head);

  for (const x of [-0.42, 0.42]) {
    for (const z of [-0.36, 0.36]) {
      const leg = new THREE.Group();
      const shin = new THREE.Mesh(
        new THREE.CylinderGeometry(0.075, 0.095, 0.55, 8),
        kind === 'cow' && variant % 2 ? darkMaterial : bodyMaterial
      );
      shin.position.y = -0.24;
      shin.castShadow = true;
      leg.add(shin);
      leg.position.set(x, 0.61, z);
      group.add(leg);
      legs.push(leg);
    }
  }

  const tail = new THREE.Group();
  const tailBone = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.055, 0.48, 7), bodyMaterial);
  tailBone.position.y = -0.22;
  tailBone.rotation.x = -0.3;
  const tuft = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), darkMaterial);
  tuft.position.set(0, -0.45, 0);
  tail.add(tailBone, tuft);
  tail.position.set(0, 1.1, -0.65);
  group.add(tail);

  return { group, head, tail, legs };
}
