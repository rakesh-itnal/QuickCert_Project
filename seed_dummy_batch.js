const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const inst = await prisma.institute.findFirst();
  if (!inst) {
    console.log('No institute found');
    return;
  }
  
  await prisma.importBatch.create({
    data: {
      fileName: 'Dummy_Past_Upload.xlsx',
      importedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      studentCount: 50,
      classAdmittedTo: '1st PUC',
      instituteId: inst.id
    }
  });
  console.log('Created dummy batch successfully!');
}

main().finally(() => prisma.$disconnect());
