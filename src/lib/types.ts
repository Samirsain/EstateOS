export type Role = "MD" | "PC";

export const ROLES: Role[] = ["MD", "PC"];

export type CustomerType = "User" | "Investor";

export const CUSTOMER_TYPES: CustomerType[] = ["User", "Investor"];

export type DealsIn = "Residential" | "Commercial" | "Agriculture" | "Rental";

export const DEALS_IN_OPTIONS: DealsIn[] = [
  "Residential",
  "Commercial",
  "Agriculture",
  "Rental",
];

export interface UserRow {
  id: number;
  username: string;
  name: string;
  role: Role;
  password_hash: string;
  is_active: number;
  created_at: string;
  created_by: number | null;
}

export interface MemberRow {
  id: number;
  member_code: string;
  name: string;
  mobile: string;
  alternate_mobile: string | null;
  city: string | null;
  company_name: string | null;
  deals_in: string;
  experience: string | null;
  aadhaar_encrypted: string;
  aadhaar_index: string;
  aadhaar_last4: string;
  invite_code: string;
  is_active: number;
  created_at: string;
  created_by: number | null;
}

export interface CustomerRow {
  id: number;
  customer_code: string;
  name: string;
  mobile: string;
  customer_type: CustomerType;
  aadhaar_encrypted: string;
  aadhaar_index: string;
  aadhaar_last4: string;
  member_id: number;
  invite_code: string;
  created_at: string;
  created_by: number | null;
}

export interface CustomerWithMember extends CustomerRow {
  member_name: string;
  member_code: string;
}

export interface SessionUser {
  id: number;
  username: string;
  name: string;
  role: Role;
}

export type PlotStatus = "Available" | "Hold" | "Booked" | "Allotted";
export const PLOT_STATUS_OPTIONS: PlotStatus[] = ["Available", "Hold", "Booked", "Allotted"];

export type PlotType = "Residential" | "Commercial" | "Agriculture";
export const PLOT_TYPE_OPTIONS: PlotType[] = ["Residential", "Commercial", "Agriculture"];

export type PlotFacing = "East" | "West" | "North" | "South" | "Corner";
export const PLOT_FACING_OPTIONS: PlotFacing[] = ["East", "West", "North", "South", "Corner"];

export interface ProjectRow {
  id: number;
  code: string;
  name: string;
  location: string;
  total_plots: number;
  status: "Active" | "Completed" | "Upcoming";
  project_type?: PlotType;
  description: string | null;
  created_at: string;
  created_by: number | null;
}

export interface PlotRow {
  id: number;
  plot_code: string;
  project_id: number;
  plot_number: string;
  block: string | null;
  size_sqft: number;
  rate_per_sqft: number;
  total_price: number;
  facing: PlotFacing | null;
  plot_type?: PlotType;
  status: PlotStatus;
  notes: string | null;
  created_at: string;
  created_by: number | null;
}

export interface PlotWithDetails extends PlotRow {
  project_name: string;
  project_location: string;
  allotment_code?: string | null;
  customer_name?: string | null;
  customer_code?: string | null;
  member_name?: string | null;
  member_code?: string | null;
  booking_amount?: number | null;
  payment_status?: string | null;
}

export interface PlotAllotmentRow {
  id: number;
  allotment_code: string;
  plot_id: number;
  customer_id: number;
  member_id: number;
  agreed_price: number;
  booking_amount: number;
  payment_status: "Token" | "Partial" | "Completed";
  allotment_date: string;
  notes: string | null;
  created_by: number | null;
  created_at: string;
}

export interface PlotAllotmentWithDetails extends PlotAllotmentRow {
  plot_number: string;
  plot_code: string;
  project_name: string;
  customer_name: string;
  customer_code: string;
  customer_mobile: string;
  member_name: string;
  member_code: string;
}

/** Shape returned by every server action so forms can render feedback uniformly. */
export interface ActionState {
  ok: boolean;
  message: string;
  /** Field-level validation errors keyed by form field name. */
  errors?: Record<string, string>;
  /** Populated on a successful create so the UI can link to the new record. */
  createdCode?: string;
}

export const EMPTY_ACTION_STATE: ActionState = { ok: false, message: "" };

