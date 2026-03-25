// Firebase 設定 — 請替換成你的 Firebase 專案資訊
var FIREBASE_CONFIG = {
  projectId: 'screen-annotations',
  databaseUrl: 'https://screen-annotations-default-rtdb.asia-southeast1.firebasedatabase.app'
};

// 畫筆顏色
var COLORS = [
  '#FF0000', // 紅
  '#FF9800', // 橙
  '#FFEB3B', // 黃
  '#4CAF50', // 綠
  '#2196F3', // 藍
  '#9C27B0', // 紫
  '#FFFFFF', // 白
  '#000000'  // 黑
];

// 預設值
var DEFAULTS = {
  color: '#FF0000',
  penWidth: 3,
  eraserWidth: 20,
  tool: 'pen'
};
