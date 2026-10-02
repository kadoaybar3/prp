export type ServiceType = 'ht' | 'prp' | 'both';
export type PaymentMethod = 'cash' | 'card' | 'mixed';
export type SessionStatus = 'scheduled' | 'completed' | 'cancelled';

export interface Patient {
  id: string;
  user_id: string;
  full_name: string;
  phone: string | null;
  address: string | null;
  medical_notes: string | null;
  service_type: ServiceType;
  created_at: string;
}

export interface HairTransplant {
  id: string;
  patient_id: string;
  user_id: string;
  operation_date: string;
  total_price: number | null;
  payment_method: PaymentMethod;
  payment_notes: string | null;
  graft_count: number | null;
  technique_notes: string | null;
  created_at: string;
}

export interface PrpCycle {
  id: string;
  patient_id: string;
  user_id: string;
  total_sessions: number;
  cycle_interval_days: number;
  start_date: string;
  total_price: number | null;
  created_at: string;
}

export interface PrpSession {
  id: string;
  prp_cycle_id: string;
  patient_id: string;
  user_id: string;
  session_number: number;
  scheduled_date: string;
  status: SessionStatus;
  fee_amount: number | null;
  fee_paid: boolean;
  rescheduled_from: string | null;
  created_at: string;
}

export interface PatientWithDetails extends Patient {
  hair_transplants: HairTransplant[];
  prp_cycles: PrpCycleWithSessions[];
}

export interface PrpCycleWithSessions extends PrpCycle {
  prp_sessions: PrpSession[];
}

export interface CalendarEvent {
  id: string;
  date: string;
  type: 'ht' | 'prp';
  patientName: string;
  patientId: string;
  sessionNumber?: number;
  totalSessions?: number;
  status?: SessionStatus;
}
