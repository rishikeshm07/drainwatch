// ============================================================
// DrainWatch – Shared TypeScript Types
// ============================================================

export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'escalated';
export type TicketPriority = 'low' | 'medium' | 'high' | 'critical';
export type UserRole = 'ward_officer' | 'supervisor' | 'admin';

export interface Ward {
  id: string;
  ward_number: number;
  ward_name: string;
  zone: string | null;
  authority_email: string | null;
  authority_name: string | null;
  created_at: string;
}

export interface Ticket {
  id: string;
  ticket_number: string;
  title: string;
  description: string | null;
  latitude: number;
  longitude: number;
  address: string | null;
  ward_id: string | null;
  ward_number: number | null;
  ward?: Ward;
  status: TicketStatus;
  priority: TicketPriority;
  ai_severity_tag: string | null;
  ai_confidence: number | null;
  photo_url: string | null;
  resolved_photo_url: string | null;
  reporter_name: string | null;
  reporter_phone: string | null;
  reporter_email: string | null;
  assigned_officer_id: string | null;
  assigned_officer_name: string | null;
  resolution_notes: string | null;
  sla_hours: number;
  escalated_at: string | null;
  escalated_to: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TicketEvent {
  id: string;
  ticket_id: string;
  event_type: string;
  old_value: string | null;
  new_value: string | null;
  note: string | null;
  actor_id: string | null;
  actor_name: string | null;
  created_at: string;
}

export interface Profile {
  id: string;
  full_name: string | null;
  role: UserRole;
  ward_id: string | null;
  ward_number: number | null;
  avatar_url: string | null;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ReportFormData {
  title: string;
  description: string;
  latitude: number | null;
  longitude: number | null;
  address: string;
  reporter_name: string;
  reporter_phone: string;
  reporter_email: string;
  photo: File | null;
}

export interface MapPin {
  id: string;
  ticket_number: string;
  latitude: number;
  longitude: number;
  status: TicketStatus;
  title: string;
  ai_severity_tag: string | null;
  created_at: string;
}

export interface SLAInfo {
  hoursElapsed: number;
  hoursRemaining: number;
  percentUsed: number;
  isOverdue: boolean;
  isEscalated: boolean;
}
