(function () {
  'use strict';

  if (window._screenAnnotateActive) return;

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
      if (!CanvasOverlay.isActive) {
        CanvasOverlay.create(videoElement);
        DrawingEngine.init(CanvasOverlay.canvas, CanvasOverlay.ctx, userId);
      }
      window._screenAnnotateActive = true;
    },
    () => {
      console.log('[ScreenAnnotate] Screen share ended');
      CanvasOverlay.destroy();
    }
  );

  window.addEventListener('beforeunload', () => {
    FirebaseSync.clearRoomOnUnload();
    FirebaseSync.disconnect();
    CanvasOverlay.destroy();
    MeetDetector.destroy();
  });
})();
