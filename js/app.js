import { AudioEngine } from './audio-engine.js';
import { TrackManager } from './track-manager.js';
import { UIRenderer } from './ui-renderer.js';
import { log } from './utils.js';

(function(){
  const audio = new AudioEngine();
  const trackManager = new TrackManager(audio);
  const ui = new UIRenderer(audio, trackManager);

  // Inicialización y configuración de eventos
  const setupEventListeners = () => {
    // Eventos de transporte
    document.getElementById('btnPlay').onclick = async () => {
      await audio.init();
      audio.play();
    };
    document.getElementById('btnPause').onclick = () => audio.pause();
    document.getElementById('btnStop').onclick = () => audio.stop();
    document.getElementById('bpm').oninput = (e) => audio.setTempo(parseInt(e.target.value));
    document.getElementById('btnClick').onclick = () => {
      audio.click.enabled = !audio.click.enabled;
      document.getElementById('btnClick').classList.toggle('btn-on', audio.click.enabled);
    };
    document.getElementById('btnLoop').onclick = () => {
      audio.loop.enabled = !audio.loop.enabled;
      document.getElementById('btnLoop').classList.toggle('btn-on', audio.loop.enabled);
    };
    document.getElementById('loopStart').oninput = (e) => audio.loop.start = parseFloat(e.target.value);
    document.getElementById('loopEnd').oninput = (e) => audio.loop.end = parseFloat(e.target.value);

    // Eventos de proyecto
    document.getElementById('btnExport').onclick = async () => {
      await audio.init();
      log('Renderizando mezcla...');
      try {
        await audio.exportMix();
        log('Exportación completada.');
      } catch (err) {
        log('Error al exportar:', err);
      }
    };
    document.getElementById('btnNew').onclick = () => location.reload();

    // Eventos de pistas
    document.getElementById('btnAddAudio').onclick = () => document.getElementById('fileInput').click();
    document.getElementById('fileInput').addEventListener('change', async (e) => {
      await audio.init();
      const files = e.target.files;
      for (const f of files) {
        trackManager.addAudioTrack(f);
      }
      e.target.value = '';
    });
    document.getElementById('btnAddInstrument').onclick = async () => {
      await audio.init();
      trackManager.addInstrumentTrack();
    };

    // Eventos de grabación
    document.getElementById('btnRecord').onclick = () => trackManager.toggleRecord();
    document.getElementById('btnMonitor').onclick = () => trackManager.toggleMonitor();
    document.getElementById('btnAuditionTake').onclick = () => trackManager.auditionLastTake();
    document.getElementById('btnStopAudition').onclick = () => trackManager.stopAudition();

    // Eventos de marcadores
    document.getElementById('btnMarker').onclick = () => {
      const sec = audio.playhead;
      const btn = document.createElement('button');
      btn.className = 'marker';
      btn.textContent = ui.formatSeconds(sec) + 's';
      btn.onclick = () => {
        audio.playhead = sec;
        if (audio.ctx) {
          audio.startTime = audio.ctx.currentTime - sec;
          if (audio.playing) audio._startSources();
        }
      };
      document.getElementById('markers').append(btn);
    };

    // Ayuda
    document.getElementById('helpToggle').onclick = () => {
      ui.state.help = !ui.state.help;
      document.getElementById('helpState').textContent = ui.state.help ? 'ON' : 'OFF';
    };
    document.getElementById('masterGain').oninput = (e) => {
      if (audio.masterGain) audio.masterGain.gain.value = parseFloat(e.target.value);
    };
  };

  const startApp = async () => {
    setupEventListeners();
    await audio.init();
    ui.tick();
  };

  startApp();
})();