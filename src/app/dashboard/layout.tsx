"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Database, FileStack, Settings, LogOut, Layers,
  Bell, Menu, X, CreditCard, Shield, FileText, History, Key, Upload,
  FolderOpen, ClipboardCheck,
} from "lucide-react";
import { useState, useEffect } from "react";
import { logoutOrganization } from "@/app/actions/auth-actions";

const NAV_SECTIONS = [
  {
    label: null,
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, exact: true },
    ],
  },
  {
    label: "Data",
    items: [
      { href: "/dashboard/data", label: "Records", icon: Database, exact: true },
      { href: "/dashboard/data/imports", label: "Imports", icon: Upload },
      { href: "/dashboard/data/schemas", label: "Schemas", icon: FolderOpen },
    ],
  },
  {
    label: "Documents",
    items: [
      { href: "/dashboard/documents", label: "All Documents", icon: FileText },
      { href: "/dashboard/definitions", label: "Definitions", icon: ClipboardCheck },
      { href: "/dashboard/templates", label: "Templates", icon: Layers },
    ],
  },
  {
    label: "Operations",
    items: [
      { href: "/dashboard/audit", label: "Audit Logs", icon: History },
      { href: "/dashboard/integrations", label: "API Keys", icon: Key },
      { href: "/dashboard/billing", label: "Billing", icon: CreditCard },
      { href: "/dashboard/settings", label: "Settings", icon: Settings },
    ],
  },
];

const ROLE_LABELS: Record<string, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  MANAGER: "Manager",
  OPERATOR: "Operator",
  APPROVER: "Approver",
  AUDITOR: "Auditor",
  VIEWER: "Viewer",
  CLERK: "Staff",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userInfo, setUserInfo] = useState<{ name: string; role: string } | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data) setUserInfo(data); })
      .catch(() => {});
  }, []);

  const userName = userInfo?.name || "Admin User";
  const userRole = ROLE_LABELS[userInfo?.role || ""] || userInfo?.role || "User";
  const initials = userName.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  };

  const SidebarContent = () => (
    <>
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700">
        <div className="h-20 flex items-center px-6 border-b border-slate-800 bg-slate-950/50">
          <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mr-3 shadow-lg">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-black tracking-tight">QuickCert</span>
        </div>
        
        {/* Navigation Links */}
        <nav className="mt-6 px-3 space-y-6">
          {NAV_SECTIONS.map((section, idx) => (
            <div key={idx}>
              {section.label && (
                <p className="px-4 mb-2 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                  {section.label}
                </p>
              )}
              <div className="space-y-1">
                {section.items.map((item) => {
                  const active = isActive(item.href, item.exact);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                        active
                          ? "bg-blue-600/20 text-blue-400 border border-blue-500/20"
                          : "text-slate-400 hover:text-white hover:bg-white/5 border border-transparent"
                      }`}
                    >
                      <Icon className="w-[18px] h-[18px]" /> {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>

      {/* User Profile Footer */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/30">
        <div className="flex items-center gap-3 px-2 mb-4">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-black text-sm shadow-lg">
            {initials}
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-white leading-tight">{userName}</span>
            <span className="text-xs text-slate-500 font-medium">{userRole}</span>
          </div>
        </div>
        <button
          onClick={() => logoutOrganization()}
          className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-red-400 hover:bg-red-500/10 font-bold transition-all w-full text-sm"
        >
          <LogOut className="w-4 h-4" /> Sign Out
        </button>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      
      {/* Desktop Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex-col justify-between hidden md:flex border-r border-slate-800">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-slate-900 text-white flex flex-col justify-between shadow-2xl">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative h-full overflow-hidden">
        
        {/* Top Navbar */}
        <header className="h-20 bg-white/50 backdrop-blur-xl border-b border-slate-200 flex items-center justify-between px-4 md:px-8 z-10 shrink-0 shadow-[0_10px_30px_rgba(0,0,0,0.02)]">
          <div className="flex items-center gap-3">
            {/* Mobile hamburger */}
            <button
              className="md:hidden p-2 rounded-xl hover:bg-slate-100 text-slate-600 transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
            <h1 className="text-xl font-black text-slate-800 tracking-tight">Workspace</h1>
          </div>
          <div className="flex items-center gap-4 md:gap-6">
            <div className="flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-full border border-blue-100">
               <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
               <span className="text-xs font-bold text-blue-700 tracking-wider">BUSINESS</span>
            </div>
            <button className="relative text-slate-400 hover:text-slate-600 transition">
              <Bell className="w-6 h-6" />
              <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
            </button>
          </div>
        </header>

        {/* Scrolling Viewport */}
        <div className="flex-1 overflow-y-auto w-full p-4 md:p-8 pb-32">
          {children}
        </div>
      </main>

    </div>
  );
}
