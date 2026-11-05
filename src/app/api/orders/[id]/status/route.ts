import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { broadcastEvent } from '@/lib/events';

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = params;
    const { status, paymentStatus } = await req.json();

    const currentOrder = await prisma.order.findUnique({
      where: { id },
      include: { restaurant: true },
    });

    if (!currentOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const updated = await prisma.order.update({
      where: { id },
      data: {
        status: status || currentOrder.status,
        paymentStatus: paymentStatus || currentOrder.paymentStatus,
      },
      include: {
        table: true,
        items: true,
      },
    });

    // Broadcast real-time update to both Kitchen and Customer pages
    broadcastEvent({
      type: 'order:updated',
      restaurantId: updated.restaurantId,
      orderId: updated.id,
      data: {
        orderId: updated.id,
        status: updated.status,
        paymentStatus: updated.paymentStatus,
      },
    });

    return NextResponse.json({ success: true, order: updated });
  } catch (error: any) {
    console.error('Error updating order status:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to update order status' },
      { status: 500 }
    );
  }
}
