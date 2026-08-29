import { prisma } from './prisma';

export async function generateTicketNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.ticket.count();
  const sequence = String(count + 1).padStart(6, '0');
  return `TKT-${year}-${sequence}`;
}