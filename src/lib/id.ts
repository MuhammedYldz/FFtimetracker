import * as Crypto from 'expo-crypto';

/** Cryptographically-random UUID, works on web and native. */
export function newId(): string {
  return Crypto.randomUUID();
}
