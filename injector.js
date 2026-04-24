// HumanType Pro - MAIN World Injector
// This script runs in the page's MAIN world, not the extension's isolated world
// All dispatched events appear as genuine user interactions

(function() {
  'use strict';

  // Anti-detection: Don't pollute global scope
  const HumanTypePro = (function() {
    // Private state
    let isRunning = false;
    let isPaused = false;
    let currentPosition = 0;
    let textToType = '';
    let config = {};
    let totalChars = 0;
    let startTime = 0;
    let charTimings = [];

    // =============== KEYSTROKE ENGINE ===============
    
    // QWERTY keyboard layout for typo simulation
    const QWERTY_NEIGHBORS = {
      'q': ['w', 'a'], 'w': ['q', 'e', 'a', 's'], 'e': ['w', 'r', 's', 'd'],
      'r': ['e', 't', 'd', 'f'], 't': ['r', 'y', 'f', 'g'], 'y': ['t', 'u', 'g', 'h'],
      'u': ['y', 'i', 'h', 'j'], 'i': ['u', 'o', 'j', 'k'], 'o': ['i', 'p', 'k', 'l'],
      'p': ['o', 'l'], 'a': ['q', 'w', 's', 'z'], 's': ['a', 'w', 'e', 'd', 'x', 'z'],
      'd': ['s', 'e', 'r', 'f', 'c', 'x'], 'f': ['d', 'r', 't', 'g', 'v', 'c'],
      'g': ['f', 't', 'y', 'h', 'b', 'v'], 'h': ['g', 'y', 'u', 'j', 'n', 'b'],
      'j': ['h', 'u', 'i', 'k', 'm', 'n'], 'k': ['j', 'i', 'o', 'l', 'm'],
      'l': ['k', 'o', 'p'], 'z': ['a', 's', 'x'], 'x': ['z', 's', 'd', 'c'],
      'c': ['x', 'd', 'f', 'v'], 'v': ['c', 'f', 'g', 'b'], 'b': ['v', 'g', 'h', 'n'],
      'n': ['b', 'h', 'j', 'm'], 'm': ['n', 'j', 'k']
    };

    // Common digraphs for timing optimization
    const FAST_DIGRAPHS = new Set(['th', 'he', 'in', 'er', 'an', 're', 'on', 'at', 'en', 'nd', 'ti', 'es', 'or', 'te', 'of']);
    const SLOW_DIGRAPHS = new Set(['qz', 'xj', 'zx', 'qx', 'jq', 'vj', 'fq', 'bc', 'pq', 'wg']);

    // Creates a synthetically trusted event by overriding isTrusted
    function createSyntheticEvent(type, options = {}) {
      let event;
      if (type.startsWith('key')) {
        event = new KeyboardEvent(type, {
          key: options.key || '',
          code: options.code || '',
          keyCode: options.keyCode || 0,
          which: options.which || 0,
          charCode: options.charCode || 0,
          shiftKey: options.shiftKey || false,
          ctrlKey: false,
          altKey: false,
          metaKey: false,
          bubbles: true,
          cancelable: true,
          composed: true
        });
      } else if (type === 'beforeinput' || type === 'input') {
        event = new InputEvent(type, {
          inputType: options.inputType || 'insertText',
          data: options.data || null,
          bubbles: true,
          cancelable: true,
          composed: true
        });
      }
      
      // Override isTrusted to appear as genuine user event
      // This is the key anti-detection technique
      if (event) {
        Object.defineProperty(event, 'isTrusted', {
          get: function() { return true; }
        });
      }
      
      return event;
    }

    // Get key properties from character
    function getKeyProperties(char) {
      const keyMap = {
        ' ': { key: ' ', code: 'Space', keyCode: 32, which: 32 },
        '.': { key: '.', code: 'Period', keyCode: 190, which: 190 },
        ',': { key: ',', code: 'Comma', keyCode: 188, which: 188 },
        '!': { key: '!', code: 'Digit1', keyCode: 49, which: 49, shiftKey: true },
        '?': { key: '?', code: 'Slash', keyCode: 191, which: 191, shiftKey: true },
        ':': { key: ':', code: 'Semicolon', keyCode: 186, which: 186, shiftKey: true },
        ';': { key: ';', code: 'Semicolon', keyCode: 186, which: 186 },
        '\n': { key: 'Enter', code: 'Enter', keyCode: 13, which: 13 }
      };

      if (keyMap[char]) return keyMap[char];

      const isUpperCase = char === char.toUpperCase();
      const upperChar = char.toUpperCase();
      
      return {
        key: char,
        code: `Key${upperChar}`,
        keyCode: char.charCodeAt(0),
        which: char.charCodeAt(0),
        shiftKey: isUpperCase
      };
    }

    // Dispatch full keystroke sequence for a single character
    function dispatchKeystroke(target, char) {
      const props = getKeyProperties(char);
      
      // keydown
      target.dispatchEvent(createSyntheticEvent('keydown', props));
      
      // keypress (legacy, but some frameworks check for it)
      target.dispatchEvent(createSyntheticEvent('keypress', props));
      
      // beforeinput - critical for contenteditable/TipTap
      target.dispatchEvent(createSyntheticEvent('beforeinput', {
        inputType: 'insertText',
        data: char
      }));
      
      // input - the actual insertion
      target.dispatchEvent(createSyntheticEvent('input', {
        inputType: 'insertText',
        data: char
      }));
      
      // keyup
      target.dispatchEvent(createSyntheticEvent('keyup', props));
    }

    // Dispatch Backspace keystrokes
    function dispatchBackspace(target, count = 1) {
      for (let i = 0; i < count; i++) {
        const backspaceProps = {
          key: 'Backspace',
          code: 'Backspace',
          keyCode: 8,
          which: 8
        };
        
        target.dispatchEvent(createSyntheticEvent('keydown', backspaceProps));
        target.dispatchEvent(createSyntheticEvent('beforeinput', {
          inputType: 'deleteContentBackward',
          data: null
        }));
        target.dispatchEvent(createSyntheticEvent('input', {
          inputType: 'deleteContentBackward',
          data: null
        }));
        target.dispatchEvent(createSyntheticEvent('keyup', backspaceProps));
      }
    }

    // Dispatch arrow key movement
    function dispatchArrowKeys(target, direction, count = 1) {
      const arrowProps = {
        key: direction === 'left' ? 'ArrowLeft' : 'ArrowRight',
        code: direction === 'left' ? 'ArrowLeft' : 'ArrowRight',
        keyCode: direction === 'left' ? 37 : 39,
        which: direction === 'left' ? 37 : 39
      };
      
      for (let i = 0; i < count; i++) {
        target.dispatchEvent(createSyntheticEvent('keydown', arrowProps));
        target.dispatchEvent(createSyntheticEvent('keyup', arrowProps));
      }
    }

    // =============== TARGET DETECTION ===============
    
    function findGoogleDocsTarget() {
      // Google Docs uses a hidden iframe for keyboard input
      const iframe = document.querySelector('.docs-texteventtarget-iframe');
      if (iframe && iframe.contentDocument) {
        const input = iframe.contentDocument.querySelector('input[type="text"]');
        return input;
      }
      // Fallback to the editing surface
      return document.querySelector('.kix-canvas-tile-content');
    }

    function findCadmusTarget() {
      // Cadmus uses ProseMirror/TipTap with contenteditable
      const editor = document.querySelector('.ProseMirror[contenteditable="true"]') ||
                    document.querySelector('[contenteditable="true"]');
      return editor;
    }

    function getTargetElement(editorType) {
      if (editorType === 'google-docs') {
        return findGoogleDocsTarget();
      } else if (editorType === 'cadmus') {
        return findCadmusTarget();
      }
      return document.activeElement;
    }

    // =============== HUMAN SIMULATION ===============
    
    function gaussianRandom(mean, stdDev) {
      let u = 0, v = 0;
      while (u === 0) u = Math.random();
      while (v === 0) v = Math.random();
      return mean + stdDev * Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    }

    function calculateTypingDelay(char, nextChar) {
      const baseDelay = 60000 / (config.wpm * 5); // ms per character
      const jitter = gaussianRandom(0, baseDelay * 0.18); // 18% jitter
      
      let delay = baseDelay + jitter;
      
      // Bigram-aware timing
      if (nextChar) {
        const bigram = (char + nextChar).toLowerCase();
        if (FAST_DIGRAPHS.has(bigram)) {
          delay *= 0.85; // 15% faster for common digraphs
        } else if (SLOW_DIGRAPHS.has(bigram)) {
          delay *= 1.40; // 40% slower for awkward digraphs
        }
      }
      
      return Math.max(20, delay); // Minimum 20ms between keystrokes
    }

    function calculatePauseDelay(pauseType) {
      switch (pauseType) {
        case 'sentence_end': // . ! ?
          return 3000 + Math.random() * 7000;
        case 'clause': // , ; :
          return 400 + Math.random() * 800;
        case 'paragraph': // \n\n
          if (config.longPauseIntensity === 'paranoid') {
            return 180000 + Math.random() * 120000; // 3-5 min
          } else if (config.longPauseIntensity === 'realistic') {
            return 60000 + Math.random() * 180000; // 1-4 min
          } else if (config.longPauseIntensity === 'light') {
            return 30000 + Math.random() * 60000; // 30-90 sec
          }
          return 60000 + Math.random() * 240000; // default: 1-5 min
        case 'thinking':
          return 4000 + Math.random() * 11000; // 4-15 seconds
        case 'typo_notice':
          return 200 + Math.random() * 700; // 200-900ms
        default:
          return 1000;
      }
    }

    function shouldMakeTypo() {
      return Math.random() * 100 < config.errorRate;
    }

    function getTypoType() {
      const rand = Math.random();
      if (rand < 0.40) return 'substitution';
      if (rand < 0.65) return 'transposition';
      if (rand < 0.85) return 'double';
      return 'omission';
    }

    function generateTypo(char, nextChar, prevChar) {
      const typoType = getTypoType();
      
      switch (typoType) {
        case 'substitution':
          const neighbors = QWERTY_NEIGHBORS[char.toLowerCase()] || [];
          if (neighbors.length > 0) {
            const sub = neighbors[Math.floor(Math.random() * neighbors.length)];
            return char === char.toUpperCase() ? sub.toUpperCase() : sub;
          }
          return char;
          
        case 'transposition':
          if (nextChar) {
            return nextChar; // Return next char first, then handle correction
          }
          return char;
          
        case 'double':
          return char + char;
          
        case 'omission':
          return ''; // Skip this character
          
        default:
          return char;
      }
    }

    // =============== CADMUS COUNTERMEASURES ===============
    
    function overrideClipboardAPI() {
      // Override clipboard to prevent detection
      const originalWriteText = navigator.clipboard.writeText;
      navigator.clipboard.writeText = function() {
        // Silently fail - Cadmus won't detect clipboard usage
        return Promise.resolve();
      };
      
      // Override ClipboardEvent constructor
      const OriginalClipboardEvent = window.ClipboardEvent;
      window.ClipboardEvent = function(type, options) {
        // Prevent paste events from being created
        if (type === 'paste') {
          return new Event('paste', { bubbles: true, cancelable: true });
        }
        return new OriginalClipboardEvent(type, options);
      };
    }

    function simulateRevision(target, editorType) {
      // Navigate back ~200 characters
      dispatchArrowKeys(target, 'left', gaussianRandom(200, 20));
      
      // Select and delete 2-6 words
      const wordsToDelete = Math.floor(Math.random() * 5) + 2;
      for (let i = 0; i < wordsToDelete; i++) {
        // Shift+Arrow to select
        const shiftSelectEvent = createSyntheticEvent('keydown', {
          key: 'ArrowLeft',
          code: 'ArrowLeft',
          keyCode: 37,
          which: 37,
          shiftKey: true
        });
        target.dispatchEvent(shiftSelectEvent);
        target.dispatchEvent(createSyntheticEvent('keyup', {
          key: 'ArrowLeft',
          code: 'ArrowLeft',
          keyCode: 37,
          which: 37,
          shiftKey: true
        }));
      }
      
      // Delete selected text
      dispatchBackspace(target, 1);
      
      // Retype a variant (just retype the deleted chars for simplicity)
      // In a real scenario, you'd have synonym replacement
      return wordsToDelete;
    }

    function simulateFocusDrift(target, editorType) {
      // Blur the editor
      target.blur();
      const blurEvent = new FocusEvent('blur', { bubbles: true });
      target.dispatchEvent(blurEvent);
      
      // Wait 800-3000ms then refocus
      const driftDuration = 800 + Math.random() * 2200;
      setTimeout(() => {
        target.focus();
        const focusEvent = new FocusEvent('focus', { bubbles: true });
        target.dispatchEvent(focusEvent);
      }, driftDuration);
      
      return driftDuration;
    }

    // =============== MAIN TYPING LOOP ===============
    
    async function typeCharacter(target, char, index, editorType) {
      return new Promise((resolve) => {
        setTimeout(() => {
          if (!isRunning || isPaused) {
            resolve();
            return;
          }
          
          dispatchKeystroke(target, char);
          currentPosition = index + 1;
          
          // Report progress
          const event = new CustomEvent('humantype-main-to-content', {
            detail: {
              type: 'progress',
              progress: {
                typed: currentPosition,
                total: totalChars,
                percent: Math.round((currentPosition / totalChars) * 100)
              }
            }
          });
          window.dispatchEvent(event);
          
          resolve();
        }, 0);
      });
    }

    async function typeText(editorType) {
      const target = getTargetElement(editorType);
      if (!target) {
        throw new Error('Could not find editor target');
      }
      
      // Focus the target
      target.focus();
      
      let wordCount = 0;
      let wordsSinceFocusDrift = 0;
      let charsSinceRevision = 0;
      
      // Apply Cadmus countermeasures
      if (editorType === 'cadmus') {
        overrideClipboardAPI();
      }
      
      while (currentPosition < textToType.length && isRunning) {
        if (isPaused) {
          await new Promise(resolve => setTimeout(resolve, 100));
          continue;
        }
        
        const char = textToType[currentPosition];
        const nextChar = currentPosition + 1 < textToType.length ? textToType[currentPosition + 1] : null;
        
        // Handle typos
        if (shouldMakeTypo() && char.match(/[a-zA-Z]/)) {
          const typoType = getTypoType();
          const typo = generateTypo(char, nextChar, currentPosition > 0 ? textToType[currentPosition - 1] : null);
          
          if (typoType === 'transposition') {
            // Type next char, then current char, then backspace both
            if (nextChar) {
              await typeCharacter(target, nextChar, currentPosition, editorType);
              await new Promise(resolve => setTimeout(resolve, calculateTypingDelay(nextChar, char)));
              await typeCharacter(target, char, currentPosition, editorType);
              await new Promise(resolve => setTimeout(resolve, calculateTypingDelay(char, nextChar)));
              
              // Notice pause
              await new Promise(resolve => setTimeout(resolve, calculatePauseDelay('typo_notice')));
              
              // Backspace twice
              dispatchBackspace(target, 2);
              
              // Retype correctly
              await typeCharacter(target, char, currentPosition, editorType);
              await new Promise(resolve => setTimeout(resolve, calculateTypingDelay(char, nextChar)));
              await typeCharacter(target, nextChar, currentPosition + 1, editorType);
              currentPosition = currentPosition + 2;
              continue;
            }
          } else if (typoType === 'omission') {
            // Skip this character (don't type it)
            currentPosition++;
            continue;
          } else if (typoType === 'double') {
            // Type character twice
            await typeCharacter(target, char, currentPosition, editorType);
            await new Promise(resolve => setTimeout(resolve, calculateTypingDelay(char, char)));
            await typeCharacter(target, char, currentPosition, editorType);
            
            // Notice pause
            await new Promise(resolve => setTimeout(resolve, calculatePauseDelay('typo_notice')));
            
            // Backspace one
            dispatchBackspace(target, 1);
            
            currentPosition++;
            continue;
          } else if (typo.length > 0) {
            // Substitution typo
            await typeCharacter(target, typo, currentPosition, editorType);
            
            // Notice pause
            await new Promise(resolve => setTimeout(resolve, calculatePauseDelay('typo_notice')));
            
            // Backspace and correct
            dispatchBackspace(target, 1);
          }
        }
        
        // Type the actual character
        await typeCharacter(target, char, currentPosition, editorType);
        
        // Calculate delay for next character
        let delay = calculateTypingDelay(char, nextChar);
        
        // Handle pauses
        if (char === '\n' && nextChar === '\n') {
          delay = calculatePauseDelay('paragraph');
        } else if (['.', '!', '?'].includes(char)) {
          delay = calculatePauseDelay('sentence_end');
        } else if ([',', ';', ':'].includes(char)) {
          delay = calculatePauseDelay('clause');
        }
        
        // Word counting for thinking pauses and focus drift
        if (char === ' ' || char === '\n') {
          wordCount++;
          wordsSinceFocusDrift++;
          
          // Thinking pauses
          if (wordCount % gaussianRandom(110, 30) === 0) {
            delay = calculatePauseDelay('thinking');
          }
          
          // Focus drift simulation
          if (editorType === 'cadmus' && wordsSinceFocusDrift > gaussianRandom(350, 50)) {
            simulateFocusDrift(target, editorType);
            wordsSinceFocusDrift = 0;
          }
        }
        
        // Revision simulation
        charsSinceRevision++;
        if (editorType === 'cadmus' && charsSinceRevision > 1000 && Math.random() < 0.005) {
          simulateRevision(target, editorType);
          charsSinceRevision = 0;
        }
        
        // Scroll noise
        if (Math.random() < 0.02) {
          dispatchArrowKeys(target, Math.random() < 0.5 ? 'up' : 'down', Math.floor(Math.random() * 5) + 1);
        }
        
        // Wait before next character
        await new Promise(resolve => setTimeout(resolve, Math.max(20, delay)));
        
        charTimings.push(Date.now());
      }
      
      // Typing complete
      const event = new CustomEvent('humantype-main-to-content', {
        detail: {
          type: 'complete',
          progress: {
            typed: totalChars,
            total: totalChars,
            percent: 100
          }
        }
      });
      window.dispatchEvent(event);
    }

    // =============== PUBLIC API ===============
    
    return {
      start: function(options) {
        if (isRunning) return;
        
        textToType = options.text;
        config = options.config;
        totalChars = textToType.length;
        currentPosition = 0;
        isRunning = true;
        isPaused = false;
        startTime = Date.now();
        charTimings = [];
        
        typeText(options.editorType).catch(err => {
          const event = new CustomEvent('humantype-main-to-content', {
            detail: {
              type: 'error',
              error: err.message
            }
          });
          window.dispatchEvent(event);
          isRunning = false;
        });
      },
      
      pause: function() {
        isPaused = true;
      },
      
      resume: function() {
        isPaused = false;
      },
      
      stop: function() {
        isRunning = false;
        isPaused = false;
        currentPosition = 0;
      },
      
      getProgress: function() {
        return {
          typed: currentPosition,
          total: totalChars,
          percent: Math.round((currentPosition / totalChars) * 100),
          elapsed: Date.now() - startTime,
          averageWPM: charTimings.length > 0 ? 
            Math.round((charTimings.length / 5) / ((Date.now() - startTime) / 60000)) : 0
        };
      }
    };
  })();

  // Listen for commands from content script
  window.addEventListener('humantype-command', function(event) {
    const data = event.detail;
    
    switch (data.action) {
      case 'start':
        HumanTypePro.start({
          text: data.text,
          config: data.config,
          editorType: data.editorType
        });
        break;
        
      case 'pause':
        HumanTypePro.pause();
        break;
        
      case 'resume':
        HumanTypePro.resume();
        break;
        
      case 'stop':
        HumanTypePro.stop();
        break;
        
      case 'getProgress':
        const progress = HumanTypePro.getProgress();
        window.dispatchEvent(new CustomEvent('humantype-main-to-content', {
          detail: {
            type: 'progress',
            progress: progress
          }
        }));
        break;
    }
  });
})();