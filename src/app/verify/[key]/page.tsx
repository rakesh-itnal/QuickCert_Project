import { redirect } from "next/navigation";

/**
 * Backward compatibility redirect: /verify/[key] → /v/[key]
 * Ensures existing QR codes on previously issued certificates continue to work.
 */
export default async function LegacyVerifyPage(
  props: { params: Promise<{ key: string }> }
) {
  const params = await props.params;
  redirect(`/v/${params.key}`);
}
