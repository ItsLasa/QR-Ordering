import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        restaurant: {
          select: {
            name: true,
            slug: true,
            currency: true,
            logoUrl: true,
          },
        },
        table: {
          select: {
            name: true,
            token: true,
          },
        },
        items: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json({ order });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch order status' },
      { status: 500 }
    );
  }
}
