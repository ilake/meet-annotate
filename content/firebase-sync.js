var FirebaseSync = {
  baseUrl: null,
  roomId: null,
  userId: null,
  eventSource: null,
  isConnected: false,

  init(roomId, userId) {
    this.baseUrl = FIREBASE_CONFIG.databaseUrl;
    this.roomId = roomId;
    this.userId = userId;
    this._trackRoom(roomId);
    this._cleanupOldRooms();
    this._startListening();
  },

  // 記錄用過的 room，方便之後清理
  _trackRoom(roomId) {
    try {
      const rooms = JSON.parse(localStorage.getItem('sa-rooms') || '{}');
      rooms[roomId] = Date.now();
      localStorage.setItem('sa-rooms', JSON.stringify(rooms));
    } catch (e) {}
  },

  // 清理超過 1 小時的舊 room（解決 Meet 每次不同 URL 的問題）
  _cleanupOldRooms() {
    try {
      const rooms = JSON.parse(localStorage.getItem('sa-rooms') || '{}');
      const now = Date.now();
      const EXPIRY = 60 * 60 * 1000; // 1 小時
      const remaining = {};

      Object.entries(rooms).forEach(([id, timestamp]) => {
        if (id === this.roomId) {
          remaining[id] = timestamp; // 當前房間不清
        } else if ((now - timestamp) > EXPIRY) {
          // 過期了，刪掉 Firebase 的資料
          const url = `${this.baseUrl}/rooms/${id}/strokes.json`;
          fetch(url, { method: 'DELETE' }).catch(() => {});
        } else {
          remaining[id] = timestamp; // 還沒過期，保留
        }
      });

      localStorage.setItem('sa-rooms', JSON.stringify(remaining));
    } catch (e) {}
  },

  async sendStroke(stroke) {
    const url = `${this.baseUrl}/rooms/${this.roomId}/strokes/${stroke.id}.json`;
    try {
      await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(stroke)
      });
    } catch (err) {
      console.error('[MeetAnnotate] sync error:', err);
    }
  },

  _startListening() {
    const url = `${this.baseUrl}/rooms/${this.roomId}/strokes.json`;
    this.eventSource = new EventSource(url);

    this.eventSource.addEventListener('put', (event) => {
      const data = JSON.parse(event.data);

      if (data.path === '/') {
        if (data.data === null) {
          // 全部清除（對方按了清除）
          this._handleRemoteDelete('/');
        } else if (data.data) {
          // 初次載入：取得所有筆畫
          const now = Date.now();
          const EXPIRY = 60 * 60 * 1000; // 1 小時
          Object.values(data.data).forEach(stroke => {
            if (this._isValidStroke(stroke) && stroke.userId !== this.userId) {
              if (stroke.timestamp && (now - stroke.timestamp) < EXPIRY) {
                DrawingEngine.addRemoteStroke(stroke);
              }
            }
          });
        }
      } else {
        // 單筆更新
        const stroke = data.data;
        if (this._isValidStroke(stroke) && stroke.userId !== this.userId) {
          DrawingEngine.addRemoteStroke(stroke);
        }
        // null 表示被刪除（撤銷或清除）
        if (stroke === null) {
          this._handleRemoteDelete(data.path);
        }
      }
    });

    this.eventSource.addEventListener('patch', () => {});
    this.eventSource.addEventListener('keep-alive', () => {});

    this.eventSource.addEventListener('cancel', () => {
      console.error('[MeetAnnotate] Firebase connection cancelled');
      this.isConnected = false;
    });

    this.eventSource.addEventListener('error', () => {
      this.isConnected = false;
    });

    this.eventSource.onopen = () => {
      this.isConnected = true;
      console.log('[MeetAnnotate] Firebase connected');
    };
  },

  _isValidStroke(s) {
    return s && typeof s.id === 'string' && typeof s.userId === 'string'
      && Array.isArray(s.points) && s.points.length < 5000
      && typeof s.tool === 'string';
  },

  _handleRemoteDelete(path) {
    // path 是 "/<strokeId>" 或 "/" (全部清除)
    const strokeId = path.replace(/^\//, '');

    if (strokeId) {
      // 單筆撤銷
      DrawingEngine.allStrokes = DrawingEngine.allStrokes.filter(s => s.id !== strokeId);
    } else {
      // 全部清除
      DrawingEngine.allStrokes = [];
    }

    // 重繪
    if (CanvasOverlay.canvas) {
      const ctx = CanvasOverlay.canvas.getContext('2d');
      const dpr = window.devicePixelRatio || 1;
      ctx.clearRect(0, 0, CanvasOverlay.canvas.width / dpr, CanvasOverlay.canvas.height / dpr);
      DrawingEngine.redrawAll(ctx, CanvasOverlay.canvas.width, CanvasOverlay.canvas.height);
    }
  },

  async deleteStroke(strokeId) {
    const url = `${this.baseUrl}/rooms/${this.roomId}/strokes/${strokeId}.json`;
    try {
      await fetch(url, { method: 'DELETE' });
    } catch (err) {
      console.error('[MeetAnnotate] delete stroke error:', err);
    }
  },

  async clearRoom() {
    const url = `${this.baseUrl}/rooms/${this.roomId}/strokes.json`;
    try {
      await fetch(url, { method: 'DELETE' });
    } catch (err) {
      console.error('[MeetAnnotate] clear error:', err);
    }
  },

  // beforeunload 專用：keepalive 確保頁面關閉前送出
  clearRoomOnUnload() {
    if (!this.baseUrl || !this.roomId) return;
    const url = `${this.baseUrl}/rooms/${this.roomId}/strokes.json`;
    fetch(url, { method: 'DELETE', keepalive: true }).catch(() => {});
  },

  disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.isConnected = false;
  }
};
