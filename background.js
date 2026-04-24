// HumanType Pro - Service Worker
// Acts as message bridge between popup and content scripts
// No network requests, no analytics, zero telemetry

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'startTyping') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: 'startTyping',
          config: request.config,
          text: request.text
        }).catch(err => {
          console.error('Failed to start typing:', err);
          sendResponse({ success: false, error: err.message });
        });
      }
    });
    sendResponse({ success: true });
  } else if (request.action === 'pauseTyping') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'pauseTyping' });
      }
    });
    sendResponse({ success: true });
  } else if (request.action === 'stopTyping') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'stopTyping' });
      }
    });
    sendResponse({ success: true });
  } else if (request.action === 'getProgress') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'getProgress' }, (response) => {
          sendResponse(response);
        });
      }
    });
    return true; // Keep channel open for async response
  }
  return true;
});