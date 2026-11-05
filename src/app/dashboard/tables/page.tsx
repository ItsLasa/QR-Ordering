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
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <TableProperties className="w-6 h-6 text-orange-500" />
            Tables & QR Tokens
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Each table receives a cryptographically secure, unguessable token preventing spoofing.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/dashboard/tables/print"
            className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition flex items-center gap-2 border border-slate-200 shadow-sm"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            Print QR Sheet (PDF)
          </Link>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 rounded-xl shadow-sm shadow-orange-500/20 transition flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Add Table
          </button>
        </div>
      </div>

      {/* Tables Grid */}
      {loading ? (
        <div className="py-20 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500 mx-auto mb-3" />
          <p className="text-sm text-slate-500">Loading tables & generating QR codes...</p>
        </div>
      ) : tables.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center">
          <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <QrCode className="w-7 h-7" />
          </div>
          <h3 className="font-bold text-slate-800 text-base">No dining tables yet</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Click &quot;Add Table&quot; to generate your first table and printable QR code.
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {tables.map((table) => (
            <div
              key={table.id}
              className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 flex flex-col justify-between hover:shadow-md transition"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-extrabold text-lg text-slate-900 tracking-tight">
                      {table.name}
                    </h3>
                    <span className="text-[11px] font-mono text-slate-400 block mt-0.5">
                      Token: {table.token}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDeleteTable(table.id, table.name)}
                    className="p-1.5 text-slate-300 hover:text-rose-600 rounded-lg transition"
                    title="Delete Table"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* QR Code Container */}
                <div className="my-4 bg-slate-50 rounded-xl p-3 border border-slate-100 flex flex-col items-center justify-center">
                  {table.qrCodeDataUrl ? (
                    <img
                      src={table.qrCodeDataUrl}
                      alt={`QR code for ${table.name}`}
                      className="w-44 h-44 object-contain rounded-lg shadow-inner bg-white p-2"
                    />
                  ) : (
                    <div className="w-44 h-44 flex items-center justify-center text-slate-400">
                      Generating QR...
                    </div>
                  )}
                  <span className="text-[11px] text-slate-500 font-medium mt-2">
                    Scan with smartphone camera
                  </span>
                </div>
              </div>

              {/* Table card bottom actions */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopyLink(table.publicUrl, table.id)}
                    className="flex-1 py-2 px-3 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition flex items-center justify-center gap-1.5"
                  >
                    {copiedId === table.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" /> Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-500" /> Copy Link
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => handleDownloadQR(table.qrCodeDataUrl, table.name)}
                    className="py-2 px-3 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition flex items-center justify-center gap-1.5"
                    title="Download PNG QR Code"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-500" />
                    PNG
                  </button>

                  <Link
                    href={table.publicUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-xl transition border border-orange-200"
                    title="Test Customer Table Menu"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Table Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="font-bold text-lg text-slate-900 mb-1">Add New Table</h3>
            <p className="text-xs text-slate-500 mb-4">
              A secure unguessable QR token will be generated automatically.
            </p>

            <form onSubmit={handleCreateTable} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Table Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Table 5, Patio 2, Bar 1"
                  value={newTableName}
                  onChange={(e) => setNewTableName(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 text-xs font-semibold text-white bg-orange-500 hover:bg-orange-600 rounded-xl shadow-sm flex items-center gap-1.5"
                >
                  {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  Generate Table
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
