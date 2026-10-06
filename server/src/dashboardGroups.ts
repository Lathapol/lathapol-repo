// Shared status groupings (specification.md §5.3) so a dashboard count and its
// drill-down list always filter the same way (BR-17).
export const OPEN_GROUP = ['NEW', 'OPEN', 'IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'REOPENED'] as const;
export const RESOLVED_GROUP = ['RESOLVED', 'CLOSED'] as const;
export const ALL_STATUSES = ['NEW', 'OPEN', 'IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'RESOLVED', 'CLOSED', 'REOPENED', 'CANCELLED'] as const;
export const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH'] as const;
export const RECENT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export function groupStatuses(group: unknown): string[] | undefined {
  if (group === 'open') return [...OPEN_GROUP];
  if (group === 'resolved') return [...RESOLVED_GROUP];
  return undefined;
}
export function recentSince(recent: unknown): Date | undefined {
  return recent === '7d' ? new Date(Date.now() - RECENT_WINDOW_MS) : undefined;
}
