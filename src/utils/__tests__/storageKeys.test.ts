import { describe, it, expect } from 'vitest';
import * as keys from '../storageKeys';

describe('storageKeys', () => {
  it('keeps the stored key names, so saved data stays readable', () => {
    expect({ ...keys }).toEqual({
      STORAGE_OBSERVATIONS_KEY: 'fertility_care_observations',
      STORAGE_RECOVERY_KEY: 'fertility_care_observations_recovery',
      STORAGE_UNDO_KEY: 'fertility_care_observations_undo',
      STORAGE_LAST_BACKUP_KEY: 'fertility_care_last_backup',
      STORAGE_BACKUP_REMINDER_START_KEY: 'fertility_care_backup_reminder_start',
      STORAGE_BACKUP_SNOOZED_UNTIL_KEY: 'fertility_care_backup_snoozed_until',
      STORAGE_LANGUAGE_KEY: 'fertility_care_lang',
      STORAGE_THEME_KEY: 'fertility_care_theme',
      STORAGE_ENTRY_MODE_KEY: 'fertility_care_entry_mode',
      LAST_SEEN_VERSION_KEY: 'fertility_tracker_last_seen_version',
      STORAGE_HAS_SEEN_WELCOME_KEY: 'fertility_tracker_has_seen_welcome',
    });
  });
});
