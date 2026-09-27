export const PROJECTS_DATA = {
  weathr: {
    id: 'weathr',
    title: 'Weathr',
    category: 'Mobile Application',
    period: '2026',
    aspectMode: 'portrait',
    subtitle: 'Weather Android App with OpenMeteo API',
    summary: 'Weather application developed for Android devices using React and Capacitor. The application fetches live data from the OpenMeteo API and presents it using ASCII-styled art, multi-day forecasts, and atmospheric indicators in a responsive interface.',
    highlights: [
      'Built with React and packaged for Android via Capacitor.',
      'Uses OpenMeteo REST API for real-time weather metrics.',
      'Offline data caching with local state persistence.',
      'Custom ASCII art for every weather condition.'
    ],
    stack: ['React', 'Capacitor', 'JavaScript', 'OpenMeteo API', 'CSS Modules'],
    links: [],
    media: [
      {
        type: 'image',
        src: './assets/media/weathr/1.jpg'
      },
      {
        type: 'video',
        src: './assets/media/weathr/2.mp4'
      },
      {
        type: 'image',
        src: './assets/media/weathr/3.jpg'
      },
      {
        type: 'video',
        src: './assets/media/weathr/4.mp4'
      }
    ]
  },
  carrom: {
    id: 'carrom',
    title: 'Carrom',
    category: 'Embedded Systems / Mobile App',
    period: '2025 — 2026',
    aspectMode: 'portrait',
    subtitle: 'Bluetooth app to control an RC car',
    summary: 'Native Android application engineered in Kotlin to establish high-speed, bidirectional communication with embedded development boards like ESP32, Arduino, Raspberry Pi, and Tang Nano FPGA via Bluetooth and Serial UART.',
    highlights: [
      'Developed in Kotlin using Android Studio.',
      'Virtual analog joystick control interface.',
      'Multi-board protocol compatibility supporting ESP32, Arduino, and Tang Nano.'
    ],
    stack: ['Kotlin', 'Android Studio', 'Bluetooth', 'Serial UART', 'ESP32', 'Arduino', 'Embedded C++'],
    links: [
      { label: 'GitHub Repository', url: 'https://github.com/NotWoshy/Carrom' }
    ],
    media: [
      {
        type: 'image',
        src: './assets/media/carrom/1.png?v=2'
      },
      {
        type: 'image',
        src: './assets/media/carrom/2.png?v=2'
      }
    ]
  },
  leaflet: {
    id: 'leaflet',
    title: 'Leaflet',
    category: 'Mobile Application',
    period: '2026',
    aspectMode: 'portrait',
    subtitle: 'Freeform Diary/Scrapbook Application',
    summary: 'Diary simulation app designed as a spatial freeform canvas allowing users to place notes anywhere on screen. Built with React and Capacitor, using SQLite for local-first persistent storage and multimedia support.',
    highlights: [
      'Spatial freeform canvas allowing users to place notes anywhere.',
      'Local-first persistent storage using SQLite via Capacitor plugins.',
      'Multimedia support for camera snapshots and cards.'
    ],
    stack: ['React', 'Capacitor', 'SQLite', 'JavaScript', 'CSS Grid/Canvas', 'Mobile UI'],
    links: [],
    media: [
      {
        type: 'video',
        src: './assets/media/leaflet/1.mp4'
      },
      {
        type: 'video',
        src: './assets/media/leaflet/2.mp4'
      },
      {
        type: 'image',
        src: './assets/media/leaflet/3.jpg'
      },
      {
        type: 'image',
        src: './assets/media/leaflet/4.jpg'
      }
    ]
  }
};

export class ProjectViewer {
  constructor() {
    this.detailPanel = document.getElementById('view-project-detail');
    this.detailContent = document.getElementById('project-detail-content');
    this.currentScrollY = 0;
    this.activeProjectId = null;
    this.activePairIndex = 0;
    this.totalPairs = 1;
    this.currentMediaList = [];
    this.autoplayTimer = null;
    this.videoEndListeners = [];
    this.isHovered = false;
    this.pendingAdvance = false;
    this.justSwiped = false;

    if (!this.detailPanel || !this.detailContent) return;

    this.initEvents();
  }

  initEvents() {
    document.addEventListener('click', (e) => {
      const trigger = e.target.closest('[data-project-id]');
      if (trigger) {
        e.preventDefault();
        const projectId = trigger.getAttribute('data-project-id');
        this.openProject(projectId);
        return;
      }

      const backBtn = e.target.closest('#project-back-btn, .back-btn');
      if (backBtn) {
        e.preventDefault();
        this.closeProject();
        return;
      }

      const showcase = e.target.closest('#dual-showcase-wrapper');
      if (showcase && this.totalPairs > 1) {
        if (this.justSwiped) return;
        this.nextPair();
      }
    });

    window.addEventListener('keydown', (e) => {
      if (!document.body.classList.contains('detail-active')) return;

      if (e.key === 'Escape') {
        this.closeProject();
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        this.nextPair();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        this.prevPair();
      }
    });
  }

  startAutoplay() {
    this.scheduleAutoplayForActivePair();
  }

  stopAutoplay() {
    if (this.autoplayTimer) {
      clearTimeout(this.autoplayTimer);
      this.autoplayTimer = null;
    }
    if (this.videoEndListeners && this.videoEndListeners.length > 0) {
      this.videoEndListeners.forEach(({ element, handler, event }) => {
        element.removeEventListener(event, handler);
      });
      this.videoEndListeners = [];
    }
  }

  scheduleAutoplayForActivePair() {
    this.stopAutoplay();
    if (this.totalPairs <= 1) return;

    const activeSlides = this.detailContent.querySelectorAll('.dual-screen-slide.active');
    const activeVideos = [];
    activeSlides.forEach((slide) => {
      const vid = slide.querySelector('video');
      if (vid) activeVideos.push(vid);
    });

    if (activeVideos.length === 0) {
      this.autoplayTimer = setTimeout(() => {
        if (!this.isHovered) {
          this.nextPair();
        } else {
          this.pendingAdvance = true;
        }
      }, 6000);
      return;
    }

    const completedVideos = new Set();
    const pairStartTime = performance.now();
    let hasAdvanced = false;

    const tryAdvance = () => {
      if (hasAdvanced) return;
      if (completedVideos.size >= activeVideos.length) {
        hasAdvanced = true;
        const elapsed = performance.now() - pairStartTime;
        const waitBuffer = Math.max(700, 5000 - elapsed);
        this.autoplayTimer = setTimeout(() => {
          if (!this.isHovered) {
            this.nextPair();
          } else {
            this.pendingAdvance = true;
          }
        }, waitBuffer);
      }
    };

    activeVideos.forEach((vid) => {
      const onEnded = () => {
        completedVideos.add(vid);

        if (completedVideos.size < activeVideos.length) {
          vid.currentTime = 0;
          vid.play().catch(() => {});
        }

        tryAdvance();
      };

      vid.addEventListener('ended', onEnded);
      this.videoEndListeners.push({ element: vid, handler: onEnded, event: 'ended' });

      const setupFallback = () => {
        const durations = activeVideos.map((v) => (v.duration && !isNaN(v.duration) ? v.duration : 0));
        const maxDur = Math.max(...durations);
        if (maxDur > 0 && !hasAdvanced) {
          const fallbackMs = Math.max(6000, (maxDur + 1.2) * 1000);
          if (this.autoplayTimer) clearTimeout(this.autoplayTimer);
          this.autoplayTimer = setTimeout(() => {
            if (!this.isHovered && !hasAdvanced) {
              hasAdvanced = true;
              this.nextPair();
            } else if (this.isHovered) {
              this.pendingAdvance = true;
            }
          }, fallbackMs);
        }
      };

      if (!isNaN(vid.duration) && vid.duration > 0) {
        setupFallback();
      } else {
        const onMeta = () => setupFallback();
        vid.addEventListener('loadedmetadata', onMeta, { once: true });
        this.videoEndListeners.push({ element: vid, handler: onMeta, event: 'loadedmetadata' });
      }
    });
  }

  initDualGestures() {
    const showcase = document.getElementById('dual-showcase-wrapper');
    if (!showcase) return;

    showcase.addEventListener('mouseenter', () => {
      this.isHovered = true;
      if (this.autoplayTimer) {
        clearTimeout(this.autoplayTimer);
        this.autoplayTimer = null;
      }
    });

    showcase.addEventListener('mouseleave', () => {
      this.isHovered = false;
      if (this.pendingAdvance) {
        this.pendingAdvance = false;
        this.nextPair();
      } else {
        this.scheduleAutoplayForActivePair();
      }
    });

    let touchStartX = 0;
    showcase.addEventListener('touchstart', (e) => {
      touchStartX = e.touches[0].clientX;
      this.stopAutoplay();
    }, { passive: true });

    showcase.addEventListener('touchend', (e) => {
      const touchEndX = e.changedTouches[0].clientX;
      const diffX = touchStartX - touchEndX;
      if (Math.abs(diffX) > 35) {
        this.justSwiped = true;
        setTimeout(() => { this.justSwiped = false; }, 400);
        if (diffX > 0) {
          this.nextPair();
        } else {
          this.prevPair();
        }
      } else {
        this.startAutoplay();
      }
    }, { passive: true });
  }

  goToPair(pairIndex) {
    if (this.totalPairs <= 0) return;
    this.activePairIndex = (pairIndex + this.totalPairs) % this.totalPairs;
    this.pendingAdvance = false;

    const slides = document.querySelectorAll('.dual-screen-slide');
    slides.forEach((slide) => {
      const pIdx = parseInt(slide.getAttribute('data-pair-index'), 10);
      const isActive = pIdx === this.activePairIndex;
      slide.classList.toggle('active', isActive);

      const vid = slide.querySelector('video');
      if (vid) {
        if (isActive) {
          vid.currentTime = 0;
          vid.play().catch(() => {});
        } else {
          vid.pause();
        }
      }
    });

    this.startAutoplay();
  }

  nextPair() {
    this.goToPair(this.activePairIndex + 1);
  }

  prevPair() {
    this.goToPair(this.activePairIndex - 1);
  }

  openProject(projectId) {
    const project = PROJECTS_DATA[projectId];
    if (!project) return;

    this.activeProjectId = projectId;
    this.currentScrollY = window.scrollY;
    this.isHovered = false;
    this.pendingAdvance = false;

    this.renderDetail(project);

    document.body.classList.add('detail-active');
    this.detailPanel.setAttribute('aria-hidden', 'false');

    if (window.__ditherWave) {
      window.__ditherWave.setDetailMode(true);
    }

    this.goToPair(0);
  }

  closeProject() {
    this.stopAutoplay();
    this.isHovered = false;
    this.pendingAdvance = false;

    if (this.detailContent) {
      const videos = this.detailContent.querySelectorAll('video');
      videos.forEach((vid) => vid.pause());
    }

    document.body.classList.remove('detail-active');
    this.detailPanel.setAttribute('aria-hidden', 'true');
    this.activeProjectId = null;

    if (window.__ditherWave) {
      window.__ditherWave.setDetailMode(false);
    }

    window.scrollTo({
      top: this.currentScrollY,
      behavior: 'instant'
    });
  }

  renderDetail(project) {
    this.activePairIndex = 0;
    this.currentMediaList = Array.isArray(project.media) && project.media.length > 0
      ? project.media
      : project.image
        ? [{ type: 'image', src: project.image }]
        : [];

    const isPortrait = project.aspectMode === 'portrait' || project.id === 'weathr';

    const highlightsHtml = project.highlights
      .map((h) => `<li class="project-highlight-item"><span class="highlight-bullet">›</span> <span>${h}</span></li>`)
      .join('');

    const stackHtml = project.stack
      .map((s) => `<span class="tag-pill">${s}</span>`)
      .join('');

    const validLinks = Array.isArray(project.links)
      ? project.links.filter((link) => link && link.url && link.label)
      : [];

    const linksBlockHtml = validLinks.length > 0
      ? `
        <div class="detail-subblock">
          <div class="hero-contact-info">
            ${validLinks
              .map(
                (link) => `
                <a href="${link.url}" target="_blank" rel="noopener noreferrer" class="hero-btn-link">
                  <span>${link.label}</span>
                  <svg class="external-arrow" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="7" y1="17" x2="17" y2="7"></line>
                    <polyline points="7 7 17 7 17 17"></polyline>
                  </svg>
                </a>`
              )
              .join('')}
          </div>
        </div>`
      : '';

    const isDual = this.currentMediaList.length > 1;
    let rightColumnContent = '';

    if (isDual) {
      this.totalPairs = Math.ceil(this.currentMediaList.length / 2);
      const leftItems = this.currentMediaList.filter((_, idx) => idx % 2 === 0);
      const rightItems = this.currentMediaList.filter((_, idx) => idx % 2 === 1);

      const renderSlides = (items, isSlotRight = false) =>
        items
          .map((item, pairIdx) => {
            const isVideo = item.type === 'video' || (item.src && /\.(mp4|webm|ogg)$/i.test(item.src));
            const mediaTag = isVideo
              ? `<video class="phone-media-element" src="${item.src}" muted playsinline preload="metadata">Tu navegador no soporta video.</video>`
              : `<img class="phone-media-element" src="${item.src}" alt="${project.title}" loading="${pairIdx === 0 ? 'eager' : 'lazy'}" />`;

            return `
              <div class="dual-screen-slide ${pairIdx === 0 ? 'active' : ''}" data-pair-index="${pairIdx}">
                ${mediaTag}
              </div>
            `;
          })
          .join('');

      rightColumnContent = `
        <div class="dual-showcase-wrapper" id="dual-showcase-wrapper" title="${this.totalPairs > 1 ? '' : ''}">
          <div class="dual-screen-card ${isPortrait ? 'is-portrait' : 'is-landscape'}">
            ${renderSlides(leftItems, false)}
          </div>
          <div class="dual-screen-card ${isPortrait ? 'is-portrait' : 'is-landscape'}">
            ${renderSlides(rightItems, true)}
          </div>
        </div>
      `;
    } else {
      this.totalPairs = 1;
      const singleItem = this.currentMediaList[0];
      const isVideo = singleItem?.type === 'video' || (singleItem?.src && /\.(mp4|webm|ogg)$/i.test(singleItem.src));
      const mediaTag = isVideo
        ? `<video class="phone-media-element" src="${singleItem.src}" autoplay loop muted playsinline preload="metadata">Tu navegador no soporta video.</video>`
        : `<img class="phone-media-element" src="${singleItem?.src || ''}" alt="${project.title}" />`;

      rightColumnContent = `
        <div class="dual-showcase-wrapper" id="dual-showcase-wrapper">
          <div class="dual-screen-card ${isPortrait ? 'is-portrait' : 'is-landscape'}">
            <div class="dual-screen-slide active" data-pair-index="0">
              ${mediaTag}
            </div>
          </div>
        </div>
      `;
    }

    this.detailContent.innerHTML = `
      <div class="project-detail-layout">
        
        <!-- LEFT COLUMN: Compact High-Density Editorial Panel -->
        <div class="project-detail-col-left">
          
          <div class="project-detail-header">
            <div class="project-detail-meta">
              <span class="editorial-category">${project.category}</span>
              <span class="hero-contact-sep">/</span>
              <span class="editorial-period">${project.period}</span>
            </div>

            <h1 class="project-detail-title">${project.title}</h1>
            <p class="project-detail-subtitle">${project.subtitle}</p>
          </div>

          <div class="detail-section-block">
            <p class="project-detail-summary">${project.summary}</p>
          </div>

          <div class="detail-section-block">
            <ul class="project-highlights-list">
              ${highlightsHtml}
            </ul>
          </div>

          <div class="detail-meta-row">
            <div class="detail-subblock">
              <div class="editorial-tags">
                ${stackHtml}
              </div>
            </div>
            ${linksBlockHtml}
          </div>

        </div>

        <!-- RIGHT COLUMN: Dual Screen Side-by-Side Showcase (Pure Media, Zero Noise) -->
        <div class="project-detail-col-right">
          ${rightColumnContent}
        </div>

      </div>
    `;

    this.initDualGestures();
  }
}
