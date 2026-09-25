const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  try {
    await prisma.student.upsert({
      where: {
        instituteId_satsNumber: {
          instituteId: 'test',
          satsNumber: 'test'
        }
      },
      update: {},
      create: { instituteId: 'test', satsNumber: 'test', name: 'test' }
    });
  } catch(e) {
    console.log(e.message);
  }
}
run();
