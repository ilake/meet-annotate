var CoordinateNormalizer = {
  normalize(x, y, w, h) {
    return { x: x / w, y: y / h };
  },

  denormalize(nx, ny, w, h) {
    return { x: nx * w, y: ny * h };
  },

  normalizePoints(points, w, h) {
    return points.map(p => this.normalize(p.x, p.y, w, h));
  },

  denormalizePoints(points, w, h) {
    return points.map(p => this.denormalize(p.x, p.y, w, h));
  },

  // 用對角線正規化筆寬，確保不同螢幕比例下筆畫粗細一致
  normalizeWidth(width, w, h) {
    return width / Math.sqrt(w * w + h * h);
  },

  denormalizeWidth(nw, w, h) {
    return nw * Math.sqrt(w * w + h * h);
  }
};
