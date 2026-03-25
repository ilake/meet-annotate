var CanvasOverlay = {
  canvas: null,
  ctx: null,
  targetVideo: null,
  toolbar: null,
  isActive: false,
  drawingEnabled: false,
  _positionInterval: null,

  // 全螢幕模式（任何網頁）
  createFullscreen() {
    if (this.isActive) this.destroy();

    this.canvas = document.createElement('canvas');
    this.canvas.id = 'ma-canvas';
    document.body.appendChild(this.canvas);

    this.ctx = this.canvas.getContext('2d');
    this._syncFullscreen();
    this._createToolbar();
    this.enableDrawing();

    window.addEventListener('resize', this._resizeHandler = () => this._syncFullscreen());
    this.isActive = true;
    console.log('[ScreenAnnotate] Canvas overlay created');
  },

  // 追蹤 video 模式（Google Meet 等）
  create(videoElement) {
    if (this.isActive) this.destroy();

    this.targetVideo = videoElement;
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'ma-canvas';
    document.body.appendChild(this.canvas);

    this.ctx = this.canvas.getContext('2d');
    this._syncPosition();
    this._createToolbar();
    this.enableDrawing();

    this._positionInterval = setInterval(() => this._syncPosition(), 1000);
    window.addEventListener('resize', this._resizeHandler = () => this._syncPosition());
    this.isActive = true;
  },

  _syncFullscreen() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const dpr = window.devicePixelRatio || 1;

    this.canvas.style.cssText = `
      position: fixed; top: 0; left: 0;
      width: ${w}px; height: ${h}px;
      z-index: 10000;
      pointer-events: ${this.drawingEnabled ? 'auto' : 'none'};
      cursor: ${this.drawingEnabled ? 'crosshair' : 'default'};
      touch-action: none;
    `;

    const newW = Math.round(w * dpr);
    const newH = Math.round(h * dpr);
    if (this.canvas.width !== newW || this.canvas.height !== newH) {
      this.canvas.width = newW;
      this.canvas.height = newH;
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      DrawingEngine.redrawAll(this.ctx, this.canvas.width, this.canvas.height);
    }
  },

  _syncPosition() {
    if (!this.targetVideo) return;
    const rect = this.targetVideo.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    this.canvas.style.cssText = `
      position: fixed;
      top: ${rect.top}px; left: ${rect.left}px;
      width: ${rect.width}px; height: ${rect.height}px;
      z-index: 10000;
      pointer-events: ${this.drawingEnabled ? 'auto' : 'none'};
      cursor: ${this.drawingEnabled ? 'crosshair' : 'default'};
      touch-action: none;
    `;

    const newW = Math.round(rect.width * dpr);
    const newH = Math.round(rect.height * dpr);
    if (this.canvas.width !== newW || this.canvas.height !== newH) {
      this.canvas.width = newW;
      this.canvas.height = newH;
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      DrawingEngine.redrawAll(this.ctx, this.canvas.width, this.canvas.height);
    }
  },

  enableDrawing() {
    this.drawingEnabled = true;
    if (this.canvas) {
      this.canvas.style.pointerEvents = 'auto';
      this.canvas.style.cursor = 'crosshair';
    }
    this._updateToggleBtn();
    console.log('[MeetAnnotate] Drawing enabled');
  },

  disableDrawing() {
    this.drawingEnabled = false;
    if (this.canvas) {
      this.canvas.style.pointerEvents = 'none';
      this.canvas.style.cursor = 'default';
    }
    this._updateToggleBtn();
    console.log('[MeetAnnotate] Drawing disabled');
  },

  toggleDrawing() {
    if (this.drawingEnabled) {
      this.disableDrawing();
    } else {
      this.enableDrawing();
    }
  },

  _updateToggleBtn() {
    const btn = document.getElementById('ma-toggle');
    if (btn) {
      btn.classList.toggle('ma-active', this.drawingEnabled);
      btn.title = this.drawingEnabled ? 'Stop Drawing' : 'Start Drawing';
    }
  },

  _createToolbar() {
    this.toolbar = document.createElement('div');
    this.toolbar.id = 'ma-toolbar';

    const colorBtns = COLORS.map((c, i) =>
      `<button class="ma-color${i === 0 ? ' ma-color-active' : ''}" data-color="${c}" style="background:${c}" title="${c}"></button>`
    ).join('');

    this.toolbar.innerHTML = `
      <span class="ma-label">Annotate Together</span>
      <div class="ma-sep"></div>
      <button id="ma-toggle" class="ma-btn ma-active" title="Stop Drawing">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 19l7-7 3 3-7 7-3-3z"/>
          <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/>
          <path d="M2 2l7.586 7.586"/>
          <circle cx="11" cy="11" r="2"/>
        </svg>
      </button>
      <div class="ma-sep"></div>
      <button id="ma-pen" class="ma-btn ma-tool-active" title="Pen">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <line x1="2" y1="22" x2="22" y2="2"/>
        </svg>
      </button>
      <button id="ma-eraser" class="ma-btn" title="Eraser" data-tool="eraser">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 20H7L3 16l9-9 8 8-4 4z"/>
          <line x1="6" y1="11" x2="13" y2="18"/>
        </svg>
      </button>
      <button id="ma-line" class="ma-btn" title="Line" data-tool="line">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <line x1="4" y1="20" x2="20" y2="4"/>
        </svg>
      </button>
      <button id="ma-arrow" class="ma-btn" title="Arrow" data-tool="arrow">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="4" y1="20" x2="20" y2="4"/>
          <polyline points="10 4 20 4 20 14"/>
        </svg>
      </button>
      <button id="ma-rect" class="ma-btn" title="Rectangle" data-tool="rect">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2"/>
        </svg>
      </button>
      <button id="ma-text" class="ma-btn" title="Text" data-tool="text">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="4 7 4 4 20 4 20 7"/>
          <line x1="12" y1="4" x2="12" y2="20"/>
          <line x1="8" y1="20" x2="16" y2="20"/>
        </svg>
      </button>
      <button id="ma-laser" class="ma-btn" title="Laser Pointer (fades in 2s)" data-tool="laser">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <circle cx="12" cy="12" r="3"/>
          <line x1="12" y1="1" x2="12" y2="4"/>
          <line x1="12" y1="20" x2="12" y2="23"/>
          <line x1="1" y1="12" x2="4" y2="12"/>
          <line x1="20" y1="12" x2="23" y2="12"/>
        </svg>
      </button>
      <div class="ma-sep"></div>
      <div id="ma-colors">${colorBtns}</div>
      <div class="ma-sep"></div>
      <input id="ma-size" type="range" min="1" max="20" value="${DEFAULTS.penWidth}" title="Stroke Width">
      <div class="ma-sep"></div>
      <button id="ma-undo" class="ma-btn" title="Undo (Ctrl+Z)">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="1 4 1 10 7 10"/>
          <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
        </svg>
      </button>
      <button id="ma-clear" class="ma-btn ma-danger" title="Clear All">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
        </svg>
      </button>
    `;

    document.body.appendChild(this.toolbar);
    this._bindToolbar();
  },

  _setActiveTool(toolName) {
    const allTools = ['ma-pen', 'ma-eraser', 'ma-line', 'ma-arrow', 'ma-rect', 'ma-text', 'ma-laser'];
    allTools.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.toggle('ma-tool-active', id === 'ma-' + toolName);
    });
    DrawingEngine.currentTool = toolName;
  },

  _bindToolbar() {
    document.getElementById('ma-toggle').addEventListener('click', () => this.toggleDrawing());

    // 所有工具按鈕
    ['pen', 'eraser', 'line', 'arrow', 'rect', 'text', 'laser'].forEach(tool => {
      const el = document.getElementById('ma-' + tool);
      if (el) el.addEventListener('click', () => this._setActiveTool(tool));
    });

    // 顏色
    document.querySelectorAll('#ma-colors .ma-color').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#ma-colors .ma-color').forEach(b => b.classList.remove('ma-color-active'));
        btn.classList.add('ma-color-active');
        DrawingEngine.currentColor = btn.dataset.color;
      });
    });

    // 筆寬
    document.getElementById('ma-size').addEventListener('input', (e) => {
      DrawingEngine.currentWidth = parseInt(e.target.value, 10);
    });

    // 撤銷
    document.getElementById('ma-undo').addEventListener('click', () => {
      DrawingEngine.undo();
    });

    document.getElementById('ma-clear').addEventListener('click', () => {
      DrawingEngine.clearMine();
    });

    // Ctrl+Z / Cmd+Z 快捷鍵
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        DrawingEngine.undo();
      }
    });
  },

  destroy() {
    if (this.canvas && this.canvas.parentNode) this.canvas.parentNode.removeChild(this.canvas);
    if (this.toolbar && this.toolbar.parentNode) this.toolbar.parentNode.removeChild(this.toolbar);
    if (this._positionInterval) clearInterval(this._positionInterval);
    if (this._resizeHandler) window.removeEventListener('resize', this._resizeHandler);
    this.canvas = null;
    this.ctx = null;
    this.targetVideo = null;
    this.isActive = false;
    this.drawingEnabled = false;
  }
};
