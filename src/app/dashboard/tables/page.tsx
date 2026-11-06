'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { QrCode, Plus, Printer, Copy, Check, Download, Trash2, ExternalLink, Loader2, TableProperties } from 'lucide-react';
import { RestaurantTable, Restaurant } from '@/types';

interface TableWithQR extends RestaurantTable {
  publicUrl: string;
  qrCodeDataUrl: string;
  _count?: { orders: number };
}

export default function TablesManagementPage() {
  const [tables, setTables] = useState<TableWithQR[]>([]);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [newTableName, setNewTableName] = useState('');
  const [creating, setCreating] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  const fetchTables = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/tables');
      if (res.ok) {
        const data = await res.json();
        setTables(data.tables || []);
        setRestaurant(data.restaurant || null);
      }
    } catch (err) {
      console.error('Failed to fetch tables:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTables();
  }, [fetchTables]);

  const handleCreateTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTableName.trim()) return;
    setCreating(true);

    try {
      const res = await fetch('/api/tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTableName.trim() }),
      });
      if (res.ok) {
        setNewTableName('');
        setShowAddModal(false);
        fetchTables();
      }
    } catch (err) {
      console.error('Failed to create table:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteTable = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? QR codes printed for this table will no longer work.`)) return;
    try {
      const res = await fetch(`/api/tables/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setTables((prev) => prev.filter((t) => t.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete table:', err);
    }
  };

  const handleCopyLink = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownloadQR = (qrDataUrl: string, tableName: string) => {
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `QR-${tableName.replace(/\s+/g, '-')}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-6 text-stone-900">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-xl border border-stone-200/90 shadow-subtle">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-serif text-xl sm:text-2xl font-bold text-stone-900 tracking-tight">
              Tables & QR Tokens
            </h1>
          </div>
          <p className="text-xs text-stone-500 mt-0.5">
            Every dining station receives a cryptographic token to prevent order spoofing.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/tables/print"
            className="px-3 py-1.5 text-xs font-medium text-stone-700 bg-stone-50 hover:bg-stone-100 border border-stone-200 rounded-lg transition flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5 text-stone-500" />
            <span>Print Tent Cards (PDF)</span>
          </Link>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-1.5 text-xs font-medium text-white bg-stone-900 hover:bg-stone-800 rounded-lg shadow-subtle transition flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Table</span>
          </button>
        </div>
      </div>

      {/* Tables Grid */}
      {loading ? (
        <div className="py-20 text-center">
          <Loader2 className="w-6 h-6 animate-spin text-stone-400 mx-auto mb-2" />
          <p className="text-xs text-stone-500 uppercase tracking-widest font-medium">Loading tables & QR codes...</p>
        </div>
      ) : tables.length === 0 ? (
        <div className="bg-white rounded-xl border border-stone-200 p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-stone-100 text-stone-400 flex items-center justify-center mx-auto mb-3">
            <QrCode className="w-6 h-6" />
          </div>
          <p className="font-serif text-base text-stone-800">No dining tables configured</p>
          <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
            Click &quot;Add Table&quot; above to create tabletop ordering stations with instant QR tokens.
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tables.map((table) => (
            <div
              key={table.id}
              className="bg-white rounded-xl border border-stone-200/90 shadow-subtle p-5 flex flex-col justify-between hover:border-stone-300 transition"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-serif font-bold text-lg text-stone-900 tracking-tight">
                      {table.name}
                    </h3>
                    <span className="text-[11px] font-mono text-stone-400 block mt-0.5">
                      Token: {table.token}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDeleteTable(table.id, table.name)}
                    className="p-1.5 text-stone-300 hover:text-rose-600 rounded transition"
                    title="Delete Table"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* QR Code Canvas */}
                <div className="my-4 bg-stone-50 rounded-lg p-3 border border-stone-200 flex flex-col items-center justify-center">
                  {table.qrCodeDataUrl ? (
                    <img
                      src={table.qrCodeDataUrl}
                      alt={`QR code for ${table.name}`}
                      className="w-40 h-40 object-contain rounded bg-white p-2 border border-stone-200/80 shadow-subtle"
                    />
                  ) : (
                    <div className="w-40 h-40 flex items-center justify-center text-stone-400 text-xs">
                      Generating...
                    </div>
                  )}
                  <span className="text-[11px] text-stone-500 font-medium mt-2">
                    Directs to table order menu
                  </span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="space-y-2 pt-2 border-t border-stone-100">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleCopyLink(table.publicUrl, table.id)}
                    className="flex-1 py-1.5 px-2.5 text-xs font-medium text-stone-700 bg-stone-50 hover:bg-stone-100 border border-stone-200 rounded-lg transition flex items-center justify-center gap-1.5"
                  >
                    {copiedId === table.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-700" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-stone-400" /> Copy Link
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => handleDownloadQR(table.qrCodeDataUrl, table.name)}
                    className="py-1.5 px-2.5 text-xs font-medium text-stone-700 bg-stone-50 hover:bg-stone-100 border border-stone-200 rounded-lg transition flex items-center justify-center gap-1"
                    title="Download PNG QR Code"
                  >
                    <Download className="w-3.5 h-3.5 text-stone-400" />
                    PNG
                  </button>

                  <Link
                    href={table.publicUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 text-stone-600 hover:text-stone-900 bg-stone-50 hover:bg-stone-100 rounded-lg transition border border-stone-200"
                    title="Test Customer Table Menu"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Table Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-float border border-stone-200">
            <h3 className="font-serif font-bold text-lg text-stone-900 mb-1">Add Table</h3>
            <p className="text-xs text-stone-500 mb-4">
              A cryptographic QR token will be generated automatically.
            </p>

            <form onSubmit={handleCreateTable} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Table Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Table 5, Patio 2, Booth A"
                  value={newTableName}
                  onChange={(e) => setNewTableName(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-200 rounded-lg text-xs sm:text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:border-stone-400"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-1.5 text-xs font-medium text-white bg-stone-900 hover:bg-stone-800 rounded-lg shadow-subtle flex items-center gap-1.5"
                >
                  {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  Create Table
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
