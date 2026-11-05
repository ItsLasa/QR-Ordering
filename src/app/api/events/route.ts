import { NextRequest } from 'next/server';
import { orderEvents, AppEvent } from '@/lib/events';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const restaurantId = searchParams.get('restaurantId');
  const orderId = searchParams.get('orderId');

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection packet
      controller.enqueue(encoder.encode(`event: connected\ndata: ${JSON.stringify({ ok: true, timestamp: Date.now() })}\n\n`));

      const sendEvent = (event: AppEvent) => {
        try {
          const payload = `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
          controller.enqueue(encoder.encode(payload));
        } catch (err) {
          console.error('Error enqueuing SSE event:', err);
        }
      };

      // Listeners
      const restaurantListener = (event: AppEvent) => sendEvent(event);
      const orderListener = (event: AppEvent) => sendEvent(event);

      if (restaurantId) {
        orderEvents.on(`restaurant:${restaurantId}`, restaurantListener);
      }
      if (orderId) {
        orderEvents.on(`order:${orderId}`, orderListener);
      }

      // Heartbeat ping every 15 seconds to keep connection open through proxies/firewalls
      const interval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch {
          clearInterval(interval);
        }
      }, 15000);

      // Clean up when client disconnects
      req.signal.addEventListener('abort', () => {
        clearInterval(interval);
        if (restaurantId) {
          orderEvents.off(`restaurant:${restaurantId}`, restaurantListener);
        }
        if (orderId) {
          orderEvents.off(`order:${orderId}`, orderListener);
        }
        try {
          controller.close();
        } catch {}
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
