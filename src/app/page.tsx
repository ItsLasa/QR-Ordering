import Link from 'next/link';
import { QrCode, UtensilsCrossed, ChefHat, Sparkles, ArrowRight, ShieldCheck, Clock, Smartphone } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50/50 via-white to-slate-50">
      {/* Navbar */}
      <header className="border-b border-orange-100/80 bg-white/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-orange-500 text-white flex items-center justify-center shadow-md shadow-orange-500/20">
              <UtensilsCrossed className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-xl tracking-tight text-slate-900">Bistro<span className="text-orange-600">QR</span></span>
              <span className="hidden sm:inline-block ml-2 text-xs font-medium px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">Ordering System</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-semibold text-slate-700 hover:text-orange-600 transition px-3 py-2"
            >
              Owner Sign In
            </Link>
            <Link
              href="/register"
              className="text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 transition px-4 py-2 rounded-lg shadow-sm shadow-orange-500/20 flex items-center gap-1.5"
            >
              Get Started <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-6xl mx-auto px-4 pt-16 pb-20">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-100/80 text-orange-800 text-xs font-semibold mb-6">
            <Sparkles className="w-4 h-4 text-orange-600" />
            Next-Gen QR Ordering for Modern Restaurants & Cafes
          </div>
          <h1 className="text-4xl sm:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.15]">
            Contactless Ordering. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-amber-600">
              Zero App Installs. Real-Time Kitchen.
            </span>
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-slate-600 leading-relaxed max-w-2xl mx-auto">
            Customers scan table QR codes, customize orders, and track live kitchen status. Kitchen staff manage incoming orders with instant sound alerts. Pay at counter with cash.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/s/rustic-bistro?t=tbl_t1_948f2a1b"
              className="px-6 py-3.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold shadow-lg shadow-orange-500/25 flex items-center gap-2 transition hover:-translate-y-0.5"
            >
              <Smartphone className="w-5 h-5" />
              Try Customer Demo (Table 1)
            </Link>
            <Link
              href="/dashboard/kitchen"
              className="px-6 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold shadow-lg shadow-slate-900/10 flex items-center gap-2 transition hover:-translate-y-0.5"
            >
              <ChefHat className="w-5 h-5" />
              Live Kitchen Dashboard
            </Link>
          </div>
        </div>

        {/* Feature Cards Grid */}
        <div className="mt-20 grid md:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm hover:shadow-md transition">
            <div className="w-12 h-12 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center mb-4">
              <QrCode className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-lg text-slate-900 mb-2">Table QR Codes & PDF Sheet</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Generate secure unguessable tokens for every table. Print professional branded QR tent cards or stickers ready for customer dining.
            </p>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm hover:shadow-md transition">
            <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center mb-4">
              <ChefHat className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-lg text-slate-900 mb-2">Live Kitchen Display</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Instant audio bell chime alerts the cook when an order arrives. One-click status updates: New → Preparing → Ready → Completed.
            </p>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm hover:shadow-md transition">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4">
              <Clock className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-lg text-slate-900 mb-2">Live Customer Order Tracking</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Customers watch real-time status changes right on their phones. 1-click sold-out toggles immediately hide out-of-stock items.
            </p>
          </div>
        </div>

        {/* Demo credentials banner */}
        <div className="mt-14 max-w-xl mx-auto bg-orange-50 border border-orange-200 rounded-xl p-5 text-center">
          <h4 className="font-semibold text-orange-950 text-sm flex items-center justify-center gap-2">
            <ShieldCheck className="w-4 h-4 text-orange-600" />
            Demo Credentials Pre-configured
          </h4>
          <p className="text-xs text-orange-800 mt-1.5">
            Email: <strong className="font-mono bg-white px-2 py-0.5 rounded border border-orange-200">owner@bistro.com</strong> | Password: <strong className="font-mono bg-white px-2 py-0.5 rounded border border-orange-200">password123</strong>
          </p>
        </div>
      </main>
    </div>
  );
}
