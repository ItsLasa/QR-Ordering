import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET() {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const restaurant = await prisma.restaurant.findFirst({
    where: { userId: session.userId },
  });

  if (!restaurant) {
    return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
  }

  const categories = await prisma.category.findMany({
    where: { restaurantId: restaurant.id },
    orderBy: { sortOrder: 'asc' },
    include: {
      menuItems: true,
    },
  });

  return NextResponse.json({ categories });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const restaurant = await prisma.restaurant.findFirst({
    where: { userId: session.userId },
  });

  if (!restaurant) {
    return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
  }

  try {
    const { name } = await req.json();
    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Category name is required' }, { status: 400 });
    }

    const maxSort = await prisma.category.aggregate({
      where: { restaurantId: restaurant.id },
      _max: { sortOrder: true },
    });
    const nextOrder = (maxSort._max.sortOrder || 0) + 1;

    const category = await prisma.category.create({
      data: {
        restaurantId: restaurant.id,
        name: name.trim(),
        sortOrder: nextOrder,
      },
    });

    return NextResponse.json({ success: true, category });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to create category' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id, name, sortOrder } = await req.json();
    if (!id || !name?.trim()) {
      return NextResponse.json({ error: 'ID and name are required' }, { status: 400 });
    }

    const updated = await prisma.category.update({
      where: { id },
      data: {
        name: name.trim(),
        sortOrder: sortOrder !== undefined ? Number(sortOrder) : undefined,
      },
    });

    return NextResponse.json({ success: true, category: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to update category' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    await prisma.category.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to delete category' }, { status: 500 });
  }
}
