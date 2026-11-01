var DrawingEngine = {
  isDrawing: false,
  currentStroke: null,
  allStrokes: [],
  currentTool: DEFAULTS.tool,
  currentColor: DEFAULTS.color,
  currentWidth: DEFAULTS.penWidth,
  canvas: null,
  ctx: null,
  userId: null,
  _startPoint: null,

  init(canvas, ctx, userId) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.userId = userId;

    canvas.addEventListener('pointerdown', (e) => this._onDown(e));
    canvas.addEventListener('pointermove', (e) => this._onMove(e));
    canvas.addEventListener('pointerup', (e) => this._onUp(e));
    canvas.addEventListener('pointerleave', (e) => this._onUp(e));
  },

  _canvasSize() {
    if (!this.canvas) return { w: 0, h: 0 };
    const dpr = window.devicePixelRatio || 1;
    return { w: this.canvas.width / dpr, h: this.canvas.height / dpr };
  },

  _point(e) {
    const rect = this.canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  },

  // --- 是否為形狀工具（直線/箭頭/矩形） ---
  _isShapeTool(tool) {
    return tool === 'line' || tool === 'arrow' || tool === 'rect';
  },

  // ==================== 事件處理 ====================

  _onDown(e) {
    e.preventDefault();
    const pt = this._point(e);
    const { w, h } = this._canvasSize();

    // 文字工具：點擊後輸入
    if (this.currentTool === 'text') {
      this._handleText(pt, w, h);
      return;
    }

    this.isDrawing = true;
    this._startPoint = pt;

    this.currentStroke = {
      id: this.userId + '-' + Date.now(),
      tool: this.currentTool,
      color: this.currentTool === 'eraser' ? null : this.currentColor,
      width: CoordinateNormalizer.normalizeWidth(
        this.currentTool === 'eraser' ? DEFAULTS.eraserWidth : this.currentWidth, w, h
      ),
      points: [CoordinateNormalizer.normalize(pt.x, pt.y, w, h)],
      userId: this.userId,
      timestamp: Date.now()
    };
  },

  _onMove(e) {
    if (!this.isDrawing || !this.currentStroke) return;
    e.preventDefault();

    const pt = this._point(e);
    const { w, h } = this._canvasSize();

    if (this._isShapeTool(this.currentStroke.tool)) {
      // 形狀工具：只保留起點和終點，即時預覽
      this.currentStroke.points = [
        CoordinateNormalizer.normalize(this._startPoint.x, this._startPoint.y, w, h),
        CoordinateNormalizer.normalize(pt.x, pt.y, w, h)
      ];
      this._redrawWithPreview(w, h);
    } else {
      // 自由畫筆（pen / eraser / laser）
      this.currentStroke.points.push(CoordinateNormalizer.normalize(pt.x, pt.y, w, h));
      this._drawSegment(this.currentStroke, w, h);
    }
  },

  _onUp() {
    if (!this.isDrawing || !this.currentStroke) return;
    this.isDrawing = false;

    // 至少要有 2 個點
    if (this.currentStroke.points.length < 2) {
      this.currentStroke = null;
      return;
    }

    this.allStrokes.push(this.currentStroke);
    FirebaseSync.sendStroke(this.currentStroke);

    // 雷射筆：2 秒後自動消失
    if (this.currentStroke.tool === 'laser') {
      const strokeId = this.currentStroke.id;
      setTimeout(() => this._removeLaserStroke(strokeId), 2000);
    }

    this.currentStroke = null;
  },

  // ==================== 繪製方法 ====================

  _drawSegment(stroke, w, h) {
    const pts = stroke.points;
    if (pts.length < 2) return;
    const last = pts.length - 1;
    const from = CoordinateNormalizer.denormalize(pts[last - 1].x, pts[last - 1].y, w, h);
    const to = CoordinateNormalizer.denormalize(pts[last].x, pts[last].y, w, h);

    this._setupCtx(stroke, w, h);
    this.ctx.beginPath();
    this.ctx.moveTo(from.x, from.y);
    this.ctx.lineTo(to.x, to.y);
    this.ctx.stroke();
    this.ctx.globalCompositeOperation = 'source-over';
  },

  _drawFullStroke(ctx, stroke, w, h) {
    if (!ctx || !stroke.points || stroke.points.length < 1) return;

    // 文字
    if (stroke.tool === 'text') {
      this._drawText(ctx, stroke, w, h);
      return;
    }

    const pts = CoordinateNormalizer.denormalizePoints(stroke.points, w, h);
    if (pts.length < 2) return;

    // 直線 / 箭頭
    if (stroke.tool === 'line' || stroke.tool === 'arrow') {
      this._drawLine(ctx, stroke, pts);
      return;
    }

    // 矩形
    if (stroke.tool === 'rect') {
      this._drawRect(ctx, stroke, pts);
      return;
    }

    // 自由畫筆（pen / eraser / laser）
    this._setupCtx(stroke, w, h, ctx);
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length - 1; i++) {
      const mx = (pts[i].x + pts[i + 1].x) / 2;
      const my = (pts[i].y + pts[i + 1].y) / 2;
      ctx.quadraticCurveTo(pts[i].x, pts[i].y, mx, my);
    }
    ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
    ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
  },

  // --- 直線 / 箭頭 ---
  _drawLine(ctx, stroke, pts) {
    const from = pts[0];
    const to = pts[pts.length - 1];

    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = CoordinateNormalizer.denormalizeWidth(stroke.width, pts[0].x || 1, pts[0].y || 1);
    // 重新計算 lineWidth
    const { w, h } = this._canvasSize();
    ctx.lineWidth = CoordinateNormalizer.denormalizeWidth(stroke.width, w, h);
    ctx.lineCap = 'round';

    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();

    // 箭頭
    if (stroke.tool === 'arrow') {
      const angle = Math.atan2(to.y - from.y, to.x - from.x);
      const headLen = Math.max(12, ctx.lineWidth * 4);
      ctx.beginPath();
      ctx.moveTo(to.x, to.y);
      ctx.lineTo(to.x - headLen * Math.cos(angle - 0.4), to.y - headLen * Math.sin(angle - 0.4));
      ctx.moveTo(to.x, to.y);
      ctx.lineTo(to.x - headLen * Math.cos(angle + 0.4), to.y - headLen * Math.sin(angle + 0.4));
      ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
  },

  // --- 矩形 ---
  _drawRect(ctx, stroke, pts) {
    const from = pts[0];
    const to = pts[pts.length - 1];
    const { w, h } = this._canvasSize();

    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = CoordinateNormalizer.denormalizeWidth(stroke.width, w, h);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.rect(from.x, from.y, to.x - from.x, to.y - from.y);
    ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
  },

  // --- 文字 ---
  _handleText(pt, w, h) {
    const text = prompt('Enter text:');
    if (!text) return;

    const stroke = {
      id: this.userId + '-' + Date.now(),
      tool: 'text',
      color: this.currentColor,
      width: CoordinateNormalizer.normalizeWidth(this.currentWidth, w, h),
      points: [CoordinateNormalizer.normalize(pt.x, pt.y, w, h)],
      text: text,
      fontSize: Math.max(16, this.currentWidth * 5),
      userId: this.userId,
      timestamp: Date.now()
    };

    this.allStrokes.push(stroke);
    this._drawText(this.ctx, stroke, w, h);
    FirebaseSync.sendStroke(stroke);
  },

  _drawText(ctx, stroke, w, h) {
    const pt = CoordinateNormalizer.denormalize(stroke.points[0].x, stroke.points[0].y, w, h);
    const fontSize = stroke.fontSize || 20;

    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = stroke.color;
    ctx.font = `bold ${fontSize}px 'Google Sans', Roboto, Arial, sans-serif`;
    ctx.textBaseline = 'top';
    ctx.fillText(stroke.text, pt.x, pt.y);
  },

  // --- 雷射筆自動消失 ---
  _removeLaserStroke(strokeId) {
    this.allStrokes = this.allStrokes.filter(s => s.id !== strokeId);
    FirebaseSync.deleteStroke(strokeId);
    if (!this.canvas || !this.ctx) return;
    const { w, h } = this._canvasSize();
    this.ctx.clearRect(0, 0, w, h);
    this.redrawAll(this.ctx, this.canvas.width, this.canvas.height);
  },

  // --- 形狀預覽（拖曳中即時顯示） ---
  _redrawWithPreview(w, h) {
    this.ctx.clearRect(0, 0, w, h);
    this.redrawAll(this.ctx, this.canvas.width, this.canvas.height);
    // 畫預覽
    if (this.currentStroke) {
      this._drawFullStroke(this.ctx, this.currentStroke, w, h);
    }
  },

  // ==================== 共用方法 ====================

  _setupCtx(stroke, w, h, ctx) {
    ctx = ctx || this.ctx;
    if (!ctx) return;
    if (stroke.tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = stroke.color;
      if (stroke.tool === 'laser') {
        ctx.strokeStyle = stroke.color;
        ctx.shadowColor = stroke.color;
        ctx.shadowBlur = 8;
      } else {
        ctx.shadowBlur = 0;
      }
    }
    ctx.lineWidth = CoordinateNormalizer.denormalizeWidth(stroke.width, w, h);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  },

  redrawAll(ctx, canvasWidth, canvasHeight) {
    const dpr = window.devicePixelRatio || 1;
    const w = canvasWidth / dpr;
    const h = canvasHeight / dpr;
    this.allStrokes.forEach(s => this._drawFullStroke(ctx, s, w, h));
  },

  ownStrokeIds() {
    return this.allStrokes.filter(s => s.userId === this.userId).map(s => s.id);
  },

  // 清掉畫布並重畫所有筆畫
  redraw() {
    if (!this.canvas || !this.ctx) return;
    const { w, h } = this._canvasSize();
    this.ctx.clearRect(0, 0, w, h);
    this.redrawAll(this.ctx, this.canvas.width, this.canvas.height);
  },

  addRemoteStroke(stroke) {
    // 斷線重連時伺服器會重送全部筆畫，已經有的不重複加
    if (this.allStrokes.some(s => s.id === stroke.id)) return;
    this.allStrokes.push(stroke);
    if (!this.canvas || !this.ctx) return;
    const { w, h } = this._canvasSize();
    this._drawFullStroke(this.ctx, stroke, w, h);

    // 遠端的雷射筆也要自動消失
    if (stroke.tool === 'laser') {
      const strokeId = stroke.id;
      setTimeout(() => this._removeLaserStroke(strokeId), 2000);
    }
  },

  undo() {
    if (!this.canvas || !this.ctx) return;
    for (let i = this.allStrokes.length - 1; i >= 0; i--) {
      if (this.allStrokes[i].userId === this.userId) {
        const removed = this.allStrokes.splice(i, 1)[0];
        FirebaseSync.deleteStroke(removed.id);
        const { w, h } = this._canvasSize();
        this.ctx.clearRect(0, 0, w, h);
        this.redrawAll(this.ctx, this.canvas.width, this.canvas.height);
        return;
      }
    }
  },

  clearMine() {
    if (!this.canvas || !this.ctx) return;
    const mine = this.allStrokes.filter(s => s.userId === this.userId);
    mine.forEach(s => FirebaseSync.deleteStroke(s.id));
    this.allStrokes = this.allStrokes.filter(s => s.userId !== this.userId);
    const { w, h } = this._canvasSize();
    this.ctx.clearRect(0, 0, w, h);
    this.redrawAll(this.ctx, this.canvas.width, this.canvas.height);
  }
};
