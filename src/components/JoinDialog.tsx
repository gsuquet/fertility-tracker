/** The join of this device with an invitation link. See docs/reference/screens/settings.md#join-dialog. */
import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import { useCycle } from '../context/CycleContext';
import { useLanguage } from '../context/LanguageContext';
import type { AnswerContent, Offer } from '../domain/vault/invitation';
import { useDemoRemoval } from '../hooks/useDemoRemoval';
import type { SyncControl } from '../hooks/useSync';
import type { VaultError } from '../sync/deviceVault';
import type { JoinState } from '../sync/invitationFlow';
import { failureOf } from '../utils/syncFailure';
import type { SyncFailure } from '../utils/syncFailure';
import { INVITE_POLL_MS, SyncStepDialog, codeText } from './SyncStepDialog';
import type { StepAction } from './SyncStepDialog';

type EndMessage = SyncFailure | 'expired' | 'refused' | 'alreadySynced' | 'undoFirst' | 'badLink';

type Step =
  | { kind: 'waiting' }
  | { kind: 'confirm'; code: string }
  /** Finishing is true while `finishJoin()` runs: the dialog then does not close. */
  | { kind: 'joining'; code: string; finishing: boolean }
  | { kind: 'done' }
  | { kind: 'end'; message: EndMessage };

interface Answered {
  offer: Offer;
  content: AnswerContent;
}

interface JoinDialogProps {
  control: SyncControl;
  /** The fragment of the invitation link, for example `#invite=<id>.<secret>`. */
  fragment: string;
  onClose: () => void;
  /** The time between two checks. Tests give a short time. */
  pollMs?: number;
}

/** A failure of the join that is not a failure of the relay. */
class JoinStop extends Error {
  constructor(readonly reason: EndMessage) {
    super(reason);
  }
}

const endOf = (error: unknown): EndMessage =>
  error instanceof JoinStop ? error.reason : failureOf(error);

export const JoinDialog: React.FC<JoinDialogProps> = ({
  control,
  fragment,
  onClose,
  pollMs = INVITE_POLL_MS,
}) => {
  const { t } = useLanguage();
  const s = t.sync;
  const { undoChange } = useCycle();
  const removeDemoDays = useDemoRemoval();
  const [step, setStep] = useState<Step>({ kind: 'waiting' });
  const join = useRef<JoinState | null>(null);
  const answered = useRef<Answered | null>(null);
  const confirmed = useRef(false);
  // True when the invitation is used or stopped: nothing to delete on the relay
  const finished = useRef(false);
  const latest = useRef({ control, pollMs, undoChange, fragment });
  latest.current = { control, pollMs, undoChange, fragment };

  const end = (message: EndMessage) => {
    finished.current = true;
    setStep({ kind: 'end', message });
  };

  /** Reads the vault with the keys of the answer. Only after the user confirmed the codes. */
  const finish = async (code: string) => {
    const reply = answered.current as Answered;
    setStep({ kind: 'joining', code, finishing: true });
    try {
      const { finishJoin } = await import('../sync/invitationFlow');
      await control.withSync(async ({ relay, keyStore }) => {
        if (await keyStore.load()) throw new JoinStop('alreadySynced');
        removeDemoDays();
        return finishJoin(relay, keyStore, join.current as JoinState, reply.offer, reply.content);
      });
      finished.current = true;
      setStep({ kind: 'done' });
      void control.syncNow();
    } catch (error) {
      end(endOf(error));
    }
  };
  const ref = useRef({ end, finish });
  ref.current = { end, finish };

  // Sends the join request, then checks the invitation until the answer comes
  useEffect(() => {
    let live = true;
    const { control: sync, pollMs: wait, undoChange: undo, fragment: link } = latest.current;
    const run = async () => {
      const { relay, keyStore } = await sync.services();
      if (await keyStore.load()) throw new JoinStop('alreadySynced');
      // ADR 0012: no join while an undo copy exists
      if (undo !== null) throw new JoinStop('undoFirst');
      const { parseInviteFragment } = await import('../domain/vault/invitation');
      const invitation = parseInviteFragment(link);
      if (!invitation) throw new JoinStop('badLink');
      const flow = await import('../sync/invitationFlow');
      // The relay has no invitation with this id: it expired, or the owner device stopped it
      const state = await flow.startJoin(relay, invitation).catch((error: unknown) => {
        throw (error as VaultError).detail?.status === 404 ? new JoinStop('expired') : error;
      });
      join.current = state;
      for (;;) {
        await new Promise(resolve => setTimeout(resolve, wait));
        const check = await flow.checkAsNewDevice(relay, state);
        if (!live) return;
        if (!('code' in check)) {
          if (check.status === 'waiting') continue;
          ref.current.end(check.status);
          return;
        }
        const { code } = check;
        setStep(now => (now.kind === 'waiting' ? { kind: 'confirm', code } : now));
        if (check.status === 'answered') {
          answered.current = { offer: check.offer, content: check.content };
          if (confirmed.current) void ref.current.finish(code);
          return;
        }
      }
    };
    run().catch(error => {
      if (live) ref.current.end(endOf(error));
    });
    return () => {
      live = false;
    };
  }, []);

  /** Deletes the invitation on the relay, then closes. */
  const cancel = () => {
    const state = join.current;
    if (state && !finished.current) {
      finished.current = true;
      void control
        .services()
        .then(({ relay }) => relay.deleteInvite(state.invitation.id, state.token));
    }
    onClose();
  };

  const confirm = (code: string) => {
    confirmed.current = true;
    if (answered.current) void finish(code);
    else setStep({ kind: 'joining', code, finishing: false });
  };

  const closeAction: StepAction = { label: s.close, onClick: onClose, primary: true };
  const cancelAction: StepAction = { label: t.actions.cancel, onClick: cancel };
  const view: { status: string; actions: StepAction[]; alert?: string } = (() => {
    switch (step.kind) {
      case 'waiting':
        return { status: s.joinWaiting, actions: [cancelAction] };
      case 'confirm':
        return {
          status: s.joinConfirm,
          actions: [
            { label: s.codesDiffer, onClick: cancel },
            { label: s.codesMatch, onClick: () => confirm(step.code), primary: true },
          ],
        };
      case 'joining':
        return { status: s.working, actions: step.finishing ? [] : [cancelAction] };
      case 'done':
        return { status: s.joinDone, actions: [closeAction] };
      default:
        return { status: s.joinTitle, alert: s[step.message], actions: [closeAction] };
    }
  })();

  return (
    <SyncStepDialog
      title={s.joinTitle}
      status={view.status}
      alert={view.alert ?? null}
      actions={view.actions}
      onClose={step.kind === 'joining' && step.finishing ? null : cancel}
    >
      {(step.kind === 'confirm' || step.kind === 'joining') && (
        <p className="sync-code">{codeText(step.code)}</p>
      )}
    </SyncStepDialog>
  );
};
