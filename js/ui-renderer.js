import { log, formatSeconds, osc, makeImpulse } from './utils.js';

export class UIRenderer {
  constructor(audioEngine, trackManager) {
    this.audioEngine = audioEngine;
    this.trackManager = trackManager;
    this.state = { help: false };
    this.cvs = document.getElementById('canvas');
    this.ctx2d = this.cvs.getContext('2d');
    this.scope = document.getElementById('scope');
    this.sctx = this.scope.getContext('2d');
  }

  tick() {
    this.drawTimeline();
    this.drawAnalyser();
    requestAnimationFrame(() => this.tick());
  }

  drawTimeline() {
    const W = this.cvs.width;
    const H = this.cvs.height;
    this.ctx2d.fillStyle = '#0b1220';
    this.ctx2d.fillRect(0, 0, W, H);
    const dur = 12;
    const secWidth = W / dur;
    this.ctx2d.strokeStyle = '#1f2a44';
    this.ctx2d.lineWidth = 1;
    for (let s = 0; s <= dur; s++) {
      const x = Math.floor(s * secWidth) + 0.5;
      this.ctx2d.beginPath();
      this.ctx2d.moveTo(x, 0);
      this.ctx2d.lineTo(x, H);
      this.ctx2d.stroke();
      this.ctx2d.fillStyle = '#64748b';
      this.ctx2d.font = '12px system-ui';
      this.ctx2d.fillText(s + 's', x + 2, 12);
    }
    if (this.audioEngine.loop.enabled) {
      const ls = this.audioEngine.loop.start;
      const le = this.audioEngine.loop.end;
      const x1 = ls / dur * W;
      const x2 = le / dur * W;
      this.ctx2d.fillStyle = 'rgba(96,165,250,0.15)';
      this.ctx2d.fillRect(x1, 0, x2 - x1, H);
      this.ctx2d.strokeStyle = '#60a5fa';
      this.ctx2d.beginPath();
      this.ctx2d.moveTo(x1, 0);
      this.ctx2d.lineTo(x1, H);
      this.ctx2d.moveTo(x2, 0);
      this.ctx2d.lineTo(x2, H);
      this.ctx2d.stroke();
    }
    const xph = (this.audioEngine.playhead / dur) * W;
    this.ctx2d.strokeStyle = '#22c55e';
    this.ctx2d.beginPath();
    this.ctx2d.moveTo(xph, 0);
    this.ctx2d.lineTo(xph, H);
    this.ctx2d.stroke();
  }

  drawAnalyser() {
    const W = this.scope.width;
    const H = this.scope.height;
    this.sctx.fillStyle = '#0b1220';
    this.sctx.fillRect(0, 0, W, H);
    if (!this.audioEngine.analyser) return;
    const bufLen = this.audioEngine.analyser.frequencyBinCount;
    const data = new Uint8Array(bufLen);
    this.audioEngine.analyser.getByteTimeDomainData(data);
    this.sctx.strokeStyle = '#22c55e';
    this.sctx.lineWidth = 1;
    this.sctx.beginPath();
    for (let i = 0; i < bufLen; i++) {
      const x = i / bufLen * W;
      const y = (data[i] / 255) * H;
      if (i === 0) this.sctx.moveTo(x, y);
      else this.sctx.lineTo(x, y);
    }
    this.sctx.stroke();
  }

  static applySolo(audioEngine) {
    const anySolo = audioEngine.tracks.some(t => t.solo);
    audioEngine.tracks.forEach(t => {
      t.enabled = anySolo ? t.solo : true;
    });
    if (audioEngine.playing) {
      audioEngine._startSources();
    }
  }

  static addTrackUI(track, audioEngine) {
    const tracks = document.getElementById('tracks');
    const el = document.createElement('div');
    el.className = 'track';
    el.id = track.id;
    const left = document.createElement('div');
    left.className = 'left';
    const right = document.createElement('div');
    right.className = 'cell';

    const row1 = document.createElement('div');
    row1.className = 'row';
    const name = document.createElement('span');
    name.className = 'name';
    name.textContent = track.name;
    const type = document.createElement('span');
    type.className = 'chip';
    type.textContent = track.type === 'audio' ? 'Audio' : 'Instrumento';
    UIRenderer.tip(type, 'Tipo de pista');
    row1.append(name, type);

    const row2 = document.createElement('div');
    row2.className = 'row';
    const mute = document.createElement('button');
    mute.className = 'btn';
    mute.textContent = '🔇 Mute';
    UIRenderer.tip(mute, 'Silencia esta pista');
    const solo = document.createElement('button');
    solo.className = 'btn';
    solo.textContent = '⭐ Solo';
    UIRenderer.tip(solo, 'Escucha solo esta pista');
    row2.append(mute, solo);

    const row3 = document.createElement('div');
    row3.className = 'col';
    const vol = document.createElement('input');
    vol.type = 'range';
    vol.min = 0;
    vol.max = 1;
    vol.step = 0.01;
    vol.value = track.volume;
    UIRenderer.tip(vol, 'Volumen de la pista');
    const pan = document.createElement('input');
    pan.type = 'range';
    pan.min = -1;
    pan.max = 1;
    pan.step = 0.01;
    pan.value = track.pan;
    UIRenderer.tip(pan, 'Paneo izq/der');
    const l1 = document.createElement('label');
    l1.textContent = 'Volumen';
    l1.append(vol);
    const l2 = document.createElement('label');
    l2.textContent = 'Pan';
    l2.append(pan);
    row3.append(l1, l2);

    const fx = document.createElement('div');
    fx.className = 'fx';
    const btnEq = document.createElement('button');
    btnEq.className = 'btn';
    btnEq.textContent = '🎛️ EQ';
    UIRenderer.tip(btnEq, 'Ecualizador (bajos/agudos)');
    const btnDel = document.createElement('button');
    btnDel.className = 'btn';
    btnDel.textContent = '⏱️ Delay';
    UIRenderer.tip(btnDel, 'Eco (tiempo/feedback/mezcla)');
    const btnRev = document.createElement('button');
    btnRev.className = 'btn';
    btnRev.textContent = '🏛️ Reverb';
    UIRenderer.tip(btnRev, 'Simula sala (mezcla)');
    fx.append(btnEq, btnDel, btnRev);

    const ps = document.createElement('div');
    ps.className = 'col';
    ps.innerHTML = `
      <div class="row"><label>Bajos <input id="low" type="range" min="-1" max="1" step="0.01" value="${track.eq.low}"></label>
      <label>Agudos <input id="high" type="range" min="-1" max="1" step="0.01" value="${track.eq.high}"></label></div>
      <div class="row"><label>Delay (s) <input id="dtime" type="range" min="0" max="0.9" step="0.01" value="${track.delay.time}"></label>
      <label>Feedback <input id="dfb" type="range" min="0" max="0.95" step="0.01" value="${track.delay.feedback}"></label>
      <label>Mezcla <input id="dwet" type="range" min="0" max="1" step="0.01" value="${track.delay.wet}"></label></div>
      <div class="row"><label>Reverb (wet) <input id="rwet" type="range" min="0" max="1" step="0.01" value="${track.reverb.wet}"></label></div>`;

    left.append(row1, row2, row3, fx, ps);

    if (track.type === 'audio') {
      const wz = document.createElement('canvas');
      wz.width = 900;
      wz.height = 80;
      wz.style.background = '#0b1220';
      wz.style.border = '1px solid #334155';
      wz.style.borderRadius = '6px';
      right.append(wz);
      function drawW() {
        const wctx = wz.getContext('2d');
        wctx.fillStyle = '#0b1220';
        wctx.fillRect(0, 0, wz.width, wz.height);
        if (!track.buffer) return;
        const data = track.buffer.getChannelData(0);
        const step = Math.ceil(data.length / wz.width);
        wctx.strokeStyle = '#60a5fa';
        wctx.beginPath();
        for (let i = 0; i < wz.width; i++) {
          const idx = i * step;
          let min = 1,
            max = -1;
          for (let j = 0; j < step; j++) {
            const v = data[idx + j] || 0;
            if (v < min) min = v;
            if (v > max) max = v;
          }
          const y1 = (1 - min) * 0.5 * wz.height;
          const y2 = (1 - max) * 0.5 * wz.height;
          wctx.moveTo(i, y1);
          wctx.lineTo(i, y2);
        }
        wctx.stroke();
      }
      track._drawWave = drawW;
      drawW();
    } else {
      const row = document.createElement('div');
      row.className = 'row';
      const waveSel = document.createElement('select');
      ['sine', 'square', 'triangle', 'sawtooth'].forEach(w => {
        const opt = document.createElement('option');
        opt.value = w;
        opt.textContent = w;
        waveSel.append(opt);
      });
      waveSel.value = track.instrument.wave;
      UIRenderer.tip(waveSel, 'Forma de onda del oscilador');
      row.append(document.createTextNode('Forma:'), waveSel);
      right.append(row);
      const grid = document.createElement('div');
      grid.className = 'grid';
      for (let i = 0; i < 8; i++) {
        const sel = document.createElement('select');
        const opts = ['0', '1', '3', '5', '7', '8', '10', '12'];
        opts.forEach(o => {
          const op = document.createElement('option');
          op.value = o;
          op.textContent = o === '0' ? '—' : ('+' + o + ' semit');
          sel.append(op);
        });
        sel.value = String(track.instrument.notes[i] || 0);
        sel.className = 'marker';
        UIRenderer.tip(sel, 'Nota (semitonos desde A3)');
        grid.append(sel);
        sel.addEventListener('change', () => {
          track.instrument.notes[i] = parseInt(sel.value);
        });
      }
      right.append(grid);
      waveSel.addEventListener('change', () => {
        track.instrument.wave = waveSel.value;
      });
    }

    mute.onclick = () => {
      track.muted = !track.muted;
      mute.classList.toggle('btn-on', track.muted);
      if (audioEngine.playing) audioEngine._startSources();
    };
    solo.onclick = () => {
      track.solo = !track.solo;
      solo.classList.toggle('btn-on', track.solo);
      UIRenderer.applySolo(audioEngine);
    };
    vol.oninput = () => {
      track.volume = parseFloat(vol.value);
      if (audioEngine.playing) audioEngine._startSources();
    };
    pan.oninput = () => {
      track.pan = parseFloat(pan.value);
      if (audioEngine.playing) audioEngine._startSources();
    };
    btnEq.onclick = () => {
      track.eq.enabled = !track.eq.enabled;
      btnEq.classList.toggle('btn-on', track.eq.enabled);
      if (audioEngine.playing) audioEngine._startSources();
    };
    btnDel.onclick = () => {
      track.delay.enabled = !track.delay.enabled;
      btnDel.classList.toggle('btn-on', track.delay.enabled);
      if (audioEngine.playing) audioEngine._startSources();
    };
    btnRev.onclick = () => {
      track.reverb.enabled = !track.reverb.enabled;
      btnRev.classList.toggle('btn-on', track.reverb.enabled);
      if (audioEngine.playing) audioEngine._startSources();
    };
    ps.querySelector('#low').oninput = e => {
      track.eq.low = parseFloat(e.target.value);
      if (audioEngine.playing) audioEngine._startSources();
    };
    ps.querySelector('#high').oninput = e => {
      track.eq.high = parseFloat(e.target.value);
      if (audioEngine.playing) audioEngine._startSources();
    };
    ps.querySelector('#dtime').oninput = e => {
      track.delay.time = parseFloat(e.target.value);
      if (audioEngine.playing) audioEngine._startSources();
    };
    ps.querySelector('#dfb').oninput = e => {
      track.delay.feedback = parseFloat(e.target.value);
      if (audioEngine.playing) audioEngine._startSources();
    };
    ps.querySelector('#dwet').oninput = e => {
      track.delay.wet = parseFloat(e.target.value);
      if (audioEngine.playing) audioEngine._startSources();
    };
    ps.querySelector('#rwet').oninput = e => {
      track.reverb.wet = parseFloat(e.target.value);
      if (audioEngine.playing) audioEngine._startSources();
    };

    tracks.append(el);
    el.append(left, right);
  }

  static tip(el, text) {
    el.title = UIRenderer.state.help ? text : '';
    if (UIRenderer.state.help) el.classList.add('tooltip');
    else el.classList.remove('tooltip');
  }
}

UIRenderer.state = { help: false };