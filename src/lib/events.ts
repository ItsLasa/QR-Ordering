import { EventEmitter } from 'events';

// Create a global event emitter for SSE
const globalForEvents = globalThis as unknown as {
  orderEvents: EventEmitter | undefined;
};

export const orderEvents = globalForEvents.orderEvents ?? new EventEmitter();

// Set unlimited listeners for multiple concurrent kitchen and customer tabs
orderEvents.setMaxListeners(0);

if (process.env.NODE_ENV !== 'production') {
  globalForEvents.orderEvents = orderEvents;
}

export interface AppEvent {
  type: 'order:created' | 'order:updated' | 'menu:updated';
  restaurantId: string;
  orderId?: string;
  tableId?: string;
  data?: any;
  timestamp: number;
}

export function broadcastEvent(event: Omit<AppEvent, 'timestamp'>) {
  const fullEvent: AppEvent = {
    ...event,
    timestamp: Date.now(),
  };
  orderEvents.emit(`restaurant:${event.restaurantId}`, fullEvent);
  if (event.orderId) {
    orderEvents.emit(`order:${event.orderId}`, fullEvent);
  }
}
