
export class PixelCursorTrail {
  constructor(container, options = {}) {
    this.container = typeof container === 'string' ? document.querySelector(container) : container;
    if (!this.container) return;

    this.columns = options.columns || 24;
    this.color = options.color || 'var(--accent-glow)';
    this.fadeDuration = options.fadeDuration || 600;

    const compPos = window.getComputedStyle(this.container).position;
    if (compPos === 'static') {
      this.container.style.position = 'relative';
    }

    this.wrapper = document.createElement('div');
    this.wrapper.className = 'pixel-trail-wrapper';
    this.wrapper.style.position = 'absolute';
    this.wrapper.style.inset = '0';
    this.wrapper.style.overflow = 'hidden';
    this.wrapper.style.pointerEvents = 'none';
    this.wrapper.style.userSelect = 'none';
    this.wrapper.style.display = 'flex';
    this.wrapper.style.zIndex = '1';

    this.container.appendChild(this.wrapper);
    this.cells = [];

    this.init();
  }

  build() {
    this.wrapper.innerHTML = '';
    this.cells = [];

    const rect = this.container.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const blockSize = rect.width / this.columns;
    const rows = blockSize > 0 ? Math.ceil(rect.height / blockSize) : 0;
    this.rows = rows;
    this.blockSize = blockSize;

    for (let col = 0; col < this.columns; col++) {
      const colEl = document.createElement('div');
      colEl.style.display = 'flex';
      colEl.style.flex = '1';
      colEl.style.flexDirection = 'column';

      for (let row = 0; row < rows; row++) {
        const cell = document.createElement('div');
        cell.style.width = '100%';
        cell.style.height = `${blockSize}px`;
        cell.style.backgroundColor = 'transparent';
        cell.style.willChange = 'background-color, opacity';
        colEl.appendChild(cell);
        this.cells[col * rows + row] = cell;
      }
      this.wrapper.appendChild(colEl);
    }
  }

  colorize(cell) {
    if (!cell) return;
    cell.style.transition = 'none';
    cell.style.backgroundColor = this.color || 'currentColor';
    cell.style.opacity = '0.35';
    void cell.offsetWidth;
    
    requestAnimationFrame(() => {
      cell.style.transition = `background-color ${this.fadeDuration}ms ease-out, opacity ${this.fadeDuration}ms ease-out`;
      cell.style.backgroundColor = 'transparent';
      cell.style.opacity = '0';
    });
  }

  handleMouseMove(e) {
    const rect = this.container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (x < 0 || y < 0 || x > rect.width || y > rect.height || !this.blockSize || !this.rows) return;

    const col = Math.min(this.columns - 1, Math.max(0, Math.floor(x / this.blockSize)));
    const row = Math.min(this.rows - 1, Math.max(0, Math.floor(y / this.blockSize)));
    const index = col * this.rows + row;
    const cell = this.cells[index];
    if (cell) this.colorize(cell);
  }

  init() {
    this.build();

    this.onResize = () => this.build();
    this.resizeObserver = new ResizeObserver(this.onResize);
    this.resizeObserver.observe(this.container);

    this.onMove = (e) => this.handleMouseMove(e);
    window.addEventListener('mousemove', this.onMove, { passive: true });
  }

  destroy() {
    if (this.resizeObserver) this.resizeObserver.disconnect();
    window.removeEventListener('mousemove', this.onMove);
    if (this.wrapper && this.wrapper.parentElement) {
      this.wrapper.parentElement.removeChild(this.wrapper);
    }
  }
}
