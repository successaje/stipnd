import type { Metadata } from "next";
import { AccountProvider } from "@/lib/account/provider";
import { QueryProvider } from "@/lib/query";
import { Gate } from "@/components/shell/gate";

export const metadata: Metadata = { title: "Stipends" };

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <AccountProvider>
        <Gate>{children}</Gate>
      </AccountProvider>
    </QueryProvider>
  );
}
