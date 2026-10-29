import type React from 'react';
import { Copy, Keyboard, Trash2 } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import type { MenuEntry } from '../MenuButton';
import { MenuButton } from '../MenuButton';

interface ObservationActionsMenuProps {
  /** The code of the day before, or null when that day has no observation. */
  yesterdayCode: string | null;
  onCopyYesterday: () => void;
  directOnly: boolean;
  onToggleDirectOnly: () => void;
  /** Deletes the saved observation. Leave it out for a day without one. */
  onDelete?: (() => void) | undefined;
}

/**
 * The ⋮ menu of an observation: Copy yesterday, Direct Code Only and, last and in red,
 * Delete observation.
 */
export const ObservationActionsMenu: React.FC<ObservationActionsMenuProps> = ({
  yesterdayCode,
  onCopyYesterday,
  directOnly,
  onToggleDirectOnly,
  onDelete,
}) => {
  const { t } = useLanguage();
  const entries: MenuEntry[] = [
    {
      kind: 'item',
      label: t.observationForm.copyYesterday,
      icon: <Copy size={18} />,
      onSelect: onCopyYesterday,
      disabled: yesterdayCode === null,
      hint: yesterdayCode,
    },
    {
      kind: 'check',
      label: t.todayView.modeDirect,
      icon: <Keyboard size={18} />,
      checked: directOnly,
      onSelect: onToggleDirectOnly,
    },
  ];
  if (onDelete) {
    entries.push(
      { kind: 'separator' },
      {
        kind: 'item',
        label: t.observationForm.deleteObservation,
        icon: <Trash2 size={18} />,
        onSelect: onDelete,
        danger: true,
      }
    );
  }
  return (
    <MenuButton
      label={t.observationForm.actionsLabel}
      entries={entries}
      className="obs-actions-btn"
    />
  );
};
