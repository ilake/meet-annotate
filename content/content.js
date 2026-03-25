(function () {
  'use strict';

  // 防止重複注入
  if (window._screenAnnotateActive) return;
  window._screenAnnotateActive = true;

  if (FIREBASE_CONFIG.projectId === 'YOUR_PROJECT_ID') {
    console.warn('[ScreenAnnotate] Please configure Firebase in shared/constants.js');
    return;
  }

  const roomId = RoomManager.getRoomId();
  const userId = RoomManager.getUserId();
  console.log(`[ScreenAnnotate] Room: ${roomId}, User: ${userId}`);

  // 連線 Firebase
  FirebaseSync.init(roomId, userId);

  // 直接建立全螢幕 Canvas overlay
  CanvasOverlay.createFullscreen();
  DrawingEngine.init(CanvasOverlay.canvas, CanvasOverlay.ctx, userId);

  // 接收關閉指令
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'ANNOTATE_OFF') {
      FirebaseSync.clearRoom();
      FirebaseSync.disconnect();
      CanvasOverlay.destroy();
      window._screenAnnotateActive = false;
    }
  });

  // 離開時清理（自動清除房間資料）
  window.addEventListener('beforeunload', () => {
    FirebaseSync.clearRoomOnUnload();
    FirebaseSync.disconnect();
    CanvasOverlay.destroy();
  });
})();
