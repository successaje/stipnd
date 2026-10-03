import { Wordmark } from "@/components/ui/wordmark";
import { configStatus } from "@/lib/config";

/** Shown instead of the app when required public configuration is missing. */
export function Unconfigured() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-6 py-16">
      <Wordmark className="mb-10 text-ink" />
      <h1 className="text-2xl font-semibold tracking-tight">
        This deployment is not configured yet
      </h1>
      <p className="mt-2 text-[15px] leading-6 text-ink-2">
        The app needs contract addresses and an account-abstraction provider before it can sign
        anyone in. Copy <code className="font-mono text-ink">.env.example</code> to{" "}
        <code className="font-mono text-ink">.env</code> and set:
      </p>
      <ul className="mt-4 space-y-1.5 rounded-md border border-line bg-surface p-4 font-mono text-[13px]">
        {configStatus.missing.map((m) => (
          <li key={m}>{m}</li>
        ))}
      </ul>
      <p className="mt-4 text-sm text-ink-3">
        Contracts: run the deploy script in <code className="font-mono">packages/contracts</code>.
        Account abstraction: create a free project at dashboard.zerodev.app and paste its id.
      </p>
    </div>
  );
}
