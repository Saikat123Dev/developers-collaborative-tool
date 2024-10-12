const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const { faker } = require('@faker-js/faker');

const prisma = new PrismaClient();
const BATCH_SIZE = 100; // Number of users to insert in one batch

async function main() {
  for (let i = 0; i < 10000; i += BATCH_SIZE) {
    const users = [];

    for (let j = 0; j < BATCH_SIZE; j++) {
      if (i + j >= 10000) break; // Avoid going beyond 10,000

      const username = faker.internet.userName();
      const name = faker.person.fullName();
      const email = faker.internet.email();
      const password = 'password123'; // This is just a reference, not inserted directly

      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 10);

      users.push({
        username,
        name,
        email,
        password:hashedPassword, // Correct field name
      });
    }

    // Insert users in parallel
    await Promise.all(
      users.map(user => {
        return prisma.user.create({ data: user });
      })
    );

    console.log(`Inserted ${Math.min(i + BATCH_SIZE, 10000)} users`);
  }

  console.log('10,000 users created successfully!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
