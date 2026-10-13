import type { Metadata } from "next";
import { requireUser } from "@/server/auth/guards";
import { AccountSettings } from "@/components/account/account-settings";
import { PageHeader } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Paramètres du compte" };

export default async function OwnerSettingsPage() {
  const user = await requireUser();
  return (
    <>
      <PageHeader eyebrow="Compte" title="Paramètres" />
      <AccountSettings user={user} />
    </>
  );
}
