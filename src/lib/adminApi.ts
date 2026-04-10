import axios, { AxiosInstance, AxiosError } from "axios";

const BASE_URL = import.meta.env.VITE_API_URL || "https://amdon-backened.vercel.app/api";

const adminClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
});

adminClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("amdon_access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  const adminSecret = localStorage.getItem("amdon_admin_secret");
  if (adminSecret) config.headers["x-admin-secret"] = adminSecret;
  return config;
});

function extractError(err: unknown): string {
  const e = err as AxiosError<{ error?: string; errors?: { msg: string }[] }>;
  if (e.response?.data?.errors) return e.response.data.errors.map((x) => x.msg).join(", ");
  return e.response?.data?.error || e.message || "An unexpected error occurred";
}

// ─── Types ───────────────────────────────────────────────────────
export interface DashboardData {
  totalCount: number;
  registrationsByState: { state: string; count: number }[];
  registrationsByLGA: { lga: string; state: string; count: number }[];
  progressiveReport: { month: string; count: number; cumulative: number }[];
  lastTen: AdminMember[];
  withoutPayments: AdminMember[];
}

export interface AdminMember {
  member_id: string;
  account_status: string;
  created_at: string;
  member_bio?: {
    first_name: string;
    middle_name?: string;
    last_name: string;
    gender?: string;
    occupation?: string;
    photo_url?: string;
    date_of_birth?: string;
  };
  member_location?: {
    state: string;
    lga: string;
    full_address?: string;
    dealership_name?: string;
    dealership_category?: string;
  };
  member_contact?: {
    email: string;
    phone_primary?: string;
    phone_secondary?: string;
  };
}

export interface PaymentRecord {
  id: string;
  member_id: string;
  amount: number;
  status: string;
  payment_date: string;
  payment_method?: string;
  reference?: string;
  created_at: string;
}

export interface YearlyDuesData {
  year: number;
  totalMembers: number;
  totalPaid: number;
  totalDefaulters: number;
  stateBreakdown: { state: string; count: number; members: AdminMember[] }[];
  allDues: { member_id: string; year: number; amount: number; status: string; payment_date: string }[];
}

export interface Report {
  id: string;
  reporter_id?: string;
  reported_member_id: string;
  issue_type: string;
  description: string;
  status: string;
  admin_notes?: string;
  created_at: string;
  resolved_at?: string;
}

export interface AdminUser {
  id: string;
  email: string;
  role: string;
  permissions: string[];
  created_at: string;
  last_login?: string;
}

// ─── Dashboard ──────────────────────────────────────────────────
export async function getDashboard(): Promise<DashboardData> {
  try {
    const { data } = await adminClient.get("/admin/dashboard");
    return data;
  } catch (err) {
    throw new Error(extractError(err));
  }
}

// ─── Members ────────────────────────────────────────────────────
export async function getMembers(params?: {
  page?: number;
  limit?: number;
  search?: string;
  state?: string;
  status?: string;
}): Promise<{ members: AdminMember[]; total: number; page: number; totalPages: number }> {
  try {
    const { data } = await adminClient.get("/admin/members", { params });
    return data;
  } catch (err) {
    throw new Error(extractError(err));
  }
}

export async function getMember(memberId: string): Promise<{ member: AdminMember }> {
  try {
    const { data } = await adminClient.get(`/admin/members/${memberId}`);
    return data;
  } catch (err) {
    throw new Error(extractError(err));
  }
}

export async function updateMember(memberId: string, updates: {
  bio?: Record<string, unknown>;
  location?: Record<string, unknown>;
  contact?: Record<string, unknown>;
  accountStatus?: string;
}): Promise<void> {
  try {
    await adminClient.patch(`/admin/members/${memberId}`, updates);
  } catch (err) {
    throw new Error(extractError(err));
  }
}

// ─── Registration Payments ───────────────────────────────────────
export async function getRegistrationPayments(params?: {
  page?: number;
  limit?: number;
  status?: string;
}): Promise<{ payments: PaymentRecord[]; total: number; summary: { totalPaid: number; totalPending: number; totalCount: number } }> {
  try {
    const { data } = await adminClient.get("/admin/payments/registration", { params });
    return data;
  } catch (err) {
    throw new Error(extractError(err));
  }
}

export async function recordRegistrationPayment(payload: {
  memberId: string;
  amount: number;
  status?: string;
  paymentMethod?: string;
  reference?: string;
}): Promise<void> {
  try {
    await adminClient.post("/admin/payments/registration", payload);
  } catch (err) {
    throw new Error(extractError(err));
  }
}

// ─── Yearly Dues ─────────────────────────────────────────────────
export async function getYearlyDues(year?: number): Promise<YearlyDuesData> {
  try {
    const { data } = await adminClient.get("/admin/payments/yearly-dues", { params: { year } });
    return data;
  } catch (err) {
    throw new Error(extractError(err));
  }
}

export async function recordYearlyDue(payload: {
  memberId: string;
  year: number;
  amount?: number;
  status?: string;
  paymentMethod?: string;
  reference?: string;
}): Promise<void> {
  try {
    await adminClient.post("/admin/payments/yearly-dues", payload);
  } catch (err) {
    throw new Error(extractError(err));
  }
}

// ─── Reports ────────────────────────────────────────────────────
export async function getReports(params?: {
  page?: number;
  limit?: number;
  status?: string;
}): Promise<{ reports: Report[]; total: number }> {
  try {
    const { data } = await adminClient.get("/admin/reports", { params });
    return data;
  } catch (err) {
    throw new Error(extractError(err));
  }
}

export async function createReport(payload: {
  reportedMemberId: string;
  issueType: string;
  description: string;
  reporterId?: string;
}): Promise<void> {
  try {
    await adminClient.post("/admin/reports", payload);
  } catch (err) {
    throw new Error(extractError(err));
  }
}

export async function updateReport(reportId: string, updates: {
  status?: string;
  adminNotes?: string;
}): Promise<void> {
  try {
    await adminClient.patch(`/admin/reports/${reportId}`, updates);
  } catch (err) {
    throw new Error(extractError(err));
  }
}

// ─── Roles ──────────────────────────────────────────────────────
export async function getAdmins(): Promise<{ admins: AdminUser[] }> {
  try {
    const { data } = await adminClient.get("/admin/roles");
    return data;
  } catch (err) {
    throw new Error(extractError(err));
  }
}

export async function addAdmin(payload: {
  email: string;
  role: string;
  permissions: string[];
  password: string;
}): Promise<void> {
  try {
    await adminClient.post("/admin/roles", payload);
  } catch (err) {
    throw new Error(extractError(err));
  }
}

export async function updateAdmin(adminId: string, updates: {
  role?: string;
  permissions?: string[];
}): Promise<void> {
  try {
    await adminClient.patch(`/admin/roles/${adminId}`, updates);
  } catch (err) {
    throw new Error(extractError(err));
  }
}

// ─── API: Member search ──────────────────────────────────────────
export async function apiSearchMember(params: {
  id?: string;
  phone?: string;
  email?: string;
}): Promise<{ found: boolean; member?: AdminMember }> {
  try {
    const { data } = await adminClient.get("/admin/api/members/search", { params });
    return data;
  } catch (err) {
    throw new Error(extractError(err));
  }
}

export async function apiAddMember(payload: Record<string, unknown>): Promise<{ memberId: string }> {
  try {
    const { data } = await adminClient.post("/admin/api/members", payload);
    return data;
  } catch (err) {
    throw new Error(extractError(err));
  }
}

export async function apiUpdateMember(payload: {
  id?: string;
  phone?: string;
  email?: string;
  updates: Record<string, unknown>;
}): Promise<void> {
  try {
    await adminClient.patch("/admin/api/members/update", payload);
  } catch (err) {
    throw new Error(extractError(err));
  }
}
