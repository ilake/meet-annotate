(function () {
  'use strict';

  if (window._screenAnnotateActive) return;

  // 只在會議室裡啟動（不是 Meet 首頁）
  if (!/^\/[a-z]{3}-[a-z]{4}-[a-z]{3}/.test(window.location.pathname)) return;

  if (FIREBASE_CONFIG.projectId === 'YOUR_PROJECT_ID') {
    console.warn('[ScreenAnnotate] Please configure Firebase in shared/constants.js');
    return;
  }

  const roomId = RoomManager.getRoomId();
  const userId = RoomManager.getUserId();
  console.log(`[ScreenAnnotate] Meet mode — Room: ${roomId}, User: ${userId}`);

  FirebaseSync.init(roomId, userId);

  // Google Meet 模式：偵測到螢幕分享才啟動
  MeetDetector.init(
    (videoElement) => {
      console.log('[ScreenAnnotate] Screen share detected');
      // 如果已經是全螢幕模式（主持人），切換到影片追蹤模式
      if (CanvasOverlay.isActive) CanvasOverlay.destroy();
      CanvasOverlay.create(videoElement);
      DrawingEngine.init(CanvasOverlay.canvas, CanvasOverlay.ctx, userId);
      window._screenAnnotateActive = true;
    },
    () => {
      console.log('[ScreenAnnotate] Screen share ended');
      CanvasOverlay.destroy();
    }
  );

  // 主持人（看不到分享畫面的人）可以點 icon 手動啟動全螢幕模式

  // 接收 icon 點擊指令（主持人手動啟動全螢幕模式）
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'ANNOTATE_FULLSCREEN') {
      if (!CanvasOverlay.isActive) {
        CanvasOverlay.createFullscreen();
        DrawingEngine.init(CanvasOverlay.canvas, CanvasOverlay.ctx, userId);
      }
      window._screenAnnotateActive = true;
    }
    if (msg.type === 'ANNOTATE_OFF') {
      CanvasOverlay.destroy();
      window._screenAnnotateActive = false;
    }
  });

  window.addEventListener('beforeunload', () => {
    FirebaseSync.clearRoomOnUnload();
    FirebaseSync.disconnect();
    CanvasOverlay.destroy();
    MeetDetector.destroy();
  });
})();
