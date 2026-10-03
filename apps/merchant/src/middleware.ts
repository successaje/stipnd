import type { Context, MiddlewareHandler } from "hono";
import type { PublicClient } from "viem";
import {
  challengeHeaderValue,
  parsePaymentHeader,
  resourceHash,
  type Challenge,
} from "@stipnd/protocol";
import type { MerchantConfig } from "./config";
import { verifyProof, type RedemptionStore } from "./verify";

export interface PaidRouteOptions {
  /** Price in the token's smallest unit. */
  price: bigint;
  /** Shown to the agent and stored as the receipt memo (max 96 bytes). */
  description: string | ((c: Context) => string);
}

export interface PaywallDeps {
  config: MerchantConfig;
  client: PublicClient;
  redeemed: RedemptionStore;
  onSettled?: (info: { path: string; amount: bigint; stipendId: bigint; txHash: string }) => void;
}

/**
 * Hono middleware that turns a route into a Stipnd-paid resource.
 *
 * Without a valid `Authorization: Payment stipnd …` header it answers 402 with a
 * challenge. With one, it verifies the onchain receipt and lets the handler run.
 */
export function stipndPaywall(deps: PaywallDeps, opts: PaidRouteOptions): MiddlewareHandler {
  const { config } = deps;
  return async (c, next) => {
    const url = new URL(c.req.url);
    // Behind a proxy the public origin differs from what Node sees; use the configured one.
    const publicUrl = new URL(url.pathname + url.search, config.publicUrl);
    const method = c.req.method;
    const hash = resourceHash(method, publicUrl);
    const description =
      typeof opts.description === "function" ? opts.description(c) : opts.description;

    const proof = parsePaymentHeader(c.req.header("authorization"));
    if (!proof) {
      return challenge(c, config, {
        method,
        publicUrl,
        hash,
        amount: opts.price,
        description,
      });
    }

    const result = await verifyProof(deps.client, deps.redeemed, {
      proof,
      expected: {
        chainId: config.chainId,
        hub: config.hub,
        merchant: config.merchant,
        resourceHash: hash,
        amount: opts.price,
      },
      maxAgeSeconds: config.proofMaxAge,
    });

    if (!result.ok) {
      if (result.status === 409) return c.json({ error: result.reason }, 409);
      return challenge(
        c,
        config,
        { method, publicUrl, hash, amount: opts.price, description },
        result.reason,
      );
    }

    deps.onSettled?.({
      path: publicUrl.pathname,
      amount: result.amount,
      stipendId: result.stipendId,
      txHash: result.txHash,
    });
    c.header("X-Stipnd-Receipt", `${result.txHash}:${result.logIndex}`);
    await next();
  };
}

function challenge(
  c: Context,
  config: MerchantConfig,
  r: { method: string; publicUrl: URL; hash: `0x${string}`; amount: bigint; description: string },
  error?: string,
) {
  const body: Challenge = {
    scheme: "stipnd",
    version: 1,
    chainId: config.chainId,
    hub: config.hub,
    merchant: config.merchant,
    token: config.token,
    amount: r.amount.toString(),
    resource: `${r.method.toUpperCase()} ${r.publicUrl.origin}${r.publicUrl.pathname}${r.publicUrl.search}`,
    resourceHash: r.hash,
    description: r.description.slice(0, 96),
    expiresAt: Math.floor(Date.now() / 1000) + config.challengeTtl,
  };
  c.header("WWW-Authenticate", challengeHeaderValue(body));
  c.header("Cache-Control", "no-store");
  return c.json(error ? { ...body, error } : body, 402);
}
