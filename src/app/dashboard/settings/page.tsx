'use client';

import { useState, useEffect } from 'react';
import { Save, Store, Image as ImageIcon, MapPin, Phone, Check, AlertCircle, Loader2 } from 'lucide-react';
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
        <Loader2 className="w-6 h-6 animate-spin text-stone-400 mx-auto mb-2" />
        <p className="text-xs text-stone-500 uppercase tracking-widest font-medium">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 text-stone-900">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-xl border border-stone-200/90 shadow-subtle">
        <h1 className="font-serif text-xl sm:text-2xl font-bold text-stone-900 tracking-tight">
          Restaurant Profile
        </h1>
        <p className="text-xs text-stone-500 mt-0.5">
          Configure branding, currency format, and public contact information.
        </p>
      </div>

      {/* Form */}
      <div className="bg-white p-6 sm:p-8 rounded-xl border border-stone-200/90 shadow-subtle">
        {success && (
          <div className="mb-5 rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs font-medium text-emerald-800 flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>Profile settings updated successfully.</span>
          </div>
        )}

        {error && (
          <div className="mb-5 rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs font-medium text-rose-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-5">
          {/* Restaurant Name */}
          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">
              Restaurant Name *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                <Store className="w-4 h-4" />
              </div>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full pl-9 pr-3.5 py-2 border border-stone-200 rounded-lg text-xs sm:text-sm text-stone-900 focus:outline-none focus:border-stone-400"
              />
            </div>
            {restaurant?.slug && (
              <p className="mt-1 text-xs text-stone-500">
                Public Dining URL: <span className="font-mono text-stone-800">/s/{restaurant.slug}</span>
              </p>
            )}
          </div>

          {/* Currency Selection */}
          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">
              Currency Symbol *
            </label>
            <div className="flex flex-wrap items-center gap-1.5">
              {['$', '€', '£', '₹', '฿', '¥', 'C$'].map((sym) => (
                <button
                  key={sym}
                  type="button"
                  onClick={() => setFormData({ ...formData, currency: sym })}
                  className={`px-3 py-1.5 rounded-lg font-medium text-xs border transition ${
                    formData.currency === sym
                      ? 'bg-stone-900 text-white border-stone-900 shadow-subtle'
                      : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  {sym}
                </button>
              ))}
              <div className="relative">
                <input
                  type="text"
                  maxLength={4}
                  placeholder="Other"
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  className="w-20 px-2.5 py-1.5 text-xs border border-stone-200 rounded-lg text-center font-medium"
                />
              </div>
            </div>
          </div>

          {/* Logo URL */}
          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">
              Logo / Branding Image URL
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                <ImageIcon className="w-4 h-4" />
              </div>
              <input
                type="url"
                placeholder="https://..."
                value={formData.logoUrl}
                onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                className="w-full pl-9 pr-3.5 py-2 border border-stone-200 rounded-lg text-xs sm:text-sm text-stone-900 focus:outline-none focus:border-stone-400"
              />
            </div>
            {formData.logoUrl && (
              <div className="mt-2.5 flex items-center gap-2.5">
                <img
                  src={formData.logoUrl}
                  alt="Logo preview"
                  className="w-10 h-10 rounded-full object-cover border border-stone-200 shadow-subtle"
                  onError={(e) => ((e.target as HTMLElement).style.display = 'none')}
                />
                <span className="text-xs text-stone-500">Logo preview</span>
              </div>
            )}
          </div>

          {/* Address & Phone */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">
                Street Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                  <MapPin className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  placeholder="104 Main Street, Downtown"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full pl-9 pr-3.5 py-2 border border-stone-200 rounded-lg text-xs sm:text-sm text-stone-900 focus:outline-none focus:border-stone-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">
                Contact Phone
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                  <Phone className="w-4 h-4" />
                </div>
                <input
                  type="tel"
                  placeholder="+1 (555) 234-5678"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full pl-9 pr-3.5 py-2 border border-stone-200 rounded-lg text-xs sm:text-sm text-stone-900 focus:outline-none focus:border-stone-400"
                />
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-stone-100 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white font-medium text-xs rounded-lg shadow-subtle transition flex items-center gap-1.5 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" /> Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
