import * as THREE from 'three';

/**
 * Procedural Canvas Texture Generator for Grand Theft Bay
 * Zero external images, perfect PBR texture maps, crisp at grazing angles.
 */

class TextureFactory {
  private cache: Map<string, THREE.CanvasTexture> = new Map();

  // Helper to configure procedural textures for optimal PBR
  private setupTexture(canvas: HTMLCanvasElement, repeatX = 1, repeatY = 1): THREE.CanvasTexture {
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(repeatX, repeatY);
    texture.anisotropy = 8;
    return texture;
  }

  // --- ROAD TEXTURE ---
  public getRoadTexture(): THREE.CanvasTexture {
    if (this.cache.has('road')) return this.cache.get('road')!;
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Dark asphalt base
    ctx.fillStyle = '#22252a';
    ctx.fillRect(0, 0, 512, 512);

    // Asphalt noise grain
    for (let i = 0; i < 4000; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const gray = Math.floor(25 + Math.random() * 25);
      ctx.fillStyle = `rgb(${gray},${gray},${gray})`;
      ctx.fillRect(x, y, 2, 2);
    }

    // Outer white shoulder lines (solid)
    ctx.fillStyle = '#dcdde1';
    ctx.fillRect(20, 0, 8, 512);
    ctx.fillRect(484, 0, 8, 512);

    // Double yellow center lines
    ctx.fillStyle = '#fbc531';
    ctx.fillRect(250, 0, 5, 512);
    ctx.fillRect(257, 0, 5, 512);

    // Lane dividing dashed lines
    ctx.fillStyle = '#dcdde1';
    for (let y = 0; y < 512; y += 64) {
      ctx.fillRect(135, y, 6, 32);
      ctx.fillRect(370, y, 6, 32);
    }

    const tex = this.setupTexture(canvas, 1, 1);
    this.cache.set('road', tex);
    return tex;
  }

  // --- CROSSWALK TEXTURE ---
  public getCrosswalkTexture(): THREE.CanvasTexture {
    if (this.cache.has('crosswalk')) return this.cache.get('crosswalk')!;
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#22252a';
    ctx.fillRect(0, 0, 512, 512);

    // Thick white zebra stripes
    ctx.fillStyle = '#e5e7eb';
    for (let x = 40; x < 480; x += 60) {
      ctx.fillRect(x, 60, 36, 392);
    }

    const tex = this.setupTexture(canvas, 1, 1);
    this.cache.set('crosswalk', tex);
    return tex;
  }

  // --- SIDEWALK / CONCRETE TILE ---
  public getSidewalkTexture(): THREE.CanvasTexture {
    if (this.cache.has('sidewalk')) return this.cache.get('sidewalk')!;
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#838891';
    ctx.fillRect(0, 0, 256, 256);

    // Concrete pavers grid lines
    ctx.strokeStyle = '#575c66';
    ctx.lineWidth = 3;
    for (let i = 0; i <= 256; i += 64) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 256);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(256, i);
      ctx.stroke();
    }

    // Concrete speckle
    for (let i = 0; i < 2000; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      ctx.fillStyle = Math.random() > 0.5 ? '#9ca3af' : '#6b7280';
      ctx.fillRect(x, y, 1.5, 1.5);
    }

    const tex = this.setupTexture(canvas, 4, 4);
    this.cache.set('sidewalk', tex);
    return tex;
  }

  // --- SKYSCRAPER WINDOW FACADE ---
  public getBuildingFacadeTexture(style = 0): THREE.CanvasTexture {
    const key = `facade_${style}`;
    if (this.cache.has(key)) return this.cache.get(key)!;

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    const baseColors = ['#1e293b', '#0f172a', '#18181b', '#27272a'];
    ctx.fillStyle = baseColors[style % baseColors.length];
    ctx.fillRect(0, 0, 512, 512);

    const cols = 8;
    const rows = 12;
    const padX = 14;
    const padY = 12;
    const w = (512 - padX * (cols + 1)) / cols;
    const h = (512 - padY * (rows + 1)) / rows;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = padX + c * (w + padX);
        const y = padY + r * (h + padY);

        // Random window states: office lights, blinds, tinted glass
        const rand = Math.random();
        if (rand > 0.45) {
          // Lit warm or cool window
          ctx.fillStyle = rand > 0.75 ? '#fef08a' : rand > 0.6 ? '#67e8f9' : '#e2e8f0';
          ctx.fillRect(x, y, w, h);
          // Blinds
          ctx.fillStyle = 'rgba(0,0,0,0.15)';
          ctx.fillRect(x, y, w, h * (0.2 + Math.random() * 0.4));
        } else {
          // Reflective dark tint
          ctx.fillStyle = '#090d16';
          ctx.fillRect(x, y, w, h);
        }

        // Window frame
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, w, h);
      }
    }

    const tex = this.setupTexture(canvas, 1, 3);
    this.cache.set(key, tex);
    return tex;
  }

  // --- STOREFRONT / COMMERCIAL SIGNS ---
  public getStorefrontTexture(name: string, bgColor: string, fgColor: string): THREE.CanvasTexture {
    const key = `store_${name}`;
    if (this.cache.has(key)) return this.cache.get(key)!;

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, 512, 128);

    // Neon / bold border
    ctx.strokeStyle = fgColor;
    ctx.lineWidth = 6;
    ctx.strokeRect(6, 6, 500, 116);

    ctx.fillStyle = fgColor;
    ctx.font = 'bold 34px Impact, "Arial Black", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(name, 256, 64);

    const tex = this.setupTexture(canvas, 1, 1);
    this.cache.set(key, tex);
    return tex;
  }

  // --- RADIAL CONTACT SHADOW ---
  public getRadialContactShadowTexture(): THREE.CanvasTexture {
    if (this.cache.has('contactShadow')) return this.cache.get('contactShadow')!;
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;

    const grad = ctx.createRadialGradient(64, 64, 10, 64, 64, 60);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.7)');
    grad.addColorStop(0.5, 'rgba(0, 0, 0, 0.35)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);

    const tex = new THREE.CanvasTexture(canvas);
    this.cache.set('contactShadow', tex);
    return tex;
  }

  // --- GRASS PARK TEXTURE ---
  public getGrassTexture(): THREE.CanvasTexture {
    if (this.cache.has('grass')) return this.cache.get('grass')!;
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#2d5a27';
    ctx.fillRect(0, 0, 256, 256);

    for (let i = 0; i < 3000; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      ctx.fillStyle = Math.random() > 0.5 ? '#3b7533' : '#1e3d1a';
      ctx.fillRect(x, y, 2, 2);
    }

    const tex = this.setupTexture(canvas, 6, 6);
    this.cache.set('grass', tex);
    return tex;
  }
}

export const textureFactory = new TextureFactory();
