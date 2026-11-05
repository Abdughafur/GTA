import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { WeatherType } from '../core/gameState';

export class EnvironmentSystem {
  public dirLight: THREE.DirectionalLight;
  public hemiLight: THREE.HemisphereLight;
  public rainParticles: THREE.Points | null = null;
  private rainGeo: THREE.BufferGeometry | null = null;
  private scene: THREE.Scene;
  private skyMaterial: THREE.ShaderMaterial;

  constructor(scene: THREE.Scene, renderer: THREE.WebGLRenderer) {
    this.scene = scene;

    this.skyMaterial = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color(0x43aee4) },
        horizonColor: { value: new THREE.Color(0xf6d49b) }
      },
      vertexShader: `
        varying vec3 skyDirection;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          skyDirection = normalize(worldPosition.xyz - cameraPosition);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 horizonColor;
        varying vec3 skyDirection;
        void main() {
          float height = normalize(skyDirection).y;
          float gradient = smoothstep(-0.12, 0.78, height);
          float horizonGlow = exp(-pow((height + 0.015) * 7.0, 2.0));
          vec3 sky = mix(horizonColor, topColor, gradient);
          sky = mix(sky, horizonColor, horizonGlow * 0.18);
          gl_FragColor = vec4(sky, 1.0);
        }
      `,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false
    });
    const sky = new THREE.Mesh(new THREE.SphereGeometry(800, 32, 20), this.skyMaterial);
    sky.renderOrder = -1000;
    scene.add(sky);

    // 1. Mandatory Studio Environment Reflections via RoomEnvironment
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 2. Warm Sun Key Light with tight shadow frustum
    this.dirLight = new THREE.DirectionalLight(0xfffaed, 2.2);
    this.dirLight.position.set(120, 180, 100);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.width = 2048;
    this.dirLight.shadow.mapSize.height = 2048;
    this.dirLight.shadow.camera.near = 10;
    this.dirLight.shadow.camera.far = 400;
    const shadowD = 180;
    this.dirLight.shadow.camera.left = -shadowD;
    this.dirLight.shadow.camera.right = shadowD;
    this.dirLight.shadow.camera.top = shadowD;
    this.dirLight.shadow.camera.bottom = -shadowD;
    this.dirLight.shadow.bias = -0.0005;
    this.dirLight.shadow.normalBias = 0.02;
    scene.add(this.dirLight);

    // 3. Cool Hemisphere fill light
    this.hemiLight = new THREE.HemisphereLight(0x93c5fd, 0x1e293b, 1.0);
    scene.add(this.hemiLight);

    // 4. Horizon Fog
    scene.fog = new THREE.FogExp2(0xcfe3fa, 0.0018);

    // 5. Rain Particle System
    this.initRain();
  }

  private initRain() {
    const rainCount = 3500;
    const rainPositions = new Float32Array(rainCount * 3);
    for (let i = 0; i < rainCount; i++) {
      rainPositions[i * 3] = (Math.random() - 0.5) * 200;
      rainPositions[i * 3 + 1] = Math.random() * 80;
      rainPositions[i * 3 + 2] = (Math.random() - 0.5) * 200;
    }

    this.rainGeo = new THREE.BufferGeometry();
    this.rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));

    const rainMat = new THREE.PointsMaterial({
      color: 0x93c5fd,
      size: 0.35,
      transparent: true,
      opacity: 0.75
    });

    this.rainParticles = new THREE.Points(this.rainGeo, rainMat);
    this.rainParticles.visible = false;
    this.scene.add(this.rainParticles);
  }

  public update(timeOfDay: number, weather: WeatherType, centerPos: THREE.Vector3, dt: number) {
    // Sun arc angle (0h to 24h)
    const sunAngle = ((timeOfDay - 6) / 24) * Math.PI * 2;
    const sunDist = 200;

    const sunX = Math.cos(sunAngle) * sunDist + centerPos.x;
    const sunY = Math.sin(sunAngle) * sunDist;
    const sunZ = Math.sin(sunAngle * 0.5) * 80 + centerPos.z;

    this.dirLight.position.set(sunX, Math.max(10, sunY), sunZ);
    this.dirLight.target.position.copy(centerPos);
    this.dirLight.target.updateMatrixWorld();

    const isNight = timeOfDay < 5.5 || timeOfDay > 19.5;
    const isSunset = (timeOfDay >= 17.5 && timeOfDay <= 19.5) || weather === 'sunset';

    // Sky & Lighting Color Palette
    if (weather === 'rain') {
      this.setSkyPalette(0x566a7e, 0xb5b9b2);
      this.scene.background = new THREE.Color(0x334155);
      (this.scene.fog as THREE.FogExp2).color.setHex(0x334155);
      this.dirLight.intensity = 0.8;
      this.dirLight.color.setHex(0x94a3b8);
      this.hemiLight.intensity = 0.5;
      if (this.rainParticles) {
        this.rainParticles.visible = true;
        this.rainParticles.position.set(centerPos.x, 0, centerPos.z);
        // Animate falling rain streaks
        const positions = this.rainGeo!.attributes.position.array as Float32Array;
        for (let i = 1; i < positions.length; i += 3) {
          positions[i] -= dt * 65;
          if (positions[i] < 0) {
            positions[i] = 80;
          }
        }
        this.rainGeo!.attributes.position.needsUpdate = true;
      }
    } else if (isNight || weather === 'night') {
      this.setSkyPalette(0x101a3a, 0x374563);
      this.scene.background = new THREE.Color(0x060913);
      (this.scene.fog as THREE.FogExp2).color.setHex(0x090d1a);
      this.dirLight.intensity = 0.35;
      this.dirLight.color.setHex(0x60a5fa); // Moonlight
      this.hemiLight.intensity = 0.4;
      this.hemiLight.color.setHex(0x3b82f6);
      if (this.rainParticles) this.rainParticles.visible = false;
    } else if (isSunset) {
      this.setSkyPalette(0x5577a2, 0xffb36b);
      this.scene.background = new THREE.Color(0xf97316);
      (this.scene.fog as THREE.FogExp2).color.setHex(0xfb923c);
      this.dirLight.intensity = 2.0;
      this.dirLight.color.setHex(0xfbbf24);
      this.hemiLight.intensity = 0.9;
      if (this.rainParticles) this.rainParticles.visible = false;
    } else {
      // Sunny daytime
      this.setSkyPalette(0x43aee4, 0xf6d49b);
      this.scene.background = new THREE.Color(0x7dd3fc);
      (this.scene.fog as THREE.FogExp2).color.setHex(0xbae6fd);
      this.dirLight.intensity = 2.4;
      this.dirLight.color.setHex(0xfffaed);
      this.hemiLight.intensity = 1.0;
      if (this.rainParticles) this.rainParticles.visible = false;
    }
  }

  private setSkyPalette(top: number, horizon: number) {
    this.skyMaterial.uniforms.topColor.value.setHex(top);
    this.skyMaterial.uniforms.horizonColor.value.setHex(horizon);
  }
}
