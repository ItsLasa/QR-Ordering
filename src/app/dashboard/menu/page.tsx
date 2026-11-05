'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, Check, X, Sparkles, FolderPlus, Image as ImageIcon, AlertCircle, ToggleLeft, ToggleRight, Loader2 } from 'lucide-react';
import { Category, MenuItem } from '@/types';

export default function MenuManagementPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [currency, setCurrency] = useState('$');
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Modals state
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Item form state
  const [formData, setFormData] = useState({
    name: '',
    categoryId: '',
    price: '',
    description: '',
    imageUrl: '',
    isAvailable: true,
    optionGroups: [] as Array<{
      id?: string;
      name: string;
      isRequired: boolean;
      allowMultiple: boolean;
      choices: Array<{ id?: string; name: string; price: string }>;
    }>,
  });

  const [savingItem, setSavingItem] = useState(false);
  const [togglingItemId, setTogglingItemId] = useState<string | null>(null);
  const [error, setError] = useState('');

  // Fetch menu data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [catRes, itemRes, restRes] = await Promise.all([
        fetch('/api/categories'),
        fetch('/api/menu-items'),
        fetch('/api/restaurant'),
      ]);

      if (catRes.ok) {
        const catData = await catRes.json();
        setCategories(catData.categories || []);
      }
      if (itemRes.ok) {
        const itemData = await itemRes.json();
        setItems(itemData.items || []);
      }
      if (restRes.ok) {
        const restData = await restRes.json();
        if (restData.restaurant?.currency) {
          setCurrency(restData.restaurant.currency);
        }
      }
    } catch (err) {
      console.error('Failed to load menu data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle sold-out toggle
  const handleToggleAvailable = async (itemId: string) => {
    setTogglingItemId(itemId);
    try {
      const res = await fetch(`/api/menu-items/${itemId}/toggle-available`, {
        method: 'PATCH',
      });
      if (res.ok) {
        const data = await res.json();
        setItems((prev) =>
          prev.map((i) => (i.id === itemId ? { ...i, isAvailable: data.isAvailable } : i))
        );
      }
    } catch (err) {
      console.error('Failed to toggle item availability:', err);
    } finally {
      setTogglingItemId(null);
    }
  };

  // Open item modal for Create or Edit
  const handleOpenItemModal = (item?: MenuItem) => {
    setError('');
    if (item) {
      setEditingItem(item);
      setFormData({
        name: item.name,
        categoryId: item.categoryId,
        price: item.price.toString(),
        description: item.description || '',
        imageUrl: item.imageUrl || '',
        isAvailable: item.isAvailable,
        optionGroups: (item.optionGroups || []).map((og) => ({
          id: og.id,
          name: og.name,
          isRequired: og.isRequired,
          allowMultiple: og.allowMultiple,
          choices: (og.choices || []).map((c) => ({
            id: c.id,
            name: c.name,
            price: c.price.toString(),
          })),
        })),
      });
    } else {
      setEditingItem(null);
      setFormData({
        name: '',
        categoryId: categories[0]?.id || '',
        price: '',
        description: '',
        imageUrl: '',
        isAvailable: true,
        optionGroups: [],
      });
    }
    setShowItemModal(true);
  };

  // Option groups builder helpers
  const addOptionGroup = () => {
    setFormData((prev) => ({
      ...prev,
      optionGroups: [
        ...prev.optionGroups,
        {
          name: '',
          isRequired: false,
          allowMultiple: false,
          choices: [{ name: '', price: '0' }],
        },
      ],
    }));
  };

  const removeOptionGroup = (groupIndex: number) => {
    setFormData((prev) => ({
      ...prev,
      optionGroups: prev.optionGroups.filter((_, idx) => idx !== groupIndex),
    }));
  };

  const addChoiceToGroup = (groupIndex: number) => {
    setFormData((prev) => {
      const updated = [...prev.optionGroups];
      updated[groupIndex].choices.push({ name: '', price: '0' });
      return { ...prev, optionGroups: updated };
    });
  };

  const removeChoiceFromGroup = (groupIndex: number, choiceIndex: number) => {
    setFormData((prev) => {
      const updated = [...prev.optionGroups];
      updated[groupIndex].choices = updated[groupIndex].choices.filter((_, idx) => idx !== choiceIndex);
      return { ...prev, optionGroups: updated };
    });
  };

  // Save Item
  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSavingItem(true);

    try {
      if (!formData.name || !formData.categoryId || !formData.price) {
        throw new Error('Please fill in Item Name, Category, and Price');
      }

      const payload = {
        id: editingItem ? editingItem.id : undefined,
        name: formData.name,
        categoryId: formData.categoryId,
        price: parseFloat(formData.price),
        description: formData.description,
        imageUrl: formData.imageUrl,
        isAvailable: formData.isAvailable,
        optionGroups: formData.optionGroups.filter((g) => g.name.trim()).map((g) => ({
          name: g.name.trim(),
          isRequired: g.isRequired,
          allowMultiple: g.allowMultiple,
          choices: g.choices.filter((c) => c.name.trim()).map((c) => ({
            name: c.name.trim(),
            price: parseFloat(c.price || '0'),
          })),
        })),
      };

      const res = await fetch('/api/menu-items', {
        method: editingItem ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save item');

      setShowItemModal(false);
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Error saving item');
    } finally {
      setSavingItem(false);
    }
  };

  // Delete Item
  const handleDeleteItem = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;
    try {
      const res = await fetch(`/api/menu-items?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setItems((prev) => prev.filter((i) => i.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete item:', err);
    }
  };

  // Add Category
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCategoryName }),
      });
      if (res.ok) {
        setNewCategoryName('');
        setShowCategoryModal(false);
        fetchData();
      }
    } catch (err) {
      console.error('Failed to add category:', err);
    }
  };

  // Delete Category
  const handleDeleteCategory = async (id: string, name: string) => {
    if (!confirm(`Delete category "${name}"? Items inside this category will also be removed.`)) return;
    try {
      const res = await fetch(`/api/categories?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error('Failed to delete category:', err);
    }
  };

  const filteredItems = items.filter((i) => {
    if (selectedCategory === 'ALL') return true;
    return i.categoryId === selectedCategory;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Menu Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Create items, organize categories, customize extras, and toggle sold-out status.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowCategoryModal(true)}
            className="px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition flex items-center gap-1.5"
          >
            <FolderPlus className="w-4 h-4 text-slate-500" />
            Add Category
          </button>

          <button
            onClick={() => handleOpenItemModal()}
            className="px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 rounded-xl shadow-sm shadow-orange-500/20 transition flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Add Menu Item
          </button>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setSelectedCategory('ALL')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition ${
            selectedCategory === 'ALL'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
          }`}
        >
          All Items ({items.length})
        </button>

        {categories.map((cat) => {
          const count = items.filter((i) => i.categoryId === cat.id).length;
          return (
            <div key={cat.id} className="relative group">
              <button
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition flex items-center gap-2 ${
                  selectedCategory === cat.id
                    ? 'bg-orange-500 text-white shadow-sm'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
                }`}
              >
                <span>{cat.name}</span>
                <span className={`text-xs px-1.5 py-0.2 rounded-full ${selectedCategory === cat.id ? 'bg-orange-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                  {count}
                </span>
              </button>
            </div>
          );
        })}
      </div>

      {/* Menu Items Grid */}
      {loading ? (
        <div className="py-20 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500 mx-auto mb-3" />
          <p className="text-sm text-slate-500">Loading menu items...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center">
          <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <ImageIcon className="w-7 h-7" />
          </div>
          <h3 className="font-bold text-slate-800 text-base">No menu items found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Get started by clicking &quot;Add Menu Item&quot; to build your restaurant menu.
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className={`bg-white rounded-2xl border transition overflow-hidden flex flex-col justify-between ${
                item.isAvailable ? 'border-slate-200/80 shadow-sm' : 'border-rose-200 bg-rose-50/20 opacity-80'
              }`}
            >
              <div>
                {/* Photo banner */}
                <div className="relative h-44 w-full bg-slate-100 overflow-hidden">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                      <ImageIcon className="w-8 h-8 mb-1" />
                      <span className="text-xs">No Photo</span>
                    </div>
                  )}

                  {/* Availability Badge */}
                  <div className="absolute top-3 left-3">
                    {item.isAvailable ? (
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500 text-white shadow-sm flex items-center gap-1">
                        <Check className="w-3 h-3" /> Available
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-600 text-white shadow-sm flex items-center gap-1">
                        <X className="w-3 h-3" /> SOLD OUT
                      </span>
                    )}
                  </div>

                  {/* Price Tag */}
                  <div className="absolute top-3 right-3 bg-white/95 backdrop-blur px-2.5 py-1 rounded-xl shadow-sm text-xs font-black text-slate-900">
                    {currency}{item.price.toFixed(2)}
                  </div>
                </div>

                {/* Body Details */}
                <div className="p-4">
                  <h3 className="font-bold text-slate-900 text-base leading-snug">
                    {item.name}
                  </h3>
                  {item.description && (
                    <p className="mt-1 text-xs text-slate-500 line-clamp-2">
                      {item.description}
                    </p>
                  )}

                  {/* Options tags */}
                  {item.optionGroups && item.optionGroups.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {item.optionGroups.map((g) => (
                        <span
                          key={g.id}
                          className="px-2 py-0.5 rounded-md bg-orange-50 text-orange-700 text-[10px] font-semibold border border-orange-200/60"
                        >
                          + {g.name} ({g.choices?.length || 0})
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Card Footer: Quick Sold-out Switch & Actions */}
              <div className="p-4 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between">
                {/* Sold-out toggle button */}
                <button
                  onClick={() => handleToggleAvailable(item.id)}
                  disabled={togglingItemId === item.id}
                  className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border transition ${
                    item.isAvailable
                      ? 'bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50'
                      : 'bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100'
                  }`}
                  title={item.isAvailable ? 'Click to mark as Sold Out' : 'Click to make Available'}
                >
                  {togglingItemId === item.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : item.isAvailable ? (
                    <ToggleRight className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <ToggleLeft className="w-4 h-4 text-rose-600" />
                  )}
                  <span>{item.isAvailable ? 'Available' : 'Sold Out'}</span>
                </button>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenItemModal(item)}
                    className="p-2 text-slate-500 hover:text-slate-800 hover:bg-white rounded-lg transition border border-transparent hover:border-slate-200"
                    title="Edit Item"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleDeleteItem(item.id, item.name)}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-white rounded-lg transition border border-transparent hover:border-rose-200"
                    title="Delete Item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="font-bold text-lg text-slate-900 mb-2">Manage Categories</h3>
            <p className="text-xs text-slate-500 mb-4">Add or manage menu categories.</p>

            {/* Existing categories list */}
            <div className="max-h-44 overflow-y-auto space-y-1.5 mb-4 border rounded-xl p-2 bg-slate-50">
              {categories.map((c) => (
                <div key={c.id} className="flex items-center justify-between text-xs bg-white p-2 rounded-lg border border-slate-200">
                  <span className="font-semibold text-slate-800">{c.name}</span>
                  <button
                    onClick={() => handleDeleteCategory(c.id, c.name)}
                    className="text-rose-500 hover:text-rose-700"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <form onSubmit={handleAddCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">New Category Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Desserts, Specials, Cocktails"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCategoryModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-orange-500 hover:bg-orange-600 rounded-xl shadow-sm"
                >
                  Add Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Item Create / Edit Modal */}
      {showItemModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-lg text-slate-900">
                {editingItem ? 'Edit Menu Item' : 'Add New Menu Item'}
              </h3>
              <button
                onClick={() => setShowItemModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="mt-3 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSaveItem} className="mt-4 space-y-4 max-h-[75vh] overflow-y-auto pr-1">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Item Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Classic Smash Burger"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Category *</label>
                  <select
                    required
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                  >
                    <option value="" disabled>Select a category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Price ({currency}) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="12.50"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Photo Image URL</label>
                  <input
                    type="url"
                    placeholder="https://images.unsplash.com/..."
                    value={formData.imageUrl}
                    onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Ingredients, preparation details, flavor profile..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              {/* Options / Extras Builder */}
              <div className="border-t border-slate-200 pt-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">Options & Extras</h4>
                    <p className="text-[11px] text-slate-500">e.g. Size, Patty doneness, Add-ons (bacon, cheese)</p>
                  </div>
                  <button
                    type="button"
                    onClick={addOptionGroup}
                    className="px-2.5 py-1 text-xs font-semibold text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-lg border border-orange-200 transition flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Option Group
                  </button>
                </div>

                {formData.optionGroups.map((group, gIdx) => (
                  <div key={gIdx} className="mb-3 p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Group Name (e.g. Extra Toppings, Size)"
                        value={group.name}
                        onChange={(e) => {
                          const updated = [...formData.optionGroups];
                          updated[gIdx].name = e.target.value;
                          setFormData({ ...formData, optionGroups: updated });
                        }}
                        className="flex-1 px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg bg-white"
                      />
                      <label className="flex items-center gap-1 text-[11px] text-slate-600 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={group.isRequired}
                          onChange={(e) => {
                            const updated = [...formData.optionGroups];
                            updated[gIdx].isRequired = e.target.checked;
                            setFormData({ ...formData, optionGroups: updated });
                          }}
                        />
                        Required
                      </label>
                      <label className="flex items-center gap-1 text-[11px] text-slate-600 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={group.allowMultiple}
                          onChange={(e) => {
                            const updated = [...formData.optionGroups];
                            updated[gIdx].allowMultiple = e.target.checked;
                            setFormData({ ...formData, optionGroups: updated });
                          }}
                        />
                        Multi-choice
                      </label>
                      <button
                        type="button"
                        onClick={() => removeOptionGroup(gIdx)}
                        className="text-slate-400 hover:text-rose-600 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Choices */}
                    <div className="pl-3 space-y-1.5 border-l-2 border-orange-300">
                      {group.choices.map((choice, cIdx) => (
                        <div key={cIdx} className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="Choice name (e.g. Extra Bacon)"
                            value={choice.name}
                            onChange={(e) => {
                              const updated = [...formData.optionGroups];
                              updated[gIdx].choices[cIdx].name = e.target.value;
                              setFormData({ ...formData, optionGroups: updated });
                            }}
                            className="flex-1 px-2.5 py-1 text-xs border border-slate-300 rounded bg-white"
                          />
                          <div className="flex items-center gap-1">
                            <span className="text-[11px] text-slate-400">+ {currency}</span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="0.00"
                              value={choice.price}
                              onChange={(e) => {
                                const updated = [...formData.optionGroups];
                                updated[gIdx].choices[cIdx].price = e.target.value;
                                setFormData({ ...formData, optionGroups: updated });
                              }}
                              className="w-16 px-2 py-1 text-xs border border-slate-300 rounded bg-white text-right"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => removeChoiceFromGroup(gIdx, cIdx)}
                            className="text-slate-400 hover:text-rose-600 text-xs"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => addChoiceToGroup(gIdx)}
                        className="text-[11px] font-semibold text-orange-600 hover:text-orange-700 mt-1"
                      >
                        + Add Choice
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Submit buttons */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowItemModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingItem}
                  className="px-5 py-2 text-xs font-semibold text-white bg-orange-500 hover:bg-orange-600 rounded-xl shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                >
                  {savingItem ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
                    </>
                  ) : (
                    <>Save Item</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
