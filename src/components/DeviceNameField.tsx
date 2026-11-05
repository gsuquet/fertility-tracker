/** The field of a device name. See docs/reference/screens/settings.md#name-dialog. */
import type React from 'react';
import { useId } from 'react';
import { useLanguage } from '../context/LanguageContext';

interface DeviceNameFieldProps {
  value: string;
  onChange: (value: string) => void;
  /** True after a submit with a name that is not valid. */
  invalid: boolean;
  inputRef?: React.Ref<HTMLInputElement>;
}

export const DeviceNameField: React.FC<DeviceNameFieldProps> = ({
  value,
  onChange,
  invalid,
  inputRef,
}) => {
  const { t } = useLanguage();
  const id = useId();
  return (
    <div className="form-group">
      <label htmlFor={`${id}-name`}>{t.sync.nameLabel}</label>
      <input
        ref={inputRef}
        id={`${id}-name`}
        className="form-input"
        type="text"
        autoComplete="off"
        value={value}
        aria-invalid={invalid}
        aria-describedby={invalid ? `${id}-error` : undefined}
        onChange={e => onChange(e.target.value)}
      />
      {invalid && (
        <p id={`${id}-error`} className="settings-alert" role="alert">
          {t.sync.nameInvalid}
        </p>
      )}
    </div>
  );
};
