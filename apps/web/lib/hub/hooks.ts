"use client";

import { useQuery } from "@tanstack/react-query";
import type { Address } from "viem";
import {
  fetchAllowance,
  fetchMerchant,
  fetchMerchants,
  fetchStipend,
  fetchStipendIds,
  fetchStipendLive,
  fetchStipends,
  fetchTokenBalance,
} from "./reads";

export const qk = {
  stipends: (owner?: Address) => ["stipends", owner] as const,
  stipend: (id?: string) => ["stipend", id] as const,
  live: (id?: string) => ["stipend-live", id] as const,
  balance: (owner?: Address) => ["balance", owner] as const,
  allowance: (owner?: Address) => ["allowance", owner] as const,
  merchants: () => ["merchants"] as const,
  merchant: (a?: Address) => ["merchant", a] as const,
  receipts: (id?: string) => ["receipts", id] as const,
};

export function useStipends(owner?: Address) {
  return useQuery({
    queryKey: qk.stipends(owner),
    enabled: !!owner,
    queryFn: async () => fetchStipends(await fetchStipendIds(owner!)),
    refetchInterval: 8_000,
  });
}

export function useStipend(id?: string) {
  return useQuery({
    queryKey: qk.stipend(id),
    enabled: !!id,
    queryFn: () => fetchStipend(BigInt(id!)),
    refetchInterval: 6_000,
  });
}

export function useStipendLive(id?: string) {
  return useQuery({
    queryKey: qk.live(id),
    enabled: !!id,
    queryFn: () => fetchStipendLive(BigInt(id!)),
    refetchInterval: 6_000,
  });
}

export function useTokenBalance(owner?: Address) {
  return useQuery({
    queryKey: qk.balance(owner),
    enabled: !!owner,
    queryFn: () => fetchTokenBalance(owner!),
    refetchInterval: 10_000,
  });
}

export function useAllowance(owner?: Address) {
  return useQuery({
    queryKey: qk.allowance(owner),
    enabled: !!owner,
    queryFn: () => fetchAllowance(owner!),
  });
}

export function useMerchants() {
  return useQuery({ queryKey: qk.merchants(), queryFn: fetchMerchants, refetchInterval: 15_000 });
}

export function useMerchant(address?: Address) {
  return useQuery({
    queryKey: qk.merchant(address),
    enabled: !!address,
    queryFn: () => fetchMerchant(address!),
  });
}
