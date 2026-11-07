/**
 * Procedural Web Audio API sound synthesizer for Grand Theft Bay
 * Zero external audio files required - 100% reliable, zero 404s.
 */

class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;

  // Engine sound nodes
  private engineOsc: OscillatorNode | null = null;
  private engineSubOsc: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private isEngineRunning = false;

  // Siren nodes
  private sirenOsc: OscillatorNode | null = null;
  private sirenGain: GainNode | null = null;
  private sirenLfo: OscillatorNode | null = null;
  private isSirenActive = false;

  // Radio synthesizer loop
  private radioStep = 0;
  private radioInterval: number | null = null;
  private radioPlaying = false;
  private currentStation = 0;

  private isMuted = false;

  public init() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.8;
      this.masterGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.8;
      this.sfxGain.connect(this.masterGain);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.5;
      this.musicGain.connect(this.masterGain);
    } catch {
      // AudioContext unavailable or blocked until user gesture
    }
  }

  public resumeContext() {
    if (!this.ctx) {
      this.init();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(muted ? 0 : 0.8, this.ctx.currentTime, 0.05);
    }
  }

  public setVolumes(sfx: number, music: number) {
    if (!this.ctx) return;
    if (this.sfxGain) this.sfxGain.gain.setTargetAtTime(sfx, this.ctx.currentTime, 0.05);
    if (this.musicGain) this.musicGain.gain.setTargetAtTime(music, this.ctx.currentTime, 0.05);
  }

  // --- CAR ENGINE SYNTHESIS ---
  public startEngine() {
    this.resumeContext();
    if (this.isEngineRunning || !this.ctx || !this.sfxGain) return;
    try {
      this.isEngineRunning = true;
      const now = this.ctx.currentTime;

      this.engineOsc = this.ctx.createOscillator();
      this.engineOsc.type = 'sawtooth';
      this.engineOsc.frequency.setValueAtTime(45, now);

      this.engineSubOsc = this.ctx.createOscillator();
      this.engineSubOsc.type = 'triangle';
      this.engineSubOsc.frequency.setValueAtTime(22.5, now);

      this.engineFilter = this.ctx.createBiquadFilter();
      this.engineFilter.type = 'lowpass';
      this.engineFilter.frequency.setValueAtTime(280, now);
      this.engineFilter.Q.value = 3.0;

      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.setValueAtTime(0.01, now);
      this.engineGain.gain.linearRampToValueAtTime(0.25, now + 0.3);

      this.engineOsc.connect(this.engineFilter);
      this.engineSubOsc.connect(this.engineFilter);
      this.engineFilter.connect(this.engineGain);
      this.engineGain.connect(this.sfxGain);

      this.engineOsc.start(now);
      this.engineSubOsc.start(now);
    } catch {
      this.isEngineRunning = false;
    }
  }

  public updateEngine(rpmRatio: number, isAccelerating: boolean) {
    if (!this.isEngineRunning || !this.ctx || !this.engineOsc || !this.engineFilter || !this.engineGain) return;
    const now = this.ctx.currentTime;
    // Map RPM 0-1 to pitch (45Hz idle to 240Hz redline)
    const targetFreq = 45 + Math.pow(rpmRatio, 1.2) * 195;
    this.engineOsc.frequency.setTargetAtTime(targetFreq, now, 0.08);
    if (this.engineSubOsc) {
      this.engineSubOsc.frequency.setTargetAtTime(targetFreq * 0.5, now, 0.08);
    }
    // Filter open on acceleration
    const filterFreq = isAccelerating ? 250 + rpmRatio * 900 : 220 + rpmRatio * 300;
    this.engineFilter.frequency.setTargetAtTime(filterFreq, now, 0.05);

    const gainVal = isAccelerating ? 0.35 + rpmRatio * 0.25 : 0.2 + rpmRatio * 0.15;
    this.engineGain.gain.setTargetAtTime(gainVal, now, 0.05);
  }

  public stopEngine() {
    if (!this.isEngineRunning || !this.ctx) return;
    this.isEngineRunning = false;
    try {
      const now = this.ctx.currentTime;
      if (this.engineGain) {
        this.engineGain.gain.linearRampToValueAtTime(0.001, now + 0.2);
      }
      setTimeout(() => {
        try {
          this.engineOsc?.stop();
          this.engineSubOsc?.stop();
          this.engineOsc?.disconnect();
          this.engineSubOsc?.disconnect();
          this.engineFilter?.disconnect();
          this.engineGain?.disconnect();
        } catch {}
      }, 250);
    } catch {}
  }

  // --- TIRE SCREECH ---
  public playTireSkid(intensity = 0.5) {
    this.resumeContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      const bufferSize = this.ctx.sampleRate * 0.25;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1400, now);
      filter.Q.value = 5.0;

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(Math.min(0.3, intensity * 0.3), now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);

      noise.start(now);
    } catch {}
  }

  // --- POLICE SIREN ---
  public setSiren(active: boolean) {
    this.resumeContext();
    if (!this.ctx || !this.sfxGain) return;
    if (active && !this.isSirenActive) {
      try {
        this.isSirenActive = true;
        const now = this.ctx.currentTime;

        this.sirenOsc = this.ctx.createOscillator();
        this.sirenOsc.type = 'sawtooth';
        this.sirenOsc.frequency.setValueAtTime(650, now);

        this.sirenLfo = this.ctx.createOscillator();
        this.sirenLfo.frequency.setValueAtTime(0.8, now); // Wailing period
        const lfoGain = this.ctx.createGain();
        lfoGain.gain.setValueAtTime(300, now);

        this.sirenLfo.connect(lfoGain);
        lfoGain.connect(this.sirenOsc.frequency);

        this.sirenGain = this.ctx.createGain();
        this.sirenGain.gain.setValueAtTime(0.18, now);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1200, now);

        this.sirenOsc.connect(filter);
        filter.connect(this.sirenGain);
        this.sirenGain.connect(this.sfxGain);

        this.sirenOsc.start(now);
        this.sirenLfo.start(now);
      } catch {
        this.isSirenActive = false;
      }
    } else if (!active && this.isSirenActive) {
      this.isSirenActive = false;
      try {
        const now = this.ctx.currentTime;
        if (this.sirenGain) {
          this.sirenGain.gain.linearRampToValueAtTime(0.001, now + 0.2);
        }
        setTimeout(() => {
          try {
            this.sirenOsc?.stop();
            this.sirenLfo?.stop();
            this.sirenOsc?.disconnect();
            this.sirenLfo?.disconnect();
            this.sirenGain?.disconnect();
          } catch {}
        }, 250);
      } catch {}
    }
  }

  // --- IMPACT & CRASH ---
  public playCrash(impactSpeed = 1.0) {
    this.resumeContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      // Low punch
      const osc = this.ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.exponentialRampToValueAtTime(30, now + 0.35);

      const gain = this.ctx.createGain();
      const vol = Math.min(0.6, 0.2 + impactSpeed * 0.4);
      gain.gain.setValueAtTime(vol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.35);

      // Metallic crunch
      const bufferSize = this.ctx.sampleRate * 0.3;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.2));
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const noiseFilter = this.ctx.createBiquadFilter();
      noiseFilter.type = 'lowpass';
      noiseFilter.frequency.setValueAtTime(800, now);
      noise.connect(noiseFilter);
      noiseFilter.connect(gain);
      noise.start(now);
    } catch {}
  }

  // --- FOOTSTEPS ---
  public playFootstep() {
    this.resumeContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(80, now);
      osc.frequency.exponentialRampToValueAtTime(30, now + 0.08);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.08);
    } catch {}
  }

  public playWaterSplash() {
    this.resumeContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      const noiseBuffer = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * 0.12), this.ctx.sampleRate);
      const samples = noiseBuffer.getChannelData(0);
      for (let i = 0; i < samples.length; i++) {
        samples[i] = (Math.random() * 2 - 1) * (1 - i / samples.length);
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = noiseBuffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(900, now);
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);
      noise.start(now);
      noise.stop(now + 0.12);
    } catch {}
  }

  // --- CAR DOOR / ENTER ---
  public playDoorSlam() {
    this.resumeContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.15);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.15);
    } catch {}
  }

  // --- UI SOUNDS: SMARTPHONE, MONEY, WANTED ---
  public playPhoneBeep() {
    this.resumeContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.setValueAtTime(1760, now + 0.06);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.14);
    } catch {}
  }

  public playCashRegister() {
    this.resumeContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      const chords = [1046.5, 1318.5, 1567.98, 2093.0]; // C6, E6, G6, C7
      chords.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.06);
        const gain = this.ctx!.createGain();
        gain.gain.setValueAtTime(0.18, now + idx * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.25);
        osc.connect(gain);
        gain.connect(this.sfxGain!);
        osc.start(now + idx * 0.06);
        osc.stop(now + idx * 0.06 + 0.25);
      });
    } catch {}
  }

  public playWantedSting() {
    this.resumeContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(130, now);
      osc.frequency.exponentialRampToValueAtTime(85, now + 0.45);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(600, now);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.5);
    } catch {}
  }

  // --- PROCEDURAL RADIO STATIONS ---
  public startRadio(stationIndex: number) {
    this.resumeContext();
    this.currentStation = stationIndex;
    if (stationIndex === 4) {
      // Station 4 is "Off"
      this.stopRadio();
      return;
    }
    if (this.radioPlaying) return;
    this.radioPlaying = true;
    this.radioStep = 0;

    // 120 BPM 16th note synthwave sequencer
    const stepDuration = 125; // ms
    this.radioInterval = window.setInterval(() => {
      this.tickRadio();
    }, stepDuration);
  }

  public stopRadio() {
    this.radioPlaying = false;
    if (this.radioInterval) {
      clearInterval(this.radioInterval);
      this.radioInterval = null;
    }
  }

  private tickRadio() {
    if (!this.ctx || !this.musicGain || this.isMuted || !this.radioPlaying) return;
    const now = this.ctx.currentTime;
    const step = this.radioStep % 16;
    this.radioStep++;

    // Notes for Synthwave / Retrowave (A Minor: A, C, D, E, G)
    const bassNotes = [110, 110, 130.8, 110, 146.8, 110, 164.8, 146.8];
    const leadNotes = [440, 523.25, 587.33, 659.25, 523.25, 440, 392, 523.25];

    // Station 0: Flash FM (Arpeggiated pop synth)
    // Station 1: Wave 103 (Driving 80s bassline)
    // Station 2: Reggae Dub (laid back chords on upbeats)
    // Station 3: Hip Hop (deep 808 sub kick + snare on 4, 12)

    try {
      if (this.currentStation === 0 || this.currentStation === 1) {
        // Kick on 0, 4, 8, 12
        if (step % 4 === 0) {
          const kickOsc = this.ctx.createOscillator();
          kickOsc.type = 'sine';
          kickOsc.frequency.setValueAtTime(140, now);
          kickOsc.frequency.exponentialRampToValueAtTime(35, now + 0.12);
          const kickGain = this.ctx.createGain();
          kickGain.gain.setValueAtTime(0.3, now);
          kickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
          kickOsc.connect(kickGain);
          kickGain.connect(this.musicGain);
          kickOsc.start(now);
          kickOsc.stop(now + 0.14);
        }

        // Snare / Clap on 4, 12
        if (step === 4 || step === 12) {
          const snareOsc = this.ctx.createOscillator();
          snareOsc.type = 'triangle';
          snareOsc.frequency.setValueAtTime(200, now);
          const snareGain = this.ctx.createGain();
          snareGain.gain.setValueAtTime(0.18, now);
          snareGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
          snareOsc.connect(snareGain);
          snareGain.connect(this.musicGain);
          snareOsc.start(now);
          snareOsc.stop(now + 0.1);
        }

        // Synth Bassline
        const bassFreq = bassNotes[Math.floor(step / 2) % bassNotes.length];
        const bOsc = this.ctx.createOscillator();
        bOsc.type = 'sawtooth';
        bOsc.frequency.setValueAtTime(bassFreq, now);
        const bFilter = this.ctx.createBiquadFilter();
        bFilter.type = 'lowpass';
        bFilter.frequency.setValueAtTime(450, now);
        const bGain = this.ctx.createGain();
        bGain.gain.setValueAtTime(0.12, now);
        bGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        bOsc.connect(bFilter);
        bFilter.connect(bGain);
        bGain.connect(this.musicGain);
        bOsc.start(now);
        bOsc.stop(now + 0.15);

        // Melody lead occasionally
        if (step % 2 === 1 && (step > 6 && step < 14)) {
          const leadFreq = leadNotes[step % leadNotes.length];
          const lOsc = this.ctx.createOscillator();
          lOsc.type = 'sine';
          lOsc.frequency.setValueAtTime(leadFreq, now);
          const lGain = this.ctx.createGain();
          lGain.gain.setValueAtTime(0.08, now);
          lGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
          lOsc.connect(lGain);
          lGain.connect(this.musicGain);
          lOsc.start(now);
          lOsc.stop(now + 0.18);
        }
      } else if (this.currentStation === 2) {
        // Reggae dub off-beat skank
        if (step === 2 || step === 6 || step === 10 || step === 14) {
          const chord = [330, 440, 554.37];
          chord.forEach(f => {
            const osc = this.ctx!.createOscillator();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(f, now);
            const g = this.ctx!.createGain();
            g.gain.setValueAtTime(0.1, now);
            g.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
            osc.connect(g);
            g.connect(this.musicGain!);
            osc.start(now);
            osc.stop(now + 0.12);
          });
        }
      } else if (this.currentStation === 3) {
        // Hip hop heavy sub bass + boom bap
        if (step === 0 || step === 10) {
          const sub = this.ctx.createOscillator();
          sub.type = 'sine';
          sub.frequency.setValueAtTime(80, now);
          sub.frequency.exponentialRampToValueAtTime(38, now + 0.28);
          const g = this.ctx.createGain();
          g.gain.setValueAtTime(0.35, now);
          g.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
          sub.connect(g);
          g.connect(this.musicGain);
          sub.start(now);
          sub.stop(now + 0.3);
        }
      }
    } catch {}
  }

  // --- ELEVATOR SOUNDS ---
  public playElevatorDing() {
    this.resumeContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      [523.25, 659.25].forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.12);
        const gain = this.ctx!.createGain();
        gain.gain.setValueAtTime(0.22, now + idx * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.6);
        osc.connect(gain);
        gain.connect(this.sfxGain!);
        osc.start(now + idx * 0.12);
        osc.stop(now + idx * 0.12 + 0.6);
      });
    } catch {}
  }

  // --- CAMERA SHUTTER ---
  public playCameraShutter() {
    this.resumeContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1200, now);
      osc.frequency.setValueAtTime(800, now + 0.05);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.1);
    } catch {}
  }

  // --- EAT & DRINK ---
  public playEat() {
    this.resumeContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      [180, 240, 160].forEach((freq, i) => {
        const osc = this.ctx!.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + i * 0.08);
        const g = this.ctx!.createGain();
        g.gain.setValueAtTime(0.18, now + i * 0.08);
        g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.1);
        osc.connect(g);
        g.connect(this.sfxGain!);
        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 0.1);
      });
    } catch {}
  }

  public playDrink() {
    this.resumeContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(480, now + 0.15);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.18);
    } catch {}
  }

  // --- SLEEP LULLABY ---
  public playSleep() {
    this.resumeContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      [440, 554.37, 659.25, 880].forEach((freq, i) => {
        const osc = this.ctx!.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.14);
        const gain = this.ctx!.createGain();
        gain.gain.setValueAtTime(0.15, now + i * 0.14);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.14 + 0.8);
        osc.connect(gain);
        gain.connect(this.sfxGain!);
        osc.start(now + i * 0.14);
        osc.stop(now + i * 0.14 + 0.8);
      });
    } catch {}
  }

  // --- FUEL PUMP ---
  public playFuelPump() {
    this.resumeContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.setValueAtTime(90, now + 0.08);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.15);
    } catch {}
  }

  // --- WEAPONS & COMBAT SOUNDS ---
  public playPistolShot() {
    this.resumeContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      // 1. Noise transient snap
      const bufferSize = Math.floor(this.ctx.sampleRate * 0.08);
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1200, now);
      filter.Q.setValueAtTime(2.5, now);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.7, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      whiteNoise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.sfxGain);

      // 2. Punchy body sine kick
      const osc = this.ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(45, now + 0.14);

      const bodyGain = this.ctx.createGain();
      bodyGain.gain.setValueAtTime(0.8, now);
      bodyGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

      osc.connect(bodyGain);
      bodyGain.connect(this.sfxGain);

      whiteNoise.start(now);
      whiteNoise.stop(now + 0.08);
      osc.start(now);
      osc.stop(now + 0.14);
    } catch {}
  }

  public playSmgShot() {
    this.resumeContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(480, now);
      osc.frequency.exponentialRampToValueAtTime(70, now + 0.09);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.55, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.09);
    } catch {}
  }

  public playRifleShot() {
    this.resumeContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(260, now);
      osc.frequency.exponentialRampToValueAtTime(32, now + 0.22);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.85, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.22);
    } catch {}
  }

  public playGunReload() {
    this.resumeContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      // Metallic magazine snap
      const osc = this.ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.setValueAtTime(1400, now + 0.06);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.16);
    } catch {}
  }

  public playBulletImpact() {
    this.resumeContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800 + Math.random() * 400, now);
      osc.frequency.exponentialRampToValueAtTime(180, now + 0.08);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.08);
    } catch {}
  }

  // --- TRAIN & HELICOPTER SOUNDS ---
  public playCarHorn() {
    this.resumeContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const context = this.ctx;
    const output = this.sfxGain;
    const now = context.currentTime;
    for (const frequency of [392, 494]) {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = 'square';
      oscillator.frequency.setValueAtTime(frequency, now);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.12, now + 0.025);
      gain.gain.setValueAtTime(0.12, now + 0.28);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.34);
      oscillator.connect(gain);
      gain.connect(output);
      oscillator.start(now);
      oscillator.stop(now + 0.35);
    }
  }

  public playTrainHorn() {
    this.resumeContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      [311.13, 392.0, 466.16].forEach((f) => {
        const osc = this.ctx!.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(f, now);
        const g = this.ctx!.createGain();
        g.gain.setValueAtTime(0.25, now);
        g.gain.linearRampToValueAtTime(0.3, now + 0.4);
        g.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
        osc.connect(g);
        g.connect(this.sfxGain!);
        osc.start(now);
        osc.stop(now + 1.2);
      });
    } catch {}
  }

  public playHelicopterRotor() {
    this.resumeContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(55, now);
      osc.frequency.setValueAtTime(35, now + 0.07);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.08);
    } catch {}
  }

  // --- SCARY CITIZEN SCREAM ---
  public playCitizenScream(pitchMod = 1.0) {
    this.resumeContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      osc1.type = 'sawtooth';
      osc2.type = 'square';

      const baseFreq = (650 + Math.random() * 250) * pitchMod;
      osc1.frequency.setValueAtTime(baseFreq, now);
      osc1.frequency.linearRampToValueAtTime(baseFreq * 1.3, now + 0.12);
      osc1.frequency.exponentialRampToValueAtTime(baseFreq * 0.4, now + 0.7);

      osc2.frequency.setValueAtTime(baseFreq * 1.5, now);
      osc2.frequency.exponentialRampToValueAtTime(baseFreq * 0.6, now + 0.7);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1400, now);
      filter.Q.value = 3.5;

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.42, now + 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.7);
      osc2.stop(now + 0.7);
    } catch {}
  }

  // --- HEAVY VEHICLE CRASH & ROADKILL IMPACT ---
  public playHeavyCrash() {
    this.resumeContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;

      // Deep Sub-Bass Punch
      const osc = this.ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(25, now + 0.5);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.85, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.5);

      // Crumpled Metal Noise
      const bufferSize = this.ctx.sampleRate * 0.45;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.25));
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const noiseFilter = this.ctx.createBiquadFilter();
      noiseFilter.type = 'lowpass';
      noiseFilter.frequency.setValueAtTime(1200, now);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.7, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(this.sfxGain);
      noise.start(now);

      // High-frequency glass shatter
      const glassBufferSize = this.ctx.sampleRate * 0.25;
      const glassBuffer = this.ctx.createBuffer(1, glassBufferSize, this.ctx.sampleRate);
      const glassData = glassBuffer.getChannelData(0);
      for (let i = 0; i < glassBufferSize; i++) {
        glassData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (glassBufferSize * 0.1));
      }
      const glassNoise = this.ctx.createBufferSource();
      glassNoise.buffer = glassBuffer;
      const glassFilter = this.ctx.createBiquadFilter();
      glassFilter.type = 'highpass';
      glassFilter.frequency.setValueAtTime(3500, now);

      const glassGain = this.ctx.createGain();
      glassGain.gain.setValueAtTime(0.4, now);
      glassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      glassNoise.connect(glassFilter);
      glassFilter.connect(glassGain);
      glassGain.connect(this.sfxGain);
      glassNoise.start(now);
    } catch {}
  }

  // --- CARJACK SCUFFLE & CITIZEN PUSH ---
  public playCarjackYank() {
    this.resumeContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      // Door yank latch click
      const osc = this.ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.setValueAtTime(340, now);
      osc.frequency.exponentialRampToValueAtTime(120, now + 0.08);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.08);

      // Body grapple thump
      const osc2 = this.ctx.createOscillator();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(95, now + 0.08);
      osc2.frequency.exponentialRampToValueAtTime(30, now + 0.25);

      const gain2 = this.ctx.createGain();
      gain2.gain.setValueAtTime(0.4, now + 0.08);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc2.connect(gain2);
      gain2.connect(this.sfxGain);
      osc2.start(now + 0.08);
      osc2.stop(now + 0.25);
    } catch {}
  }

  // --- CAR DOOR OPEN & CLOSE ---
  public playDoorOpen() {
    this.resumeContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(420, now);
      osc.frequency.exponentialRampToValueAtTime(210, now + 0.1);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.1);
    } catch {}
  }

  public playDoorClose() {
    this.playDoorSlam();
  }

  // --- AIRPLANE TURBINE WHINE & JET ROAR ---
  public playPlaneTurbine(throttle: number = 0.8) {
    this.resumeContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      // High-pitched turbine blade spool
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      const freq = 480 + throttle * 850;
      osc.frequency.setValueAtTime(freq, now);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(freq, now);
      filter.Q.value = 6.0;

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.12);
    } catch {}
  }

  // --- GTA WASTED DEATH SOUND ---
  public playWastedSound() {
    this.resumeContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      // Low sinister slow minor chord
      [110, 130.81, 164.81].forEach((f) => {
        const osc = this.ctx!.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(f, now);
        osc.frequency.linearRampToValueAtTime(f * 0.7, now + 2.5);

        const filter = this.ctx!.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(350, now);
        filter.frequency.linearRampToValueAtTime(100, now + 2.5);

        const gain = this.ctx!.createGain();
        gain.gain.setValueAtTime(0.45, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 2.8);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGain!);
        osc.start(now);
        osc.stop(now + 2.8);
      });
    } catch {}
  }

  // --- TRAIN AMBIENT RIDE ---
  public playTrainRide() {
    this.resumeContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(80, now);
      osc.frequency.setValueAtTime(45, now + 0.06);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.08);
    } catch {}
  }
}

export const audioManager = new SoundEngine();
