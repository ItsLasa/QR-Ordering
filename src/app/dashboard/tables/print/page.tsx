'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Printer, ArrowLeft, Loader2, UtensilsCrossed, Smartphone } from 'lucide-react';
import { RestaurantTable, Restaurant } from '@/types';

interface TableWithQR extends RestaurantTable {
  publicUrl: string;
  qrCodeDataUrl: string;
}

export default function PrintableQRSheetPage() {
  const [tables, setTables] = useState<TableWithQR[]>([]);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTables = async () => {
      try {
        const res = await fetch('/api/tables');
        if (res.ok) {
          const data = await res.json();
          setTables(data.tables || []);
          setRestaurant(data.restaurant || null);
        }
      } catch (err) {
        console.error('Failed to load tables:', err);
      } finally {
        setLoading(false);
      }
    };
    loadTables();
  }, []);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-100 py-8 px-4 sm:px-6">
      {/* Top action toolbar (Hidden when printing) */}
      <div className="no-print max-w-5xl mx-auto mb-6 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/tables"
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="font-extrabold text-slate-900 text-lg">
              Printable Table QR Sheets
            </h1>
            <p className="text-xs text-slate-500">
              Select &quot;Save as PDF&quot; in the print dialog to export digital PDF sheets, or print directly on cardstock.
            </p>
          </div>
        </div>

        <button
          onClick={handlePrint}
          className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm rounded-xl shadow-md shadow-orange-500/20 transition flex items-center gap-2"
        >
          <Printer className="w-4 h-4" />
          Print / Save PDF
        </button>
      </div>

      {/* Printable Sheet Canvas */}
      {loading ? (
        <div className="py-20 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500 mx-auto mb-3" />
          <p className="text-sm text-slate-500">Preparing high-res QR cards...</p>
        </div>
      ) : tables.length === 0 ? (
        <div className="max-w-md mx-auto bg-white p-8 rounded-2xl text-center border border-slate-200">
          <p className="text-sm text-slate-600">No tables found to print.</p>
        </div>
      ) : (
        <div className="max-w-5xl mx-auto bg-white p-8 sm:p-12 rounded-3xl shadow-lg border border-slate-200 print:shadow-none print:border-none print:p-0">
          {/* Printable Cards Grid (Optimized for 2x2 or 2x3 A4 cards) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 print:grid-cols-2 print:gap-6">
            {tables.map((table) => (
              <div
                key={table.id}
                className="border-2 border-dashed border-slate-300 rounded-3xl p-8 flex flex-col items-center justify-between text-center bg-gradient-to-b from-orange-50/40 via-white to-slate-50 page-break-inside-avoid shadow-sm print:border-slate-800 print:shadow-none"
              >
                {/* Store Header */}
                <div>
                  <div className="flex items-center justify-center gap-2 mb-2">
                    {restaurant?.logoUrl ? (
                      <img
                        src={restaurant.logoUrl}
                        alt="logo"
                        className="w-10 h-10 rounded-full object-cover border border-orange-200"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-orange-500 text-white flex items-center justify-center">
                        <UtensilsCrossed className="w-5 h-5" />
                      </div>
                    )}
                    <span className="font-extrabold text-xl text-slate-900 tracking-tight">
                      {restaurant?.name || 'Restaurant'}
                    </span>
                  </div>

                  {/* Table Badge */}
                  <div className="inline-block px-4 py-1.5 rounded-full bg-slate-900 text-white font-black text-sm tracking-wide shadow-sm my-2">
                    {table.name}
                  </div>
                </div>

                {/* QR Code Container */}
                <div className="my-5 bg-white p-4 rounded-2xl border-2 border-slate-900 shadow-md">
                  {table.qrCodeDataUrl && (
                    <img
                      src={table.qrCodeDataUrl}
                      alt={table.name}
                      className="w-52 h-52 object-contain"
                    />
                  )}
                </div>

                {/* Instructions */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-center gap-1.5 font-bold text-slate-900 text-base">
                    <Smartphone className="w-4 h-4 text-orange-600" />
                    <span>Scan to View Menu & Order</span>
                  </div>
                  <p className="text-xs text-slate-500 max-w-xs">
                    No app install needed. Browse dishes, place order from your phone, and pay at the counter with cash.
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
