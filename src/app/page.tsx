import Link from 'next/link';
import { QrCode, UtensilsCrossed, ChefHat, ArrowRight, Smartphone, Bell, Receipt, CheckCircle2 } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#FAF9F6] text-stone-900 selection:bg-stone-200">
      {/* Editorial Navbar */}
      <header className="border-b border-stone-200/80 bg-white/90 backdrop-blur sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-stone-900 text-stone-100 flex items-center justify-center font-serif text-lg font-bold">
              B
            </div>
            <div>
              <span className="font-serif font-bold text-lg tracking-tight text-stone-900">BistroQR</span>
              <span className="hidden sm:inline-block ml-2 text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded bg-stone-100 text-stone-600 border border-stone-200">
                Hospitality Tech
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-xs sm:text-sm font-medium text-stone-600 hover:text-stone-900 transition px-3 py-1.5"
            >
              Owner Sign In
            </Link>
            <Link
              href="/register"
              className="text-xs sm:text-sm font-medium text-white bg-stone-900 hover:bg-stone-800 transition px-3.5 py-1.5 rounded-lg shadow-subtle flex items-center gap-1.5"
            >
              Get Started <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-16 pb-24">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-stone-100 border border-stone-200/90 text-stone-600 text-xs font-medium mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-stone-900" />
            Contactless QR Table Ordering & Kitchen Display
          </div>

          <h1 className="font-serif text-4xl sm:text-6xl font-bold text-stone-900 tracking-tight leading-[1.12]">
            Tabletop ordering, <br />
            <span className="italic font-normal text-stone-700">crafted for real hospitality.</span>
          </h1>

          <p className="mt-6 text-base sm:text-lg text-stone-600 leading-relaxed max-w-2xl mx-auto font-sans">
            Guests scan table tent cards to browse dishes, customize their meals, and order without waiting. Kitchen staff manage incoming tickets with instant sound chimes and live status tracking.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/s/rustic-bistro?t=tbl_t1_948f2a1b"
              className="px-5 py-3 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-sm font-medium shadow-card flex items-center gap-2 transition"
            >
              <Smartphone className="w-4 h-4" />
              Customer Menu (Table 1 Demo)
            </Link>
            <Link
              href="/dashboard/kitchen"
              className="px-5 py-3 rounded-lg bg-white hover:bg-stone-50 text-stone-900 text-sm font-medium border border-stone-200 shadow-subtle flex items-center gap-2 transition"
            >
              <ChefHat className="w-4 h-4 text-stone-600" />
              Kitchen Display (KDS)
            </Link>
          </div>
        </div>

        {/* Product Architecture Pillars */}
        <div className="mt-20 grid md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl p-6 border border-stone-200/90 shadow-subtle hover:border-stone-300 transition space-y-3">
            <div className="w-10 h-10 rounded-lg bg-stone-100 border border-stone-200/80 text-stone-800 flex items-center justify-center">
              <QrCode className="w-5 h-5" />
            </div>
            <h3 className="font-serif font-bold text-lg text-stone-900">Branded Table QR Tent Cards</h3>
            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
              Generate cryptographic, unguessable table tokens. Export printable high-res PDF table cards ready for tabletop cardstock or acrylic holders.
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 border border-stone-200/90 shadow-subtle hover:border-stone-300 transition space-y-3">
            <div className="w-10 h-10 rounded-lg bg-stone-100 border border-stone-200/80 text-stone-800 flex items-center justify-center">
              <ChefHat className="w-5 h-5" />
            </div>
            <h3 className="font-serif font-bold text-lg text-stone-900">Live Kitchen Display System</h3>
            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
              Audio bell chimes alert the kitchen when an order arrives. One-click status progressions (Received → Preparing → Ready → Served) with elapsed timers.
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 border border-stone-200/90 shadow-subtle hover:border-stone-300 transition space-y-3">
            <div className="w-10 h-10 rounded-lg bg-stone-100 border border-stone-200/80 text-stone-800 flex items-center justify-center">
              <Bell className="w-5 h-5" />
            </div>
            <h3 className="font-serif font-bold text-lg text-stone-900">Live Diner Tracking & Stock Toggles</h3>
            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
              Customers follow real-time cooking progress from their phone. Kitchen managers can 86 any dish with a single tap, instantly updating guest menus.
            </p>
          </div>
        </div>

        {/* Pre-configured Demo Access Card */}
        <div className="mt-16 max-w-lg mx-auto bg-white border border-stone-200/90 rounded-xl p-5 shadow-subtle text-center">
          <span className="text-[10px] uppercase tracking-widest font-semibold text-stone-400 block font-sans">
            Demo Credentials
          </span>
          <p className="font-serif text-stone-900 text-sm font-semibold mt-1">
            Explore the manager dashboard with pre-seeded data:
          </p>
          <div className="mt-2.5 inline-flex flex-wrap items-center justify-center gap-2 text-xs font-mono bg-stone-50 border border-stone-200 px-3 py-1.5 rounded-lg text-stone-700">
            <span>email: <strong className="text-stone-900">owner@bistro.com</strong></span>
            <span className="text-stone-300">•</span>
            <span>password: <strong className="text-stone-900">password123</strong></span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-stone-200/80 bg-white py-6">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-stone-500">
          <p>© {new Date().getFullYear()} BistroQR. Contactless Restaurant Technology.</p>
          <p>Cash at counter • Real-time SSE • MySQL</p>
        </div>
      </footer>
    </div>
  );
}
