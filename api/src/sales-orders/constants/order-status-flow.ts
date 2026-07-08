import { OrderStatus } from '@prisma/client';

export const ORDER_STATUS_FLOW: OrderStatus[] = [
  OrderStatus.CRIADA,
  OrderStatus.PLANEJADA,
  OrderStatus.AGENDADA,
  OrderStatus.EM_TRANSPORTE,
  OrderStatus.ENTREGUE,
];

export const getExpectedNextStatus = (status: OrderStatus) => {
  const currentIndex = ORDER_STATUS_FLOW.indexOf(status);
  return ORDER_STATUS_FLOW[currentIndex + 1] ?? null;
};