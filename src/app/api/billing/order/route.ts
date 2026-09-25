import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

// Plan pricing in paise (1 INR = 100 paise)
const PLANS: Record<string, { amount: number; name: string }> = {
  pro: { amount: 99900, name: "QuickCert Pro" },           // ₹999/month
  enterprise: { amount: 249900, name: "QuickCert Enterprise" }, // ₹2499/month
};

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const plan = typeof body?.plan === "string" ? body.plan : "";

  if (!PLANS[plan]) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    return NextResponse.json({ error: "Razorpay not configured" }, { status: 500 });
  }

  try {
    const shortId = session.organizationId.slice(-8);
    const receipt = `qc_${plan[0]}_${shortId}_${Date.now().toString().slice(-6)}`;
    const authHeader = `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`;

    const razorpayResponse = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: PLANS[plan].amount,
        currency: "INR",
        receipt: receipt.slice(0, 40),
        notes: { plan },
      }),
      cache: "no-store",
    });

    const order = await razorpayResponse.json();

    if (!razorpayResponse.ok || !order?.id) {
      const razorpayMsg = order?.error?.description || order?.error?.reason || order?.error?.code || "Unknown error";
      return NextResponse.json(
        { error: `Payment failed: ${razorpayMsg}` },
        { status: razorpayResponse.status || 500 }
      );
    }

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      planName: PLANS[plan].name,
      keyId,
    });
  } catch (error: unknown) {
    const razorpayMsg =
      error instanceof Error
        ? error.message
        : "Unknown error";
    console.error("Razorpay order creation failed:", error);
    return NextResponse.json(
      { error: `Payment failed: ${razorpayMsg}` },
      { status: 500 }
    );
  }
}
