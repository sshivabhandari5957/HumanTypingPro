// HumanType Pro - Content Script
// Injected into Google Docs and Cadmus pages
// Bridges isolated world and MAIN world

(function() {
  'use strict';

  let typingController = null;
  let mainWorldPort = null;

  // Inject MAIN world script that bypasses isolated world restrictions
  function injectMainWorldScript() {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('injector.js');
    script.onload = function() {
      this.remove();
    };
    (document.head || document.documentElement).appendChild(script);
  }

  // Setup communication with MAIN world script via custom DOM events
  function setupMainWorldBridge() {
    // Listen for MAIN world messages
    window.addEventListener('humantype-main-to-content', function(event) {
      const data = event.detail;
      if (data.type === 'progress') {
        chrome.runtime.sendMessage({
          action: 'progressUpdate',
          progress: data.progress
        }).catch(() => {});
      } else if (data.type === 'complete') {
        chrome.runtime.sendMessage({
          action: 'typingComplete'
        }).catch(() => {});
      } else if (data.type === 'error') {
        chrome.runtime.sendMessage({
          action: 'typingError',
          error: data.error
        }).catch(() => {});
      }
    });

    // Forward commands to MAIN world
    window.addEventListener('humantype-content-to-main', function(event) {
      const customEvent = new CustomEvent('humantype-command', {
        detail: event.detail
      });
      window.dispatchEvent(customEvent);
    });
  }

  // Detect the editor type (Google Docs or Cadmus)
  function detectEditorType() {
    const url = window.location.href;
    if (url.includes('docs.google.com')) {
      return 'google-docs';
    } else if (url.includes('cadmus.io') || url.includes('app.cadmus.io')) {
      return 'cadmus';
    }
    return 'unknown';
  }

  // Initialize on page load
  function initialize() {
    injectMainWorldScript();
    setupMainWorldBridge();

    // Listen for messages from popup via background
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'startTyping') {
        const editorType = detectEditorType();
        // Forward to MAIN world
        const event = new CustomEvent('humantype-command', {
          detail: {
            action: 'start',
            config: request.config,
            text: request.text,
            editorType: editorType
          }
        });
        window.dispatchEvent(event);
        sendResponse({ success: true });
      } else if (request.action === 'pauseTyping') {
        const event = new CustomEvent('humantype-command', {
          detail: { action: 'pause' }
        });
        window.dispatchEvent(event);
        sendResponse({ success: true });
      } else if (request.action === 'stopTyping') {
        const event = new CustomEvent('humantype-command', {
          detail: { action: 'stop' }
        });
        window.dispatchEvent(event);
        sendResponse({ success: true });
      } else if (request.action === 'getProgress') {
        const event = new CustomEvent('humantype-command', {
          detail: { action: 'getProgress' }
        });
        window.dispatchEvent(event);
        // Progress will be sent back via the bridge
        sendResponse({ status: 'requested' });
      }
      return true;
    });
  }

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }
})();