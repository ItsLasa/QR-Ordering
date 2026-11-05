import { NextResponse } from 'next/server';
import { getCurrentUserWithRestaurant } from '@/lib/auth';

export async function GET() {
  const user = await getCurrentUserWithRestaurant();
  if (!user) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  return NextResponse.json({
    authenticated: true,
    user: {
      id: user.id,
      email: user.email,
      restaurant: user.restaurant,
    },
  });
}
