import { useCycleData } from '../context/CycleContext';
import { downloadBackupFile } from '../utils/exportUtils';

/** Downloads a backup file of all the observations and records the date of the backup. */
export const useBackUpNow = (): (() => void) => {
  const { exportDataJson, markBackedUp } = useCycleData();
  return () => {
    downloadBackupFile(exportDataJson());
    markBackedUp();
  };
};
