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

  return NextResponse.json({ restaurant });
}

export async function PUT(req: Request) {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { name, logoUrl, currency, address, phone } = await req.json();

    const restaurant = await prisma.restaurant.findFirst({
      where: { userId: session.userId },
    });

    if (!restaurant) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
    }

    const updated = await prisma.restaurant.update({
      where: { id: restaurant.id },
      data: {
        name: name !== undefined ? name.trim() : restaurant.name,
        logoUrl: logoUrl !== undefined ? logoUrl.trim() : restaurant.logoUrl,
        currency: currency !== undefined ? currency.trim() : restaurant.currency,
        address: address !== undefined ? address.trim() : restaurant.address,
        phone: phone !== undefined ? phone.trim() : restaurant.phone,
      },
    });

    return NextResponse.json({ success: true, restaurant: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to update settings' }, { status: 500 });
  }
}
