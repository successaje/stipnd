import type { Metadata } from "next";
import { PageHeader } from "@/components/shell/app-shell";
import { NewStipendForm } from "@/components/stipend/new-stipend-form";

export const metadata: Metadata = { title: "New stipend" };

export default function NewStipendPage() {
  return (
    <>
      <PageHeader
        back={{ href: "/app", label: "Stipends" }}
        title="New stipend"
        description="Set the budget and the rules. The agent gets a credential afterwards; it never sees your key."
      />
      <NewStipendForm />
    </>
  );
}
