import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { broadcastEvent } from '@/lib/events';

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

  const items = await prisma.menuItem.findMany({
    where: { restaurantId: restaurant.id },
    include: {
      category: true,
      optionGroups: {
        include: {
          choices: true,
        },
      },
    },
    orderBy: [{ categoryId: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'desc' }],
  });

  return NextResponse.json({ items });
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
    const { categoryId, name, description, price, imageUrl, isAvailable, optionGroups } = await req.json();

    if (!categoryId || !name || price === undefined) {
      return NextResponse.json({ error: 'Category, name, and price are required' }, { status: 400 });
    }

    const item = await prisma.menuItem.create({
      data: {
        restaurantId: restaurant.id,
        categoryId,
        name: name.trim(),
        description: description ? description.trim() : null,
        price: parseFloat(price),
        imageUrl: imageUrl ? imageUrl.trim() : null,
        isAvailable: isAvailable !== undefined ? Boolean(isAvailable) : true,
        optionGroups: optionGroups && Array.isArray(optionGroups) && optionGroups.length > 0 ? {
          create: optionGroups.map((g: any) => ({
            name: g.name.trim(),
            isRequired: Boolean(g.isRequired),
            allowMultiple: Boolean(g.allowMultiple),
            choices: {
              create: (g.choices || []).map((c: any) => ({
                name: c.name.trim(),
                price: parseFloat(c.price || 0),
              })),
            },
          })),
        } : undefined,
      },
      include: {
        category: true,
        optionGroups: {
          include: {
            choices: true,
          },
        },
      },
    });

    broadcastEvent({
      type: 'menu:updated',
      restaurantId: restaurant.id,
      data: { itemId: item.id },
    });

    return NextResponse.json({ success: true, item });
  } catch (error: any) {
    console.error('Error creating menu item:', error);
    return NextResponse.json({ error: error?.message || 'Failed to create menu item' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id, categoryId, name, description, price, imageUrl, isAvailable, optionGroups } = await req.json();

    if (!id || !categoryId || !name || price === undefined) {
      return NextResponse.json({ error: 'ID, category, name, and price are required' }, { status: 400 });
    }

    // Replace option groups cleanly if provided
    if (optionGroups && Array.isArray(optionGroups)) {
      await prisma.optionGroup.deleteMany({
        where: { menuItemId: id },
      });
    }

    const item = await prisma.menuItem.update({
      where: { id },
      data: {
        categoryId,
        name: name.trim(),
        description: description !== undefined ? (description ? description.trim() : null) : undefined,
        price: parseFloat(price),
        imageUrl: imageUrl !== undefined ? (imageUrl ? imageUrl.trim() : null) : undefined,
        isAvailable: isAvailable !== undefined ? Boolean(isAvailable) : undefined,
        optionGroups: optionGroups && Array.isArray(optionGroups) ? {
          create: optionGroups.map((g: any) => ({
            name: g.name.trim(),
            isRequired: Boolean(g.isRequired),
            allowMultiple: Boolean(g.allowMultiple),
            choices: {
              create: (g.choices || []).map((c: any) => ({
                name: c.name.trim(),
                price: parseFloat(c.price || 0),
              })),
            },
          })),
        } : undefined,
      },
      include: {
        category: true,
        optionGroups: {
          include: {
            choices: true,
          },
        },
      },
    });

    broadcastEvent({
      type: 'menu:updated',
      restaurantId: item.restaurantId,
      data: { itemId: item.id },
    });

    return NextResponse.json({ success: true, item });
  } catch (error: any) {
    console.error('Error updating menu item:', error);
    return NextResponse.json({ error: error?.message || 'Failed to update menu item' }, { status: 500 });
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
      return NextResponse.json({ error: 'Item ID is required' }, { status: 400 });
    }

    const item = await prisma.menuItem.delete({
      where: { id },
    });

    broadcastEvent({
      type: 'menu:updated',
      restaurantId: item.restaurantId,
      data: { itemId: id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to delete menu item' }, { status: 500 });
  }
}
