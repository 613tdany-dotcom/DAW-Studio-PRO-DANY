import { log } from './utils.js';
import { UIRenderer } from './ui-renderer.js';

let trackId = 1;
export class TrackManager {
  constructor(audioEngine) {
    this.audioEngine = audioEngine;
    this.mediaRecorder = null;
    this.recChunks = [];
    this.micStream = null;
    this.monitorNode = null;
    this.lastRecordedBuffer = null;
    this.auditionSrc = null;
  }

  async addAudioTrack(file) {
    const buf = await file.arrayBuffer();
    const audio = await this.audioEngine.ctx.decodeAudioData(buf.slice(0));
    const t = new Track('audio', file.name);
    t.buffer = audio;
    this.audioEngine.tracks.push(t);
    UIRenderer.addTrackUI(t, this.audioEngine);
    log('Pista de audio agregada:', file.name);
    if (this.audioEngine.playing) this.audioEngine._startSources();
  }

  async addInstrumentTrack() {
    const t = new Track('instrument', 'Sintetizador');
    this.audioEngine.tracks.push(t);
    UIRenderer.addTrackUI(t, this.audioEngine);
    log('Pista instrumento agregada.');
    if (this.audioEngine.playing) this.audioEngine._startSources();
  }

  async ensureMic() {
    await this.audioEngine.init();
    if (this.micStream) return;
    this.micStream = await navigator.mediaDevices.getUserMedia({
      audio: true
    });
    this.monitorNode = this.audioEngine.ctx.createGain();
    this.monitorNode.gain.value = 1.0;
    const src = this.audioEngine.ctx.createMediaStreamSource(this.micStream);
    src.connect(this.monitorNode);
  }

  async toggleMonitor() {
    try {
      await this.ensureMic();
    } catch (err) {
      log('Mic no disponible. Abre con servidor local (localhost).');
      return;
    }
    const btn = document.getElementById('btnMonitor');
    if (this.monitorNode && !this.monitorNode._connected) {
      this.monitorNode.connect(this.audioEngine.masterGain);
      this.monitorNode._connected = true;
      btn.classList.add('btn-on');
      log('Monitor activado.');
    } else if (this.monitorNode && this.monitorNode._connected) {
      try {
        this.monitorNode.disconnect();
      } catch (e) {}
      this.monitorNode._connected = false;
      btn.classList.remove('btn-on');
      log('Monitor desactivado.');
    }
  }

  async toggleRecord() {
    await this.audioEngine.init();
    if (!this.mediaRecorder) {
      try {
        await this.ensureMic();
        this.mediaRecorder = new MediaRecorder(this.micStream);
        this.mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) this.recChunks.push(e.data);
        };
        this.mediaRecorder.onstop = async () => {
          const blob = new Blob(this.recChunks, {
            type: 'audio/webm'
          });
          this.recChunks = [];
          const arr = await blob.arrayBuffer();
          let audioBuf;
          try {
            audioBuf = await this.audioEngine.ctx.decodeAudioData(arr.slice(0));
          } catch (err) {
            log('No se pudo decodificar WebM en este navegador.');
            this.mediaRecorder = null;
            return;
          }
          this.lastRecordedBuffer = audioBuf;
          document.getElementById('btnAuditionTake').disabled = false;
          document.getElementById('btnStopAudition').disabled = false;
          const t = new Track('audio', 'Grabación');
          t.buffer = audioBuf;
          this.audioEngine.tracks.push(t);
          UIRenderer.addTrackUI(t, this.audioEngine);
          log('Grabación agregada como pista.');
          if (this.audioEngine.playing) this.audioEngine._startSources();
          this.mediaRecorder = null;
        };
        this.mediaRecorder.start();
        log('Grabando... pulsa de nuevo para detener.');
        document.getElementById('btnRecord').classList.add('btn-on');
      } catch (err) {
        log('Permiso de micrófono denegado o no disponible. Abre con un servidor local (localhost).');
        this.mediaRecorder = null;
      }
    } else {
      if (this.mediaRecorder.state === 'recording') {
        this.mediaRecorder.stop();
        document.getElementById('btnRecord').classList.remove('btn-on');
      }
    }
  }

  auditionLastTake() {
    if (!this.lastRecordedBuffer || !this.audioEngine.ctx) return;
    if (this.auditionSrc) {
      try {
        this.auditionSrc.stop();
      } catch (e) {}
    }
    const src = this.audioEngine.ctx.createBufferSource();
    src.buffer = this.lastRecordedBuffer;
    src.connect(this.audioEngine.masterGain);
    src.start();
    this.auditionSrc = src;
    log('Reproduciendo última toma...');
  }

  stopAudition() {
    if (this.auditionSrc) {
      try {
        this.auditionSrc.stop();
      } catch (e) {}
      this.auditionSrc = null;
      log('Audición detenida.');
    }
  }
}

// La clase Track se mueve aquí
let trackId = 1;
export class Track {
  constructor(type, name) {
    this.id = 't' + (trackId++);
    this.type = type;
    this.name = name || (type === 'audio' ? 'Audio' : 'Instrumento');
    this.enabled = true;
    this.muted = false;
    this.solo = false;
    this.volume = 0.9;
    this.pan = 0.0;
    this.eq = { enabled: false, low: 0, high: 0 };
    this.delay = { enabled: false, time: 0.25, feedback: 0.25, wet: 0.2 };
    this.reverb = { enabled: false, wet: 0.25 };
    this.buffer = null;
    this.instrument = { wave: 'sine', notes: [0, 7, 0, 7, 0, 10, 0, 12] };
  }

  getDuration() {
    if (this.type === 'audio' && this.buffer) return this.buffer.duration;
    if (this.type === 'instrument') return 8 * (60 / this.audioEngine.tempo);
    return 0;
  }

  getBuffer(ctxOverride) {
    const ctx = ctxOverride || this.audioEngine.ctx;
    if (this.type === 'audio') return this.buffer;
    if (this.type === 'instrument') {
      const spb = 60 / this.audioEngine.tempo;
      const steps = 8;
      const length = Math.ceil(steps * spb * ctx.sampleRate);
      const buf = ctx.createBuffer(2, length, ctx.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const data = buf.getChannelData(ch);
        for (let i = 0; i < steps; i++) {
          const note = this.instrument.notes[i];
          if (note === 0) {
            continue;
          }
          const freq = 220 * Math.pow(2, note / 12);
          const dur = spb * 0.9;
          const start = Math.floor(i * spb * ctx.sampleRate);
          const end = Math.min(length, start + Math.floor(dur * ctx.sampleRate));
          for (let n = start; n < end; n++) {
            const tt = (n - start) / ctx.sampleRate;
            const env = Math.min(1, tt * 10) * Math.exp(-3 * tt);
            const val = osc(this.instrument.wave, 2 * Math.PI * freq * (n / ctx.sampleRate)) * env * 0.4;
            data[n] += val;
          }
        }
      }
      return buf;
    }
    return null;
  }

  buildFxChain(ctx) {
    const input = ctx.createGain();
    const output = ctx.createGain();
    const panner = (ctx.createStereoPanner ? ctx.createStereoPanner() : null);
    if (panner) panner.pan.value = this.pan;
    const gain = ctx.createGain();
    gain.gain.value = this.muted ? 0 : this.volume;

    const low = ctx.createBiquadFilter();
    low.type = 'lowshelf';
    low.frequency.value = 200;
    low.gain.value = this.eq.low * 15;
    const high = ctx.createBiquadFilter();
    high.type = 'highshelf';
    high.frequency.value = 4000;
    high.gain.value = this.eq.high * 15;

    const delay = ctx.createDelay(1.0);
    delay.delayTime.value = this.delay.time;
    const fb = ctx.createGain();
    fb.gain.value = this.delay.feedback;
    const wetDelay = ctx.createGain();
    wetDelay.gain.value = this.delay.enabled ? this.delay.wet : 0;
    delay.connect(fb).connect(delay);

    const conv = ctx.createConvolver();
    if (!Track._ir) {
      Track._ir = UIRenderer.makeImpulse(ctx, 1.8);
    }
    conv.buffer = Track._ir;
    const wetRev = ctx.createGain();
    wetRev.gain.value = this.reverb.enabled ? this.reverb.wet : 0;

    if (this.eq.enabled) {
      input.connect(low);
      low.connect(high);
      if (panner) {
        high.connect(panner);
        panner.connect(gain);
      } else {
        high.connect(gain);
      }
    } else {
      if (panner) {
        input.connect(panner);
        panner.connect(gain);
      } else {
        input.connect(gain);
      }
    }
    gain.connect(output);
    const send1 = ctx.createGain();
    input.connect(send1);
    send1.connect(delay);
    delay.connect(wetDelay).connect(output);
    const send2 = ctx.createGain();
    input.connect(send2);
    send2.connect(conv);
    conv.connect(wetRev).connect(output);
    return {
      input,
      output,
      disconnect: () => {
        try {
          input.disconnect();
          output.disconnect();
          low.disconnect();
          high.disconnect();
          delay.disconnect();
          fb.disconnect();
          wetDelay.disconnect();
          conv.disconnect();
          wetRev.disconnect();
          gain.disconnect();
          panner && panner.disconnect();
        } catch (e) {}
      }
    };
  }
}