import { PrismaClient, UserRole } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const [adminPasswordHash, operatorPasswordHash] = await Promise.all([
    hash('Admin@123', 10),
    hash('Operator@123', 10),
  ]);

  const transportTypes = await Promise.all([
    prisma.transportType.upsert({
      where: { name: 'Caminhão' },
      update: { description: 'Entrega urbana padrão' },
      create: { name: 'Caminhão', description: 'Entrega urbana padrão' },
    }),
    prisma.transportType.upsert({
      where: { name: 'Carreta' },
      update: { description: 'Entrega de alto volume' },
      create: { name: 'Carreta', description: 'Entrega de alto volume' },
    }),
    prisma.transportType.upsert({
      where: { name: 'Bi-truck' },
      update: { description: 'Entrega intermunicipal' },
      create: { name: 'Bi-truck', description: 'Entrega intermunicipal' },
    }),
  ]);

  await Promise.all([
    prisma.item.upsert({
      where: { sku: 'SKU-001' },
      update: { name: 'Cimento CP-II', unitOfMeasure: 'saco' },
      create: {
        sku: 'SKU-001',
        name: 'Cimento CP-II',
        description: 'Cimento para construção civil',
        unitOfMeasure: 'saco',
      },
    }),
    prisma.item.upsert({
      where: { sku: 'SKU-002' },
      update: { name: 'Brita 1', unitOfMeasure: 'tonelada' },
      create: {
        sku: 'SKU-002',
        name: 'Brita 1',
        description: 'Agregado graúdo',
        unitOfMeasure: 'tonelada',
      },
    }),
    prisma.item.upsert({
      where: { sku: 'SKU-003' },
      update: { name: 'Areia Média', unitOfMeasure: 'metro cúbico' },
      create: {
        sku: 'SKU-003',
        name: 'Areia Média',
        description: 'Areia para argamassa',
        unitOfMeasure: 'metro cúbico',
      },
    }),
  ]);

  const alphaClient = await prisma.client.upsert({
    where: { code: 'CLI-ALPHA' },
    update: { name: 'Construtora Alpha' },
    create: { code: 'CLI-ALPHA', name: 'Construtora Alpha' },
  });

  const betaClient = await prisma.client.upsert({
    where: { code: 'CLI-BETA' },
    update: { name: 'Distribuidora Beta' },
    create: { code: 'CLI-BETA', name: 'Distribuidora Beta' },
  });

  await prisma.clientTransportType.deleteMany({
    where: { clientId: { in: [alphaClient.id, betaClient.id] } },
  });

  await prisma.clientTransportType.createMany({
    data: [
      {
        clientId: alphaClient.id,
        transportTypeId: transportTypes[0].id,
      },
      {
        clientId: alphaClient.id,
        transportTypeId: transportTypes[1].id,
      },
      {
        clientId: betaClient.id,
        transportTypeId: transportTypes[0].id,
      },
      {
        clientId: betaClient.id,
        transportTypeId: transportTypes[2].id,
      },
    ],
  });

  await Promise.all([
    prisma.user.upsert({
      where: { username: 'admin' },
      update: {
        displayName: 'Administrador OVGS',
        passwordHash: adminPasswordHash,
        role: UserRole.ADMIN,
      },
      create: {
        username: 'admin',
        displayName: 'Administrador OVGS',
        passwordHash: adminPasswordHash,
        role: UserRole.ADMIN,
      },
    }),
    prisma.user.upsert({
      where: { username: 'operator' },
      update: {
        displayName: 'Operador OVGS',
        passwordHash: operatorPasswordHash,
        role: UserRole.OPERATOR,
      },
      create: {
        username: 'operator',
        displayName: 'Operador OVGS',
        passwordHash: operatorPasswordHash,
        role: UserRole.OPERATOR,
      },
    }),
  ]);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });