const activeTabs = new Set();

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.url || tab.url.startsWith('chrome')) return;

  if (activeTabs.has(tab.id)) {
    activeTabs.delete(tab.id);
    chrome.action.setBadgeText({ text: '', tabId: tab.id });
    chrome.tabs.sendMessage(tab.id, { type: 'ANNOTATE_OFF' });
    return;
  }

  await chrome.scripting.insertCSS({
    target: { tabId: tab.id },
    files: ['content/content.css']
  });

  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: [
      'shared/constants.js',
      'content/coordinate-normalizer.js',
      'content/room-manager.js',
      'content/firebase-sync.js',
      'content/drawing-engine.js',
      'content/canvas-overlay.js',
      'content/content.js'
    ]
  });

  activeTabs.add(tab.id);
  chrome.action.setBadgeText({ text: 'ON', tabId: tab.id });
  chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });
});

chrome.tabs.onRemoved.addListener((tabId) => {
  activeTabs.delete(tabId);
});
