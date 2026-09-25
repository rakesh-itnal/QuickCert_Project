import { redirect } from "next/navigation";

export default async function LegacyCertificatesPage() {
  redirect("/dashboard/documents");
}
