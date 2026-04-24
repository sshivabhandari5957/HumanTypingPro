# HumanType Pro - Chrome Extension

A sophisticated text injection tool that types pasted text into Google Docs and Cadmus editors with realistic human-like keystrokes, fully bypassing paste-detection and writing behavior analytics.

## Features

- **Human-like typing simulation** with configurable WPM (10-120)
- **Typo engine** with realistic error patterns and self-correction
- **Anti-detection technology** that bypasses Cadmus analytics
- **Full keystroke simulation** indistinguishable from human typing
- **Revision simulation** mimicking natural editing behavior
- **Zero network permissions** - completely offline and private
- **Dark mode UI** with real-time progress tracking

## Installation

### Manual Installation (Developer Mode)

1. Download and extract this folder
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top-right corner
4. Click "Load unpacked" and select the `humantype-pro` folder
5. The HumanType Pro icon will appear in your extensions bar

### Quick Start

1. Navigate to Google Docs or Cadmus editor
2. Click the HumanType Pro extension icon
3. Paste your text into the text area (up to 50,000 characters)
4. Adjust settings:
   - **WPM**: Your desired typing speed
   - **Error Rate**: How often typos occur (0-8%)
   - **Long Pause Intensity**: How long pauses between paragraphs
   - **Target**: Auto-detect or force specific editor
5. Click "Start Typing" and watch the magic happen

## Usage Walkthrough for Cadmus

### Before You Begin

1. Open your Cadmus assignment
2. Make sure the editor is active and has focus
3. Prepare your text in a separate document

### Step-by-Step

1. **Extension Setup**
   - Pin HumanType Pro to your toolbar for easy access
   - Open the popup by clicking the extension icon

2. **Paste Your Content**
   - Copy your prepared text
   - Paste into the text area in the popup
   - The counter will show character count (max 50,000)

3. **Configure Settings**

   **For a 1000-word essay:**
   - WPM: 45-55 (average typing speed)
   - Error Rate: 2-3% (natural error rate)
   - Long Pause Intensity: Realistic
   - This will take approximately 25-30 minutes

   **For maximum stealth:**
   - WPM: 35-45 (slower, more deliberate)
   - Error Rate: 4-5% (more natural mistakes)
   - Long Pause Intensity: Paranoid (longer breaks)
   - This will take 40-60 minutes for 1000 words

4. **Start Typing**
   - Click "Start Typing"
   - The extension will automatically:
     - Find the editor on the page
     - Begin typing with human-like timing
     - Add natural pauses and typos
     - Simulate focus changes and revisions

5. **Monitor Progress**
   - Watch the real-time progress bar
   - Current WPM shows actual typing speed
   - ETA estimates remaining time
   - You can Pause/Resume anytime

6. **During Typing**
   - Don't interact with the page
   - Don't switch tabs
   - Let the extension work autonomously
   - You can pause if needed

7. **Completion**
   - Extension will stop automatically when done
   - Text will be fully typed in the editor
   - You can manually stop anytime

### Advanced Tips

**For Cadmus specifically:**
- The extension automatically applies anti-detection measures
- Never type or click in the editor while typing is in progress
- Close other tabs to prevent accidental interruptions
- For long essays, consider breaking into multiple sessions

**Timing Guidelines:**
- 500 words: 10-15 minutes (with realistic settings)
- 1000 words: 25-35 minutes
- 2000 words: 60-90 minutes
- 5000 words: 3-4 hours (consider pausing midway)

## How It Works

### Anti-Detection Technology

HumanType Pro uses several sophisticated techniques to avoid detection:

1. **MAIN World Injection**: Scripts run in the page's context, not the extension's isolated world
2. **Synthetic isTrusted Events**: All keystrokes appear as genuine user interactions
3. **Clipboard Override**: Prevents Cadmus from detecting clipboard activity
4. **Natural Timing**: Gaussian distribution of delays, not uniform intervals
5. **Edit History**: Simulates revisions and corrections
6. **Focus Patterns**: Mimics natural focus/blur behavior

### Editor Support

**Google Docs:**
- Targets the hidden `.docs-texteventtarget-iframe` input
- Dispatches events that Docs' canvas reads from

**Cadmus:**
- Targets ProseMirror/TipTap contenteditable elements
- Dispatches full beforeinput/input event sequences
- Includes focus drift and revision simulation

## Privacy

HumanType Pro is completely private:
- **Zero network requests** - no data ever leaves your browser
- **No analytics** - no usage tracking
- **No telemetry** - no error reporting
- **Local storage only** - settings saved in Chrome's local storage
- **Minimal permissions** - only accesses Google Docs and Cadmus domains

## Troubleshooting

**Extension doesn't start typing:**
- Ensure you're on a supported page (docs.google.com or cadmus.io)
- Check if the text area has content
- Refresh the page and try again

**Typing seems too fast/slow:**
- Adjust WPM slider
- Increase pause intensity for longer delays
- Check if error rate is appropriate

**Cadmus detects the activity:**
- Reduce WPM to 30-45
- Increase error rate to 4-6%
- Set pause intensity to "Paranoid"
- Ensure you're not interacting with the page

**Progress stuck:**
- Check if the popup is still open
- You may need to click "Stop" and restart
- Refresh the page if persistent

## Technical Details

### File Structure

humantype-pro/
├── manifest.json # Extension configuration (Manifest V3)
├── background.js # Service worker for message routing
├── content.js # Content script bridge
├── injector.js # MAIN world injector (core engine)
├── popup/
│ ├── popup.html # Control panel UI
│ ├── popup.js # UI logic and state management
│ └── popup.css # Dark mode styling
└── README.md # This file



### Permissions Explained

- `storage`: Save user preferences locally
- `activeTab`: Access the current tab for typing
- `scripting`: Inject scripts into target pages
- `host_permissions`: Limited to Google Docs and Cadmus domains

## Disclaimer

This tool is for educational and research purposes. Users are responsible for complying with their institution's academic integrity policies. The developers do not condone academic dishonesty.

## License

MIT License - Free for personal and educational use.

---

Built with ❤️ for researchers studying human-computer interaction patterns.