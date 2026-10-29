import type { TranslationSchema } from '../../i18n';
import { formatMessage } from '../../i18n';
import type { StampType } from '../../types/crms';

/** The one guidance sentence of a stamp, for a day with a code */
export const fertilityGuidance = (stamp: StampType, t: TranslationSchema) => {
  switch (stamp) {
    case 'RED':
      return t.todayView.guidance.red;
    case 'WHITE_BABY':
      return t.todayView.guidance.whiteBaby;
    case 'LIGHT_GREEN_BABY_1':
    case 'LIGHT_GREEN_BABY_2':
    case 'LIGHT_GREEN_BABY_3':
      return formatMessage(t.todayView.guidance.postPeak, { day: stamp.slice(-1) });
    default:
      return t.todayView.guidance.dry;
  }
};
