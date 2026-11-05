'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { ChefHat, Volume2, VolumeX, RefreshCw, Clock, CheckCircle2, Flame, Bell, User, MessageSquare, AlertTriangle, DollarSign } from 'lucide-react';
import { Order, OrderStatus } from '@/types';
import { playOrderChime } from '@/lib/audio';

export default function KitchenDashboardPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [currency, setCurrency] = useState('$');
  const [loading, setLoading] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'ACTIVE' | OrderStatus>('ACTIVE');
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Keep track of known order IDs to play sound only for genuinely new orders
  const knownOrderIdsRef = useRef<Set<string>>(new Set());
  const initialLoadDoneRef = useRef(false);

  // Fetch orders from API
  const fetchOrders = useCallback(async (isBackground = false) => {
    try {
      if (!isBackground) setLoading(true);
      const res = await fetch('/api/orders');
      if (!res.ok) return;

      const data = await res.json();
      const fetchedOrders: Order[] = data.orders || [];
      setCurrency(data.currency || '$');

      if (fetchedOrders.length > 0 && !restaurantId) {
        setRestaurantId(fetchedOrders[0].restaurantId);
      }

      // Check for incoming new orders to trigger chime
      if (initialLoadDoneRef.current && soundEnabled) {
        const hasBrandNewOrder = fetchedOrders.some(
          (o) => !knownOrderIdsRef.current.has(o.id) && o.status === 'NEW'
        );
        if (hasBrandNewOrder) {
          playOrderChime();
        }
      }

      // Update known order IDs
      fetchedOrders.forEach((o) => knownOrderIdsRef.current.add(o.id));
      initialLoadDoneRef.current = true;

      setOrders(fetchedOrders);
    } catch (err) {
      console.error('Failed to fetch orders:', err);
    } finally {
      if (!isBackground) setLoading(false);
    }
  }, [soundEnabled, restaurantId]);

  // Initial load
  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Periodic polling fallback (every 3.5s) to guarantee updates
  useEffect(() => {
    const interval = setInterval(() => {
      fetchOrders(true);
    }, 3500);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  // Real-time Server-Sent Events (SSE) connection
  useEffect(() => {
    let eventSource: EventSource | null = null;

    const setupSSE = async () => {
      // Get current restaurant ID if not already cached
      let targetRestaurantId = restaurantId;
      if (!targetRestaurantId) {
        try {
          const meRes = await fetch('/api/auth/me');
          if (meRes.ok) {
            const meData = await meRes.json();
            targetRestaurantId = meData?.user?.restaurant?.id;
            if (targetRestaurantId) setRestaurantId(targetRestaurantId);
          }
        } catch {}
      }

      if (!targetRestaurantId) return;

      eventSource = new EventSource(`/api/events?restaurantId=${targetRestaurantId}`);

      eventSource.addEventListener('order:created', (e: any) => {
        try {
          const eventData = JSON.parse(e.data);
          if (soundEnabled) playOrderChime();
          fetchOrders(true);
        } catch (err) {
          console.error('Error handling SSE event:', err);
        }
      });

      eventSource.addEventListener('order:updated', () => {
        fetchOrders(true);
      });
    };

    setupSSE();

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [restaurantId, soundEnabled, fetchOrders]);

  // Handle status update
  const handleUpdateStatus = async (orderId: string, nextStatus: OrderStatus) => {
    setActionLoadingId(orderId);
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) {
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, status: nextStatus } : o))
        );
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handle mark payment paid
  const handleMarkPaid = async (orderId: string) => {
    setActionLoadingId(orderId);
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentStatus: 'PAID' }),
      });
      if (res.ok) {
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, paymentStatus: 'PAID' } : o))
        );
      }
    } catch (err) {
      console.error('Failed to mark paid:', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Filter orders based on active tab
  const filteredOrders = orders.filter((o) => {
    if (statusFilter === 'ACTIVE') {
      return o.status === 'NEW' || o.status === 'PREPARING' || o.status === 'READY';
    }
    return o.status === statusFilter;
  });

  // Calculate counts for badges
  const counts = {
    active: orders.filter((o) => o.status === 'NEW' || o.status === 'PREPARING' || o.status === 'READY').length,
    new: orders.filter((o) => o.status === 'NEW').length,
    preparing: orders.filter((o) => o.status === 'PREPARING').length,
    ready: orders.filter((o) => o.status === 'READY').length,
    completed: orders.filter((o) => o.status === 'COMPLETED').length,
  };

  // Helper for elapsed time
  const getElapsedMins = (createdAt: string) => {
    const elapsedMs = Date.now() - new Date(createdAt).getTime();
    return Math.floor(elapsedMs / 60000);
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Audio controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
              <ChefHat className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                Live Kitchen Display System
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 animate-pulse">
                  ● Real-time
                </span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-500">
                Incoming orders appear instantly with automatic sound alerts.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              playOrderChime();
            }}
            className="px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition flex items-center gap-1.5"
            title="Test audio chime"
          >
            <Bell className="w-3.5 h-3.5 text-slate-500" />
            Test Chime
          </button>

          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`px-3 py-2 text-xs font-semibold rounded-xl transition flex items-center gap-1.5 border ${
              soundEnabled
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
            }`}
          >
            {soundEnabled ? (
              <>
                <Volume2 className="w-4 h-4 text-emerald-600" />
                Sound Alerts ON
              </>
            ) : (
              <>
                <VolumeX className="w-4 h-4 text-rose-600" />
                Sound Muted
              </>
            )}
          </button>

          <button
            onClick={() => fetchOrders()}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
            title="Refresh Orders"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setStatusFilter('ACTIVE')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 whitespace-nowrap transition ${
            statusFilter === 'ACTIVE'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
          }`}
        >
          <span>All Active</span>
          <span className={`px-1.5 py-0.5 rounded-full text-xs ${statusFilter === 'ACTIVE' ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-600'}`}>
            {counts.active}
          </span>
        </button>

        <button
          onClick={() => setStatusFilter('NEW')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 whitespace-nowrap transition ${
            statusFilter === 'NEW'
              ? 'bg-amber-500 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
          }`}
        >
          <span>New Orders</span>
          <span className={`px-1.5 py-0.5 rounded-full text-xs ${statusFilter === 'NEW' ? 'bg-amber-600 text-white' : 'bg-amber-100 text-amber-700'}`}>
            {counts.new}
          </span>
        </button>

        <button
          onClick={() => setStatusFilter('PREPARING')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 whitespace-nowrap transition ${
            statusFilter === 'PREPARING'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
          }`}
        >
          <span>Preparing</span>
          <span className={`px-1.5 py-0.5 rounded-full text-xs ${statusFilter === 'PREPARING' ? 'bg-blue-700 text-white' : 'bg-blue-100 text-blue-700'}`}>
            {counts.preparing}
          </span>
        </button>

        <button
          onClick={() => setStatusFilter('READY')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 whitespace-nowrap transition ${
            statusFilter === 'READY'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
          }`}
        >
          <span>Ready for Pickup</span>
          <span className={`px-1.5 py-0.5 rounded-full text-xs ${statusFilter === 'READY' ? 'bg-emerald-700 text-white' : 'bg-emerald-100 text-emerald-700'}`}>
            {counts.ready}
          </span>
        </button>

        <button
          onClick={() => setStatusFilter('COMPLETED')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 whitespace-nowrap transition ${
            statusFilter === 'COMPLETED'
              ? 'bg-slate-700 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
          }`}
        >
          <span>Completed History</span>
          <span className={`px-1.5 py-0.5 rounded-full text-xs ${statusFilter === 'COMPLETED' ? 'bg-slate-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
            {counts.completed}
          </span>
        </button>
      </div>

      {/* Orders Grid */}
      {loading ? (
        <div className="py-20 text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-orange-500 mx-auto mb-3" />
          <p className="text-sm text-slate-500">Loading orders...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center">
          <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <ChefHat className="w-7 h-7" />
          </div>
          <h3 className="font-bold text-slate-800 text-base">No {statusFilter === 'ACTIVE' ? 'active' : statusFilter.toLowerCase()} orders right now</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            When customers scan a table QR code and place an order, it will appear here in real time.
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredOrders.map((order) => {
            const elapsedMins = getElapsedMins(order.createdAt);
            const isFresh = elapsedMins < 5;
            const isMedium = elapsedMins >= 5 && elapsedMins < 15;
            const isUrgent = elapsedMins >= 15;

            return (
              <div
                key={order.id}
                className={`bg-white rounded-2xl border shadow-sm transition flex flex-col justify-between overflow-hidden ${
                  order.status === 'NEW'
                    ? 'border-amber-400 ring-2 ring-amber-400/20'
                    : order.status === 'PREPARING'
                    ? 'border-blue-400'
                    : order.status === 'READY'
                    ? 'border-emerald-400'
                    : 'border-slate-200'
                }`}
              >
                {/* Order Top Bar */}
                <div className="p-4 border-b border-slate-100 bg-slate-50/60">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-lg text-slate-900 tracking-tight">
                        #{order.orderNumber}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-lg bg-slate-900 text-white font-bold text-xs tracking-wide">
                        {order.table?.name || 'Table'}
                      </span>
                    </div>

                    {/* Status Badge */}
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                        order.status === 'NEW'
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : order.status === 'PREPARING'
                          ? 'bg-blue-100 text-blue-800 border border-blue-300'
                          : order.status === 'READY'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : order.status === 'CANCELLED'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {order.status}
                    </span>
                  </div>

                  {/* Customer info & Timer */}
                  <div className="mt-2.5 flex items-center justify-between text-xs text-slate-600">
                    <div className="flex items-center gap-1.5 font-medium">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>{order.customerName}</span>
                    </div>

                    <div
                      className={`flex items-center gap-1 font-semibold px-2 py-0.5 rounded-full ${
                        isUrgent
                          ? 'bg-rose-100 text-rose-700'
                          : isMedium
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      <Clock className="w-3 h-3" />
                      <span>{elapsedMins === 0 ? 'Just now' : `${elapsedMins}m ago`}</span>
                    </div>
                  </div>

                  {/* Customer Note */}
                  {order.customerNote && (
                    <div className="mt-2.5 bg-amber-50 border border-amber-200/80 rounded-xl p-2.5 text-xs text-amber-900 flex items-start gap-2">
                      <MessageSquare className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <strong className="font-semibold block text-[11px] text-amber-700 uppercase">Customer Note:</strong>
                        <span>{order.customerNote}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Items List */}
                <div className="p-4 flex-1 space-y-3">
                  {order.items.map((item) => {
                    let parsedOptions: any[] = [];
                    if (item.selectedOptions) {
                      try {
                        parsedOptions = JSON.parse(item.selectedOptions);
                      } catch {}
                    }

                    return (
                      <div key={item.id} className="text-sm">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-2">
                            <span className="font-black text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded text-xs min-w-[24px] text-center">
                              {item.quantity}×
                            </span>
                            <div>
                              <span className="font-semibold text-slate-900">{item.itemName}</span>
                              {parsedOptions.length > 0 && (
                                <div className="mt-0.5 space-y-0.5">
                                  {parsedOptions.map((opt, idx) => (
                                    <div key={idx} className="text-xs text-slate-500 flex items-center gap-1">
                                      <span className="text-orange-500 font-bold">•</span>
                                      <span>{opt.groupName}: <strong className="text-slate-700">{opt.choiceName}</strong></span>
                                      {opt.price > 0 && <span className="text-slate-400">({currency}{opt.price.toFixed(2)})</span>}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                          <span className="text-xs font-semibold text-slate-500 whitespace-nowrap ml-2">
                            {currency}{item.subtotal.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Order Footer & Actions */}
                <div className="p-4 bg-slate-50/80 border-t border-slate-100 space-y-3">
                  {/* Total and Payment Status */}
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5 text-slate-500" />
                      {order.paymentStatus === 'PAID' ? (
                        <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          ✓ Cash Paid
                        </span>
                      ) : (
                        <button
                          onClick={() => handleMarkPaid(order.id)}
                          className="font-semibold text-amber-800 bg-amber-100 hover:bg-amber-200 px-2 py-0.5 rounded-full border border-amber-300 transition"
                          title="Click to mark as paid at counter"
                        >
                          💵 Pay at Counter (Mark Paid)
                        </button>
                      )}
                    </div>

                    <div className="text-right">
                      <span className="text-slate-400 text-[11px] block">Order Total</span>
                      <span className="font-extrabold text-base text-slate-900">
                        {currency}{order.totalAmount.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Status Change Buttons */}
                  <div className="pt-1 flex items-center gap-2">
                    {order.status === 'NEW' && (
                      <button
                        onClick={() => handleUpdateStatus(order.id, 'PREPARING')}
                        disabled={actionLoadingId === order.id}
                        className="flex-1 py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-sm flex items-center justify-center gap-1.5 transition disabled:opacity-50"
                      >
                        <Flame className="w-4 h-4" />
                        Start Preparing
                      </button>
                    )}

                    {order.status === 'PREPARING' && (
                      <button
                        onClick={() => handleUpdateStatus(order.id, 'READY')}
                        disabled={actionLoadingId === order.id}
                        className="flex-1 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-sm flex items-center justify-center gap-1.5 transition disabled:opacity-50"
                      >
                        <Bell className="w-4 h-4" />
                        Mark Ready for Table
                      </button>
                    )}

                    {order.status === 'READY' && (
                      <button
                        onClick={() => handleUpdateStatus(order.id, 'COMPLETED')}
                        disabled={actionLoadingId === order.id}
                        className="flex-1 py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs shadow-sm flex items-center justify-center gap-1.5 transition disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Complete Order
                      </button>
                    )}

                    {order.status === 'COMPLETED' && (
                      <span className="w-full text-center py-2 text-xs font-semibold text-slate-500 bg-slate-100 rounded-xl">
                        ✓ Order Completed
                      </span>
                    )}

                    {order.status !== 'COMPLETED' && order.status !== 'CANCELLED' && (
                      <button
                        onClick={() => {
                          if (confirm('Are you sure you want to cancel this order?')) {
                            handleUpdateStatus(order.id, 'CANCELLED');
                          }
                        }}
                        disabled={actionLoadingId === order.id}
                        className="py-2.5 px-3 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-medium transition"
                        title="Cancel Order"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
