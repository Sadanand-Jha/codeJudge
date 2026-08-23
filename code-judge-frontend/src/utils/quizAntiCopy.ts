/**
 * Quiz Anti-Copy Protection Utilities
 * 
 * Client-side deterrents to discourage copying quiz content.
 * These are NOT security boundaries - they are UX deterrents only.
 */

/**
 * Disable text selection on protected elements
 */
export function disableTextSelection(): void {
  const style = document.createElement('style');
  style.id = 'quiz-anti-copy-styles';
  style.textContent = `
    .quiz-protected-content {
      -webkit-user-select: none !important;
      -moz-user-select: none !important;
      -ms-user-select: none !important;
      user-select: none !important;
    }
    
    .quiz-protected-content img {
      -webkit-user-drag: none !important;
      user-drag: none !important;
      pointer-events: none !important;
    }
    
    .quiz-protected-content * {
      -webkit-touch-callout: none !important;
    }
  `;
  
  if (!document.getElementById('quiz-anti-copy-styles')) {
    document.head.appendChild(style);
  }
}

/**
 * Remove anti-copy styles
 */
export function enableTextSelection(): void {
  const style = document.getElementById('quiz-anti-copy-styles');
  if (style) {
    style.remove();
  }
}

/**
 * Disable copy event
 */
export function disableCopy(e: ClipboardEvent): void {
  e.preventDefault();
}

/**
 * Disable context menu
 */
export function disableContextMenu(e: MouseEvent): void {
  e.preventDefault();
}

/**
 * Disable drag start
 */
export function disableDragStart(e: DragEvent): void {
  e.preventDefault();
}

/**
 * Disable select start
 */
export function disableSelectStart(e: Event): void {
  e.preventDefault();
}

/**
 * Handle keyboard shortcuts
 */
export function disableKeyboardShortcuts(e: KeyboardEvent): void {
  const isInputFocused = document.activeElement instanceof HTMLInputElement || 
                          document.activeElement instanceof HTMLTextAreaElement ||
                          document.activeElement instanceof HTMLSelectElement;
  
  if (isInputFocused) {
    // Allow typing in input fields
    return;
  }
  
  const key = e.key.toLowerCase();
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const modifier = isMac ? e.metaKey : e.ctrlKey;
  
  if (modifier) {
    switch (key) {
      case 'c':
      case 'x':
      case 'a':
      case 's':
      case 'p':
        e.preventDefault();
        break;
    }
  }
}

/**
 * Handle tab visibility change
 */
export function handleVisibilityChange(callback: (isVisible: boolean) => void): () => void {
  const handler = () => {
    const isVisible = document.visibilityState === 'visible';
    callback(isVisible);
  };
  
  document.addEventListener('visibilitychange', handler);
  
  // Return cleanup function
  return () => {
    document.removeEventListener('visibilitychange', handler);
  };
}

/**
 * Disable printing
 */
export function disablePrint(e: KeyboardEvent): void {
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const modifier = isMac ? e.metaKey : e.ctrlKey;
  
  if (modifier && e.key.toLowerCase() === 'p') {
    e.preventDefault();
  }
}

/**
 * Generate dynamic watermark
 */
export function generateWatermark(username: string, rollNumber: string, quizCode: string): string {
  const timestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  const watermarkText = `${username} | ${rollNumber} | ${quizCode} | ${timestamp}`;
  
  return watermarkText;
}

/**
 * Create watermark element
 */
export function createWatermarkElement(username: string, rollNumber: string, quizCode: string): HTMLDivElement {
  const watermark = document.createElement('div');
  watermark.className = 'quiz-watermark';
  watermark.textContent = generateWatermark(username, rollNumber, quizCode);
  
  return watermark;
}

/**
 * Inject watermark styles
 */
export function injectWatermarkStyles(): void {
  const style = document.createElement('style');
  style.id = 'quiz-watermark-styles';
  style.textContent = `
    .quiz-watermark-container {
      position: relative;
      overflow: hidden;
      pointer-events: none;
    }
    
    .quiz-watermark {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      pointer-events: none;
      z-index: 1;
      opacity: 0.06;
      font-size: 14px;
      color: #000;
      line-height: 2;
      transform: rotate(-30deg);
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: center;
      gap: 40px;
      overflow: hidden;
    }
    
    .quiz-watermark::before {
      content: attr(data-watermark);
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      white-space: nowrap;
    }
    
    .quiz-watermark-content {
      position: relative;
      z-index: 2;
    }
    
    .quiz-paused-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(9, 9, 11, 0.95);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 100;
      pointer-events: all;
    }
    
    .quiz-paused-overlay h2 {
      color: #EC4899;
      font-size: 24px;
      margin-bottom: 10px;
    }
    
    .quiz-paused-overlay p {
      color: #9CA3AF;
      font-size: 14px;
    }
  `;
  
  if (!document.getElementById('quiz-watermark-styles')) {
    document.head.appendChild(style);
  }
}

/**
 * Remove watermark styles
 */
export function removeWatermarkStyles(): void {
  const style = document.getElementById('quiz-watermark-styles');
  if (style) {
    style.remove();
  }
}

/**
 * Create tab switch overlay
 */
export function createTabSwitchOverlay(): HTMLDivElement {
  const overlay = document.createElement('div');
  overlay.className = 'quiz-paused-overlay';
  overlay.innerHTML = `
    <h2>Quiz Paused</h2>
    <p>Please return to the quiz tab to continue.</p>
  `;
  
  return overlay;
}