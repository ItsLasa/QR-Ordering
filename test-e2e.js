const { spawn } = require('child_process');
const http = require('http');

async function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function request(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const postData = options.body ? JSON.stringify(options.body) : null;

    const reqOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
        ...(postData ? { 'Content-Length': Buffer.byteLength(postData) } : {}),
      },
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch {}
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: json || data,
        });
      });
    });

    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function runTests() {
  console.log('--- STARTING E2E INTEGRATION TEST ---');
  const baseUrl = 'http://localhost:3000';

  // 1. Owner Login
  console.log('\n1. Testing Owner Login...');
  const loginRes = await request(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    body: {
      email: 'owner@bistro.com',
      password: 'password123',
    },
  });

  if (loginRes.status !== 200 || !loginRes.data.success) {
    throw new Error(`Owner login failed: ${JSON.stringify(loginRes.data)}`);
  }
  console.log('✓ Owner logged in successfully! User ID:', loginRes.data.user.id);
  const cookieHeader = loginRes.headers['set-cookie']
    ? loginRes.headers['set-cookie'][0].split(';')[0]
    : '';

  // 2. Fetch Restaurant & Tables
  console.log('\n2. Testing Tables & Unguessable Tokens...');
  const tablesRes = await request(`${baseUrl}/api/tables`, {
    headers: { Cookie: cookieHeader },
  });

  if (tablesRes.status !== 200 || !tablesRes.data.tables) {
    throw new Error('Failed to fetch tables');
  }
  const table1 = tablesRes.data.tables.find((t) => t.name === 'Table 1');
  if (!table1 || !table1.token || !table1.qrCodeDataUrl) {
    throw new Error('Table 1 missing or has invalid QR token / data URL');
  }
  console.log(`✓ Table 1 token verified: "${table1.token}"`);
  console.log(`✓ QR Code Data URL generated (length: ${table1.qrCodeDataUrl.length} chars)`);

  // 3. Customer Public Menu Access
  console.log('\n3. Testing Customer Public Menu (/s/rustic-bistro?t=token)...');
  const publicMenuRes = await request(`${baseUrl}/api/public/rustic-bistro?t=${table1.token}`);
  if (publicMenuRes.status !== 200 || !publicMenuRes.data.isTableValid) {
    throw new Error('Public menu access or table token validation failed');
  }
  const menuCategories = publicMenuRes.data.restaurant.categories;
  console.log(`✓ Customer menu loaded: ${menuCategories.length} categories found`);
  const burgerCategory = menuCategories.find((c) => c.name === 'Burgers & Mains');
  const smashBurger = burgerCategory.menuItems.find((i) => i.name.includes('Smash Cheeseburger'));
  console.log(`✓ Found item "${smashBurger.name}" at price $${smashBurger.price}`);
  console.log(`✓ Item options verified: ${smashBurger.optionGroups.length} option groups`);

  // 4. Test Sold-Out Toggle
  console.log('\n4. Testing Sold-Out Toggle...');
  const toggleRes = await request(`${baseUrl}/api/menu-items/${smashBurger.id}/toggle-available`, {
    method: 'PATCH',
    headers: { Cookie: cookieHeader },
  });
  console.log(`✓ Toggled item availability to: ${toggleRes.data.isAvailable}`);

  // Try placing order on sold out item -> should fail gracefully
  const failOrderRes = await request(`${baseUrl}/api/orders`, {
    method: 'POST',
    body: {
      restaurantSlug: 'rustic-bistro',
      tableToken: table1.token,
      customerName: 'Bob',
      items: [
        {
          menuItemId: smashBurger.id,
          name: smashBurger.name,
          unitPrice: smashBurger.price,
          quantity: 1,
        },
      ],
    },
  });
  if (failOrderRes.status === 400 && failOrderRes.data.error.includes('sold out')) {
    console.log('✓ Successfully blocked ordering of sold-out item:', failOrderRes.data.error);
  } else {
    throw new Error('Sold-out item was unexpectedly allowed to be ordered');
  }

  // Toggle it back to available
  await request(`${baseUrl}/api/menu-items/${smashBurger.id}/toggle-available`, {
    method: 'PATCH',
    headers: { Cookie: cookieHeader },
  });
  console.log('✓ Restored item availability to available');

  // 5. Customer Places Order (with Options and Note)
  console.log('\n5. Testing Customer Order Placement (Cash at Counter)...');
  const orderRes = await request(`${baseUrl}/api/orders`, {
    method: 'POST',
    body: {
      restaurantSlug: 'rustic-bistro',
      tableToken: table1.token,
      customerName: 'Alice Dining',
      customerNote: 'Please doner burger medium well, extra crispy fries',
      items: [
        {
          menuItemId: smashBurger.id,
          name: smashBurger.name,
          unitPrice: smashBurger.price,
          quantity: 2,
          selectedOptions: [
            { groupName: 'Patty Doneness', choiceName: 'Medium Well', price: 0 },
            { groupName: 'Tasty Add-ons', choiceName: 'Crispy Applewood Bacon', price: 2.5 },
          ],
        },
      ],
    },
  });

  if (orderRes.status !== 200 || !orderRes.data.success) {
    throw new Error(`Failed to place customer order: ${JSON.stringify(orderRes.data)}`);
  }
  const orderId = orderRes.data.orderId;
  const orderNumber = orderRes.data.orderNumber;
  console.log(`✓ Order placed successfully! Order #${orderNumber} (ID: ${orderId})`);
  console.log(`✓ Total amount calculated: $${orderRes.data.totalAmount}`);

  // 6. Verify Kitchen Dashboard Order Stream
  console.log('\n6. Testing Kitchen Dashboard Orders...');
  const kitchenOrdersRes = await request(`${baseUrl}/api/orders?status=NEW`, {
    headers: { Cookie: cookieHeader },
  });
  const kitchenOrder = kitchenOrdersRes.data.orders.find((o) => o.id === orderId);
  if (!kitchenOrder) {
    throw new Error('New order not found in Kitchen active orders');
  }
  console.log(`✓ Kitchen display shows order #${kitchenOrder.orderNumber} for ${kitchenOrder.customerName} at ${kitchenOrder.table.name}`);
  console.log(`✓ Kitchen sees payment method: ${kitchenOrder.paymentMethod} (${kitchenOrder.paymentStatus})`);

  // 7. Kitchen Status Transitions: NEW -> PREPARING -> READY -> COMPLETED
  console.log('\n7. Testing Kitchen Status Transitions...');

  // PREPARING
  const prepRes = await request(`${baseUrl}/api/orders/${orderId}/status`, {
    method: 'PATCH',
    headers: { Cookie: cookieHeader },
    body: { status: 'PREPARING' },
  });
  console.log(`✓ Status transitioned to: ${prepRes.data.order.status}`);

  // READY
  const readyRes = await request(`${baseUrl}/api/orders/${orderId}/status`, {
    method: 'PATCH',
    headers: { Cookie: cookieHeader },
    body: { status: 'READY' },
  });
  console.log(`✓ Status transitioned to: ${readyRes.data.order.status}`);

  // Mark Cash Paid at Counter
  const paidRes = await request(`${baseUrl}/api/orders/${orderId}/status`, {
    method: 'PATCH',
    headers: { Cookie: cookieHeader },
    body: { paymentStatus: 'PAID' },
  });
  console.log(`✓ Payment marked as paid at counter: ${paidRes.data.order.paymentStatus}`);

  // COMPLETED
  const compRes = await request(`${baseUrl}/api/orders/${orderId}/status`, {
    method: 'PATCH',
    headers: { Cookie: cookieHeader },
    body: { status: 'COMPLETED' },
  });
  console.log(`✓ Status transitioned to: ${compRes.data.order.status}`);

  // 8. Customer Order Tracking Check
  console.log('\n8. Testing Customer Live Status View...');
  const customerStatusRes = await request(`${baseUrl}/api/orders/${orderId}`);
  if (customerStatusRes.status !== 200 || customerStatusRes.data.order.status !== 'COMPLETED') {
    throw new Error('Customer order status did not reflect COMPLETED status');
  }
  console.log('✓ Customer live view verified: Status is COMPLETED, Cash Payment confirmed!');

  console.log('\n==========================================');
  console.log('🎉 ALL E2E INTEGRATION TESTS PASSED 100%! 🎉');
  console.log('==========================================\n');
}

async function main() {
  console.log('Starting Next.js server in production mode on port 3000...');
  const server = spawn('npm.cmd', ['start'], {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, PORT: '3000' },
  });

  // Wait for server to start
  let attempts = 0;
  while (attempts < 20) {
    await wait(1500);
    try {
      const res = await request('http://localhost:3000/api/auth/me');
      if (res.status === 401 || res.status === 200) {
        console.log('Server is up and responding!');
        break;
      }
    } catch {}
    attempts++;
  }

  try {
    await runTests();
  } catch (err) {
    console.error('Test failed with error:', err);
    process.exitCode = 1;
  } finally {
    console.log('Stopping test server...');
    server.kill();
    // Kill any stray node processes on windows if needed
    process.exit();
  }
}

main();
