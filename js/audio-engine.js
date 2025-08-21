import { Track } from './track-manager.js';
import { log } from './utils.js';

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.analyser = null;
    this.tempo = 100;
    this.playing = false;
    this.startTime = 0;
    this.playhead = 0;
    this.loop = { enabled: false, start: 0, end: 8 };
    this.click = { enabled: true, lastIdx: -1 };
    this.tracks = [];
    this.sources = new Map(); // id -> {src, chain}
  }

  async init() {
    if (this.ctx) return;
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.ctx = ctx;
    this.masterGain = ctx.createGain();
    this.masterGain.gain.value = 0.8;
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 2048;
    this.masterGain.connect(this.analyser);
    this.analyser.connect(ctx.destination);
    log('Audio inicializado:', ctx.sampleRate, 'Hz');
  }

  setTempo(bpm) {
    this.tempo = bpm;
    this.click.lastIdx = -1;
  }

  _startSources() {
    this._stopAllSources();
    const when = this.ctx.currentTime + 0.02;
    for (const track of this.tracks) {
      if (!track.enabled) continue;
      const buf = track.getBuffer();
      if (!buf) continue;
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      const chain = track.buildFxChain(this.ctx);
      src.connect(chain.input);
      chain.output.connect(this.masterGain);
      const offset = Math.min(this.playhead, Math.max(0, buf.duration - 0.001));

      if (this.loop.enabled) {
        const loopDur = Math.max(0.001, this.loop.end - this.playhead);
        try {
          src.start(when, offset);
          src.stop(when + loopDur);
        } catch (e) {
          src.start(when, offset);
        }
        src.onended = () => {
          if (this.playing) {
            this.playhead = this.loop.start;
            this.startTime = this.ctx.currentTime - this.playhead;
            this._startSources();
          }
        };
      } else {
        src.start(when, offset);
      }
      this.sources.set(track.id, { src, chain });
    }
  }

  _stopAllSources() {
    for (const [id, obj] of this.sources) {
      try {
        obj.src.stop();
        obj.chain.disconnect?.();
      } catch (e) {}
    }
    this.sources.clear();
  }

  play() {
    if (!this.ctx) return;
    if (this.playing) return;
    this.startTime = this.ctx.currentTime - this.playhead;
    this.playing = true;
    this._startSources();
  }

  pause() {
    this.playing = false;
    this._stopAllSources();
  }

  stop() {
    this.pause();
    this.playhead = this.loop.enabled ? this.loop.start : 0;
    this.click.lastIdx = -1;
  }

  tick() {
    if (!this.ctx) return requestAnimationFrame(() => this.tick());
    if (this.playing) {
      this.playhead = this.ctx.currentTime - this.startTime;
      if (this.loop.enabled && this.playhead >= this.loop.end) {
        this.playhead = this.loop.start;
        this.startTime = this.ctx.currentTime - this.playhead;
        this._startSources();
      }
      if (this.click.enabled) {
        const spb = 60 / this.tempo;
        const idx = Math.floor(this.playhead / spb);
        if (idx !== this.click.lastIdx) {
          this._tickClick();
          this.click.lastIdx = idx;
        }
      }
    }
    requestAnimationFrame(() => this.tick());
  }

  _tickClick() {
    const t = this.ctx.currentTime + 0.001;
    const osc = this.ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.value = 1000;
    const env = this.ctx.createGain();
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(0.7, t + 0.005);
    env.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    osc.connect(env).connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.1);
    const lamp = document.getElementById('lamp');
    lamp.classList.add('on');
    setTimeout(() => lamp.classList.remove('on'), 90);
  }

  async exportMix() {
    const sr = this.ctx.sampleRate;
    const lengthSec = Math.max(8, Math.max(0, ...this.tracks.map(t => t.getDuration() || 0)) + 1);
    const offline = new OfflineAudioContext(2, Math.ceil(lengthSec * sr), sr);
    const master = offline.createGain();
    master.gain.value = parseFloat(document.getElementById('masterGain').value);
    master.connect(offline.destination);
    for (const track of this.tracks) {
      if (!track.enabled) continue;
      const buf = track.getBuffer(offline);
      if (!buf) continue;
      const chain = track.buildFxChain(offline);
      const src = offline.createBufferSource();
      src.buffer = buf;
      src.connect(chain.input);
      chain.output.connect(master);
      src.start(0);
    }
    const rendered = await offline.startRendering();
    const wav = bufferToWav(rendered);
    const blob = new Blob([wav], {
      type: 'audio/wav'
    });
    downloadBlob(blob, 'mezcla.wav');
  }
}

// Funciones de utilidad movidas a utils.js
import { bufferToWav, downloadBlob } from './utils.js';