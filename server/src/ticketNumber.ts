import { prisma } from './prisma';

export async function generateTicketNumber(): Promise<string> {
  const year = new Date().getFullYear();

  const lastTicket = await prisma.ticket.findFirst({
    where: { ticketNumber: { startsWith: `TKT-${year}-` } },
    orderBy: { id: 'desc' },
  });

  let nextSequence = 1;
  if (lastTicket) {
    const parts = lastTicket.ticketNumber.split('-');
    const lastSequence = parseInt(parts[2], 10);
    nextSequence = lastSequence + 1;
  }

  return `TKT-${year}-${String(nextSequence).padStart(6, '0')}`;
}
