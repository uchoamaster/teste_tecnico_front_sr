import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { hash } from 'bcryptjs';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

describe('SalesOrders (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );

    prisma = app.get(PrismaService);
    await app.init();
  });

  beforeEach(async () => {
    await prisma.auditEvent.deleteMany();
    await prisma.salesOrderItem.deleteMany();
    await prisma.salesOrder.deleteMany();
    await prisma.clientTransportType.deleteMany();
    await prisma.client.deleteMany();
    await prisma.transportType.deleteMany();
    await prisma.item.deleteMany();
    await prisma.user.deleteMany();
  });

  it('creates a sales order when client, transport type, and items are valid', async () => {
    await prisma.user.create({
      data: {
        username: 'operator-test',
        displayName: 'Operador Teste',
        passwordHash: await hash('Operator@123', 10),
        role: 'OPERATOR',
      },
    });

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: 'operator-test', password: 'Operator@123' })
      .expect(201);

    const transportType = await prisma.transportType.create({
      data: { name: 'Caminhão', description: 'Entrega padrão' },
    });
    const item = await prisma.item.create({
      data: {
        sku: 'SKU-TESTE',
        name: 'Item teste',
        description: 'Integração',
        unitOfMeasure: 'caixa',
      },
    });
    const client = await prisma.client.create({
      data: {
        code: 'CLI-INT',
        name: 'Cliente Integração',
        authorizedTransportTypes: {
          create: [{ transportTypeId: transportType.id }],
        },
      },
    });

    const response = await request(app.getHttpServer())
      .post('/sales-orders')
      .set('authorization', `Bearer ${loginResponse.body.accessToken}`)
      .send({
        clientId: client.id,
        transportTypeId: transportType.id,
        items: [{ itemId: item.id, quantity: 3 }],
      })
      .expect(201);

    expect(response.body.status).toBe('CRIADA');
    expect(response.body.client.id).toBe(client.id);
    expect(response.body.transportType.id).toBe(transportType.id);
    expect(response.body.items).toHaveLength(1);
  });

  it('rotates refresh tokens and issues a new access token', async () => {
    await prisma.user.create({
      data: {
        username: 'admin-refresh',
        displayName: 'Admin Refresh',
        passwordHash: await hash('Admin@123', 10),
        role: 'ADMIN',
      },
    });

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: 'admin-refresh', password: 'Admin@123' })
      .expect(201);

    const refreshResponse = await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: loginResponse.body.refreshToken })
      .expect(201);

    expect(refreshResponse.body.accessToken).toBeDefined();
    expect(refreshResponse.body.refreshToken).toBeDefined();
    expect(refreshResponse.body.refreshToken).not.toBe(loginResponse.body.refreshToken);
    expect(refreshResponse.body.user.username).toBe('admin-refresh');
  });

  afterAll(async () => {
    await app.close();
  });
});
