import type React from 'react';
import { useRef, useState } from 'react';
import { Check, MoreVertical } from 'lucide-react';
import { Modal } from './Modal';

/** One entry of a menu: an action, a check item, or a line between groups. */
export type MenuEntry =
  | {
      kind: 'item';
      label: string;
      icon: React.ReactNode;
      onSelect: () => void;
      disabled?: boolean;
      /** A short text at the right of the item, for example the code that Copy yesterday copies. */
      hint?: string | null;
      /** A destructive action: red text. */
      danger?: boolean;
    }
  | { kind: 'check'; label: string; icon: React.ReactNode; checked: boolean; onSelect: () => void }
  | { kind: 'separator' };

interface MenuButtonProps {
  /** The name of the ⋮ button and of the menu. */
  label: string;
  entries: MenuEntry[];
  /** Classes of the ⋮ button, next to `icon-button menu-btn`. */
  className?: string;
}

/**
 * A ⋮ button that opens a small menu under it. Escape, Back, Tab and a click outside close the
 * menu. The up and down arrow keys move between the items, as in a native menu.
 */
export const MenuButton: React.FC<MenuButtonProps> = ({ label, entries, className = '' }) => {
  const [coords, setCoords] = useState<{ top: number; right: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const open = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setCoords({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
  };
  const close = () => setCoords(null);
  const run = (action: () => void) => () => {
    close();
    action();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      close();
      return;
    }
    const step = { ArrowDown: 1, ArrowUp: -1 }[e.key];
    if (!step) return;
    e.preventDefault();
    const items = Array.from(
      (menuRef.current as HTMLDivElement).querySelectorAll<HTMLElement>(
        '[role^="menuitem"]:not(:disabled)'
      )
    );
    const index = items.indexOf(document.activeElement as HTMLElement);
    (items[(index + step + items.length) % items.length] as HTMLElement).focus();
  };

  return (
    <>
      <button
        type="button"
        className={`icon-button menu-btn ${className}`}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={coords !== null}
        onClick={open}
      >
        <MoreVertical size={20} />
      </button>
      {coords && (
        <Modal
          label={label}
          onClose={close}
          className="menu-backdrop"
          panelClassName="menu-panel"
          panelStyle={{ position: 'fixed', top: `${coords.top}px`, right: `${coords.right}px` }}
        >
          <div ref={menuRef} role="menu" aria-label={label} onKeyDown={handleKeyDown} tabIndex={-1}>
            {entries.map((entry, index) => {
              if (entry.kind === 'separator') {
                return <hr key={`separator-${index}`} />;
              }
              if (entry.kind === 'check') {
                return (
                  <button
                    key={entry.label}
                    type="button"
                    role="menuitemcheckbox"
                    aria-checked={entry.checked}
                    className="menu-item"
                    onClick={run(entry.onSelect)}
                  >
                    {entry.icon}
                    <span>{entry.label}</span>
                    {entry.checked && <Check size={18} className="menu-check" />}
                  </button>
                );
              }
              return (
                <button
                  key={entry.label}
                  type="button"
                  role="menuitem"
                  className={`menu-item ${entry.danger ? 'danger' : ''}`}
                  disabled={entry.disabled}
                  onClick={run(entry.onSelect)}
                >
                  {entry.icon}
                  <span>{entry.label}</span>
                  {entry.hint && <span className="menu-hint">{entry.hint}</span>}
                </button>
              );
            })}
          </div>
        </Modal>
      )}
    </>
  );
};
