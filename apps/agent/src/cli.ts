#!/usr/bin/env tsx
import "dotenv/config";
import { createStipndClient, StipndHaltedError, StipndRejectedError } from "@stipnd/sdk";
import { decodeCredential, formatMoney, REJECT_COPY, type Receipt } from "@stipnd/protocol";

type Mode = "normal" | "overcap" | "loop" | "status" | "buy";

function usage(): never {
  console.log(`stipnd-agent <mode> [options]

modes
  normal    buy a few different reports (the happy path)
  overcap   try to buy the $5 dataset (expect a per-call cap rejection)
  loop      request the same report repeatedly until the stipend stops it
  status    print the stipend's remaining budget and balance
  buy       buy one path: buy --path /quotes/MSFT

options
  --merchant <url>   merchant base URL (default $STIPND_MERCHANT_URL or http://localhost:4020)
  --count <n>        requests for loop mode (default 12)
  --path <p>         path for buy mode

env
  STIPND_CREDENTIAL  the stipnd_v1_… credential from the owner app
`);
  process.exit(1);
}

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const mode = (process.argv[2] ?? "") as Mode;
if (!["normal", "overcap", "loop", "status", "buy"].includes(mode)) usage();

const credentialString = process.env.STIPND_CREDENTIAL;
if (!credentialString) {
  console.error(
    "Set STIPND_CREDENTIAL. Create a stipend in the owner app and open its Connect tab.",
  );
  process.exit(1);
}
const credential = decodeCredential(credentialString);
const merchant = (
  arg("merchant") ??
  process.env.STIPND_MERCHANT_URL ??
  "http://localhost:4020"
).replace(/\/$/, "");
const count = Number(arg("count") ?? 12);

const money = (n: bigint) => formatMoney(n, credential.tokenDecimals, credential.tokenSymbol);
const stamp = () => new Date().toISOString().slice(11, 19);

function printReceipt(r: Receipt) {
  if (r.status === "paid") {
    console.log(
      `${stamp()}  PAID      ${money(r.amount).padStart(12)}  ${r.memo ?? ""}  left ${money(r.remainingThisPeriod ?? 0n)}  ${r.txHash}`,
    );
  } else {
    const copy = REJECT_COPY[r.reason ?? 0];
    console.log(
      `${stamp()}  REJECTED  ${money(r.amount).padStart(12)}  ${copy.title}  ${r.txHash}`,
    );
  }
}

const client = createStipndClient({
  credential,
  onReceipt: printReceipt,
  haltAfterRejections: 3,
});

async function buy(path: string) {
  const url = `${merchant}${path}`;
  try {
    const res = await client.fetch(url);
    if (!res.ok) {
      console.log(`${stamp()}  HTTP ${res.status} for ${path}`);
      return false;
    }
    const body = (await res.json()) as Record<string, unknown>;
    const preview = JSON.stringify(body).slice(0, 80);
    console.log(`${stamp()}  got ${path}: ${preview}…`);
    return true;
  } catch (e) {
    if (e instanceof StipndRejectedError) {
      console.log(`${stamp()}  stopped: ${e.message}`);
      return false;
    }
    if (e instanceof StipndHaltedError) {
      console.log(`${stamp()}  agent halted itself: ${e.message}`);
      throw e;
    }
    throw e;
  }
}

async function main() {
  console.log(
    `stipend #${credential.stipendId} on chain ${credential.chainId} (${credential.label || "unnamed"})`,
  );
  console.log(`merchant ${merchant}\n`);

  if (mode === "status") {
    const s = await client.preview();
    console.log(`balance            ${money(s.balance)}`);
    console.log(`remaining (period) ${money(s.remainingThisPeriod)}`);
    console.log(
      `period ends        ${s.periodEndsAt ? new Date(s.periodEndsAt * 1000).toISOString() : "never"}`,
    );
    console.log(`frozen             ${s.frozen}`);
    return;
  }

  if (mode === "normal") {
    for (const path of ["/reports/1", "/quotes/NVDA", "/search?q=battery", "/reports/42"]) {
      await buy(path);
    }
    return;
  }

  if (mode === "overcap") {
    await buy("/datasets/1");
    return;
  }

  if (mode === "buy") {
    const path = arg("path");
    if (!path) usage();
    await buy(path);
    return;
  }

  if (mode === "loop") {
    console.log(
      `requesting /reports/42 ${count} times. The stipend's duplicate guard should stop this.\n`,
    );
    try {
      for (let i = 0; i < count; i++) {
        const ok = await buy("/reports/42");
        if (!ok && client.consecutiveRejections >= 3) break;
      }
    } catch (e) {
      if (!(e instanceof StipndHaltedError)) throw e;
    }
    const s = await client.preview();
    console.log(
      `\nexposure after the loop: ${money(s.balance)} still in the stipend, ${money(s.remainingThisPeriod)} left this period.`,
    );
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
