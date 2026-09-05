// Simplified order workflow
// confirmed -> preparing -> ready_for_dispatch -> handed_over
export type OrderStatus =
  | 'confirmed'
  | 'preparing'
  | 'ready_for_dispatch'
  | 'handed_over'
  | 'cancelled'
  | 'refunded';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Database = any
