import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { broadcastEvent } from '@/lib/events';

// GET orders for kitchen dashboard
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

  const { searchParams } = new URL(req.url);
  const statusFilter = searchParams.get('status');

  const whereClause: any = {
    restaurantId: restaurant.id,
  };

  if (statusFilter && statusFilter !== 'ALL') {
    whereClause.status = statusFilter;
  }

  const orders = await prisma.order.findMany({
    where: whereClause,
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: {
      table: true,
      items: {
        include: {
          menuItem: true,
        },
      },
    },
  });

  return NextResponse.json({ orders, currency: restaurant.currency });
}

// POST customer place order from table QR
export async function POST(req: Request) {
  try {
    const { restaurantSlug, tableToken, customerName, customerNote, items } = await req.json();

    if (!restaurantSlug || !tableToken) {
      return NextResponse.json({ error: 'Missing restaurant or table information' }, { status: 400 });
    }

    if (!customerName || !customerName.trim()) {
      return NextResponse.json({ error: 'Please enter your name for the order' }, { status: 400 });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Your cart is empty' }, { status: 400 });
    }

    // Verify restaurant and table
    const restaurant = await prisma.restaurant.findUnique({
      where: { slug: restaurantSlug },
    });

    if (!restaurant) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
    }

    const table = await prisma.restaurantTable.findFirst({
      where: {
        restaurantId: restaurant.id,
        token: tableToken,
      },
    });

    if (!table) {
      return NextResponse.json({ error: 'Invalid or expired table token. Please rescan the table QR.' }, { status: 400 });
    }

    // Fetch and validate menu items & availability
    const menuItemIds = items.map((i: any) => i.menuItemId).filter(Boolean);
    const dbMenuItems = await prisma.menuItem.findMany({
      where: {
        id: { in: menuItemIds },
        restaurantId: restaurant.id,
      },
    });

    const menuItemsMap = new Map(dbMenuItems.map((m) => [m.id, m]));

    // Check for sold-out items
    for (const item of items) {
      const dbItem = menuItemsMap.get(item.menuItemId);
      if (!dbItem) {
        return NextResponse.json({ error: `Item "${item.name}" is no longer on the menu.` }, { status: 400 });
      }
      if (!dbItem.isAvailable) {
        return NextResponse.json(
          { error: `Sorry, "${dbItem.name}" just sold out! Please remove it from your cart.` },
          { status: 400 }
        );
      }
    }

    // Calculate total and prepare order item records
    let calculatedTotal = 0;
    const orderItemsToCreate: any[] = [];

    for (const item of items) {
      const dbItem = menuItemsMap.get(item.menuItemId)!;
      let unitPrice = dbItem.price;

      // Add options price if applicable
      const optionsArray: any[] = Array.isArray(item.selectedOptions) ? item.selectedOptions : [];
      const optionsExtra = optionsArray.reduce((sum, opt) => sum + (Number(opt.price) || 0), 0);
      const itemPriceWithOptions = unitPrice + optionsExtra;
      const subtotal = itemPriceWithOptions * item.quantity;
      calculatedTotal += subtotal;

      orderItemsToCreate.push({
        menuItemId: dbItem.id,
        itemName: dbItem.name,
        unitPrice: itemPriceWithOptions,
        quantity: item.quantity,
        subtotal: subtotal,
        selectedOptions: optionsArray.length > 0 ? JSON.stringify(optionsArray) : null,
      });
    }

    // Determine readable sequential order number (e.g. 101, 102...)
    const lastOrder = await prisma.order.findFirst({
      where: { restaurantId: restaurant.id },
      orderBy: { orderNumber: 'desc' },
      select: { orderNumber: true },
    });
    const nextOrderNumber = (lastOrder?.orderNumber || 100) + 1;

    // Create order transaction
    const newOrder = await prisma.order.create({
      data: {
        restaurantId: restaurant.id,
        tableId: table.id,
        orderNumber: nextOrderNumber,
        customerName: customerName.trim(),
        customerNote: customerNote ? customerNote.trim() : null,
        status: 'NEW',
        totalAmount: parseFloat(calculatedTotal.toFixed(2)),
        paymentStatus: 'PENDING_COUNTER',
        paymentMethod: 'CASH_COUNTER',
        items: {
          create: orderItemsToCreate,
        },
      },
      include: {
        table: true,
        items: true,
      },
    });

    // Broadcast SSE to kitchen in real-time
    broadcastEvent({
      type: 'order:created',
      restaurantId: restaurant.id,
      orderId: newOrder.id,
      tableId: table.id,
      data: newOrder,
    });

    return NextResponse.json({
      success: true,
      orderId: newOrder.id,
      orderNumber: newOrder.orderNumber,
      totalAmount: newOrder.totalAmount,
    });
  } catch (error: any) {
    console.error('Error creating order:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to submit order' },
      { status: 500 }
    );
  }
}
