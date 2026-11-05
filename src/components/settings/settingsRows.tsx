/** The rows and the groups of Settings. */
import type React from 'react';
import { useId } from 'react';
import { ChevronRight } from 'lucide-react';

interface ActionRowProps {
  icon: React.ReactNode;
  label: string;
  detail?: string;
  /** A short text at the right, for example the version */
  value?: string;
  onClick: () => void;
  /** A row that opens another dialog has a chevron */
  opens?: boolean;
  danger?: boolean;
  disabled?: boolean;
  buttonRef?: React.Ref<HTMLButtonElement>;
}

export const ActionRow: React.FC<ActionRowProps> = ({
  icon,
  label,
  detail,
  value,
  onClick,
  opens = false,
  danger = false,
  disabled = false,
  buttonRef,
}) => {
  // The name is the label only: the detail is the description
  const id = useId();
  return (
    <li>
      <button
        ref={buttonRef}
        type="button"
        className={`settings-row ${danger ? 'danger' : ''}`}
        onClick={onClick}
        disabled={disabled}
        aria-labelledby={`${id}-label`}
        aria-describedby={detail ? `${id}-detail` : undefined}
      >
        {icon}
        <span className="settings-row-text">
          <span id={`${id}-label`} className="settings-row-label">
            {label}
          </span>
          {detail && (
            <span id={`${id}-detail`} className="settings-row-detail">
              {detail}
            </span>
          )}
        </span>
        {value && <span className="settings-row-value">{value}</span>}
        {opens && <ChevronRight size={18} className="settings-row-chevron" aria-hidden="true" />}
      </button>
    </li>
  );
};

export const Group: React.FC<{ id: string; title: string; children: React.ReactNode }> = ({
  id,
  title,
  children,
}) => (
  <section className="settings-group" aria-labelledby={id}>
    <h3 id={id} className="settings-group-title">
      {title}
    </h3>
    <ul className="settings-list">{children}</ul>
  </section>
);

export const iconOf = (Icon: React.ComponentType<{ size?: number; className?: string }>) => (
  <Icon size={18} className="settings-row-icon" aria-hidden="true" />
);
