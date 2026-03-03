import {
  extractScriptResult,
  requireStringParam,
  requireTabId,
  sendErrorResult,
  sendSuccessResult,
} from './helpers.js';

// Exported for testing — maps shifted punctuation characters to their physical key codes.
export const SHIFTED_PUNCTUATION_CODES: Record<string, string> = {
  '!': 'Digit1',
  '@': 'Digit2',
  '#': 'Digit3',
  $: 'Digit4',
  '%': 'Digit5',
  '^': 'Digit6',
  '&': 'Digit7',
  '*': 'Digit8',
  '(': 'Digit9',
  ')': 'Digit0',
  _: 'Minus',
  '+': 'Equal',
  '{': 'BracketLeft',
  '}': 'BracketRight',
  '|': 'Backslash',
  ':': 'Semicolon',
  '"': 'Quote',
  '<': 'Comma',
  '>': 'Period',
  '?': 'Slash',
  '~': 'Backquote',
};

// Exported for testing — maps unshifted punctuation characters to their physical key codes.
export const UNSHIFTED_PUNCTUATION_CODES: Record<string, string> = {
  '-': 'Minus',
  '=': 'Equal',
  '[': 'BracketLeft',
  ']': 'BracketRight',
  '\\': 'Backslash',
  ';': 'Semicolon',
  "'": 'Quote',
  ',': 'Comma',
  '.': 'Period',
  '/': 'Slash',
  '`': 'Backquote',
};

export const handleBrowserPressKey = async (params: Record<string, unknown>, id: string | number): Promise<void> => {
  try {
    const tabId = requireTabId(params, id);
    if (tabId === null) return;
    const key = requireStringParam(params, 'key', id);
    if (key === null) return;
    const selector = typeof params.selector === 'string' && params.selector.length > 0 ? params.selector : null;
    const modifiers =
      typeof params.modifiers === 'object' && params.modifiers !== null
        ? (params.modifiers as Record<string, unknown>)
        : {};
    const shiftKey = modifiers.shift === true;
    const ctrlKey = modifiers.ctrl === true;
    const altKey = modifiers.alt === true;
    const metaKey = modifiers.meta === true;

    const results = await chrome.scripting.executeScript({
      target: { tabId },
      world: 'MAIN',
      func: (
        k: string,
        sel: string | null,
        shift: boolean,
        ctrl: boolean,
        alt: boolean,
        meta: boolean,
        shiftedPunct: Record<string, string>,
        unshiftedPunct: Record<string, string>,
      ) => {
        // Resolve target element
        let target: Element | null = null;
        if (sel) {
          target = document.querySelector(sel);
          if (!target) return { error: `Element not found: ${sel}` };
          (target as HTMLElement).focus();
        } else {
          target = document.activeElement ?? document.body;
        }

        // Derive physical key code from key value
        const deriveCode = (k: string): string => {
          if (k.length === 1) {
            const upper = k.toUpperCase();
            if (upper >= 'A' && upper <= 'Z') return `Key${upper}`;
            if (k >= '0' && k <= '9') return `Digit${k}`;
            if (k === ' ') return 'Space';
            return shiftedPunct[k] ?? unshiftedPunct[k] ?? k;
          }
          return k;
        };

        // Map key to legacy keyCode
        const KEY_CODES: Record<string, number> = {
          Enter: 13,
          Escape: 27,
          Tab: 9,
          Backspace: 8,
          Delete: 46,
          ArrowUp: 38,
          ArrowDown: 40,
          ArrowLeft: 37,
          ArrowRight: 39,
          Home: 36,
          End: 35,
          PageUp: 33,
          PageDown: 34,
          ' ': 32,
        };

        const getKeyCode = (k: string): number => {
          if (KEY_CODES[k] !== undefined) return KEY_CODES[k];
          if (k.length === 1) return k.toUpperCase().charCodeAt(0);
          return 0;
        };

        const code = deriveCode(k);
        const keyCode = getKeyCode(k);
        const isPrintable = k.length === 1;

        const eventInit: KeyboardEventInit = {
          key: k,
          code,
          keyCode,
          which: keyCode,
          bubbles: true,
          cancelable: true,
          shiftKey: shift,
          ctrlKey: ctrl,
          metaKey: meta,
          altKey: alt,
        };

        // Dispatch keyboard event sequence
        target.dispatchEvent(new KeyboardEvent('keydown', eventInit));

        if (isPrintable) {
          target.dispatchEvent(new KeyboardEvent('keypress', eventInit));
        }

        target.dispatchEvent(new KeyboardEvent('keyup', eventInit));

        // For printable characters, insert the character and dispatch InputEvent on editable elements
        if (isPrintable) {
          const tag = target.tagName.toLowerCase();
          const isEditable = tag === 'input' || tag === 'textarea' || (target as HTMLElement).isContentEditable;
          if (isEditable) {
            if (tag === 'input' || tag === 'textarea') {
              const input = target as HTMLInputElement | HTMLTextAreaElement;
              const start = input.selectionStart ?? input.value.length;
              const end = input.selectionEnd ?? start;
              input.value = input.value.slice(0, start) + k + input.value.slice(end);
              input.selectionStart = input.selectionEnd = start + 1;
            } else {
              // contentEditable — insert via Selection/Range API
              const selection = window.getSelection();
              if (selection && selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                range.deleteContents();
                range.insertNode(document.createTextNode(k));
                range.collapse(false);
                selection.removeAllRanges();
                selection.addRange(range);
              }
            }
            target.dispatchEvent(
              new InputEvent('input', {
                bubbles: true,
                cancelable: true,
                inputType: 'insertText',
                data: k,
              }),
            );
          }
        }

        return {
          pressed: true,
          key: k,
          target: {
            tagName: target.tagName.toLowerCase(),
            id: (target as HTMLElement).id || undefined,
          },
        };
      },
      args: [key, selector, shiftKey, ctrlKey, altKey, metaKey, SHIFTED_PUNCTUATION_CODES, UNSHIFTED_PUNCTUATION_CODES],
    });

    const result = extractScriptResult(results, id);
    if (!result) return;
    sendSuccessResult(id, { pressed: result.pressed, key: result.key, target: result.target });
  } catch (err) {
    sendErrorResult(id, err);
  }
};
