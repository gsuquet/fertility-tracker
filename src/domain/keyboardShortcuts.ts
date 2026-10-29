/** The actions that a key can start. See docs/reference/application-behavior.md#keyboard-shortcuts. */
export type ShortcutId =
  | 'today'
  | 'chart'
  | 'calendar'
  | 'analytics'
  | 'newEntry'
  | 'prevDay'
  | 'nextDay'
  | 'goToToday'
  | 'help';

/** The shortcuts in the order of the shortcuts dialog. */
export const SHORTCUT_IDS: readonly ShortcutId[] = [
  'today',
  'chart',
  'calendar',
  'analytics',
  'newEntry',
  'prevDay',
  'nextDay',
  'goToToday',
  'help',
];

/** The key of each shortcut as `aria-keyshortcuts` writes it. */
export const SHORTCUT_KEYS: Record<ShortcutId, string> = {
  today: '1',
  chart: '2',
  calendar: '3',
  analytics: '4',
  newEntry: 'N',
  prevDay: 'ArrowLeft',
  nextDay: 'ArrowRight',
  goToToday: 'T',
  help: '?',
};

/** The key of each shortcut as the user sees it. */
export const SHORTCUT_LABELS: Record<ShortcutId, string> = {
  ...SHORTCUT_KEYS,
  prevDay: '←',
  nextDay: '→',
};

const DIGITS: readonly ShortcutId[] = ['today', 'chart', 'calendar', 'analytics'];

type ShortcutKeyEvent = Pick<
  KeyboardEvent,
  'key' | 'code' | 'ctrlKey' | 'metaKey' | 'altKey' | 'shiftKey' | 'isComposing'
>;

/**
 * The physical key of a character that the layout changes, or ''. AZERTY types `&` on the key 1
 * without Shift, and a Cyrillic layout types `т` on the key N. A key that is not a character, for
 * example an arrow of the number pad without Num Lock, keeps its own meaning.
 */
const physicalKey = (e: ShortcutKeyEvent, key: string) => {
  if (key.length !== 1) return '';
  const digit = /^Digit([1-4])$/.exec(e.code)?.[1];
  // Shift+1 types `!` on a US keyboard: that is not the shortcut 1
  if (digit) return e.shiftKey ? '' : digit;
  const letter = /^Key([NT])$/.exec(e.code)?.[1];
  // A letter of the Latin alphabet stays with its own key, as on a Dvorak keyboard
  return letter && !/^[\x20-\x7e]$/.test(key) ? letter.toLowerCase() : '';
};

/**
 * The shortcut of a key event, or null. A key with Ctrl, Meta or Alt stays with the browser and
 * the system. Some keys also use the physical key, see `physicalKey`.
 */
export const shortcutFor = (e: ShortcutKeyEvent): ShortcutId | null => {
  if (e.ctrlKey || e.metaKey || e.altKey || e.isComposing) return null;
  // A keydown of the autofill of a browser can have no key
  const key = String(e.key);
  const typed = /^[1-4nNtT]$/.test(key) ? key : physicalKey(e, key) || key;
  if (/^[1-4]$/.test(typed)) return DIGITS[Number(typed) - 1] as ShortcutId;
  switch (typed.toLowerCase()) {
    case 'n':
      return 'newEntry';
    case 't':
      return 'goToToday';
    case 'arrowleft':
      return 'prevDay';
    case 'arrowright':
      return 'nextDay';
    case '?':
      return 'help';
    default:
      return null;
  }
};

/** Elements that use all the keys to type text. */
const FIELDS =
  'input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"], [role="combobox"], [role="spinbutton"]';

/** Widgets that use the arrow keys to move the focus or to change a value. */
const ARROW_WIDGETS =
  '[role="listbox"], [role="grid"], [role="menu"], [role="menubar"], [role="radiogroup"], [role="slider"], [role="tree"]';

/**
 * True when the key must stay with the page: a dialog is open, the focus is in a field, or an
 * arrow key goes to a widget that uses the arrows.
 */
export const isShortcutBlocked = (id: ShortcutId, target: EventTarget | null): boolean => {
  if (document.querySelector('dialog[open]')) return true;
  if (!(target instanceof Element)) return false;
  if (target.closest(FIELDS)) return true;
  return (id === 'prevDay' || id === 'nextDay') && target.closest(ARROW_WIDGETS) !== null;
};
