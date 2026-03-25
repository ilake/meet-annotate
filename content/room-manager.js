var RoomManager = {
  getRoomId() {
    // 用 URL 產生一個穩定的短 ID（同一個 URL = 同一個房間）
    const url = window.location.href.split('#')[0].split('?')[0]; // 去掉 hash 和 query
    let hash = 0;
    for (let i = 0; i < url.length; i++) {
      hash = ((hash << 5) - hash + url.charCodeAt(i)) | 0;
    }
    return 'room-' + Math.abs(hash).toString(36);
  },

  getUserId() {
    let userId = localStorage.getItem('screen-annotate-user-id');
    if (!userId) {
      userId = 'u-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 6);
      localStorage.setItem('screen-annotate-user-id', userId);
    }
    return userId;
  }
};
