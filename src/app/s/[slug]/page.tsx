'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  UtensilsCrossed,
  Search,
  ShoppingCart,
  Plus,
  Minus,
  X,
  Check,
  AlertCircle,
  Clock,
  Sparkles,
  ArrowRight,
  Info,
  DollarSign,
  ChefHat,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { Category, MenuItem, OptionGroup, CartItem, SelectedOption, RestaurantTable, Restaurant } from '@/types';

export default function CustomerMenuPage({ params }: { params: { slug: string } }) {
  const { slug } = params;
  const searchParams = useSearchParams();
  const router = useRouter();
  const tableToken = searchParams.get('t');

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeTable, setActiveTable] = useState<RestaurantTable | null>(null);
  const [isTableValid, setIsTableValid] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  // Search & active category
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('ALL');

  // Customization modal
  const [selectedItemForModal, setSelectedItemForModal] = useState<MenuItem | null>(null);
  const [modalQuantity, setModalQuantity] = useState(1);
  const [selectedOptionsMap, setSelectedOptionsMap] = useState<Record<string, string[]>>({});
  const [modalError, setModalError] = useState('');

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerNote, setCustomerNote] = useState('');
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [orderError, setOrderError] = useState('');

  // Fetch store menu data
  const fetchMenu = async () => {
    try {
      const url = `/api/public/${slug}${tableToken ? `?t=${tableToken}` : ''}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setRestaurant(data.restaurant);
        setCategories(data.restaurant?.categories || []);
        setActiveTable(data.table || null);
        setIsTableValid(data.isTableValid || false);
      }
    } catch (err) {
      console.error('Failed to load menu:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMenu();
  }, [slug, tableToken]);

  // Listen to SSE for real-time sold-out toggles
  useEffect(() => {
    if (!restaurant?.id) return;
    const es = new EventSource(`/api/events?restaurantId=${restaurant.id}`);

    es.addEventListener('menu:updated', () => {
      fetchMenu();
    });

    return () => {
      es.close();
    };
  }, [restaurant?.id]);

  // Flatten all items for search
  const allItems = useMemo(() => {
    return categories.flatMap((c) => c.menuItems || []);
  }, [categories]);

  // Filter items by category & search
  const filteredCategories = useMemo(() => {
    return categories
      .map((cat) => {
        let items = cat.menuItems || [];
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          items = items.filter(
            (i) =>
              i.name.toLowerCase().includes(q) ||
              (i.description && i.description.toLowerCase().includes(q))
          );
        }
        return {
          ...cat,
          menuItems: items,
        };
      })
      .filter((cat) => (activeCategory === 'ALL' || cat.id === activeCategory) && cat.menuItems.length > 0);
  }, [categories, searchQuery, activeCategory]);

  // Open item customization modal
  const handleOpenItem = (item: MenuItem) => {
    if (!item.isAvailable) return;

    setSelectedItemForModal(item);
    setModalQuantity(1);
    setModalError('');

    // Pre-populate default required options if any
    const initialOptions: Record<string, string[]> = {};
    (item.optionGroups || []).forEach((g) => {
      if (g.isRequired && !g.allowMultiple && g.choices.length > 0) {
        initialOptions[g.id] = [g.choices[0].name];
      } else {
        initialOptions[g.id] = [];
      }
    });
    setSelectedOptionsMap(initialOptions);
  };

  // Calculate item price inside modal based on options
  const calculatedModalItemPrice = useMemo(() => {
    if (!selectedItemForModal) return 0;
    let price = selectedItemForModal.price;

    (selectedItemForModal.optionGroups || []).forEach((g) => {
      const selectedChoiceNames = selectedOptionsMap[g.id] || [];
      g.choices.forEach((c) => {
        if (selectedChoiceNames.includes(c.name)) {
          price += c.price;
        }
      });
    });

    return price * modalQuantity;
  }, [selectedItemForModal, selectedOptionsMap, modalQuantity]);

  // Add customized item to Cart
  const handleAddToCart = () => {
    if (!selectedItemForModal) return;

    // Validate required option groups
    for (const g of selectedItemForModal.optionGroups || []) {
      const selected = selectedOptionsMap[g.id] || [];
      if (g.isRequired && selected.length === 0) {
        setModalError(`Please select an option for "${g.name}"`);
        return;
      }
    }

    // Build flat selectedOptions array
    const selectedOptionsList: SelectedOption[] = [];
    (selectedItemForModal.optionGroups || []).forEach((g) => {
      const chosen = selectedOptionsMap[g.id] || [];
      g.choices.forEach((c) => {
        if (chosen.includes(c.name)) {
          selectedOptionsList.push({
            groupName: g.name,
            choiceName: c.name,
            price: c.price,
          });
        }
      });
    });

    const unitPrice =
      selectedItemForModal.price +
      selectedOptionsList.reduce((sum, opt) => sum + opt.price, 0);

    const newItem: CartItem = {
      id: `${selectedItemForModal.id}_${Date.now()}_${Math.random()}`,
      menuItemId: selectedItemForModal.id,
      name: selectedItemForModal.name,
      unitPrice,
      quantity: modalQuantity,
      selectedOptions: selectedOptionsList,
      subtotal: unitPrice * modalQuantity,
      imageUrl: selectedItemForModal.imageUrl,
    };

    setCart((prev) => [...prev, newItem]);
    setSelectedItemForModal(null);
  };

  // Cart operations
  const updateCartQuantity = (cartId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id === cartId) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            return {
              ...item,
              quantity: newQty,
              subtotal: item.unitPrice * newQty,
            };
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const cartTotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.subtotal, 0);
  }, [cart]);

  const cartItemCount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  // Place Order
  const handlePlaceOrder = async () => {
    setOrderError('');
    if (!isTableValid || !tableToken) {
      setOrderError('Please scan the QR code located on your table to place an order.');
      return;
    }

    if (!customerName.trim()) {
      setOrderError('Please enter your name so the kitchen knows whose order it is.');
      return;
    }

    if (cart.length === 0) {
      setOrderError('Your cart is empty.');
      return;
    }

    setSubmittingOrder(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantSlug: slug,
          tableToken,
          customerName: customerName.trim(),
          customerNote: customerNote.trim() || undefined,
          items: cart,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to place order.');
      }

      // Clear cart and redirect to live status page
      setCart([]);
      setIsCartOpen(false);
      router.push(`/s/${slug}/order/${data.orderId}`);
    } catch (err: any) {
      setOrderError(err.message || 'Error placing order');
    } finally {
      setSubmittingOrder(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <Loader2 className="w-10 h-10 animate-spin text-orange-500 mb-3" />
        <p className="text-sm font-semibold text-slate-600">Loading restaurant menu...</p>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4">
          <UtensilsCrossed className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-black text-slate-900">Restaurant Not Found</h1>
        <p className="text-xs text-slate-500 mt-2 max-w-sm">
          The restaurant you are looking for does not exist or may have changed its web link.
        </p>
      </div>
    );
  }

  const currency = restaurant.currency || '$';

  return (
    <div className="min-h-screen bg-slate-50 pb-28">
      {/* Restaurant Header Banner */}
      <div className="bg-white border-b border-slate-200/80 sticky top-0 z-30 shadow-xs">
        <div className="max-w-2xl mx-auto px-4 py-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {restaurant.logoUrl ? (
                <img
                  src={restaurant.logoUrl}
                  alt={restaurant.name}
                  className="w-11 h-11 rounded-xl object-cover border border-slate-200 shadow-xs"
                />
              ) : (
                <div className="w-11 h-11 rounded-xl bg-orange-500 text-white flex items-center justify-center shadow-xs">
                  <UtensilsCrossed className="w-5 h-5" />
                </div>
              )}
              <div>
                <h1 className="font-extrabold text-slate-900 text-base sm:text-lg tracking-tight leading-tight">
                  {restaurant.name}
                </h1>
                {restaurant.address && (
                  <p className="text-[11px] text-slate-500 line-clamp-1">{restaurant.address}</p>
                )}
              </div>
            </div>

            {/* Table Badge */}
            {activeTable ? (
              <div className="bg-emerald-50 border border-emerald-200/80 px-3 py-1.5 rounded-xl text-right">
                <span className="text-[10px] font-semibold text-emerald-600 block uppercase tracking-wider">
                  Dining At
                </span>
                <span className="font-black text-xs sm:text-sm text-emerald-950 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  {activeTable.name}
                </span>
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-200/80 px-2.5 py-1.5 rounded-xl text-right">
                <span className="text-[10px] font-semibold text-amber-700 block">View Mode</span>
                <span className="text-xs font-bold text-amber-900">No Table QR</span>
              </div>
            )}
          </div>
        </div>

        {/* Warning if no table token */}
        {!isTableValid && (
          <div className="bg-amber-50 border-t border-amber-200 px-4 py-2 text-center text-xs text-amber-900 flex items-center justify-center gap-1.5">
            <Info className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>
              You are viewing in preview mode. To place an order, please scan the QR code at your table.
            </span>
          </div>
        )}
      </div>

      {/* Search & Sticky Category Pills */}
      <div className="max-w-2xl mx-auto px-4 pt-4 space-y-3">
        {/* Search */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            placeholder="Search food, drinks, or ingredients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs sm:text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

        {/* Categories Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setActiveCategory('ALL')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
              activeCategory === 'ALL'
                ? 'bg-orange-500 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-100'
            }`}
          >
            All Items
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveCategory(c.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                activeCategory === c.id
                  ? 'bg-orange-500 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-100'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Menu Categories & Items List */}
      <div className="max-w-2xl mx-auto px-4 mt-6 space-y-8">
        {filteredCategories.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-10 text-center">
            <UtensilsCrossed className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">No items found matching your search</p>
            <button
              onClick={() => {
                setSearchQuery('');
                setActiveCategory('ALL');
              }}
              className="mt-3 text-xs font-semibold text-orange-600 underline"
            >
              Clear filters
            </button>
          </div>
        ) : (
          filteredCategories.map((cat) => (
            <div key={cat.id} className="space-y-3">
              <h2 className="font-extrabold text-slate-900 text-lg tracking-tight flex items-center gap-2">
                <span>{cat.name}</span>
                <span className="text-xs font-normal text-slate-400">({cat.menuItems?.length || 0})</span>
              </h2>

              <div className="space-y-3">
                {cat.menuItems?.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleOpenItem(item)}
                    className={`bg-white rounded-2xl border p-3.5 sm:p-4 transition flex gap-3.5 items-center justify-between cursor-pointer ${
                      item.isAvailable
                        ? 'border-slate-200/80 shadow-xs hover:border-orange-300 hover:shadow-sm'
                        : 'border-slate-200 bg-slate-50/70 opacity-70 cursor-not-allowed'
                    }`}
                  >
                    {/* Item info */}
                    <div className="flex-1 pr-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-900 text-sm sm:text-base leading-snug">
                          {item.name}
                        </h3>
                        {!item.isAvailable && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-700">
                            Sold Out
                          </span>
                        )}
                      </div>

                      {item.description && (
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                          {item.description}
                        </p>
                      )}

                      <div className="mt-2.5 flex items-center gap-3">
                        <span className="font-black text-sm sm:text-base text-slate-900">
                          {currency}{item.price.toFixed(2)}
                        </span>

                        {item.optionGroups && item.optionGroups.length > 0 && item.isAvailable && (
                          <span className="text-[11px] font-semibold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md">
                            Customizable
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Image and Add Button */}
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      {item.imageUrl && (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl object-cover bg-slate-100 shadow-xs"
                          loading="lazy"
                        />
                      )}

                      {item.isAvailable ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenItem(item);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs shadow-xs flex items-center gap-1 transition"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Add
                        </button>
                      ) : (
                        <span className="text-[11px] font-semibold text-slate-400 py-1">
                          Unavailable
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Item Customization Modal */}
      {selectedItemForModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-200">
            {/* Modal Header */}
            <div className="relative">
              {selectedItemForModal.imageUrl && (
                <div className="h-44 sm:h-52 w-full bg-slate-100 overflow-hidden">
                  <img
                    src={selectedItemForModal.imageUrl}
                    alt={selectedItemForModal.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <button
                onClick={() => setSelectedItemForModal(null)}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 flex-1 overflow-y-auto space-y-5">
              <div>
                <h3 className="font-extrabold text-xl text-slate-900">
                  {selectedItemForModal.name}
                </h3>
                {selectedItemForModal.description && (
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    {selectedItemForModal.description}
                  </p>
                )}
                <div className="mt-2 text-base font-black text-orange-600">
                  Base price: {currency}{selectedItemForModal.price.toFixed(2)}
                </div>
              </div>

              {modalError && (
                <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              {/* Option Groups */}
              {selectedItemForModal.optionGroups && selectedItemForModal.optionGroups.length > 0 && (
                <div className="space-y-4 pt-2 border-t border-slate-100">
                  {selectedItemForModal.optionGroups.map((group) => {
                    const selected = selectedOptionsMap[group.id] || [];
                    return (
                      <div key={group.id} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-sm text-slate-900">
                            {group.name}
                          </h4>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            group.isRequired
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-slate-100 text-slate-500'
                          }`}>
                            {group.isRequired ? 'Required' : 'Optional'}
                          </span>
                        </div>

                        {/* Choices */}
                        <div className="space-y-1.5">
                          {group.choices.map((choice) => {
                            const isChecked = selected.includes(choice.name);

                            return (
                              <label
                                key={choice.id}
                                onClick={() => {
                                  if (group.allowMultiple) {
                                    // Toggle choice in multi-select
                                    setSelectedOptionsMap((prev) => {
                                      const current = prev[group.id] || [];
                                      const updated = isChecked
                                        ? current.filter((n) => n !== choice.name)
                                        : [...current, choice.name];
                                      return { ...prev, [group.id]: updated };
                                    });
                                  } else {
                                    // Single choice radio
                                    setSelectedOptionsMap((prev) => ({
                                      ...prev,
                                      [group.id]: [choice.name],
                                    }));
                                  }
                                }}
                                className={`flex items-center justify-between p-3 rounded-xl border text-xs sm:text-sm cursor-pointer transition ${
                                  isChecked
                                    ? 'border-orange-500 bg-orange-50/50 text-slate-900 font-semibold'
                                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                                }`}
                              >
                                <div className="flex items-center gap-2.5">
                                  <div
                                    className={`w-4 h-4 rounded-${group.allowMultiple ? 'md' : 'full'} border flex items-center justify-center ${
                                      isChecked
                                        ? 'bg-orange-500 border-orange-500 text-white'
                                        : 'border-slate-300'
                                    }`}
                                  >
                                    {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                                  </div>
                                  <span>{choice.name}</span>
                                </div>

                                {choice.price > 0 && (
                                  <span className="text-xs font-semibold text-slate-500">
                                    +{currency}{choice.price.toFixed(2)}
                                  </span>
                                )}
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Quantity Counter */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="font-bold text-sm text-slate-800">Quantity</span>
                <div className="flex items-center gap-3 bg-slate-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setModalQuantity(Math.max(1, modalQuantity - 1))}
                    className="w-8 h-8 rounded-lg bg-white text-slate-700 flex items-center justify-center shadow-xs hover:bg-slate-50 disabled:opacity-40"
                    disabled={modalQuantity <= 1}
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="font-black text-sm min-w-[20px] text-center">
                    {modalQuantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setModalQuantity(modalQuantity + 1)}
                    className="w-8 h-8 rounded-lg bg-white text-slate-700 flex items-center justify-center shadow-xs hover:bg-slate-50"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Bottom Button */}
            <div className="p-4 bg-slate-50 border-t border-slate-100">
              <button
                type="button"
                onClick={handleAddToCart}
                className="w-full py-3.5 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-sm shadow-md shadow-orange-500/20 flex items-center justify-between transition"
              >
                <span>Add to Order</span>
                <span>{currency}{calculatedModalItemPrice.toFixed(2)}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Cart Button (when cart has items) */}
      {cartItemCount > 0 && !isCartOpen && (
        <div className="fixed bottom-4 inset-x-0 z-40 px-4">
          <div className="max-w-md mx-auto">
            <button
              onClick={() => setIsCartOpen(true)}
              className="w-full py-3.5 px-5 rounded-2xl bg-slate-900 text-white shadow-xl shadow-slate-900/30 flex items-center justify-between transition hover:scale-[1.01] active:scale-[0.99]"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-orange-500 text-white font-extrabold text-xs flex items-center justify-center">
                  {cartItemCount}
                </div>
                <span className="font-bold text-sm">View Cart</span>
              </div>
              <div className="flex items-center gap-1.5 font-black text-base">
                <span>{currency}{cartTotal.toFixed(2)}</span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Cart Drawer & Checkout Sheet */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end justify-center p-0">
          <div className="bg-white rounded-t-3xl max-w-lg w-full max-h-[92vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-200">
            {/* Cart Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-orange-500" />
                <h3 className="font-extrabold text-lg text-slate-900">Your Cart</h3>
                <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">
                  {cartItemCount} items
                </span>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Cart Items List */}
            <div className="p-4 flex-1 overflow-y-auto space-y-4">
              {cart.map((item) => (
                <div
                  key={item.id}
                  className="bg-slate-50 rounded-2xl p-3 border border-slate-200/80 flex items-start justify-between gap-3"
                >
                  <div className="flex-1">
                    <h4 className="font-bold text-sm text-slate-900">{item.name}</h4>
                    {item.selectedOptions && item.selectedOptions.length > 0 && (
                      <div className="mt-1 space-y-0.5">
                        {item.selectedOptions.map((opt, idx) => (
                          <div key={idx} className="text-xs text-slate-500 flex items-center gap-1">
                            <span className="text-orange-500">•</span>
                            <span>{opt.groupName}: {opt.choiceName}</span>
                            {opt.price > 0 && <span>(+{currency}{opt.price.toFixed(2)})</span>}
                          </div>
                        ))}
                      </div>
                    )}
                    <span className="font-extrabold text-xs text-slate-900 block mt-1.5">
                      {currency}{item.subtotal.toFixed(2)}
                    </span>
                  </div>

                  {/* Quantity adjustment */}
                  <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-xl border border-slate-200 shadow-xs">
                    <button
                      onClick={() => updateCartQuantity(item.id, -1)}
                      className="text-slate-500 hover:text-slate-800"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-xs font-black min-w-[16px] text-center">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateCartQuantity(item.id, 1)}
                      className="text-slate-500 hover:text-slate-800"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              {/* Customer Name and Note Inputs */}
              <div className="space-y-3 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Your Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Enter customer name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Special Note / Food Allergies (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Extra napkins, no ice in lemonade"
                    value={customerNote}
                    onChange={(e) => setCustomerNote(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              {/* Pay at Counter Notice */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2.5 text-xs text-amber-900">
                <DollarSign className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold block">Payment Method: Pay at Counter (Cash)</strong>
                  <span>Your order goes straight to the kitchen. You can pay with cash at the counter after ordering.</span>
                </div>
              </div>

              {orderError && (
                <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
                  <span>{orderError}</span>
                </div>
              )}
            </div>

            {/* Cart Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-slate-600">Total Amount</span>
                <span className="font-black text-xl text-slate-900">
                  {currency}{cartTotal.toFixed(2)}
                </span>
              </div>

              <button
                type="button"
                onClick={handlePlaceOrder}
                disabled={submittingOrder || !isTableValid}
                className="w-full py-3.5 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-sm shadow-md shadow-orange-500/20 flex items-center justify-center gap-2 transition disabled:opacity-50"
              >
                {submittingOrder ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Submitting to Kitchen...
                  </>
                ) : !isTableValid ? (
                  'Scan Table QR to Order'
                ) : (
                  <>
                    Place Order Now <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
