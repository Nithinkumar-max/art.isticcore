// Artisan Creation Pipeline — strict state machine
// pending_review -> accepted -> in_progress -> finishing -> quality_check -> ready_for_delivery -> delivered
export type OrderStatus =
  | 'pending_review'
  | 'accepted'
  | 'in_progress'
  | 'finishing'
  | 'quality_check'
  | 'ready_for_delivery'
  | 'delivered'
  | 'cancelled'
  | 'refunded';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Database = any
