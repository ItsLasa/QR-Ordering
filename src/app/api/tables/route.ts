import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import QRCode from 'qrcode';

export async function GET(req: Request) {
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

  const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  const tables = await prisma.restaurantTable.findMany({
    where: { restaurantId: restaurant.id },
    orderBy: { createdAt: 'asc' },
    include: {
      _count: {
        select: { orders: true },
      },
    },
  });

  // Attach full order URL and generated QR Code data URL to each table
  const tablesWithQR = await Promise.all(
    tables.map(async (table) => {
      const publicUrl = `${origin}/s/${restaurant.slug}?t=${table.token}`;
      let qrCodeDataUrl = '';
      try {
        qrCodeDataUrl = await QRCode.toDataURL(publicUrl, {
          margin: 1,
          width: 320,
          color: {
            dark: '#1e293b',
            light: '#ffffff',
          },
        });
      } catch (err) {
        console.error('Failed to generate QR:', err);
      }

      return {
        ...table,
        publicUrl,
        qrCodeDataUrl,
      };
    })
  );

  return NextResponse.json({ tables: tablesWithQR, restaurant });
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
      return NextResponse.json({ error: 'Table name is required' }, { status: 400 });
    }

    // Generate unguessable random token
    const randomHex = Math.random().toString(36).substring(2, 12) + Math.random().toString(36).substring(2, 8);
    const token = `tbl_${restaurant.slug.substring(0, 4)}_${randomHex}`;

    const table = await prisma.restaurantTable.create({
      data: {
        restaurantId: restaurant.id,
        name: name.trim(),
        token,
      },
    });

    return NextResponse.json({ success: true, table });
  } catch (error: any) {
    console.error('Error creating table:', error);
    return NextResponse.json({ error: error?.message || 'Failed to create table' }, { status: 500 });
  }
}
