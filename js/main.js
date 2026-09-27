import { DitherWaveBackground } from './dither-wave.js';
import { PixelCursorTrail } from './pixel-trail.js';
import { ProjectViewer } from './project-viewer.js';

document.addEventListener('DOMContentLoaded', () => {
  const heroBg = document.getElementById('hero-bg-canvas');
  if (heroBg) {
    const ditherWave = new DitherWaveBackground(heroBg, {
      color: '#1f2de6',
      paperColor: '#f4f5f8',
      pixelSize: 2.5,
      density: 0.74,
      speed: 1.1,
      interactive: true,
    });
    ditherWave.setRunning(true);
  }

  const interactiveItems = document.querySelectorAll('.editorial-item, .stack-rows');
  interactiveItems.forEach((item) => {
    new PixelCursorTrail(item, {
      columns: 24,
      fadeDuration: 550,
      color: 'rgba(31, 45, 230, 0.22)',
    });
  });

  new ProjectViewer();
});
