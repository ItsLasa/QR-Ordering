import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params;
    const { searchParams } = new URL(req.url);
    const tableToken = searchParams.get('t');

    const restaurant = await prisma.restaurant.findUnique({
      where: { slug },
      include: {
        categories: {
          orderBy: { sortOrder: 'asc' },
          include: {
            menuItems: {
              orderBy: { sortOrder: 'asc' },
              include: {
                optionGroups: {
                  include: {
                    choices: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!restaurant) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
    }

    let activeTable = null;
    if (tableToken) {
      activeTable = await prisma.restaurantTable.findFirst({
        where: {
          restaurantId: restaurant.id,
          token: tableToken,
        },
        select: {
          id: true,
          name: true,
          token: true,
        },
      });
    }

    return NextResponse.json({
      restaurant: {
        id: restaurant.id,
        name: restaurant.name,
        slug: restaurant.slug,
        logoUrl: restaurant.logoUrl,
        currency: restaurant.currency,
        address: restaurant.address,
        phone: restaurant.phone,
        categories: restaurant.categories,
      },
      table: activeTable,
      isTableValid: Boolean(activeTable),
    });
  } catch (error: any) {
    console.error('Error fetching public menu:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to load menu' },
      { status: 500 }
    );
  }
}
