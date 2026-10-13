import type { Metadata } from "next";
import { requireProArea } from "@/server/auth/guards";
import { AccountSettings } from "@/components/account/account-settings";
import { PageHeader } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Paramètres du compte" };

export default async function ProAccountPage() {
  const { user } = await requireProArea();
  return (
    <>
      <PageHeader eyebrow="Compte" title="Paramètres" description="Compte personnel du titulaire de l'accès professionnel." />
      <AccountSettings user={user} />
    </>
  );
}
