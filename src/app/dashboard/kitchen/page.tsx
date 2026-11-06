'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { ChefHat, Volume2, VolumeX, RefreshCw, Clock, CheckCircle2, Flame, Bell, User, MessageSquare, DollarSign } from 'lucide-react';
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

      eventSource.addEventListener('order:created', () => {
        if (soundEnabled) playOrderChime();
        fetchOrders(true);
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
    <div className="space-y-6 text-stone-900">
      {/* Top Header & Audio controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-xl border border-stone-200/90 shadow-subtle">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-stone-900 text-stone-100 flex items-center justify-center font-bold">
            <ChefHat className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-serif text-xl sm:text-2xl font-bold text-stone-900 tracking-tight">
                Kitchen Display System
              </h1>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-stone-100 text-stone-700 border border-stone-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                Live
              </span>
            </div>
            <p className="text-xs text-stone-500 mt-0.5">
              Live orders from dining table QR codes with instant bell alerts.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => playOrderChime()}
            className="px-3 py-1.5 text-xs font-medium text-stone-700 bg-stone-50 hover:bg-stone-100 border border-stone-200 rounded-lg transition flex items-center gap-1.5"
            title="Test audio chime"
          >
            <Bell className="w-3.5 h-3.5 text-stone-500" />
            <span>Test Bell</span>
          </button>

          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition flex items-center gap-1.5 border ${
              soundEnabled
                ? 'bg-stone-100 text-stone-900 border-stone-300'
                : 'bg-stone-50 text-stone-400 border-stone-200'
            }`}
          >
            {soundEnabled ? (
              <>
                <Volume2 className="w-3.5 h-3.5 text-stone-700" />
                <span>Audio Alert On</span>
              </>
            ) : (
              <>
                <VolumeX className="w-3.5 h-3.5 text-stone-400" />
                <span>Muted</span>
              </>
            )}
          </button>

          <button
            onClick={() => fetchOrders()}
            className="p-1.5 text-stone-500 hover:text-stone-900 hover:bg-stone-100 border border-stone-200 rounded-lg transition"
            title="Refresh Orders"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        <button
          onClick={() => setStatusFilter('ACTIVE')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 whitespace-nowrap transition ${
            statusFilter === 'ACTIVE'
              ? 'bg-stone-900 text-white shadow-subtle'
              : 'bg-white text-stone-600 hover:text-stone-900 border border-stone-200'
          }`}
        >
          <span>All Active</span>
          <span className={`px-1.5 py-0.2 rounded text-[11px] font-bold ${statusFilter === 'ACTIVE' ? 'bg-stone-700 text-white' : 'bg-stone-100 text-stone-600'}`}>
            {counts.active}
          </span>
        </button>

        <button
          onClick={() => setStatusFilter('NEW')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 whitespace-nowrap transition ${
            statusFilter === 'NEW'
              ? 'bg-stone-900 text-white shadow-subtle'
              : 'bg-white text-stone-600 hover:text-stone-900 border border-stone-200'
          }`}
        >
          <span>New</span>
          <span className={`px-1.5 py-0.2 rounded text-[11px] font-bold ${statusFilter === 'NEW' ? 'bg-stone-700 text-white' : 'bg-stone-100 text-stone-600'}`}>
            {counts.new}
          </span>
        </button>

        <button
          onClick={() => setStatusFilter('PREPARING')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 whitespace-nowrap transition ${
            statusFilter === 'PREPARING'
              ? 'bg-stone-900 text-white shadow-subtle'
              : 'bg-white text-stone-600 hover:text-stone-900 border border-stone-200'
          }`}
        >
          <span>In Prep</span>
          <span className={`px-1.5 py-0.2 rounded text-[11px] font-bold ${statusFilter === 'PREPARING' ? 'bg-stone-700 text-white' : 'bg-stone-100 text-stone-600'}`}>
            {counts.preparing}
          </span>
        </button>

        <button
          onClick={() => setStatusFilter('READY')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 whitespace-nowrap transition ${
            statusFilter === 'READY'
              ? 'bg-stone-900 text-white shadow-subtle'
              : 'bg-white text-stone-600 hover:text-stone-900 border border-stone-200'
          }`}
        >
          <span>Ready to Serve</span>
          <span className={`px-1.5 py-0.2 rounded text-[11px] font-bold ${statusFilter === 'READY' ? 'bg-stone-700 text-white' : 'bg-stone-100 text-stone-600'}`}>
            {counts.ready}
          </span>
        </button>

        <button
          onClick={() => setStatusFilter('COMPLETED')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 whitespace-nowrap transition ${
            statusFilter === 'COMPLETED'
              ? 'bg-stone-900 text-white shadow-subtle'
              : 'bg-white text-stone-600 hover:text-stone-900 border border-stone-200'
          }`}
        >
          <span>History</span>
          <span className={`px-1.5 py-0.2 rounded text-[11px] font-bold ${statusFilter === 'COMPLETED' ? 'bg-stone-700 text-white' : 'bg-stone-100 text-stone-600'}`}>
            {counts.completed}
          </span>
        </button>
      </div>

      {/* Orders Grid */}
      {loading ? (
        <div className="py-20 text-center">
          <RefreshCw className="w-6 h-6 animate-spin text-stone-400 mx-auto mb-2" />
          <p className="text-xs text-stone-500 uppercase tracking-widest font-medium">Checking tickets...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-white rounded-xl border border-stone-200 p-12 text-center">
          <p className="font-serif text-base text-stone-800">No {statusFilter === 'ACTIVE' ? 'active' : statusFilter.toLowerCase()} tickets right now</p>
          <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
            When guests order from their table QR codes, their tickets will arrive here with sound alerts.
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOrders.map((order) => {
            const elapsedMins = getElapsedMins(order.createdAt);
            const isUrgent = elapsedMins >= 15;

            return (
              <div
                key={order.id}
                className={`bg-white rounded-xl border transition flex flex-col justify-between overflow-hidden ${
                  order.status === 'NEW'
                    ? 'border-amber-400/90 shadow-card'
                    : order.status === 'PREPARING'
                    ? 'border-stone-400 shadow-subtle'
                    : order.status === 'READY'
                    ? 'border-stone-800 shadow-card'
                    : 'border-stone-200'
                }`}
              >
                {/* Order Chit Top Banner */}
                <div className="p-4 border-b border-stone-200 bg-stone-50/70">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-base text-stone-900">
                        #{order.orderNumber}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-stone-900 text-white font-medium text-xs">
                        {order.table?.name || 'Table'}
                      </span>
                    </div>

                    {/* Status Badge */}
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                        order.status === 'NEW'
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : order.status === 'PREPARING'
                          ? 'bg-stone-200 text-stone-800'
                          : order.status === 'READY'
                          ? 'bg-stone-900 text-white'
                          : order.status === 'CANCELLED'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-stone-100 text-stone-600'
                      }`}
                    >
                      {order.status === 'NEW' ? 'New Ticket' : order.status}
                    </span>
                  </div>

                  {/* Customer & Elapsed Timer */}
                  <div className="mt-2.5 flex items-center justify-between text-xs text-stone-600">
                    <div className="flex items-center gap-1.5 font-medium text-stone-800">
                      <User className="w-3.5 h-3.5 text-stone-400" />
                      <span>{order.customerName}</span>
                    </div>

                    <div
                      className={`flex items-center gap-1 font-mono text-[11px] ${
                        isUrgent ? 'text-rose-700 font-bold' : 'text-stone-500'
                      }`}
                    >
                      <Clock className="w-3 h-3" />
                      <span>{elapsedMins === 0 ? 'Just now' : `${elapsedMins}m ago`}</span>
                    </div>
                  </div>

                  {/* Customer Note */}
                  {order.customerNote && (
                    <div className="mt-2.5 bg-amber-50/70 border border-amber-200/90 rounded-lg p-2 text-xs text-amber-950 flex items-start gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-amber-700 flex-shrink-0 mt-0.5" />
                      <div>
                        <strong className="font-semibold block text-[10px] uppercase text-amber-900">Note:</strong>
                        <span>{order.customerNote}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Items List */}
                <div className="p-4 flex-1 space-y-2.5">
                  {order.items.map((item) => {
                    let parsedOptions: any[] = [];
                    if (item.selectedOptions) {
                      try {
                        parsedOptions = JSON.parse(item.selectedOptions);
                      } catch {}
                    }

                    return (
                      <div key={item.id} className="text-xs">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-2">
                            <span className="font-mono font-bold text-stone-900 bg-stone-100 px-1.5 py-0.5 rounded text-[11px] min-w-[22px] text-center border border-stone-200">
                              {item.quantity}×
                            </span>
                            <div>
                              <span className="font-serif font-bold text-stone-900 text-sm">{item.itemName}</span>
                              {parsedOptions.length > 0 && (
                                <div className="mt-0.5 space-y-0.5 pl-1">
                                  {parsedOptions.map((opt, idx) => (
                                    <div key={idx} className="text-xs text-stone-500">
                                      • {opt.groupName}: <strong className="text-stone-700">{opt.choiceName}</strong>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                          <span className="text-xs font-medium text-stone-500 whitespace-nowrap ml-2">
                            {currency}{item.subtotal.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Ticket Actions & Payment */}
                <div className="p-3.5 bg-stone-50/80 border-t border-stone-200 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5 text-stone-400" />
                      {order.paymentStatus === 'PAID' ? (
                        <span className="font-medium text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[11px]">
                          ✓ Paid
                        </span>
                      ) : (
                        <button
                          onClick={() => handleMarkPaid(order.id)}
                          className="font-medium text-stone-700 bg-white hover:bg-stone-100 px-2 py-0.5 rounded border border-stone-300 text-[11px] transition shadow-subtle"
                          title="Click to mark as paid at counter"
                        >
                          Mark Paid
                        </button>
                      )}
                    </div>

                    <div className="text-right">
                      <span className="font-serif font-bold text-sm text-stone-900">
                        {currency}{order.totalAmount.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Status Progression Buttons */}
                  <div className="flex items-center gap-2">
                    {order.status === 'NEW' && (
                      <button
                        onClick={() => handleUpdateStatus(order.id, 'PREPARING')}
                        disabled={actionLoadingId === order.id}
                        className="flex-1 py-2 px-3 bg-stone-900 hover:bg-stone-800 text-white rounded-lg font-medium text-xs shadow-subtle flex items-center justify-center gap-1.5 transition disabled:opacity-50"
                      >
                        <Flame className="w-3.5 h-3.5" />
                        Start Prep
                      </button>
                    )}

                    {order.status === 'PREPARING' && (
                      <button
                        onClick={() => handleUpdateStatus(order.id, 'READY')}
                        disabled={actionLoadingId === order.id}
                        className="flex-1 py-2 px-3 bg-stone-900 hover:bg-stone-800 text-white rounded-lg font-medium text-xs shadow-subtle flex items-center justify-center gap-1.5 transition disabled:opacity-50"
                      >
                        <Bell className="w-3.5 h-3.5" />
                        Ready for Table
                      </button>
                    )}

                    {order.status === 'READY' && (
                      <button
                        onClick={() => handleUpdateStatus(order.id, 'COMPLETED')}
                        disabled={actionLoadingId === order.id}
                        className="flex-1 py-2 px-3 bg-stone-900 hover:bg-stone-800 text-white rounded-lg font-medium text-xs shadow-subtle flex items-center justify-center gap-1.5 transition disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Complete Order
                      </button>
                    )}

                    {order.status === 'COMPLETED' && (
                      <span className="w-full text-center py-1.5 text-xs font-medium text-stone-500 bg-stone-100 rounded-lg">
                        Completed
                      </span>
                    )}

                    {order.status !== 'COMPLETED' && order.status !== 'CANCELLED' && (
                      <button
                        onClick={() => {
                          if (confirm('Cancel this ticket?')) {
                            handleUpdateStatus(order.id, 'CANCELLED');
                          }
                        }}
                        disabled={actionLoadingId === order.id}
                        className="py-2 px-2.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg text-xs font-medium transition"
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
