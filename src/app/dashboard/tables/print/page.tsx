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
    <div className="min-h-screen bg-[#FAF9F6] py-8 px-4 sm:px-6 text-stone-900 print:bg-white print:p-0">
      {/* Top action toolbar (Hidden when printing) */}
      <div className="no-print max-w-5xl mx-auto mb-6 bg-white p-4 rounded-xl border border-stone-200/90 shadow-subtle flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/tables"
            className="p-1.5 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="font-serif font-bold text-stone-900 text-base sm:text-lg">
              Tabletop QR Tent Cards
            </h1>
            <p className="text-xs text-stone-500">
              Print directly or select &quot;Save as PDF&quot; in your browser dialog to generate cards for table acrylic stands.
            </p>
          </div>
        </div>

        <button
          onClick={handlePrint}
          className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white font-medium text-xs rounded-lg shadow-subtle transition flex items-center gap-1.5"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>Print / Save PDF</span>
        </button>
      </div>

      {/* Printable Sheet Canvas */}
      {loading ? (
        <div className="py-20 text-center">
          <Loader2 className="w-6 h-6 animate-spin text-stone-400 mx-auto mb-2" />
          <p className="text-xs text-stone-500 uppercase tracking-widest font-medium">Rendering print cards...</p>
        </div>
      ) : tables.length === 0 ? (
        <div className="max-w-md mx-auto bg-white p-8 rounded-xl text-center border border-stone-200">
          <p className="text-sm text-stone-600">No tables available to print.</p>
        </div>
      ) : (
        <div className="max-w-5xl mx-auto bg-white p-8 sm:p-12 rounded-2xl shadow-card border border-stone-200 print:shadow-none print:border-none print:p-0">
          {/* Printable Cards Grid (Optimized for 2x2 or 2x3 cards per page) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 print:grid-cols-2 print:gap-6">
            {tables.map((table) => (
              <div
                key={table.id}
                className="border border-stone-300 rounded-2xl p-8 flex flex-col items-center justify-between text-center bg-[#FAF9F6] page-break-inside-avoid print:border-stone-800 print:bg-white print:p-6"
              >
                {/* Store Header */}
                <div className="space-y-1">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    {restaurant?.logoUrl ? (
                      <img
                        src={restaurant.logoUrl}
                        alt="logo"
                        className="w-8 h-8 rounded-full object-cover border border-stone-300"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-stone-900 text-white flex items-center justify-center font-serif font-bold text-xs">
                        {restaurant?.name?.charAt(0) || 'R'}
                      </div>
                    )}
                    <span className="font-serif font-bold text-lg text-stone-900 tracking-tight">
                      {restaurant?.name || 'Restaurant'}
                    </span>
                  </div>

                  {/* Table Badge */}
                  <div className="inline-block px-3 py-1 rounded bg-stone-900 text-white font-mono font-bold text-xs tracking-wider uppercase my-2">
                    {table.name}
                  </div>
                </div>

                {/* QR Code Container */}
                <div className="my-5 bg-white p-3.5 rounded-xl border border-stone-300 shadow-subtle print:border-stone-800 print:shadow-none">
                  {table.qrCodeDataUrl && (
                    <img
                      src={table.qrCodeDataUrl}
                      alt={table.name}
                      className="w-48 h-48 object-contain"
                    />
                  )}
                </div>

                {/* Instructions */}
                <div className="space-y-1">
                  <div className="flex items-center justify-center gap-1.5 font-serif font-semibold text-stone-900 text-sm">
                    <Smartphone className="w-3.5 h-3.5 text-stone-600" />
                    <span>Scan with camera to order</span>
                  </div>
                  <p className="text-[11px] text-stone-500 max-w-xs leading-relaxed">
                    No app download required. Browse dishes, place order from your phone, and settle bill at the counter.
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
