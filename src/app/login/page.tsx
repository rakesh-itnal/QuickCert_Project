"use client"

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Layers, Mail, Lock, CheckCircle2, AlertCircle } from "lucide-react";
import { useActionState, Suspense } from "react";
import { loginOrganization } from "@/app/actions/auth-actions";

function GoogleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

function LoginContent() {
  const [state, formAction] = useActionState(loginOrganization, null);
  const searchParams = useSearchParams();
  const googleError = searchParams.get("error");

  const errorMessages: Record<string, string> = {
    google_cancelled: "Google sign-in was cancelled.",
    google_token_failed: "Failed to authenticate with Google. Please try again.",
    google_no_email: "Could not retrieve email from Google.",
    google_server_error: "Server error during Google sign-in. Please try again.",
  };

  return (
    <div className="min-h-screen bg-slate-950 flex relative overflow-hidden">
      
      {/* Ambient Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-blue-600/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-600/10 rounded-full blur-[150px]" />
        <div className="absolute top-[40%] right-[20%] w-[30%] h-[30%] bg-emerald-600/5 rounded-full blur-[120px]" />
      </div>

      {/* Left Panel — Branding (hidden on mobile) */}
      <div className="hidden lg:flex w-1/2 flex-col justify-between p-12 relative z-10">
        <Link href="/" className="flex items-center gap-3 w-fit">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-700 rounded-2xl flex items-center justify-center shadow-[0_10px_30px_rgba(0,100,255,0.3)]">
            <Layers className="w-7 h-7 text-white" />
          </div>
          <span className="text-2xl font-black text-white tracking-tight">QuickCert</span>
        </Link>

        <div className="max-w-lg">
          <h1 className="text-5xl font-black text-white leading-tight tracking-tight mb-6">
            Automated Document
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
              Infrastructure.
            </span>
          </h1>
          <p className="text-lg text-slate-400 font-medium leading-relaxed">
            Upload Excel lists or integrate through our API. Generate hundreds of QR-verified PDF business documents instantly.
          </p>

          {/* Trust Badges */}
          <div className="flex items-center gap-6 mt-10">
            {[
              { label: "Multilingual", emoji: "🌐" },
              { label: "QR Verified", emoji: "🔒" },
              { label: "Developer APIs", emoji: "✨" },
            ].map((badge) => (
              <div key={badge.label} className="flex items-center gap-2">
                <span className="text-lg">{badge.emoji}</span>
                <span className="text-sm font-bold text-slate-500">{badge.label}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-slate-600 font-medium">
          © {new Date().getFullYear()} QuickCert. All rights reserved.
        </p>
      </div>

      {/* Right Panel — Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 relative z-10">
        <div className="w-full max-w-[440px]">
          
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-700 rounded-xl flex items-center justify-center">
              <Layers className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-black text-white tracking-tight">QuickCert</span>
          </div>

          <Link href="/" className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-blue-400 transition mb-8 w-fit">
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </Link>

          <h2 className="text-3xl font-black text-white tracking-tight mb-2">
            Welcome back
          </h2>
          <p className="text-slate-500 font-medium mb-8">
            Sign in to manage your organization&apos;s documents
          </p>

          {/* Error Alerts */}
          {googleError && errorMessages[googleError] && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-bold rounded-xl flex items-center gap-2 mb-6">
              <AlertCircle className="w-4 h-4 shrink-0" /> {errorMessages[googleError]}
            </div>
          )}
          {state?.error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-bold rounded-xl flex items-center gap-2 mb-6">
              <AlertCircle className="w-4 h-4 shrink-0" /> {state.error}
            </div>
          )}

          {/* Google Sign In */}
          <a
            href="/api/auth/google"
            className="w-full flex items-center justify-center gap-3 py-3.5 px-4 bg-white rounded-xl text-sm font-bold text-slate-800 hover:bg-slate-100 transition-all shadow-sm border border-slate-200 hover:-translate-y-0.5 hover:shadow-md"
          >
            <GoogleIcon />
            Continue with Google
          </a>

          {/* Divider */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-slate-800" />
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">or sign in with email</span>
            <div className="flex-1 h-px bg-slate-800" />
          </div>

          {/* Email/Password Form */}
          <form className="space-y-5" action={formAction}>
            <div>
              <label htmlFor="email" className="block text-sm font-bold text-slate-400 mb-2">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-slate-600" />
                </div>
                <input
                  id="email" name="email" type="email" required
                  className="block w-full pl-11 py-3 border border-slate-800 rounded-xl bg-slate-900/50 text-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none focus:border-blue-500 placeholder:text-slate-600 font-medium"
                  placeholder="admin@company.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-bold text-slate-400 mb-2">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-slate-600" />
                </div>
                <input
                  id="password" name="password" type="password" required
                  className="block w-full pl-11 py-3 border border-slate-800 rounded-xl bg-slate-900/50 text-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none focus:border-blue-500 placeholder:text-slate-600 font-medium"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full flex justify-center py-3.5 px-4 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 shadow-[0_8px_25px_rgba(59,130,246,0.3)] hover:shadow-[0_10px_30px_rgba(59,130,246,0.4)] transition-all hover:-translate-y-0.5"
            >
              Sign In
            </button>
          </form>

          {/* Register Link */}
          <p className="mt-8 text-center text-sm text-slate-500 font-medium">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-blue-400 font-bold hover:text-blue-300 transition">
              Register your organization
            </Link>
          </p>

          {/* Trust Badge */}
          <div className="mt-6 flex items-center justify-center gap-2 pt-6 border-t border-slate-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span className="text-[11px] font-bold text-slate-600 tracking-wider uppercase">256-Bit Encrypted · SOC 2 Compliant</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
