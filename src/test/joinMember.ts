import {
  approveInvitation,
  checkAsNewDevice,
  checkAsOwner,
  finishJoin,
  startInvitation,
  startJoin,
} from '../sync/invitationFlow';
import type { DeviceRecord, KeyStore } from '../sync/keyStore';
import type { RelayClient } from '../sync/relayClient';
import { createMemoryKeyStore } from './relayHarness';

/** Adds a new device to the vault of the owner record with the whole invitation. */
export async function joinMember(
  relay: RelayClient,
  ownerStore: KeyStore,
  role: DeviceRecord['role'],
  name = 'Tablet'
) {
  const ownerRecord = (await ownerStore.load()) as DeviceRecord;
  const owner = await startInvitation(relay, ownerStore, ownerRecord, role);
  const join = await startJoin(relay, owner.invitation, name);
  await checkAsOwner(relay, ownerRecord, owner);
  await checkAsNewDevice(relay, join);
  await checkAsOwner(relay, ownerRecord, owner);
  await approveInvitation(relay, ownerStore, ownerRecord, owner);
  const answered = await checkAsNewDevice(relay, join);
  if (answered.status !== 'answered') throw new Error(answered.status);
  const keyStore = createMemoryKeyStore();
  const record = await finishJoin(relay, keyStore, join, answered.offer, answered.content);
  return { record, keyStore };
}
