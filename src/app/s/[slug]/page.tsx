'use client';

import { useState, useEffect, useMemo } from 'react';
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
  ArrowRight,
  Info,
  DollarSign,
  ChevronRight,
  Loader2,
  Sparkles,
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
      <div className="min-h-screen bg-[#FAF9F6] flex flex-col items-center justify-center p-6 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-stone-600 mb-3" />
        <p className="text-xs uppercase tracking-widest font-semibold text-stone-500 font-sans">
          Preparing Menu
        </p>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-stone-100 border border-stone-200 text-stone-600 flex items-center justify-center mx-auto mb-4">
          <UtensilsCrossed className="w-5 h-5" />
        </div>
        <h1 className="font-serif text-2xl font-semibold text-stone-900">Restaurant Not Found</h1>
        <p className="text-sm text-stone-500 mt-2 max-w-sm">
          The menu link you followed is inactive or unavailable. Please scan the QR code at your table again.
        </p>
      </div>
    );
  }

  const currency = restaurant.currency || '$';

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-stone-900 pb-32">
      {/* Editorial Restaurant Header */}
      <header className="bg-white border-b border-stone-200/80 sticky top-0 z-30 shadow-subtle">
        <div className="max-w-2xl mx-auto px-4 py-3.5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {restaurant.logoUrl ? (
                <img
                  src={restaurant.logoUrl}
                  alt={restaurant.name}
                  className="w-10 h-10 rounded-full object-cover border border-stone-200/90 shadow-subtle flex-shrink-0"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-stone-900 text-stone-100 flex items-center justify-center flex-shrink-0">
                  <UtensilsCrossed className="w-4 h-4" />
                </div>
              )}
              <div className="min-w-0">
                <h1 className="font-serif font-bold text-stone-900 text-base sm:text-lg tracking-tight truncate leading-tight">
                  {restaurant.name}
                </h1>
                {restaurant.address && (
                  <p className="text-[11px] text-stone-500 truncate leading-snug">{restaurant.address}</p>
                )}
              </div>
            </div>

            {/* Table Badge - Brass marker style */}
            {activeTable ? (
              <div className="flex-shrink-0 bg-stone-100 border border-stone-300/80 px-3 py-1.5 rounded-lg text-right">
                <span className="text-[9px] font-semibold text-stone-500 block uppercase tracking-wider">
                  Table
                </span>
                <span className="font-sans font-bold text-xs sm:text-sm text-stone-900 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 inline-block" />
                  {activeTable.name}
                </span>
              </div>
            ) : (
              <div className="flex-shrink-0 bg-amber-50/80 border border-amber-200/80 px-2.5 py-1 rounded-lg text-right">
                <span className="text-[9px] font-semibold text-amber-800 block uppercase tracking-wider">Preview</span>
                <span className="text-xs font-medium text-amber-950">No Table QR</span>
              </div>
            )}
          </div>
        </div>

        {/* Warning banner when previewing without table token */}
        {!isTableValid && (
          <div className="bg-stone-100/90 border-t border-stone-200/80 px-4 py-2 text-center text-xs text-stone-600 flex items-center justify-center gap-2">
            <Info className="w-3.5 h-3.5 text-stone-500 flex-shrink-0" />
            <span>You are viewing in preview mode. Scan your table QR code to place an order.</span>
          </div>
        )}
      </header>

      {/* Category Pills & Search Toolbar */}
      <div className="max-w-2xl mx-auto px-4 pt-4 space-y-3">
        {/* Search */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            placeholder="Search menu items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-stone-200/90 rounded-lg text-xs sm:text-sm placeholder-stone-400 text-stone-900 shadow-subtle focus:outline-none focus:border-stone-400 focus:ring-1 focus:ring-stone-400 transition"
          />
        </div>

        {/* Categories Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          <button
            onClick={() => setActiveCategory('ALL')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${
              activeCategory === 'ALL'
                ? 'bg-stone-900 text-white shadow-subtle'
                : 'bg-white text-stone-600 border border-stone-200 hover:text-stone-900 hover:bg-stone-50'
            }`}
          >
            All Dishes
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveCategory(c.id)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${
                activeCategory === c.id
                  ? 'bg-stone-900 text-white shadow-subtle'
                  : 'bg-white text-stone-600 border border-stone-200 hover:text-stone-900 hover:bg-stone-50'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Dishes List */}
      <main className="max-w-2xl mx-auto px-4 mt-6 space-y-8">
        {filteredCategories.length === 0 ? (
          <div className="bg-white rounded-xl border border-stone-200 p-12 text-center">
            <p className="font-serif text-base text-stone-800">No dishes match your search</p>
            <p className="text-xs text-stone-500 mt-1">Try another keyword or browse all categories.</p>
            <button
              onClick={() => {
                setSearchQuery('');
                setActiveCategory('ALL');
              }}
              className="mt-4 text-xs font-semibold text-stone-900 underline underline-offset-4"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          filteredCategories.map((cat) => (
            <section key={cat.id} className="space-y-3">
              <div className="flex items-baseline justify-between border-b border-stone-200 pb-2">
                <h2 className="font-serif text-lg sm:text-xl font-bold text-stone-900 tracking-tight">
                  {cat.name}
                </h2>
                <span className="text-xs text-stone-400 font-sans">
                  {cat.menuItems?.length || 0} {cat.menuItems?.length === 1 ? 'item' : 'items'}
                </span>
              </div>

              <div className="space-y-3">
                {cat.menuItems?.map((item) => (
                  <article
                    key={item.id}
                    onClick={() => handleOpenItem(item)}
                    className={`bg-white rounded-xl border p-4 transition flex gap-4 items-center justify-between cursor-pointer ${
                      item.isAvailable
                        ? 'border-stone-200/90 shadow-subtle hover:border-stone-300 hover:shadow-card'
                        : 'border-stone-200 bg-stone-50/60 opacity-60 cursor-not-allowed'
                    }`}
                  >
                    {/* Item Information */}
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-serif text-base font-bold text-stone-900 leading-snug">
                          {item.name}
                        </h3>
                        {!item.isAvailable && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-stone-200 text-stone-700">
                            Sold Out
                          </span>
                        )}
                      </div>

                      {item.description && (
                        <p className="text-xs sm:text-sm text-stone-600 mt-1 line-clamp-2 leading-relaxed">
                          {item.description}
                        </p>
                      )}

                      <div className="mt-3 flex items-center gap-2.5">
                        <span className="font-sans font-semibold text-sm sm:text-base text-stone-900">
                          {currency}{item.price.toFixed(2)}
                        </span>

                        {item.optionGroups && item.optionGroups.length > 0 && item.isAvailable && (
                          <span className="text-[10px] uppercase tracking-wider font-medium text-stone-600 bg-stone-100 border border-stone-200/80 px-2 py-0.5 rounded">
                            Customizable
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Image & Action Button */}
                    <div className="flex flex-col items-end gap-2.5 flex-shrink-0">
                      {item.imageUrl && (
                        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg overflow-hidden border border-stone-200/80 bg-stone-100 shadow-subtle">
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        </div>
                      )}

                      {item.isAvailable ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenItem(item);
                          }}
                          className="px-3.5 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-white font-medium text-xs shadow-subtle flex items-center gap-1 transition"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Add
                        </button>
                      ) : (
                        <span className="text-[11px] font-medium text-stone-400 py-1">
                          Unavailable
                        </span>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))
        )}
      </main>

      {/* Item Customization Modal */}
      {selectedItemForModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-float overflow-hidden">
            {/* Modal Image Header */}
            <div className="relative">
              {selectedItemForModal.imageUrl && (
                <div className="h-44 sm:h-52 w-full bg-stone-100 overflow-hidden">
                  <img
                    src={selectedItemForModal.imageUrl}
                    alt={selectedItemForModal.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <button
                onClick={() => setSelectedItemForModal(null)}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-stone-900/70 text-white flex items-center justify-center hover:bg-stone-900 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 flex-1 overflow-y-auto space-y-5">
              <div>
                <h3 className="font-serif font-bold text-xl text-stone-900">
                  {selectedItemForModal.name}
                </h3>
                {selectedItemForModal.description && (
                  <p className="text-xs sm:text-sm text-stone-600 mt-1 leading-relaxed">
                    {selectedItemForModal.description}
                  </p>
                )}
                <div className="mt-2 text-sm font-semibold text-stone-900">
                  Base Price: {currency}{selectedItemForModal.price.toFixed(2)}
                </div>
              </div>

              {modalError && (
                <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              {/* Option Groups */}
              {selectedItemForModal.optionGroups && selectedItemForModal.optionGroups.length > 0 && (
                <div className="space-y-4 pt-3 border-t border-stone-200">
                  {selectedItemForModal.optionGroups.map((group) => {
                    const selected = selectedOptionsMap[group.id] || [];
                    return (
                      <div key={group.id} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="font-serif font-semibold text-sm text-stone-900">
                            {group.name}
                          </h4>
                          <span className={`text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded ${
                            group.isRequired
                              ? 'bg-amber-100/80 text-amber-900'
                              : 'bg-stone-100 text-stone-600'
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
                                    setSelectedOptionsMap((prev) => {
                                      const current = prev[group.id] || [];
                                      const updated = isChecked
                                        ? current.filter((n) => n !== choice.name)
                                        : [...current, choice.name];
                                      return { ...prev, [group.id]: updated };
                                    });
                                  } else {
                                    setSelectedOptionsMap((prev) => ({
                                      ...prev,
                                      [group.id]: [choice.name],
                                    }));
                                  }
                                }}
                                className={`flex items-center justify-between p-3 rounded-lg border text-xs sm:text-sm cursor-pointer transition ${
                                  isChecked
                                    ? 'border-stone-900 bg-stone-50 text-stone-900 font-medium'
                                    : 'border-stone-200 bg-white text-stone-700 hover:border-stone-300'
                                }`}
                              >
                                <div className="flex items-center gap-2.5">
                                  <div
                                    className={`w-4 h-4 rounded-${group.allowMultiple ? 'sm' : 'full'} border flex items-center justify-center ${
                                      isChecked
                                        ? 'bg-stone-900 border-stone-900 text-white'
                                        : 'border-stone-300'
                                    }`}
                                  >
                                    {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                                  </div>
                                  <span>{choice.name}</span>
                                </div>

                                {choice.price > 0 && (
                                  <span className="text-xs font-semibold text-stone-600">
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
              <div className="pt-3 border-t border-stone-200 flex items-center justify-between">
                <span className="font-serif font-semibold text-sm text-stone-900">Quantity</span>
                <div className="flex items-center gap-2.5 bg-stone-100 p-1 rounded-lg border border-stone-200">
                  <button
                    type="button"
                    onClick={() => setModalQuantity(Math.max(1, modalQuantity - 1))}
                    className="w-7 h-7 rounded bg-white text-stone-700 flex items-center justify-center shadow-subtle hover:bg-stone-50 disabled:opacity-40"
                    disabled={modalQuantity <= 1}
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="font-sans font-bold text-sm min-w-[20px] text-center">
                    {modalQuantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setModalQuantity(modalQuantity + 1)}
                    className="w-7 h-7 rounded bg-white text-stone-700 flex items-center justify-center shadow-subtle hover:bg-stone-50"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Bottom CTA */}
            <div className="p-4 bg-stone-50 border-t border-stone-200">
              <button
                type="button"
                onClick={handleAddToCart}
                className="w-full py-3 px-4 rounded-lg bg-stone-900 hover:bg-stone-800 text-white font-medium text-sm shadow-subtle flex items-center justify-between transition"
              >
                <span>Add to Order</span>
                <span className="font-bold">{currency}{calculatedModalItemPrice.toFixed(2)}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Cart Button (when items are in cart) */}
      {cartItemCount > 0 && !isCartOpen && (
        <div className="fixed bottom-5 inset-x-0 z-40 px-4 pointer-events-none">
          <div className="max-w-md mx-auto pointer-events-auto">
            <button
              onClick={() => setIsCartOpen(true)}
              className="w-full py-3.5 px-5 rounded-xl bg-stone-900 text-white shadow-float flex items-center justify-between transition hover:bg-stone-800"
            >
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-white text-stone-900 font-bold text-xs flex items-center justify-center">
                  {cartItemCount}
                </span>
                <span className="font-medium text-sm">View Order</span>
              </div>
              <div className="flex items-center gap-1.5 font-bold text-base">
                <span>{currency}{cartTotal.toFixed(2)}</span>
                <ChevronRight className="w-4 h-4 text-stone-400" />
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Cart Drawer & Checkout Sheet */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-end justify-center p-0">
          <div className="bg-white rounded-t-2xl max-w-lg w-full max-h-[92vh] flex flex-col shadow-float animate-in slide-in-from-bottom duration-200">
            {/* Cart Header */}
            <div className="p-4 border-b border-stone-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-stone-700" />
                <h3 className="font-serif font-bold text-base sm:text-lg text-stone-900">Your Order</h3>
                <span className="text-xs bg-stone-100 text-stone-600 px-2 py-0.5 rounded font-medium">
                  {cartItemCount} {cartItemCount === 1 ? 'item' : 'items'}
                </span>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="p-1 text-stone-400 hover:text-stone-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Cart Items List */}
            <div className="p-4 flex-1 overflow-y-auto space-y-3">
              {cart.map((item) => (
                <div
                  key={item.id}
                  className="bg-stone-50 rounded-lg p-3 border border-stone-200 flex items-start justify-between gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <h4 className="font-serif font-semibold text-sm text-stone-900">{item.name}</h4>
                    {item.selectedOptions && item.selectedOptions.length > 0 && (
                      <div className="mt-1 space-y-0.5">
                        {item.selectedOptions.map((opt, idx) => (
                          <div key={idx} className="text-xs text-stone-500 flex items-center gap-1">
                            <span className="text-stone-400">•</span>
                            <span>{opt.groupName}: {opt.choiceName}</span>
                            {opt.price > 0 && <span>(+{currency}{opt.price.toFixed(2)})</span>}
                          </div>
                        ))}
                      </div>
                    )}
                    <span className="font-sans font-semibold text-xs text-stone-900 block mt-1.5">
                      {currency}{item.subtotal.toFixed(2)}
                    </span>
                  </div>

                  {/* Quantity adjustments */}
                  <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-md border border-stone-200 shadow-subtle">
                    <button
                      onClick={() => updateCartQuantity(item.id, -1)}
                      className="text-stone-500 hover:text-stone-900"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-xs font-bold min-w-[16px] text-center">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateCartQuantity(item.id, 1)}
                      className="text-stone-500 hover:text-stone-900"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}

              {/* Customer Inputs */}
              <div className="space-y-3 pt-2">
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">
                    Your Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sarah"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-3 py-2 border border-stone-200 rounded-lg text-xs sm:text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:border-stone-400 focus:ring-1 focus:ring-stone-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">
                    Dietary Notes / Requests (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Dressing on the side, extra ice"
                    value={customerNote}
                    onChange={(e) => setCustomerNote(e.target.value)}
                    className="w-full px-3 py-2 border border-stone-200 rounded-lg text-xs sm:text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:border-stone-400 focus:ring-1 focus:ring-stone-400"
                  />
                </div>
              </div>

              {/* Pay at Counter Notice */}
              <div className="bg-amber-50/70 border border-amber-200/80 rounded-lg p-3 flex items-start gap-2.5 text-xs text-amber-950">
                <DollarSign className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="font-semibold block">Payment: Pay at Counter</strong>
                  <span className="text-amber-900/90 leading-relaxed">
                    Your order will be sent directly to the kitchen. You can pay with cash or card at the counter when ready.
                  </span>
                </div>
              </div>

              {orderError && (
                <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  <span>{orderError}</span>
                </div>
              )}
            </div>

            {/* Cart Footer */}
            <div className="p-4 bg-stone-50 border-t border-stone-200 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-stone-600">Total</span>
                <span className="font-serif font-bold text-xl text-stone-900">
                  {currency}{cartTotal.toFixed(2)}
                </span>
              </div>

              <button
                type="button"
                onClick={handlePlaceOrder}
                disabled={submittingOrder || !isTableValid}
                className="w-full py-3.5 px-4 rounded-lg bg-stone-900 hover:bg-stone-800 text-white font-medium text-sm shadow-subtle flex items-center justify-center gap-2 transition disabled:opacity-50"
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
