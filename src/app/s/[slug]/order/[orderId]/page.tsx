'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  Clock,
  Flame,
  Bell,
  DollarSign,
  ArrowLeft,
  Loader2,
  Receipt,
  UtensilsCrossed,
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
      <div className="min-h-screen bg-[#FAF9F6] flex flex-col items-center justify-center p-6 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-stone-600 mb-3" />
        <p className="text-xs uppercase tracking-widest font-semibold text-stone-500 font-sans">
          Fetching Order Status
        </p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-stone-100 border border-stone-200 text-stone-600 flex items-center justify-center mx-auto mb-4">
          <Receipt className="w-5 h-5" />
        </div>
        <h1 className="font-serif text-2xl font-semibold text-stone-900">Order Not Located</h1>
        <p className="text-sm text-stone-500 mt-2 mb-5 max-w-sm">
          We could not find this order ticket. Please return to the menu.
        </p>
        <Link
          href={`/s/${slug}`}
          className="px-4 py-2 bg-stone-900 text-white rounded-lg text-xs font-medium hover:bg-stone-800 transition"
        >
          Return to Menu
        </Link>
      </div>
    );
  }

  const steps = [
    { key: 'NEW', title: 'Received', desc: 'Sent to kitchen', icon: Clock },
    { key: 'PREPARING', title: 'Preparing', desc: 'Cooking on line', icon: Flame },
    { key: 'READY', title: 'Ready', desc: 'Ready for table', icon: Bell },
    { key: 'COMPLETED', title: 'Served', desc: 'Enjoy your meal', icon: CheckCircle2 },
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
    <div className="min-h-screen bg-[#FAF9F6] py-8 px-4 sm:px-6 text-stone-900">
      <div className="max-w-md mx-auto space-y-4">
        {/* Navigation & Live Signal */}
        <div className="flex items-center justify-between">
          <Link
            href={`/s/${slug}${tableToken ? `?t=${tableToken}` : ''}`}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-600 hover:text-stone-900 bg-white px-3 py-1.5 rounded-lg border border-stone-200 shadow-subtle transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Add More Food</span>
          </Link>

          <span className="text-[11px] font-medium text-stone-600 bg-white px-2.5 py-1 rounded-full border border-stone-200/90 shadow-subtle flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
            Kitchen Connected
          </span>
        </div>

        {/* Status Ticket Card */}
        <div className="bg-white rounded-xl p-6 border border-stone-200/90 shadow-card text-center space-y-4">
          <div className="space-y-1">
            <span className="text-xs uppercase tracking-widest font-semibold text-stone-400 block font-sans">
              Order #{order.orderNumber} • {order.table?.name}
            </span>
            <h2 className="font-serif text-2xl font-bold text-stone-900 tracking-tight">
              {order.status === 'NEW' && 'Order Received'}
              {order.status === 'PREPARING' && 'Kitchen is Cooking'}
              {order.status === 'READY' && 'Your Order is Ready'}
              {order.status === 'COMPLETED' && 'Order Served'}
              {order.status === 'CANCELLED' && 'Order Cancelled'}
            </h2>
            <p className="text-xs text-stone-500 leading-relaxed max-w-xs mx-auto">
              {order.status === 'NEW' && 'Your ticket is in the kitchen queue. Preparation will begin shortly.'}
              {order.status === 'PREPARING' && 'Our chefs are currently preparing your dishes.'}
              {order.status === 'READY' && 'Your food is ready and on its way to your table.'}
              {order.status === 'COMPLETED' && 'Thank you for dining with us! We hope you enjoy your meal.'}
              {order.status === 'CANCELLED' && 'This order was cancelled by staff. Please speak with your server.'}
            </p>
          </div>

          {/* Stepper Progress */}
          {order.status !== 'CANCELLED' && (
            <div className="pt-4 border-t border-stone-100">
              <div className="grid grid-cols-4 gap-2">
                {steps.map((s) => {
                  const state = getStepStatus(s.key);
                  const Icon = s.icon;

                  return (
                    <div key={s.key} className="flex flex-col items-center text-center">
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center transition ${
                          state === 'completed'
                            ? 'bg-stone-900 text-white'
                            : state === 'current'
                            ? 'bg-stone-900 text-white ring-2 ring-stone-300 animate-pulse'
                            : 'bg-stone-100 text-stone-400'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>

                      <span
                        className={`mt-2 text-[10px] uppercase tracking-wider font-semibold leading-tight ${
                          state === 'current'
                            ? 'text-stone-900'
                            : state === 'completed'
                            ? 'text-stone-700'
                            : 'text-stone-400'
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

        {/* Payment Clarification */}
        <div className="bg-stone-100/70 border border-stone-200/90 rounded-xl p-3.5 flex items-start gap-3">
          <DollarSign className="w-4 h-4 text-stone-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-stone-700 leading-relaxed">
            <strong className="font-semibold block text-stone-900">
              {order.paymentStatus === 'PAID' ? 'Payment Settled' : 'Payment at Counter'}
            </strong>
            <span>
              {order.paymentStatus === 'PAID'
                ? 'Your payment was recorded as received at the register.'
                : 'Please settle your bill at the counter whenever convenient.'}
            </span>
          </div>
        </div>

        {/* Itemized Receipt Slip */}
        <div className="bg-white rounded-xl p-6 border border-stone-200/90 shadow-card space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-stone-200">
            <div>
              <h3 className="font-serif font-bold text-sm text-stone-900">Ticket Details</h3>
              <span className="text-xs text-stone-500">Diner: {order.customerName}</span>
            </div>
            <span className="text-xs font-mono text-stone-400">
              {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          {order.customerNote && (
            <div className="bg-stone-50 p-2.5 rounded-lg text-xs text-stone-600 border border-stone-200/80">
              <span className="font-semibold text-stone-700">Special Instructions:</span> {order.customerNote}
            </div>
          )}

          {/* Items */}
          <div className="space-y-2.5 pt-1">
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
                    <span className="font-medium text-stone-900">
                      {item.quantity}× {item.itemName}
                    </span>
                    {parsedOptions.length > 0 && (
                      <div className="mt-0.5 space-y-0.5 pl-2 text-stone-500">
                        {parsedOptions.map((opt, i) => (
                          <div key={i}>
                            • {opt.groupName}: {opt.choiceName}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="font-semibold text-stone-800">
                    {currency}{item.subtotal.toFixed(2)}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Total */}
          <div className="pt-3 border-t border-stone-200 flex items-center justify-between">
            <span className="font-medium text-sm text-stone-600">Total</span>
            <span className="font-serif font-bold text-lg text-stone-900">
              {currency}{order.totalAmount.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Back to Menu CTA */}
        <div className="text-center pt-2">
          <Link
            href={`/s/${slug}${tableToken ? `?t=${tableToken}` : ''}`}
            className="inline-flex items-center gap-1.5 font-medium text-xs text-stone-600 hover:text-stone-900 underline underline-offset-4"
          >
            Order more items for {order.table?.name}
          </Link>
        </div>
      </div>
    </div>
  );
}
