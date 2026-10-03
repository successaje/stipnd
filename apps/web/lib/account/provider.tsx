"use client";

import * as React from "react";
import type { Address } from "viem";
import type { KernelValidator } from "@zerodev/sdk";
import { buildKernelClient, type KernelAccount, type KernelClient } from "../clients";
import { configStatus } from "../config";
import { humanizeError } from "../errors";
import {
  clearSession,
  devValidator,
  loadSession,
  passkeyValidator,
  restorePasskeyValidator,
  type SignerKind,
} from "./signers";

export type AccountStatus = "unconfigured" | "restoring" | "signed-out" | "connecting" | "ready";

export interface AccountState {
  status: AccountStatus;
  address?: Address;
  kind?: SignerKind;
  label?: string;
  kernelClient?: KernelClient;
  account?: KernelAccount;
  sudoValidator?: KernelValidator;
  error?: string | null;
  signInWithPasskey: (mode: "register" | "login", name?: string) => Promise<void>;
  signInWithDevKey: () => Promise<void>;
  signOut: () => void;
}

const Ctx = React.createContext<AccountState | null>(null);

export function AccountProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = React.useState<AccountStatus>(
    configStatus.ok ? "restoring" : "unconfigured",
  );
  const [error, setError] = React.useState<string | null>(null);
  const [session, setSession] = React.useState<{
    address: Address;
    kind: SignerKind;
    label: string;
    kernelClient: KernelClient;
    account: KernelAccount;
    sudoValidator: KernelValidator;
  } | null>(null);

  const connect = React.useCallback(
    async (validator: KernelValidator, kind: SignerKind, label: string) => {
      const { account, kernelClient } = await buildKernelClient(validator);
      setSession({
        address: account.address,
        kind,
        label,
        kernelClient,
        account,
        sudoValidator: validator,
      });
      setStatus("ready");
    },
    [],
  );

  // Restore a previous session silently.
  React.useEffect(() => {
    if (!configStatus.ok) return;
    let cancelled = false;
    (async () => {
      const stored = loadSession();
      if (!stored) {
        setStatus("signed-out");
        return;
      }
      try {
        const validator =
          stored.kind === "passkey" && stored.data
            ? await restorePasskeyValidator(stored.data)
            : await devValidator();
        if (!cancelled) await connect(validator, stored.kind, stored.label);
      } catch {
        clearSession();
        if (!cancelled) setStatus("signed-out");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [connect]);

  const signInWithPasskey = React.useCallback(
    async (mode: "register" | "login", name = "Stipnd") => {
      setError(null);
      setStatus("connecting");
      try {
        const validator = await passkeyValidator(mode, name);
        await connect(validator, "passkey", name);
      } catch (e) {
        setError(humanizeError(e));
        setStatus("signed-out");
      }
    },
    [connect],
  );

  const signInWithDevKey = React.useCallback(async () => {
    setError(null);
    setStatus("connecting");
    try {
      const validator = await devValidator();
      await connect(validator, "dev", "Development key");
    } catch (e) {
      setError(humanizeError(e));
      setStatus("signed-out");
    }
  }, [connect]);

  const signOut = React.useCallback(() => {
    clearSession();
    setSession(null);
    setStatus("signed-out");
  }, []);

  const value: AccountState = {
    status,
    error,
    address: session?.address,
    kind: session?.kind,
    label: session?.label,
    kernelClient: session?.kernelClient,
    account: session?.account,
    sudoValidator: session?.sudoValidator,
    signInWithPasskey,
    signInWithDevKey,
    signOut,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAccount(): AccountState {
  const v = React.useContext(Ctx);
  if (!v) throw new Error("useAccount must be used inside AccountProvider");
  return v;
}

/** Narrowed helper for pages that only render when signed in. */
export function useReadyAccount() {
  const a = useAccount();
  if (a.status !== "ready" || !a.address || !a.kernelClient || !a.account || !a.sudoValidator) {
    throw new Error("Account is not ready");
  }
  return a as AccountState & {
    address: Address;
    kernelClient: KernelClient;
    account: KernelAccount;
    sudoValidator: KernelValidator;
  };
}
