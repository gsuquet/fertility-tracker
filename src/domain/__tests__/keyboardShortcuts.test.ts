import { afterEach, describe, expect, it } from 'vitest';
import {
  SHORTCUT_IDS,
  SHORTCUT_KEYS,
  SHORTCUT_LABELS,
  isShortcutBlocked,
  shortcutFor,
} from '../keyboardShortcuts';

const key = (k: string, extra: Partial<KeyboardEvent> = {}) =>
  shortcutFor({
    key: k,
    code: '',
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    isComposing: false,
    ...extra,
  });

describe('shortcutFor', () => {
  it('maps the digits 1 to 4 to the four pages', () => {
    expect(['1', '2', '3', '4'].map(k => key(k))).toEqual([
      'today',
      'chart',
      'calendar',
      'analytics',
    ]);
    expect(key('5')).toBeNull();
  });

  it('uses the physical digit keys of AZERTY and of the number pad', () => {
    expect(key('&', { code: 'Digit1' })).toBe('today');
    expect(key('é', { code: 'Digit2' })).toBe('chart');
    expect(key('"', { code: 'Digit3' })).toBe('calendar');
    expect(key("'", { code: 'Digit4' })).toBe('analytics');
    expect(key('4', { code: 'Numpad4' })).toBe('analytics');
    expect(key('(', { code: 'Digit5' })).toBeNull();
  });

  it('maps the letters in both cases, the arrows and the question mark', () => {
    expect(key('n')).toBe('newEntry');
    expect(key('N')).toBe('newEntry');
    expect(key('t')).toBe('goToToday');
    expect(key('T')).toBe('goToToday');
    expect(key('ArrowLeft')).toBe('prevDay');
    expect(key('ArrowRight')).toBe('nextDay');
    expect(key('?')).toBe('help');
    expect(key('x')).toBeNull();
    expect(key('ArrowUp')).toBeNull();
  });

  it('leaves the keys with Ctrl, Meta or Alt and the keys of a composition', () => {
    expect(key('n', { ctrlKey: true })).toBeNull();
    expect(key('1', { metaKey: true })).toBeNull();
    expect(key('t', { altKey: true })).toBeNull();
    expect(key('n', { isComposing: true })).toBeNull();
  });

  it('ignores a key event with no key, as the autofill of a browser sends', () => {
    expect(key(undefined as unknown as string)).toBeNull();
  });
});

describe('shortcut keys', () => {
  it('has a key and a label for each shortcut', () => {
    for (const id of SHORTCUT_IDS) {
      expect(SHORTCUT_KEYS[id]).toBeTruthy();
      expect(SHORTCUT_LABELS[id]).toBeTruthy();
    }
    expect(SHORTCUT_LABELS.prevDay).toBe('←');
    expect(SHORTCUT_KEYS.prevDay).toBe('ArrowLeft');
  });
});

describe('isShortcutBlocked', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  const add = (html: string) => {
    document.body.insertAdjacentHTML('beforeend', html);
    return document.body.lastElementChild as HTMLElement;
  };

  it('lets a key on the page or with no element target through', () => {
    const button = add('<button>save</button>');
    expect(isShortcutBlocked('newEntry', button)).toBe(false);
    expect(isShortcutBlocked('newEntry', document.body)).toBe(false);
    expect(isShortcutBlocked('newEntry', window)).toBe(false);
    expect(isShortcutBlocked('newEntry', null)).toBe(false);
  });

  it('blocks all the keys while a dialog is open', () => {
    add('<dialog open><p>hi</p></dialog>');
    expect(isShortcutBlocked('today', document.body)).toBe(true);
  });

  it.each([
    '<input />',
    '<textarea></textarea>',
    '<select></select>',
    '<div contenteditable="true"></div>',
    '<div contenteditable=""></div>',
    '<div role="combobox"></div>',
  ])('blocks all the keys in the field %s', html => {
    const field = add(html);
    expect(isShortcutBlocked('today', field)).toBe(true);
    expect(isShortcutBlocked('nextDay', field)).toBe(true);
  });

  it('lets a key through in an element that is not editable', () => {
    expect(isShortcutBlocked('today', add('<div contenteditable="false"></div>'))).toBe(false);
  });

  it.each(['listbox', 'grid', 'menu', 'radiogroup', 'tablist', 'slider'])(
    'blocks only the arrows in a %s',
    role => {
      const item = add(`<div role="${role}"><button>item</button></div>`).querySelector(
        'button'
      ) as HTMLElement;
      expect(isShortcutBlocked('prevDay', item)).toBe(true);
      expect(isShortcutBlocked('nextDay', item)).toBe(true);
      expect(isShortcutBlocked('chart', item)).toBe(false);
    }
  );
});
