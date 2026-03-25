chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  const tab = tabs[0];
  if (tab?.url?.includes('meet.google.com')) {
    chrome.tabs.sendMessage(tab.id, { type: 'GET_STATUS' }, (response) => {
      if (chrome.runtime.lastError || !response) {
        document.getElementById('status-text').textContent = '等待頁面載入...';
        return;
      }
      const dot = document.getElementById('status-dot');
      const text = document.getElementById('status-text');

      if (response.connected) {
        dot.className = 'dot connected';
        text.textContent = '已連線';
      } else {
        dot.className = 'dot disconnected';
        text.textContent = '等待螢幕分享...';
      }

      if (response.roomId) {
        document.getElementById('room-info').style.display = 'block';
        document.getElementById('room-id').textContent = response.roomId;
      }
    });
  }
});
