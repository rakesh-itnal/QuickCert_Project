import Link from "next/link";
import { ArrowRight, Shield, Zap, Layers, FileSpreadsheet, QrCode, Database, CheckCircle2 } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 overflow-x-hidden font-sans iast-peripheral-glow relative">
      
      {/* Navbar - Premium Glassmorphic */}
      <nav className="w-full fixed top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200 shadow-sm transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-lg">
              <Layers className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-black tracking-tight text-slate-900">
              QuickCert
            </span>
          </div>

          <div className="hidden lg:flex items-center space-x-10 text-sm font-bold text-slate-600">
            <a href="#features" className="hover:text-amber-500 transition-colors">Features</a>
            <a href="#security" className="hover:text-amber-500 transition-colors">Security</a>
            <a href="#pricing" className="hover:text-amber-500 transition-colors">Pricing</a>
          </div>

          <div className="flex items-center space-x-4">
            <Link href="/login" className="hidden sm:block text-sm font-bold text-slate-600 hover:text-blue-600 transition-colors">
              Sign In
            </Link>
            <Link href="/dashboard" className="bg-gradient-to-br from-amber-500 to-orange-600 shadow-orange-500/30 hover:shadow-orange-500/40 text-white px-7 py-3 rounded-full font-bold text-sm flex items-center gap-2 group shadow-lg">
              Dashboard <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="w-full pt-32 lg:pt-48 pb-20 relative z-10 flex flex-col items-center">
        <div className="max-w-7xl w-full mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          
          {/* Hero Content (Left) */}
          <div className="flex flex-col items-start w-full">
            <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-blue-100/50 border border-blue-200 mb-8 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
              <span className="text-blue-700 text-xs font-bold tracking-widest uppercase">
                Modern SaaS For Organizations
              </span>
            </div>
            
            <h1 className="text-5xl sm:text-6xl lg:text-[72px] font-black tracking-tighter leading-[1.05] text-slate-900 mb-6">
              Automated <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-700 via-indigo-600 to-blue-500">
                Document
              </span>
              <br /> Infrastructure.
            </h1>
            
            <p className="text-lg sm:text-xl text-slate-600 max-w-xl font-medium leading-relaxed mb-10">
              The premium, cloud-hosted platform for document issuance. Instantly convert Excel data or API requests into hundreds of cryptographically secure, QR-verified PDF documents.
            </p>

            <a href="#how-it-works" className="inline-flex items-center gap-4 text-lg font-bold text-blue-700 hover:text-blue-800 transition-colors group">
              See How It Works 
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
                <ArrowRight className="w-6 h-6" />
              </div>
            </a>
          </div>

          {/* Hero Graphics (Right) - Safely Bounded within Container */}
          <div className="w-full relative flex items-center justify-center">
            {/* Main Graphic Container */}
            <div className="relative w-full aspect-square max-w-[500px] bg-gradient-to-br from-indigo-950 via-[#1E1B4B] to-slate-900 rounded-[3rem] shadow-2xl flex items-center justify-center rotate-3d-window perspective-1000 border border-indigo-900 overflow-visible">
              
              {/* Central Graphic */}
              <div className="relative w-[70%] h-[70%] bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-6 flex flex-col justify-between shadow-inner">
                <div className="w-full flex justify-between items-center bg-white/5 rounded-lg p-3">
                  <div className="h-4 w-24 bg-blue-400/50 rounded-md" />
                  <Database className="w-5 h-5 text-indigo-400" />
                </div>
                <div className="flex-1 mt-6 border-2 border-dashed border-indigo-500/30 rounded-xl flex items-center justify-center">
                  <span className="text-indigo-300/50 font-black text-2xl tracking-widest uppercase">PostgreSQL</span>
                </div>
              </div>

              {/* Bounded Floating Widget 1 */}
              <div className="absolute -bottom-6 -left-6 lg:bottom-10 lg:-left-12 bg-white/95 backdrop-blur-xl border border-slate-200 shadow-xl px-6 py-4 flex items-center gap-4 rounded-2xl bounce-slight z-30 min-w-[240px]">
                <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center shadow-inner shrink-0">
                  <Zap className="text-amber-600 w-7 h-7" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Speed</span>
                  <span className="text-lg font-black text-slate-800 leading-none mt-1">Instant Render</span>
                </div>
              </div>

              {/* Bounded Floating Widget 2 */}
              <div className="absolute -top-6 -right-6 lg:top-10 lg:-right-8 bg-white/95 backdrop-blur-xl border border-slate-200 shadow-xl px-5 py-3 flex items-center gap-3 rounded-2xl bounce-slight z-30" style={{ animationDelay: "1.5s" }}>
                <Shield className="w-6 h-6 text-emerald-600 shrink-0" />
                <span className="text-sm font-bold text-slate-800">Bank-Grade Cloud</span>
              </div>
              
            </div>
          </div>

        </div>
      </main>

      {/* Marquee Section */}
      <section className="w-full bg-white border-y border-slate-200 py-16 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 mb-12">
          <h3 className="text-center text-sm font-black tracking-[0.2em] text-slate-400 uppercase">
            Trusted by Modern Organizations Worldwide
          </h3>
        </div>
        
        {/* Continuous Slider */}
        <div className="flex w-[200%] animate-marquee">
          <div className="flex w-full justify-around items-center px-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="text-2xl md:text-3xl font-black text-slate-300 uppercase tracking-tight opacity-50 hover:opacity-100 transition-opacity whitespace-nowrap px-8">
                Enterprise {i}
              </div>
            ))}
          </div>
          <div className="flex w-full justify-around items-center px-4">
            {[6, 7, 8, 9, 10].map((i) => (
              <div key={i} className="text-2xl md:text-3xl font-black text-slate-300 uppercase tracking-tight opacity-50 hover:opacity-100 transition-opacity whitespace-nowrap px-8">
                Logistics Group {i}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature 1: Data Ingestion */}
      <section id="how-it-works" className="w-full py-24 lg:py-32 bg-slate-50 relative">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          
          {/* Graphics Bounded Box */}
          <div className="w-full aspect-square max-w-[500px] mx-auto bg-slate-200 rounded-[3rem] shadow-inner relative flex items-center justify-center overflow-visible">
            {/* The Excel File */}
            <div className="w-[60%] h-[70%] bg-white rounded-2xl shadow-xl border border-slate-200 p-6 flex flex-col z-10 float-slow transform rotate-3">
              <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-slate-800">records.xlsx</span>
                  <span className="text-xs text-slate-500">1,204 Rows</span>
                </div>
              </div>
              <div className="flex-1 mt-4 space-y-4">
                <div className="h-4 w-full bg-slate-100 rounded" />
                <div className="h-4 w-5/6 bg-slate-100 rounded" />
                <div className="h-4 w-4/6 bg-slate-100 rounded" />
              </div>
            </div>

            {/* Verification Widget */}
            <div className="absolute bottom-10 -right-8 bg-white/95 backdrop-blur-xl border border-slate-200 shadow-xl p-4 rounded-xl shadow-lg z-20 bounce-slight">
               <div className="flex items-center gap-3">
                 <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600"><CheckCircle2 className="w-5 h-5" /></div>
                 <span className="font-bold text-slate-800">Auto-Mapped</span>
               </div>
            </div>
          </div>

          <div className="flex flex-col">
            <div className="text-blue-600 font-bold tracking-widest uppercase text-sm mb-4">Phase 01</div>
            <h2 className="text-4xl sm:text-5xl font-black text-slate-900 mb-8 leading-tight">
              Mass Data Ingestion. <br />
              <span className="text-emerald-600">Zero Manual Typing.</span>
            </h2>
            <p className="text-lg text-slate-600 font-medium leading-relaxed mb-10">
              Eliminate dozens of hours of repetitive manual data entry. Upload your standardized business data spreadsheet, and QuickCert's massive ingestion engine will instantly populate your database without a single keystroke required.
            </p>
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="mt-1 w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                  <div className="w-2 h-2 rounded-full bg-blue-600" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-slate-900">Intelligent Column Mapping</h4>
                  <p className="text-slate-600 font-medium">Automatically detects records identifiers and custom attributes from messy spreadsheet files.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="mt-1 w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                  <div className="w-2 h-2 rounded-full bg-blue-600" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-slate-900">Duplicate Prevention</h4>
                  <p className="text-slate-600 font-medium">Strict primary keys ensure that records are never created twice.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature 2: Anti-Forgery */}
      <section id="security" className="w-full py-24 lg:py-32 bg-white relative">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          
          <div className="flex flex-col order-2 lg:order-1">
            <div className="text-purple-600 font-bold tracking-widest uppercase text-sm mb-4">Phase 02</div>
            <h2 className="text-4xl sm:text-5xl font-black text-slate-900 mb-8 leading-tight">
              Unbreakable <br />
              <span className="text-purple-600">Anti-Forgery Tech.</span>
            </h2>
            <p className="text-lg text-slate-600 font-medium leading-relaxed mb-6">
              The days of counterfeit paper or PDF documents are over. Every document generated by our SaaS embeds a mathematically guaranteed QR code.
            </p>
            <div className="bg-purple-50 p-6 rounded-2xl border border-purple-100 mb-8">
              <p className="text-purple-900 font-bold leading-relaxed">
                "When a third-party scans your document, they are hyperlinked to your secure QuickCert vault verifying its exact authenticity in real-time."
              </p>
            </div>
          </div>

          <div className="w-full aspect-square max-w-[500px] mx-auto bg-slate-900 rounded-[3rem] shadow-2xl relative flex items-center justify-center order-1 lg:order-2 overflow-visible">
            {/* Certificate Graphic */}
            <div className="w-[65%] h-[80%] bg-white rounded-md p-6 shadow-[-10px_20px_30px_rgba(0,0,0,0.5)] z-10 flex flex-col justify-between border-2 border-slate-700 float-delayed">
              <div className="w-full flex justify-center pb-4 border-b border-slate-200">
                 <div className="w-1/2 h-4 bg-slate-300 rounded" />
              </div>
              <div className="space-y-3">
                 <div className="w-full h-3 bg-slate-100 rounded" />
                 <div className="w-full h-3 bg-slate-100 rounded" />
                 <div className="w-3/4 h-3 bg-slate-100 rounded" />
              </div>
              <div className="flex justify-end pt-6 border-t border-slate-200 relative">
                 <QrCode className="w-16 h-16 text-slate-900" />
                 <div className="absolute -inset-2 border-2 border-green-400 rounded-xl animate-pulse" />
              </div>
            </div>

            {/* Verified Popup */}
            <div className="absolute top-10 -left-6 lg:-left-12 bg-white/95 backdrop-blur-xl border border-slate-200 shadow-xl px-6 py-4 flex items-center gap-4 rounded-2xl shadow-xl z-20 bounce-slight min-w-[200px]">
               <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600 shrink-0">
                  <Shield className="w-5 h-5" />
               </div>
               <div className="flex flex-col">
                 <span className="text-sm font-black text-slate-800 uppercase">Verified Live</span>
               </div>
            </div>
          </div>

        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="w-full py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight">
              Everything You Need.
            </h2>
            <p className="text-lg text-slate-500 font-medium mt-4 max-w-2xl mx-auto">
              From dynamic database ingestion to API-automated document production — QuickCert handles the entire pipeline.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: FileSpreadsheet, title: "Smart Data Parser", desc: "Upload CSV or Excel files and map fields automatically into your database.", color: "bg-blue-100 text-blue-600" },
              { icon: QrCode, title: "QR Anti-Forgery", desc: "Every document embeds a unique QR code linked to a public verification page.", color: "bg-purple-100 text-purple-600" },
              { icon: Zap, title: "Bulk Production", desc: "Generate hundreds of business documents in one click. Download as a single ZIP archive.", color: "bg-amber-100 text-amber-600" },
              { icon: Shield, title: "Multi-Tenant SaaS", desc: "Each organization gets isolated data. JWT auth, role-based access, zero leaks.", color: "bg-emerald-100 text-emerald-600" },
              { icon: Layers, title: "Flexible Studio", desc: "Upload any blank template image and let Gemini Vision recommend fields in seconds.", color: "bg-red-100 text-red-600" },
              { icon: Database, title: "Developer API First", desc: "Integrate with existing systems via API keys to trigger secure document production.", color: "bg-cyan-100 text-cyan-600" },
            ].map((f) => (
              <div key={f.title} className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm hover:shadow-lg transition-all group">
                <div className={`w-14 h-14 ${f.color} rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform`}>
                  <f.icon className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-black text-slate-800 mb-2">{f.title}</h3>
                <p className="text-slate-500 font-medium leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="w-full py-24 lg:py-32 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight">
              Simple, Transparent Pricing
            </h2>
            <p className="text-lg text-slate-500 font-medium mt-4">
              Start free. Scale when you need to.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Free Tier */}
            <div className="bg-slate-50 p-8 rounded-3xl border border-slate-200 flex flex-col">
              <h3 className="text-lg font-black text-slate-800 mb-1">Starter</h3>
              <p className="text-sm text-slate-500 font-medium mb-6">For small teams</p>
              <p className="text-4xl font-black text-slate-900 mb-8">Free</p>
              <div className="space-y-3 flex-1">
                {["Up to 100 records", "3 active templates", "50 generations/month", "QR verification"].map((f) => (
                  <div key={f} className="flex items-center gap-2 text-sm text-slate-600 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> {f}
                  </div>
                ))}
              </div>
              <Link href="/login" className="mt-8 block text-center py-3 px-6 rounded-xl bg-slate-200 text-slate-700 font-bold hover:bg-slate-300 transition-colors">
                Get Started
              </Link>
            </div>

            {/* Pro Tier — Featured */}
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-8 rounded-3xl shadow-2xl shadow-blue-500/20 flex flex-col text-white relative overflow-hidden">
              <div className="absolute top-4 right-4 bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full backdrop-blur-sm">POPULAR</div>
              <h3 className="text-lg font-black mb-1">Pro</h3>
              <p className="text-sm text-blue-200 font-medium mb-6">For growing businesses</p>
              <p className="text-4xl font-black mb-1">₹4,999<span className="text-lg font-bold text-blue-200">/yr</span></p>
              <p className="text-xs text-blue-300 mb-8">~₹416/month</p>
              <div className="space-y-3 flex-1">
                {["Unlimited records", "All templates + multilingual", "10,000 bulk generations", "Custom template uploads", "Priority support", "Super Admin panel"].map((f) => (
                  <div key={f} className="flex items-center gap-2 text-sm font-medium text-blue-100">
                    <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" /> {f}
                  </div>
                ))}
              </div>
              <Link href="/login" className="mt-8 block text-center py-3 px-6 rounded-xl bg-white text-blue-700 font-bold hover:bg-blue-50 transition-colors shadow-lg">
                Start Pro Trial
              </Link>
            </div>

            {/* Enterprise Tier */}
            <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800 flex flex-col text-white">
              <h3 className="text-lg font-black mb-1">Enterprise</h3>
              <p className="text-sm text-slate-500 font-medium mb-6">For global networks</p>
              <p className="text-4xl font-black mb-8">Custom</p>
              <div className="space-y-3 flex-1">
                {["Multi-team deployment", "Full API access", "White-label branding", "Dedicated manager", "Custom integrations", "SLA guarantee"].map((f) => (
                  <div key={f} className="flex items-center gap-2 text-sm font-medium text-slate-400">
                    <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" /> {f}
                  </div>
                ))}
              </div>
              <a href="mailto:sales@quickcert.com" className="mt-8 block text-center py-3 px-6 rounded-xl bg-slate-800 text-white font-bold hover:bg-slate-700 transition-colors border border-slate-700">
                Contact Sales
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="w-full py-24 bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-400 rounded-full blur-3xl" />
        </div>
        <div className="max-w-3xl mx-auto px-6 text-center relative z-10">
          <h2 className="text-4xl sm:text-5xl font-black text-white tracking-tight mb-6">
            Ready to automate your document workflow?
          </h2>
          <p className="text-xl text-blue-100 font-medium mb-10">
            Join hundreds of organizations already using QuickCert. Start free, upgrade anytime.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/login" className="bg-white text-blue-700 px-8 py-4 rounded-full font-bold text-lg shadow-2xl hover:shadow-xl hover:scale-105 transition-all flex items-center justify-center gap-2">
              Get Started Free <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full bg-slate-900 text-slate-400 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-6 py-16">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
            {/* Brand */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center">
                  <Layers className="w-6 h-6 text-white" />
                </div>
                <span className="text-2xl font-black text-white tracking-tight">QuickCert</span>
              </div>
              <p className="text-sm font-medium leading-relaxed max-w-sm">
                Automated document verification and trust platform. Built with Next.js, Prisma, and Gemini Vision.
              </p>
            </div>

            {/* Links */}
            <div>
              <h4 className="text-sm font-black text-white uppercase tracking-wider mb-4">Product</h4>
              <div className="space-y-2 text-sm font-medium">
                <a href="#features" className="block hover:text-white transition-colors">Features</a>
                <a href="#pricing" className="block hover:text-white transition-colors">Pricing</a>
                <a href="#security" className="block hover:text-white transition-colors">Security</a>
                <Link href="/admin" className="block hover:text-white transition-colors">Admin Panel</Link>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-black text-white uppercase tracking-wider mb-4">Legal</h4>
              <div className="space-y-2 text-sm font-medium">
                <a href="#" className="block hover:text-white transition-colors">Privacy Policy</a>
                <a href="#" className="block hover:text-white transition-colors">Terms of Service</a>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-800 mt-12 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-xs font-medium">© {new Date().getFullYear()} QuickCert. All rights reserved.</p>
          </div>
        </div>
      </footer>

    </div>
  );
}
