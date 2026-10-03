import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { parseUnits, type PublicClient } from "viem";
import { formatMoney } from "@stipnd/protocol";
import { CATALOG, datasetFor, quoteFor, reportFor, searchFor } from "./catalog";
import type { MerchantConfig } from "./config";
import { stipndPaywall, type PaywallDeps } from "./middleware";
import { memoryRedemptionStore, type RedemptionStore } from "./verify";

export interface AppDeps {
  config: MerchantConfig;
  client: PublicClient;
  redeemed?: RedemptionStore;
}

export interface SaleRecord {
  at: number;
  path: string;
  amount: string;
  stipendId: string;
  txHash: string;
}

export function createApp(deps: AppDeps) {
  const { config, client } = deps;
  const redeemed = deps.redeemed ?? memoryRedemptionStore();
  const sales: SaleRecord[] = [];

  const paywallDeps: PaywallDeps = {
    config,
    client,
    redeemed,
    onSettled: (s) =>
      sales.unshift({
        at: Date.now(),
        path: s.path,
        amount: s.amount.toString(),
        stipendId: s.stipendId.toString(),
        txHash: s.txHash,
      }),
  };

  const price = (whole: string) => parseUnits(whole, config.tokenDecimals);
  const item = (path: string) => CATALOG.find((i) => i.path === path)!;

  const app = new Hono();
  app.use("*", cors({ origin: "*", exposeHeaders: ["WWW-Authenticate", "X-Stipnd-Receipt"] }));
  app.use(
    "*",
    logger((msg) => process.stdout.write(`${msg}\n`)),
  );

  app.get("/", (c) =>
    c.json({
      name: "Stipnd reference merchant",
      accepts: "stipnd",
      chainId: config.chainId,
      hub: config.hub,
      merchant: config.merchant,
      token: { address: config.token, symbol: config.tokenSymbol, decimals: config.tokenDecimals },
      catalog: CATALOG.map((i) => ({
        ...i,
        priceLabel: formatMoney(price(i.price), config.tokenDecimals, config.tokenSymbol),
        url: `${config.publicUrl}${i.path}`,
      })),
    }),
  );

  app.get("/health", (c) => c.json({ ok: true }));

  app.get("/sales", (c) => c.json({ count: sales.length, sales: sales.slice(0, 100) }));

  app.get(
    "/reports/:id",
    stipndPaywall(paywallDeps, {
      price: price(item("/reports/:id").price),
      description: (c) => `Report ${c.req.param("id")}`,
    }),
    (c) => c.json(reportFor(c.req.param("id"))),
  );

  app.get(
    "/quotes/:symbol",
    stipndPaywall(paywallDeps, {
      price: price(item("/quotes/:symbol").price),
      description: (c) => `Quote ${(c.req.param("symbol") ?? "").toUpperCase()}`,
    }),
    (c) => c.json(quoteFor(c.req.param("symbol"))),
  );

  app.get(
    "/search",
    stipndPaywall(paywallDeps, {
      price: price(item("/search").price),
      description: (c) => `Search "${(c.req.query("q") ?? "").slice(0, 40)}"`,
    }),
    (c) => c.json(searchFor(c.req.query("q") ?? "")),
  );

  app.get(
    "/datasets/:id",
    stipndPaywall(paywallDeps, {
      price: price(item("/datasets/:id").price),
      description: (c) => `Dataset ${c.req.param("id")}`,
    }),
    (c) => c.json(datasetFor(c.req.param("id"))),
  );

  return app;
}
