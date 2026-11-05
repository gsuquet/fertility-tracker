/** The invitation of a new owner device or a partner. See docs/reference/screens/settings.md#invitation-dialog. */
import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { formatMessage } from '../../i18n';
import type { SyncControl } from '../../hooks/useSync';
import type { DeviceRecord } from '../../sync/keyStore';
import type { OwnerInvitation } from '../../sync/invitationFlow';
import { failureOf } from '../../utils/syncFailure';
import type { SyncFailure } from '../../utils/syncFailure';
import { QrCode } from './QrCode';
import { INVITE_POLL_MS, SyncStepDialog, codeText, isTemporary } from '../SyncStepDialog';
import type { StepAction } from '../SyncStepDialog';

type Step =
  | { kind: 'start' }
  | { kind: 'waiting'; link: string }
  | { kind: 'confirm'; code: string; name: string }
  | { kind: 'adding'; code: string; name: string }
  | { kind: 'done' }
  | { kind: 'end'; message: SyncFailure | 'expired' | 'refused' };

interface Started {
  record: DeviceRecord;
  owner: OwnerInvitation;
}

interface InviteDialogProps {
  control: SyncControl;
  /** `owner` for a device of the user, `reader` for a partner. */
  invitedRole: DeviceRecord['role'];
  onClose: () => void;
  /** The time between two checks. Tests give a short time. */
  pollMs?: number;
}

const appUrl = () => `${window.location.origin}${window.location.pathname}`;

export const InviteDialog: React.FC<InviteDialogProps> = ({
  control,
  invitedRole,
  onClose,
  pollMs = INVITE_POLL_MS,
}) => {
  const { t } = useLanguage();
  const s = t.sync;
  const [step, setStep] = useState<Step>({ kind: 'start' });
  const [copied, setCopied] = useState(false);
  // A failure that the next check can repair, for example no connection
  const [problem, setProblem] = useState<SyncFailure | null>(null);
  const started = useRef<Started | null>(null);
  // True when the invitation is used or deleted: nothing to delete on the relay
  const finished = useRef(false);
  const mounted = useRef(false);
  const running = useRef(false);
  const latest = useRef({ control, pollMs, invitedRole });
  latest.current = { control, pollMs, invitedRole };

  /** Deletes the invitation on the relay one time, so that the new device stops. */
  const stop = () => {
    const made = started.current;
    if (!made || finished.current) return;
    finished.current = true;
    void latest.current.control
      .services()
      .then(({ relay }) => relay.deleteInvite(made.owner.invitation.id, made.record.token));
  };

  const end = (message: Extract<Step, { kind: 'end' }>['message']) => {
    stop();
    setStep({ kind: 'end', message });
  };
  const actions = useRef({ end, stop });
  actions.current = { end, stop };

  // Makes the invitation one time, then checks it until the new device sends its reveal. The
  // checks stop when the dialog goes away.
  useEffect(() => {
    mounted.current = true;
    if (!running.current) {
      running.current = true;
      const { control: sync, pollMs: wait, invitedRole: invited } = latest.current;
      const run = async () => {
        const flow = await import('../../sync/invitationFlow');
        const { inviteLink } = await import('../../domain/vault/invitation');
        const made = await sync.withSync(async ({ relay, keyStore }) => {
          const record = await keyStore.load();
          if (!record) throw new Error('No device record');
          return { record, owner: await flow.startInvitation(relay, keyStore, record, invited) };
        });
        started.current = made;
        // The dialog closed while the invitation started: the invitation stops
        if (!mounted.current) {
          actions.current.stop();
          return;
        }
        setStep({ kind: 'waiting', link: inviteLink(appUrl(), made.owner.invitation) });
        const { relay } = await sync.services();
        for (;;) {
          await new Promise(resolve => setTimeout(resolve, wait));
          if (!mounted.current) return;
          let check: Awaited<ReturnType<typeof flow.checkAsOwner>>;
          try {
            check = await flow.checkAsOwner(relay, made.record, made.owner);
          } catch (error) {
            if (!isTemporary(error)) throw error;
            setProblem(failureOf(error));
            continue;
          }
          setProblem(null);
          if (check.status === 'confirm') {
            setStep({ kind: 'confirm', code: check.code, name: check.name });
            return;
          }
          if (check.status !== 'waiting') {
            actions.current.end(check.status);
            return;
          }
        }
      };
      run().catch(error => actions.current.end(failureOf(error)));
    }
    return () => {
      mounted.current = false;
      // A remount, for example in StrictMode, keeps the invitation
      setTimeout(() => {
        if (!mounted.current) actions.current.stop();
      });
    };
  }, []);

  const cancel = () => {
    stop();
    onClose();
  };

  // A failed add keeps the invitation: the owner can try again
  const approve = async (code: string, name: string) => {
    const made = started.current as Started;
    setStep({ kind: 'adding', code, name });
    setProblem(null);
    try {
      const { approveInvitation } = await import('../../sync/invitationFlow');
      await control.withSync(({ relay, keyStore }) =>
        approveInvitation(relay, keyStore, made.record, made.owner)
      );
      finished.current = true;
      setStep({ kind: 'done' });
      void control.syncNow();
    } catch (error) {
      setProblem(failureOf(error));
      setStep({ kind: 'confirm', code, name });
    }
  };

  const copy = (link: string) => {
    void navigator.clipboard?.writeText(link).then(
      () => setCopied(true),
      () => setCopied(false)
    );
  };

  const title = invitedRole === 'owner' ? s.inviteTitle : s.invitePartner;
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
            {
              label: s.codesMatch,
              onClick: () => void approve(step.code, step.name),
              primary: true,
            },
          ],
        };
      case 'done':
        return {
          status: invitedRole === 'owner' ? s.inviteDone : s.invitePartnerDone,
          actions: [closeAction],
        };
      default:
        return { status: title, alert: s[step.message], actions: [closeAction] };
    }
  })();

  return (
    <SyncStepDialog
      title={title}
      status={view.status}
      alert={view.alert ?? (problem && s[problem])}
      actions={view.actions}
      onClose={step.kind === 'adding' ? null : cancel}
    >
      {step.kind === 'waiting' && <QrCode text={step.link} label={s.inviteQrLabel} />}
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
        <>
          <p>{formatMessage(s.inviteName, { name: step.name })}</p>
          <p className="sync-code">{codeText(step.code)}</p>
        </>
      )}
    </SyncStepDialog>
  );
};
