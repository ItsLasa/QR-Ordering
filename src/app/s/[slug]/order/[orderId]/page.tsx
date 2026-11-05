'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  Clock,
  Flame,
  Bell,
  UtensilsCrossed,
  DollarSign,
  ArrowLeft,
  Loader2,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { Order, OrderStatus } from '@/types';

export default function CustomerOrderStatusPage({
  params,
}: {
  params: { slug: string; orderId: string };
}) {
  const { slug, orderId } = params;
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchOrderStatus = useCallback(async (isBackground = false) => {
    try {
      if (!isBackground) setLoading(true);
      const res = await fetch(`/api/orders/${orderId}`);
      if (res.ok) {
        const data = await res.json();
        setOrder(data.order);
      }
    } catch (err) {
      console.error('Failed to fetch order status:', err);
    } finally {
      if (!isBackground) setLoading(false);
    }
  }, [orderId]);

  // Initial fetch
  useEffect(() => {
    fetchOrderStatus();
  }, [fetchOrderStatus]);

  // Polling fallback every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchOrderStatus(true);
    }, 3000);
    return () => clearInterval(interval);
  }, [fetchOrderStatus]);

  // Real-time SSE
  useEffect(() => {
    const es = new EventSource(`/api/events?orderId=${orderId}`);

    es.addEventListener('order:updated', () => {
      fetchOrderStatus(true);
    });

    return () => {
      es.close();
    };
  }, [orderId, fetchOrderStatus]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <Loader2 className="w-10 h-10 animate-spin text-orange-500 mb-3" />
        <p className="text-sm font-semibold text-slate-600">Loading order status...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-center">
        <h1 className="text-xl font-black text-slate-900">Order Not Found</h1>
        <p className="text-xs text-slate-500 mt-2 mb-4">We could not locate this order.</p>
        <Link
          href={`/s/${slug}`}
          className="px-4 py-2 bg-orange-500 text-white rounded-xl text-xs font-bold"
        >
          Back to Menu
        </Link>
      </div>
    );
  }

  const steps = [
    { key: 'NEW', title: 'Order Received', desc: 'Sent to kitchen', icon: Clock },
    { key: 'PREPARING', title: 'Preparing', desc: 'In the kitchen', icon: Flame },
    { key: 'READY', title: 'Ready', desc: 'Ready for table', icon: Bell },
    { key: 'COMPLETED', title: 'Served', desc: 'Enjoy your meal!', icon: CheckCircle2 },
  ];

  const getStepStatus = (stepKey: string) => {
    const orderIndex = steps.findIndex((s) => s.key === order.status);
    const thisIndex = steps.findIndex((s) => s.key === stepKey);

    if (order.status === 'CANCELLED') return 'cancelled';
    if (thisIndex < orderIndex) return 'completed';
    if (thisIndex === orderIndex) return 'current';
    return 'upcoming';
  };

  const currency = (order as any).restaurant?.currency || '$';
  const tableToken = order.table?.token;

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6">
      <div className="max-w-md mx-auto space-y-5">
        {/* Top Restaurant Bar */}
        <div className="flex items-center justify-between">
          <Link
            href={`/s/${slug}${tableToken ? `?t=${tableToken}` : ''}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-xs transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Order More Food</span>
          </Link>

          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Live Tracking
          </span>
        </div>

        {/* Status Highlight Card */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm text-center">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Order #{order.orderNumber} • {order.table?.name}
          </span>

          <h2 className="mt-2 text-2xl font-black text-slate-900 tracking-tight">
            {order.status === 'NEW' && 'Kitchen Received Your Order!'}
            {order.status === 'PREPARING' && 'Cooking in Progress 🔥'}
            {order.status === 'READY' && 'Your Order is Ready! 🛎️'}
            {order.status === 'COMPLETED' && 'Order Completed! Bon Appétit ✨'}
            {order.status === 'CANCELLED' && 'Order Cancelled'}
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            {order.status === 'NEW' && 'Our chefs have queued your order and will start prep shortly.'}
            {order.status === 'PREPARING' && 'Your food is sizzling on the grill right now.'}
            {order.status === 'READY' && 'Your dishes are prepared and heading to your table.'}
            {order.status === 'COMPLETED' && 'Thank you for dining with us! Have a wonderful meal.'}
            {order.status === 'CANCELLED' && 'This order was cancelled by kitchen staff.'}
          </p>

          {/* Stepper Progress */}
          {order.status !== 'CANCELLED' && (
            <div className="mt-8 relative">
              <div className="grid grid-cols-4 gap-2">
                {steps.map((s, idx) => {
                  const state = getStepStatus(s.key);
                  const Icon = s.icon;

                  return (
                    <div key={s.key} className="flex flex-col items-center text-center">
                      <div
                        className={`w-11 h-11 rounded-2xl flex items-center justify-center transition ${
                          state === 'completed'
                            ? 'bg-emerald-500 text-white shadow-sm'
                            : state === 'current'
                            ? 'bg-orange-500 text-white shadow-md shadow-orange-500/25 ring-4 ring-orange-100 animate-pulse'
                            : 'bg-slate-100 text-slate-400'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>

                      <span
                        className={`mt-2 text-[11px] font-bold leading-tight ${
                          state === 'current'
                            ? 'text-orange-600'
                            : state === 'completed'
                            ? 'text-emerald-700'
                            : 'text-slate-400'
                        }`}
                      >
                        {s.title}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Pay at Counter Reminder */}
        <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-4 flex items-start gap-3">
          <DollarSign className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900">
            <strong className="font-bold block text-sm">
              {order.paymentStatus === 'PAID' ? '✓ Cash Payment Confirmed' : 'Payment: Cash at Counter'}
            </strong>
            <span>
              {order.paymentStatus === 'PAID'
                ? 'Your payment was marked as received at the counter.'
                : 'Please settle your bill with cash at the restaurant counter when convenient.'}
            </span>
          </div>
        </div>

        {/* Order Details Receipt Card */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Order Summary</h3>
              <span className="text-xs text-slate-500">Customer: {order.customerName}</span>
            </div>
            <span className="text-xs font-mono text-slate-400">
              {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          {/* Customer Note if present */}
          {order.customerNote && (
            <div className="bg-slate-50 p-2.5 rounded-xl text-xs text-slate-600">
              <strong className="font-semibold text-slate-700">Special Instructions:</strong> {order.customerNote}
            </div>
          )}

          {/* Items */}
          <div className="space-y-3 pt-1">
            {order.items.map((item) => {
              let parsedOptions: any[] = [];
              if (item.selectedOptions) {
                try {
                  parsedOptions = JSON.parse(item.selectedOptions);
                } catch {}
              }

              return (
                <div key={item.id} className="flex items-start justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-900">
                      {item.quantity}× {item.itemName}
                    </span>
                    {parsedOptions.length > 0 && (
                      <div className="mt-0.5 space-y-0.5 pl-2 text-slate-500">
                        {parsedOptions.map((opt, i) => (
                          <div key={i}>
                            • {opt.groupName}: {opt.choiceName}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="font-semibold text-slate-700">
                    {currency}{item.subtotal.toFixed(2)}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Total */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="font-bold text-sm text-slate-900">Total</span>
            <span className="font-black text-lg text-slate-900">
              {currency}{order.totalAmount.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Back to Menu CTA */}
        <div className="text-center pt-2">
          <Link
            href={`/s/${slug}${tableToken ? `?t=${tableToken}` : ''}`}
            className="inline-flex items-center gap-2 font-bold text-xs text-orange-600 hover:text-orange-700 underline"
          >
            Add more food or drinks to Table {order.table?.name}
          </Link>
        </div>
      </div>
    </div>
  );
}
