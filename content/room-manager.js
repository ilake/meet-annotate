var RoomManager = {
  // Query parameters that differ per person or per click but do not change the page.
  // (Meet adds ?authuser=, links add utm_*.) Everything else is kept, so
  // youtube.com/watch?v=A and ?v=B are different rooms.
  _NOISE_PARAMS: /^(utm_.*|fbclid|gclid|dclid|msclkid|mc_cid|mc_eid|_ga|authuser|pli|hs|usp|ref|si|feature)$/i,

  roomKey(loc) {
    loc = loc || window.location;
    const params = new URLSearchParams(loc.search);
    const kept = [];
    params.forEach((value, key) => {
      if (!RoomManager._NOISE_PARAMS.test(key)) kept.push(key + '=' + value);
    });
    kept.sort();
    // No query (the Meet case) gives exactly origin + path, same as before.
    return loc.origin + loc.pathname + (kept.length ? '?' + kept.join('&') : '');
  },

  getRoomId() {
    const url = this.roomKey();
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
