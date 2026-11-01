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

  // 關閉：只刪「我自己的」筆畫，別人的留著
  function deactivate() {
    if (!window._screenAnnotateActive) return;
    window._screenAnnotateActive = false;
    chrome.runtime.onMessage.removeListener(onMessage);
    window.removeEventListener('beforeunload', onUnload);
    FirebaseSync.deleteStrokes(DrawingEngine.ownStrokeIds());
    FirebaseSync.disconnect();
    CanvasOverlay.destroy();
  }

  function onMessage(msg) {
    if (msg && msg.type === 'ANNOTATE_OFF') deactivate();
  }

  // 離開頁面：同樣只刪自己的筆畫（keepalive 確保頁面關閉前送出）
  function onUnload() {
    FirebaseSync.deleteStrokes(DrawingEngine.ownStrokeIds(), { keepalive: true });
    FirebaseSync.disconnect();
    CanvasOverlay.destroy();
  }

  chrome.runtime.onMessage.addListener(onMessage);
  window.addEventListener('beforeunload', onUnload);

  // 工具列的 Close 按鈕
  CanvasOverlay.onClose = () => {
    deactivate();
    try { chrome.runtime.sendMessage({ type: 'ANNOTATE_CLOSED' }); } catch (e) {}
  };
})();
