'use client';

import { useState, useEffect } from 'react';
import { Settings, Save, Store, DollarSign, Image as ImageIcon, MapPin, Phone, Check, AlertCircle, Loader2 } from 'lucide-react';
import { Restaurant } from '@/types';

export default function StoreSettingsPage() {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    logoUrl: '',
    currency: '$',
    address: '',
    phone: '',
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/restaurant');
        if (res.ok) {
          const data = await res.json();
          const r: Restaurant = data.restaurant;
          setRestaurant(r);
          setFormData({
            name: r.name,
            logoUrl: r.logoUrl || '',
            currency: r.currency || '$',
            address: r.address || '',
            phone: r.phone || '',
          });
        }
      } catch (err) {
        console.error('Failed to load settings:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setSaving(true);

    try {
      const res = await fetch('/api/restaurant', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update settings');

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Error updating settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500 mx-auto mb-3" />
        <p className="text-sm text-slate-500">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Settings className="w-6 h-6 text-orange-500" />
            Shop Profile & Settings
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Configure your restaurant name, branding logo, and display currency.
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-sm">
        {success && (
          <div className="mb-6 rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-xs font-semibold text-emerald-800 flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>Store settings saved successfully!</span>
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-xl bg-rose-50 border border-rose-200 p-4 text-xs font-semibold text-rose-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          {/* Restaurant Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
              Restaurant Name *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Store className="w-4 h-4" />
              </div>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            {restaurant?.slug && (
              <p className="mt-1 text-xs text-slate-500">
                Public URL: <span className="font-mono text-orange-600">/s/{restaurant.slug}</span>
              </p>
            )}
          </div>

          {/* Currency Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
              Currency Symbol *
            </label>
            <div className="flex flex-wrap items-center gap-2">
              {['$', '€', '£', '₹', '฿', '¥', 'C$'].map((sym) => (
                <button
                  key={sym}
                  type="button"
                  onClick={() => setFormData({ ...formData, currency: sym })}
                  className={`px-4 py-2 rounded-xl font-bold text-sm border transition ${
                    formData.currency === sym
                      ? 'bg-orange-500 text-white border-orange-500 shadow-sm'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {sym}
                </button>
              ))}
              <div className="relative">
                <input
                  type="text"
                  maxLength={4}
                  placeholder="Custom"
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  className="w-24 px-3 py-2 text-sm border border-slate-300 rounded-xl text-center font-bold"
                />
              </div>
            </div>
          </div>

          {/* Logo URL */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
              Logo / Banner Image URL
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <ImageIcon className="w-4 h-4" />
              </div>
              <input
                type="url"
                placeholder="https://..."
                value={formData.logoUrl}
                onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            {formData.logoUrl && (
              <div className="mt-3 flex items-center gap-3">
                <img
                  src={formData.logoUrl}
                  alt="Logo preview"
                  className="w-12 h-12 rounded-xl object-cover border border-slate-200 shadow-sm"
                  onError={(e) => ((e.target as HTMLElement).style.display = 'none')}
                />
                <span className="text-xs text-slate-500">Logo preview</span>
              </div>
            )}
          </div>

          {/* Address & Phone */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <MapPin className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  placeholder="123 Food Street, Downtown"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                Phone Number
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Phone className="w-4 h-4" />
                </div>
                <input
                  type="tel"
                  placeholder="+1 (555) 123-4567"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm rounded-xl shadow-md shadow-orange-500/20 transition flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" /> Save Profile Settings
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
