/** The invitation of a new owner device. See docs/reference/screens/settings.md#invitation-dialog. */
import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import type { SyncControl } from '../../hooks/useSync';
import type { DeviceRecord } from '../../sync/keyStore';
import type { OwnerInvitation } from '../../sync/invitationFlow';
import { failureOf } from '../../utils/syncFailure';
import type { SyncFailure } from '../../utils/syncFailure';
import { INVITE_POLL_MS, SyncStepDialog, codeText } from '../SyncStepDialog';
import type { StepAction } from '../SyncStepDialog';

type Step =
  | { kind: 'start' }
  | { kind: 'waiting'; link: string }
  | { kind: 'confirm'; code: string }
  | { kind: 'adding'; code: string }
  | { kind: 'done' }
  | { kind: 'end'; message: SyncFailure | 'expired' | 'refused' };

interface Started {
  record: DeviceRecord;
  owner: OwnerInvitation;
}

interface InviteDialogProps {
  control: SyncControl;
  onClose: () => void;
  /** The time between two checks. Tests give a short time. */
  pollMs?: number;
}

const appUrl = () => `${window.location.origin}${window.location.pathname}`;

export const InviteDialog: React.FC<InviteDialogProps> = ({
  control,
  onClose,
  pollMs = INVITE_POLL_MS,
}) => {
  const { t } = useLanguage();
  const s = t.sync;
  const [step, setStep] = useState<Step>({ kind: 'start' });
  const [copied, setCopied] = useState(false);
  const started = useRef<Started | null>(null);
  // True when the invitation is used or stopped: nothing to delete on the relay
  const finished = useRef(false);
  const latest = useRef({ control, pollMs });
  latest.current = { control, pollMs };

  const end = (message: Extract<Step, { kind: 'end' }>['message']) => {
    finished.current = true;
    setStep({ kind: 'end', message });
  };
  const endRef = useRef(end);
  endRef.current = end;

  // Makes the invitation, then checks it until the new device sends its reveal
  useEffect(() => {
    let live = true;
    const { control: sync, pollMs: wait } = latest.current;
    const run = async () => {
      const flow = await import('../../sync/invitationFlow');
      const { inviteLink } = await import('../../domain/vault/invitation');
      const made = await sync.withSync(async ({ relay, keyStore }) => {
        const record = await keyStore.load();
        if (!record) throw new Error('No device record');
        return { record, owner: await flow.startInvitation(relay, keyStore, record, 'owner') };
      });
      started.current = made;
      // The dialog closed while the invitation started: the invitation stops
      if (!live) {
        cancelRef.current();
        return;
      }
      setStep({ kind: 'waiting', link: inviteLink(appUrl(), made.owner.invitation) });
      const { relay } = await sync.services();
      for (;;) {
        await new Promise(resolve => setTimeout(resolve, wait));
        const check = await flow.checkAsOwner(relay, made.record, made.owner);
        if (!live) return;
        if (check.status === 'confirm') {
          setStep({ kind: 'confirm', code: check.code });
          return;
        }
        if (check.status !== 'waiting') {
          endRef.current(check.status);
          return;
        }
      }
    };
    run().catch(error => {
      if (live) endRef.current(failureOf(error));
    });
    return () => {
      live = false;
    };
  }, []);

  /** Deletes the invitation on the relay, then closes. */
  const cancel = () => {
    const made = started.current;
    if (made && !finished.current) {
      finished.current = true;
      void control
        .services()
        .then(({ relay }) => relay.deleteInvite(made.owner.invitation.id, made.record.token));
    }
    onClose();
  };

  // The invitation stops when the dialog closes in another way, for example with Settings
  const cancelRef = useRef(cancel);
  cancelRef.current = cancel;
  useEffect(() => () => cancelRef.current(), []);

  const approve = async (code: string) => {
    const made = started.current as Started;
    setStep({ kind: 'adding', code });
    try {
      const { approveInvitation } = await import('../../sync/invitationFlow');
      await control.withSync(({ relay, keyStore }) =>
        approveInvitation(relay, keyStore, made.record, made.owner)
      );
      finished.current = true;
      setStep({ kind: 'done' });
      void control.syncNow();
    } catch (error) {
      end(failureOf(error));
    }
  };

  const copy = (link: string) => {
    void navigator.clipboard?.writeText(link).then(
      () => setCopied(true),
      () => setCopied(false)
    );
  };

  const closeAction: StepAction = { label: s.close, onClick: onClose, primary: true };
  const cancelAction: StepAction = { label: t.actions.cancel, onClick: cancel };
  const view: { status: string; actions: StepAction[]; alert?: string } = (() => {
    switch (step.kind) {
      case 'start':
      case 'adding':
        return { status: s.working, actions: step.kind === 'start' ? [cancelAction] : [] };
      case 'waiting':
        return {
          status: s.inviteLink,
          actions: [
            cancelAction,
            { label: copied ? s.copied : s.copy, onClick: () => copy(step.link), primary: true },
          ],
        };
      case 'confirm':
        return {
          status: s.inviteConfirm,
          actions: [
            { label: s.codesDiffer, onClick: cancel },
            { label: s.codesMatch, onClick: () => void approve(step.code), primary: true },
          ],
        };
      case 'done':
        return { status: s.inviteDone, actions: [closeAction] };
      default:
        return { status: s.inviteTitle, alert: s[step.message], actions: [closeAction] };
    }
  })();

  return (
    <SyncStepDialog
      title={s.inviteTitle}
      status={view.status}
      alert={view.alert ?? null}
      actions={view.actions}
      onClose={step.kind === 'adding' ? null : cancel}
    >
      {step.kind === 'waiting' && (
        <input
          className="form-input sync-code-input"
          aria-label={s.inviteLinkLabel}
          readOnly
          value={step.link}
          onFocus={e => e.target.select()}
        />
      )}
      {(step.kind === 'confirm' || step.kind === 'adding') && (
        <p className="sync-code">{codeText(step.code)}</p>
      )}
    </SyncStepDialog>
  );
};
