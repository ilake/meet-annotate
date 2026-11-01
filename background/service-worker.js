// This worker keeps NO state. Chrome stops service workers after ~30s idle,
// so "is annotation on?" is asked from the page itself on every click.

const RESTRICTED_URL = /^(chrome|chrome-extension|edge|about|devtools|view-source):|^https:\/\/(chromewebstore\.google\.com|chrome\.google\.com\/webstore)/i;

const CONTENT_FILES = [
  'shared/constants.js',
  'content/coordinate-normalizer.js',
  'content/room-manager.js',
  'content/firebase-sync.js',
  'content/drawing-engine.js',
  'content/canvas-overlay.js',
  'content/content.js'
];

function setBadge(tabId, text, color) {
  chrome.action.setBadgeText({ text, tabId });
  if (color) chrome.action.setBadgeBackgroundColor({ color, tabId });
}

// The injected content script runs in the isolated world, so it shares this flag.
async function isAnnotating(tabId) {
  try {
    const [res] = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => !!window._screenAnnotateActive
    });
    return !!(res && res.result);
  } catch (e) {
    return false;
  }
}

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) return;

  // Pages Chrome does not allow extensions to touch (chrome://, Web Store, ...).
  if (!tab.url || RESTRICTED_URL.test(tab.url)) {
    setBadge(tab.id, '!', '#F44336');
    return;
  }

  try {
    if (await isAnnotating(tab.id)) {
      setBadge(tab.id, '');
      await chrome.tabs.sendMessage(tab.id, { type: 'ANNOTATE_OFF' }).catch(() => {});
      return;
    }

    await chrome.scripting.insertCSS({ target: { tabId: tab.id }, files: ['content/content.css'] });
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: CONTENT_FILES });
    setBadge(tab.id, 'ON', '#4CAF50');
  } catch (e) {
    console.warn('[Annotate Together] Cannot start on this page:', e && e.message);
    setBadge(tab.id, '!', '#F44336');
  }
});

// The toolbar's Close button turns annotation off from inside the page.
chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg && msg.type === 'ANNOTATE_CLOSED' && sender.tab && sender.tab.id) {
    setBadge(sender.tab.id, '');
  }
});
