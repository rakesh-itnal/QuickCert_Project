import { redirect } from "next/navigation";

export default async function LegacyStudentsPage() {
  redirect("/dashboard/data");
}
