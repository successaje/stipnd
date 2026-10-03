"use client";

import { useQuery } from "@tanstack/react-query";
import { qk } from "./hooks";
import { fetchReceipts } from "./receipts";

export function useReceipts(id?: string) {
  return useQuery({
    queryKey: qk.receipts(id),
    enabled: !!id,
    queryFn: () => fetchReceipts(BigInt(id!)),
    refetchInterval: 5_000,
  });
}
