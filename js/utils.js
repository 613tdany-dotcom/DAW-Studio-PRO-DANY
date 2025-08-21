export const log = (...args) => {
  const el = document.getElementById('log');
  el.textContent += args.join(' ') + '\n';
  el.scrollTop = el.scrollHeight;
};
export const formatSeconds = (s) => (Math.round(s * 10) / 10).toFixed(1);
export const osc = (type, phase) => {
  switch (type) {
    case 'square':
      return Math.sign(Math.sin(phase));
    case 'sawtooth':
      return 2 * (phase / (2 * Math.PI) - Math.floor(phase / (2 * Math.PI) + 0.5));
    case 'triangle':
      return Math.asin(Math.sin(phase)) * 2 / Math.PI;
    default:
      return Math.sin(phase);
  }
};
export const makeImpulse = (ctx, seconds) => {
  const len = Math.floor(seconds * ctx.sampleRate);
  const ir = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = ir.getChannelData(ch);
    for (let i = 0; i < len; i++) {
      const t = i / len;
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 3);
    }
  }
  return ir;
};
export const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
export const bufferToWav = (buffer) => {
  const numCh = Math.min(2, buffer.numberOfChannels);
  const sampleRate = buffer.sampleRate;
  const length = buffer.length * numCh * 2 + 44;
  const arr = new ArrayBuffer(length);
  const view = new DataView(arr);
  writeStr('RIFF', 0);
  view.setUint32(4, length - 8, true);
  writeStr('WAVE', 8);
  writeStr('fmt ', 12);
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numCh, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numCh * 2, true);
  view.setUint16(32, numCh * 2, true);
  view.setUint16(34, 16, true);
  writeStr('data', 36);
  view.setUint32(40, length - 44, true);
  let offset = 44;
  const channels = [];
  for (let ch = 0; ch < numCh; ch++) channels.push(buffer.getChannelData(ch));
  for (let i = 0; i < buffer.length; i++) {
    for (let ch = 0; ch < numCh; ch++) {
      let s = Math.max(-1, Math.min(1, channels[ch][i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
      offset += 2;
    }
  }

  function writeStr(s, off) {
    for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i));
  }
  return arr;
};