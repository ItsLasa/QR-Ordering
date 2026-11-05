const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Clearing existing database...');
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.optionChoice.deleteMany();
  await prisma.optionGroup.deleteMany();
  await prisma.menuItem.deleteMany();
  await prisma.category.deleteMany();
  await prisma.restaurantTable.deleteMany();
  await prisma.restaurant.deleteMany();
  await prisma.user.deleteMany();

  console.log('Creating demo owner...');
  const passwordHash = await bcrypt.hash('password123', 10);
  const user = await prisma.user.create({
    data: {
      email: 'owner@bistro.com',
      passwordHash,
    },
  });

  console.log('Creating restaurant...');
  const restaurant = await prisma.restaurant.create({
    data: {
      userId: user.id,
      name: 'The Rustic Bistro',
      slug: 'rustic-bistro',
      currency: '$',
      address: '104 Main Street, Downtown',
      phone: '+1 (555) 234-5678',
      logoUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=160&h=160&fit=crop&crop=faces',
    },
  });

  console.log('Creating tables with unguessable tokens...');
  const tables = [
    { name: 'Table 1', token: 'tbl_t1_948f2a1b' },
    { name: 'Table 2', token: 'tbl_t2_e7b39c04' },
    { name: 'Table 3', token: 'tbl_t3_a82d41ef' },
    { name: 'Table 4', token: 'tbl_t4_3c9b78d2' },
    { name: 'Patio A', token: 'tbl_pa_8f52de91' },
  ];

  for (const t of tables) {
    await prisma.restaurantTable.create({
      data: {
        restaurantId: restaurant.id,
        name: t.name,
        token: t.token,
      },
    });
  }

  console.log('Creating categories...');
  const catBurgers = await prisma.category.create({
    data: {
      restaurantId: restaurant.id,
      name: 'Burgers & Mains',
      sortOrder: 1,
    },
  });

  const catSides = await prisma.category.create({
    data: {
      restaurantId: restaurant.id,
      name: 'Sides & Starters',
      sortOrder: 2,
    },
  });

  const catDrinks = await prisma.category.create({
    data: {
      restaurantId: restaurant.id,
      name: 'Beverages',
      sortOrder: 3,
    },
  });

  console.log('Creating menu items & options...');
  // Burger 1
  const burger1 = await prisma.menuItem.create({
    data: {
      restaurantId: restaurant.id,
      categoryId: catBurgers.id,
      name: 'Classic Smash Cheeseburger',
      description: 'Double Angus beef patties, aged Wisconsin cheddar, caramelized onions, house pickles, and bistro secret sauce on toasted brioche.',
      price: 13.50,
      imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&fit=crop',
      isAvailable: true,
      sortOrder: 1,
      optionGroups: {
        create: [
          {
            name: 'Patty Doneness',
            isRequired: true,
            allowMultiple: false,
            choices: {
              create: [
                { name: 'Medium Well', price: 0 },
                { name: 'Well Done', price: 0 },
              ],
            },
          },
          {
            name: 'Tasty Add-ons',
            isRequired: false,
            allowMultiple: true,
            choices: {
              create: [
                { name: 'Extra Cheddar Cheese', price: 1.50 },
                { name: 'Crispy Applewood Bacon', price: 2.50 },
                { name: 'Pickled Jalapeños', price: 0.75 },
              ],
            },
          },
        ],
      },
    },
  });

  // Burger 2
  await prisma.menuItem.create({
    data: {
      restaurantId: restaurant.id,
      categoryId: catBurgers.id,
      name: 'Crispy Truffle Chicken Sandwich',
      description: 'Buttermilk fried chicken breast, black truffle aioli, shredded iceberg, and wild honey drizzle on a potato bun.',
      price: 14.00,
      imageUrl: 'https://images.unsplash.com/photo-1625813506062-0aeb1d7a094b?w=600&fit=crop',
      isAvailable: true,
      sortOrder: 2,
      optionGroups: {
        create: [
          {
            name: 'Spice Level',
            isRequired: true,
            allowMultiple: false,
            choices: {
              create: [
                { name: 'Mild', price: 0 },
                { name: 'Medium Spice', price: 0 },
                { name: 'Nashville Hot 🔥', price: 0.50 },
              ],
            },
          },
        ],
      },
    },
  });

  // Burger 3 (Sold Out Demo)
  await prisma.menuItem.create({
    data: {
      restaurantId: restaurant.id,
      categoryId: catBurgers.id,
      name: 'Smoked Brisket Brioche',
      description: '14-hour Texas oak smoked beef brisket with apple cider vinegar slaw and sweet molasses glaze.',
      price: 16.50,
      imageUrl: 'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=600&fit=crop',
      isAvailable: false, // SOLD OUT DEMO
      sortOrder: 3,
    },
  });

  // Sides
  await prisma.menuItem.create({
    data: {
      restaurantId: restaurant.id,
      categoryId: catSides.id,
      name: 'Loaded Truffle Parmesan Fries',
      description: 'Hand-cut russet potatoes tossed with aromatic white truffle oil, freshly grated aged parmesan, and Italian parsley.',
      price: 6.50,
      imageUrl: 'https://images.unsplash.com/photo-1576107232684-1279f3908594?w=600&fit=crop',
      isAvailable: true,
      sortOrder: 1,
      optionGroups: {
        create: [
          {
            name: 'Dip Choice',
            isRequired: false,
            allowMultiple: false,
            choices: {
              create: [
                { name: 'Garlic Aioli', price: 0.75 },
                { name: 'Chipotle Ranch', price: 0.75 },
              ],
            },
          },
        ],
      },
    },
  });

  await prisma.menuItem.create({
    data: {
      restaurantId: restaurant.id,
      categoryId: catSides.id,
      name: 'Crispy Mozzarella Sticks',
      description: 'Golden fried herb-breaded whole milk mozzarella with slow-cooked San Marzano marinara dip.',
      price: 7.50,
      imageUrl: 'https://images.unsplash.com/photo-1531749668029-2db88e4276c7?w=600&fit=crop',
      isAvailable: true,
      sortOrder: 2,
    },
  });

  // Drinks
  await prisma.menuItem.create({
    data: {
      restaurantId: restaurant.id,
      categoryId: catDrinks.id,
      name: 'Fresh Mint Lemonade',
      description: 'Cold-pressed Sicilian lemons, fresh crushed garden mint leaves, and light organic agave nectar over ice.',
      price: 4.50,
      imageUrl: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600&fit=crop',
      isAvailable: true,
      sortOrder: 1,
    },
  });

  await prisma.menuItem.create({
    data: {
      restaurantId: restaurant.id,
      categoryId: catDrinks.id,
      name: 'Salted Caramel Pretzel Shake',
      description: 'Hand-spun Madagascar vanilla bean custard with house caramel swirl and crunchy crushed sea salt pretzels.',
      price: 6.75,
      imageUrl: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=600&fit=crop',
      isAvailable: true,
      sortOrder: 2,
    },
  });

  console.log('Seed completed successfully!');
  console.log('Owner login: owner@bistro.com / password123');
  console.log('Public table URL: /s/rustic-bistro?t=tbl_t1_948f2a1b');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
