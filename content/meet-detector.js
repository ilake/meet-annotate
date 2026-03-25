var MeetDetector = {
  _observer: null,
  _debounceTimer: null,
  _onDetected: null,
  _onEnded: null,
  _currentVideo: null,

  init(onDetected, onEnded) {
    this._onDetected = onDetected;
    this._onEnded = onEnded;
    this._startObserving();
  },

  _findLargestVideo() {
    let largest = null;
    let maxArea = 0;

    document.querySelectorAll('video').forEach(video => {
      const rect = video.getBoundingClientRect();
      const area = rect.width * rect.height;
      if (area > maxArea && rect.width > 200) {
        maxArea = area;
        largest = video;
      }
    });

    // 確認佔畫面 30% 以上才算是分享的螢幕
    if (largest) {
      const viewportArea = window.innerWidth * window.innerHeight;
      if (maxArea / viewportArea < 0.3) return null;
    }

    return largest;
  },

  _startObserving() {
    this._observer = new MutationObserver(() => {
      clearTimeout(this._debounceTimer);
      this._debounceTimer = setTimeout(() => this._check(), 500);
    });

    this._observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class']
    });

    // 立即檢查一次
    this._check();
    // 定期檢查（防止 MutationObserver 漏掉）
    this._interval = setInterval(() => this._check(), 3000);
  },

  _check() {
    const video = this._findLargestVideo();

    if (video && video !== this._currentVideo) {
      this._currentVideo = video;
      this._onDetected(video);
    } else if (!video && this._currentVideo) {
      this._currentVideo = null;
      if (this._onEnded) this._onEnded();
    }
  },

  destroy() {
    if (this._observer) this._observer.disconnect();
    clearTimeout(this._debounceTimer);
    clearInterval(this._interval);
  }
};
