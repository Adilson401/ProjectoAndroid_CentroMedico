import pkg from '@prisma/client';
const { PrismaClient } = pkg;
const prisma = new PrismaClient();

async function run() {
  try {
    const result = await prisma.$runCommandRaw({
      update: 'Usuario',
      updates: [
        {
          q: { dataRegisto: { $type: 'string' } },
          u: [
            {
              $set: {
                dataRegisto: { $toDate: '$dataRegisto' },
              },
            },
          ],
          upsert: false,
          multi: true,
        },
      ],
    });
    console.log('Raw update result:', result);
  } catch (error) {
    console.error('Fix error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

run();
