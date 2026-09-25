"use client";

import { useState, useEffect } from "react";
import { CheckCircle, Zap, Crown, Shield, Loader2, AlertCircle, Star } from "lucide-react";

declare global {
  interface Window {
    Razorpay: any;
  }
}

const PLANS = [
  {
    id: "free",
    name: "Free",
    price: "₹0",
    period: "forever",
    icon: Shield,
    color: "slate",
    description: "Perfect for small schools getting started",
    features: [
      "Up to 100 students",
      "50 certificates/month",
      "1 custom template",
      "Email support",
      "QR Verification",
    ],
    limits: ["No bulk generate", "No API access"],
  },
  {
    id: "pro",
    name: "Pro",
    price: "₹999",
    period: "per month",
    icon: Zap,
    color: "blue",
    popular: true,
    description: "For growing PU colleges and schools",
    features: [
      "Up to 1,000 students",
      "500 certificates/month",
      "5 custom templates",
      "Bulk PDF generation",
      "Priority email support",
      "Kannada Unicode support",
      "QR Verification",
    ],
    limits: [],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "₹2,499",
    period: "per month",
    icon: Crown,
    color: "amber",
    description: "For universities and large institutes",
    features: [
      "Unlimited students",
      "Unlimited certificates",
      "Unlimited templates",
      "Bulk PDF generation",
      "API access",
      "Dedicated support",
      "Custom branding",
      "Kannada + Multi-language",
    ],
    limits: [],
  },
];

export default function BillingPage() {
  const [currentPlan, setCurrentPlan] = useState<string>("free");
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Fetch current plan info
  useEffect(() => {
    fetch("/api/billing/status")
      .then((r) => r.json())
      .then((d) => {
        // Normalize legacy "inactive" to "free"
        const plan = d.plan === "inactive" ? "free" : (d.plan || "free");
        setCurrentPlan(plan);
        if (d.expiresAt) setExpiresAt(d.expiresAt);
      })
      .catch(() => {});
  }, []);

  // Load Razorpay script
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);
    return () => { document.body.removeChild(script); };
  }, []);

  const handleUpgrade = async (planId: string) => {
    if (planId === "free" || planId === currentPlan) return;
    setLoadingPlan(planId);
    setMessage(null);

    try {
      // Step 1: Create Razorpay order
      const orderRes = await fetch("/api/billing/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planId }),
      });
      const orderData = await orderRes.json();

      if (!orderData.orderId) {
        setMessage({ type: "error", text: orderData.error || "Failed to create order." });
        setLoadingPlan(null);
        return;
      }

      // Step 2: Open Razorpay checkout modal
      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "QuickCert",
        description: `Upgrade to ${orderData.planName}`,
        image: "/favicon.ico",
        order_id: orderData.orderId,
        handler: async (response: any) => {
          // Step 3: Verify payment on server
          const verifyRes = await fetch("/api/billing/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              plan: planId,
            }),
          });
          const verifyData = await verifyRes.json();

          if (verifyData.success) {
            setCurrentPlan(planId);
            setExpiresAt(verifyData.expiresAt);
            setMessage({ type: "success", text: `🎉 Successfully upgraded to ${planId.toUpperCase()} plan! Valid for 30 days.` });
          } else {
            setMessage({ type: "error", text: "Payment verified but plan update failed. Please contact support." });
          }
          setLoadingPlan(null);
        },
        modal: { ondismiss: () => setLoadingPlan(null) },
        prefill: { name: "", email: "", contact: "" },
        theme: { color: "#3B82F6" },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      setMessage({ type: "error", text: "An unexpected error occurred. Please try again." });
      setLoadingPlan(null);
    }
  };

  const colorMap: Record<string, { bg: string; border: string; text: string; btn: string; badge: string }> = {
    slate: {
      bg: "bg-slate-50",
      border: "border-slate-200",
      text: "text-slate-700",
      btn: "bg-slate-800 hover:bg-slate-700",
      badge: "bg-slate-100 text-slate-600",
    },
    blue: {
      bg: "bg-blue-50",
      border: "border-blue-300",
      text: "text-blue-700",
      btn: "bg-blue-600 hover:bg-blue-500",
      badge: "bg-blue-100 text-blue-700",
    },
    amber: {
      bg: "bg-amber-50",
      border: "border-amber-300",
      text: "text-amber-700",
      btn: "bg-amber-600 hover:bg-amber-500",
      badge: "bg-amber-100 text-amber-700",
    },
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4 border-b border-slate-200 pb-6">
        <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center">
          <Crown className="w-7 h-7 text-blue-600" />
        </div>
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Billing & Plans</h2>
          <p className="text-slate-500 font-medium">
            Current plan: <span className="font-black text-blue-600 uppercase">{currentPlan}</span>
            {expiresAt && (
              <span className="ml-2 text-xs text-slate-400">
                (expires {new Date(expiresAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })})
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Status messages */}
      {message && (
        <div className={`p-4 rounded-xl font-bold flex items-center gap-2 text-sm ${
          message.type === "success"
            ? "bg-emerald-50 border border-emerald-200 text-emerald-700"
            : "bg-red-50 border border-red-200 text-red-700"
        }`}>
          {message.type === "success" ? <CheckCircle className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
          {message.text}
        </div>
      )}

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {PLANS.map((plan) => {
          const colors = colorMap[plan.color];
          const Icon = plan.icon;
          const isCurrent = currentPlan === plan.id;
          const isLoading = loadingPlan === plan.id;

          return (
            <div
              key={plan.id}
              className={`relative rounded-[2rem] border-2 p-6 flex flex-col transition-all ${
                isCurrent ? `${colors.border} ring-2 ring-offset-2 ring-blue-500/30` : "border-slate-200"
              } ${plan.popular ? "shadow-xl shadow-blue-500/10" : "shadow-sm"} bg-white`}
            >
              {/* Popular badge */}
              {plan.popular && (
                <div className="absolute -top-3 left-0 right-0 flex justify-center">
                  <span className="bg-blue-600 text-white text-[11px] font-black px-4 py-1 rounded-full flex items-center gap-1">
                    <Star className="w-3 h-3" /> MOST POPULAR
                  </span>
                </div>
              )}

              {/* Current plan badge */}
              {isCurrent && (
                <div className="absolute -top-3 right-4">
                  <span className="bg-emerald-500 text-white text-[11px] font-black px-3 py-1 rounded-full">
                    ✓ CURRENT
                  </span>
                </div>
              )}

              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${colors.bg}`}>
                <Icon className={`w-6 h-6 ${colors.text}`} />
              </div>

              <h3 className="text-xl font-black text-slate-800">{plan.name}</h3>
              <p className="text-sm text-slate-500 font-medium mt-1 mb-4">{plan.description}</p>

              <div className="mb-6">
                <span className="text-4xl font-black text-slate-900">{plan.price}</span>
                <span className="text-sm text-slate-500 font-medium ml-1">/{plan.period}</span>
              </div>

              {/* Features */}
              <ul className="space-y-2 mb-6 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-slate-700 font-medium">
                    <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                    {f}
                  </li>
                ))}
                {plan.limits.map((l) => (
                  <li key={l} className="flex items-center gap-2 text-sm text-slate-400 font-medium">
                    <span className="w-4 h-4 flex items-center justify-center text-slate-300 shrink-0">✕</span>
                    {l}
                  </li>
                ))}
              </ul>

              {/* CTA Button */}
              <button
                onClick={() => handleUpgrade(plan.id)}
                disabled={isCurrent || plan.id === "free" || isLoading}
                className={`w-full py-3 rounded-xl text-sm font-black text-white transition-all ${
                  isCurrent || plan.id === "free"
                    ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                    : `${colors.btn} hover:-translate-y-0.5 shadow-md`
                }`}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Processing...
                  </span>
                ) : isCurrent ? (
                  "Current Plan"
                ) : plan.id === "free" ? (
                  "Default Plan"
                ) : (
                  `Upgrade to ${plan.name} →`
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Info banner */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 flex items-start gap-4">
        <Shield className="w-6 h-6 text-blue-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-bold text-blue-800">Secure payments powered by Razorpay</p>
          <p className="text-xs text-blue-600 font-medium mt-1">
            All transactions are encrypted and PCI-DSS compliant. Subscriptions are billed monthly and can be cancelled anytime. 
            For support, contact us at support@quickcert.in
          </p>
        </div>
      </div>
    </div>
  );
}
