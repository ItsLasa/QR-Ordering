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
    const current = await prisma.menuItem.findUnique({
      where: { id },
    });

    if (!current) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    const updated = await prisma.menuItem.update({
      where: { id },
      data: {
        isAvailable: !current.isAvailable,
      },
    });

    broadcastEvent({
      type: 'menu:updated',
      restaurantId: updated.restaurantId,
      data: {
        itemId: updated.id,
        isAvailable: updated.isAvailable,
      },
    });

    return NextResponse.json({
      success: true,
      id: updated.id,
      isAvailable: updated.isAvailable,
    });
  } catch (error: any) {
    console.error('Error toggling menu item:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to toggle item availability' },
      { status: 500 }
    );
  }
}
