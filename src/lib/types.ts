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
