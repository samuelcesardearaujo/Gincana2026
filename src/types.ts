export type UserRole = 'ADMIN' | 'LIDER';

export interface Team {
  id: string;
  name: string;
  color_hex: string;
  teacher_in_charge: string;
  leader_name?: string;
  vice_leader_name?: string;
  mascot_name?: string;
  mascot_image_url?: string;
  war_cry?: string;
  presentation_details?: string;
  total_score: number;
}

export interface ScoreAuditLog {
  id: string;
  team_name: string;
  changed_by: string;
  previous_points: number;
  new_points: number;
  points_delta: number;
  reason: string;
  timestamp: string;
}

export interface DonationRecord {
  id: string;
  date: string;
  category: 'Alimentos' | 'Higiene' | 'Brinquedos' | 'Roupas';
  team_id: string;
  quantity: number;
}
