"use client";

import * as React from "react";
import { Fingerprint, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/ui/wordmark";
import { appConfig } from "@/lib/config";
import { useAccount } from "@/lib/account/provider";

export function SignIn() {
  const { signInWithPasskey, signInWithDevKey, status, error } = useAccount();
  const [busy, setBusy] = React.useState<"register" | "login" | "dev" | null>(null);
  const connecting = status === "connecting";

  async function go(kind: "register" | "login" | "dev") {
    setBusy(kind);
    try {
      if (kind === "dev") await signInWithDevKey();
      else await signInWithPasskey(kind);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6 py-16">
      <Wordmark className="mb-10 text-ink" />
      <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
      <p className="mt-2 text-[15px] leading-6 text-ink-2">
        A passkey creates a smart account on {appConfig.chainLabel}. No seed phrase, no extension,
        no gas to buy.
      </p>

      <div className="mt-8 flex flex-col gap-2.5">
        <Button
          size="lg"
          leading={<Fingerprint className="size-4" />}
          loading={connecting && busy === "register"}
          loadingLabel="Waiting for your device…"
          disabled={connecting}
          onClick={() => go("register")}
        >
          Create a passkey
        </Button>
        <Button
          size="lg"
          variant="secondary"
          loading={connecting && busy === "login"}
          loadingLabel="Waiting for your device…"
          disabled={connecting}
          onClick={() => go("login")}
        >
          I already have one
        </Button>
        {appConfig.devSignerEnabled && (
          <Button
            size="lg"
            variant="ghost"
            leading={<KeyRound className="size-4" />}
            loading={connecting && busy === "dev"}
            disabled={connecting}
            onClick={() => go("dev")}
          >
            Use a development key
          </Button>
        )}
      </div>

      {error && (
        <p
          className="mt-4 rounded-md border border-refuse/30 bg-refuse-soft px-3 py-2 text-sm text-refuse-ink"
          role="alert"
        >
          {error}
        </p>
      )}

      <p className="mt-10 text-xs leading-5 text-ink-3">
        Your passkey is the owner key of the account. Agents never receive it; they get a separate
        credential scoped to one stipend.
      </p>
    </div>
  );
}
