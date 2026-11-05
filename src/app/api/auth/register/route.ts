import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, createSessionToken, setSessionCookie } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const { email, password, restaurantName, currency } = await req.json();

    if (!email || !password || !restaurantName) {
      return NextResponse.json(
        { error: 'Email, password, and restaurant name are required.' },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists.' },
        { status: 409 }
      );
    }

    // Generate clean unique slug
    let baseSlug = restaurantName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    if (!baseSlug) baseSlug = 'restaurant';

    let slug = baseSlug;
    let count = 1;
    while (await prisma.restaurant.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${count}`;
      count++;
    }

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase().trim(),
        passwordHash,
        restaurant: {
          create: {
            name: restaurantName.trim(),
            slug,
            currency: currency || '$',
            tables: {
              create: [
                { name: 'Table 1', token: `tbl_1_${Math.random().toString(36).substring(2, 10)}` },
                { name: 'Table 2', token: `tbl_2_${Math.random().toString(36).substring(2, 10)}` },
                { name: 'Table 3', token: `tbl_3_${Math.random().toString(36).substring(2, 10)}` },
              ],
            },
          },
        },
      },
      include: {
        restaurant: true,
      },
    });

    const token = await createSessionToken({
      userId: user.id,
      email: user.email,
      restaurantId: user.restaurant?.id,
      restaurantSlug: user.restaurant?.slug,
    });

    setSessionCookie(token);

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        restaurant: user.restaurant,
      },
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to register account.' },
      { status: 500 }
    );
  }
}
