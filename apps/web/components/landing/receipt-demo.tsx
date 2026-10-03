"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Money, Pill } from "@/components/ui/status";

/**
 * A scripted replay of the moment Stipnd exists for: a research agent buys a few things,
 * then loops on the same resource until the stipend refuses. The rows use the exact
 * shapes the real receipt feed renders. Nothing here claims to be live.
 */
interface DemoRow {
  id: number;
  status: "paid" | "rejected";
  amount: string;
  memo: string;
  merchant: string;
  reason?: string;
  remaining: string;
}

const SCRIPT: DemoRow[] = [
  {
    id: 1,
    status: "paid",
    amount: "0.40",
    memo: "Report 1",
    merchant: "filings.example",
    remaining: "59.60",
  },
  {
    id: 2,
    status: "paid",
    amount: "0.10",
    memo: "Quote NVDA",
    merchant: "filings.example",
    remaining: "59.50",
  },
  {
    id: 3,
    status: "paid",
    amount: "0.25",
    memo: 'Search "battery"',
    merchant: "filings.example",
    remaining: "59.25",
  },
  {
    id: 4,
    status: "paid",
    amount: "0.40",
    memo: "Report 42",
    merchant: "filings.example",
    remaining: "58.85",
  },
  {
    id: 5,
    status: "paid",
    amount: "0.40",
    memo: "Report 42",
    merchant: "filings.example",
    remaining: "58.45",
  },
  {
    id: 6,
    status: "paid",
    amount: "0.40",
    memo: "Report 42",
    merchant: "filings.example",
    remaining: "58.05",
  },
  {
    id: 7,
    status: "rejected",
    amount: "0.40",
    memo: "Report 42",
    merchant: "filings.example",
    reason: "Repeat purchase blocked",
    remaining: "58.05",
  },
  {
    id: 8,
    status: "rejected",
    amount: "0.40",
    memo: "Report 42",
    merchant: "filings.example",
    reason: "Repeat purchase blocked",
    remaining: "58.05",
  },
];

export function ReceiptDemo() {
  const reduce = useReducedMotion();
  const [count, setCount] = useState(reduce ? SCRIPT.length : 1);

  useEffect(() => {
    if (reduce) return;
    if (count >= SCRIPT.length) {
      const reset = setTimeout(() => setCount(1), 4200);
      return () => clearTimeout(reset);
    }
    const next = SCRIPT[count];
    const delay = next?.status === "rejected" ? 650 : 900;
    const t = setTimeout(() => setCount((c) => c + 1), delay);
    return () => clearTimeout(t);
  }, [count, reduce]);

  const rows = SCRIPT.slice(0, count).slice(-6).reverse();
  const halted = count >= SCRIPT.length;

  return (
    <div className="rounded-lg border border-line bg-surface shadow-card">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">Research bot</p>
          <p className="text-xs text-ink-3">
            $60 / month · $0.50 per call · same resource ≤ 3 / hour
          </p>
        </div>
        <AnimatePresence mode="wait" initial={false}>
          {halted ? (
            <motion.div
              key="halt"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <Pill tone="refuse" dot>
                Loop stopped
              </Pill>
            </motion.div>
          ) : (
            <motion.div
              key="live"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <Pill tone="money" dot>
                Paying
              </Pill>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <ul className="min-h-[312px] divide-y divide-line" aria-label="Example receipts">
        <AnimatePresence initial={false}>
          {rows.map((r) => (
            <motion.li
              key={r.id}
              layout
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.25, 1, 0.5, 1] }}
              className="flex items-center gap-3 px-4 py-2.5"
            >
              <span
                className={
                  "size-2 shrink-0 rounded-full " + (r.status === "paid" ? "bg-money" : "bg-refuse")
                }
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">
                  {r.memo}
                  <span className="text-ink-3"> · {r.merchant}</span>
                </p>
                <p className="truncate text-xs text-ink-3">
                  {r.status === "paid" ? `Paid · ${r.remaining} left this month` : r.reason}
                </p>
              </div>
              <Money tone={r.status === "paid" ? "money" : "refuse"} className="text-sm">
                {r.amount}
              </Money>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
      <div className="flex items-center justify-between border-t border-line px-4 py-2.5 text-xs text-ink-3">
        <span>Scripted replay. The real feed reads events from the hub.</span>
        <span className="font-mono tabular">exposure ≤ 60.00</span>
      </div>
    </div>
  );
}
