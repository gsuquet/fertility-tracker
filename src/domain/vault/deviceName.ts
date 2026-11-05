/**
 * The name of a member, which its user types. The keyring keeps it encrypted with the data key
 * (ADR 0012, Device names). See docs/reference/vault-format.md#device-name.
 */
import { utf8 } from './bytes';
import { unwrapWithKey, wrapWithKey } from './keyWrap';
import type { KeyContext, SealedBytes } from './keyWrap';

export const MAX_NAME_LENGTH = 40;

/** The name without spaces at the start and at the end, or null when it has 0 or more than 40 characters. */
export function cleanDeviceName(text: string): string | null {
  const name = text.trim();
  const length = [...name].length;
  return length > 0 && length <= MAX_NAME_LENGTH ? name : null;
}

/** The `name` field of a member. The context has the purpose `name`. */
export const sealName = (name: string, dataKey: CryptoKey, context: KeyContext) =>
  wrapWithKey(utf8(name), dataKey, context);

/** The name of the field, or null when it is missing, does not decrypt or is not valid. */
export async function openName(
  field: SealedBytes | undefined,
  dataKey: CryptoKey,
  context: KeyContext
): Promise<string | null> {
  if (!field) return null;
  const bytes = await unwrapWithKey(field, dataKey, context);
  if (!bytes) return null;
  const text = new TextDecoder().decode(bytes);
  return cleanDeviceName(text) === text ? text : null;
}
