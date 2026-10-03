import {
  deserializePasskeyValidator,
  PasskeyValidatorContractVersion,
  toPasskeyValidator,
  toWebAuthnKey,
  WebAuthnMode,
} from "@zerodev/passkey-validator";
import { signerToEcdsaValidator } from "@zerodev/ecdsa-validator";
import type { KernelValidator } from "@zerodev/sdk";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import type { Hex } from "viem";
import { ENTRY_POINT, KERNEL_VERSION } from "@stipnd/sdk";
import { publicClient } from "../clients";
import { appConfig } from "../config";
import { KEYS, readJson, remove, writeJson } from "../storage";

export type SignerKind = "passkey" | "dev";

export interface StoredSession {
  kind: SignerKind;
  /** Passkey: serialized validator. Dev: nothing (key lives under its own storage key). */
  data?: string;
  label: string;
  createdAt: number;
}

export function loadSession(): StoredSession | null {
  return readJson<StoredSession>(KEYS.session);
}

export function clearSession() {
  remove(KEYS.session);
}

/** Creates or signs in with a passkey through the ZeroDev passkey server. */
export async function passkeyValidator(mode: "register" | "login", passkeyName: string) {
  if (!appConfig.passkeyServerUrl) {
    throw new Error(
      "Passkeys need NEXT_PUBLIC_ZERODEV_PROJECT_ID or NEXT_PUBLIC_PASSKEY_SERVER_URL.",
    );
  }
  const webAuthnKey = await toWebAuthnKey({
    passkeyName,
    passkeyServerUrl: appConfig.passkeyServerUrl,
    mode: mode === "register" ? WebAuthnMode.Register : WebAuthnMode.Login,
  });
  const validator = await toPasskeyValidator(publicClient(), {
    webAuthnKey,
    entryPoint: ENTRY_POINT,
    kernelVersion: KERNEL_VERSION,
    validatorContractVersion: PasskeyValidatorContractVersion.V0_0_3_PATCHED,
  });
  const session: StoredSession = {
    kind: "passkey",
    data: validator.getSerializedData(),
    label: passkeyName,
    createdAt: Date.now(),
  };
  writeJson(KEYS.session, session);
  return validator as KernelValidator;
}

/** Restores a passkey validator from a stored session without prompting. */
export async function restorePasskeyValidator(serialized: string) {
  const validator = await deserializePasskeyValidator(publicClient(), {
    serializedData: serialized,
    entryPoint: ENTRY_POINT,
    kernelVersion: KERNEL_VERSION,
  });
  return validator as KernelValidator;
}

/**
 * Development signer: a browser-generated key for local work when passkeys are
 * inconvenient (http origins, automated tests). Gated by NEXT_PUBLIC_ENABLE_DEV_SIGNER.
 */
export async function devValidator(): Promise<KernelValidator> {
  if (!appConfig.devSignerEnabled) throw new Error("The development signer is disabled.");
  let pk = readJson<Hex>(KEYS.devKey);
  if (!pk) {
    pk = generatePrivateKey();
    writeJson(KEYS.devKey, pk);
  }
  const signer = privateKeyToAccount(pk);
  const validator = await signerToEcdsaValidator(publicClient(), {
    signer,
    entryPoint: ENTRY_POINT,
    kernelVersion: KERNEL_VERSION,
  });
  const session: StoredSession = { kind: "dev", label: "Development key", createdAt: Date.now() };
  writeJson(KEYS.session, session);
  return validator;
}
