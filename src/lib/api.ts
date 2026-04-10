import axios, { AxiosInstance, AxiosError } from "axios";

// ─── Base URL ────────────────────────────────────────────────────
const BASE_URL = import.meta.env.VITE_API_URL || "https://amdon-backened.vercel.app/api"; 
// ─── Axios instance ──────────────────────────────────────────────
const client: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
});

// ─── Auth token injection ─────────────────────────────────────────
client.interceptors.request.use((config) => {
  const token = localStorage.getItem("amdon_access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Error normaliser ─────────────────────────────────────────────
function extractError(err: unknown): string {
  const e = err as AxiosError<{ error?: string; errors?: { msg: string }[] }>;
  if (e.response?.data?.errors) {
    return e.response.data.errors.map((x) => x.msg).join(", ");
  }
  return e.response?.data?.error || e.message || "An unexpected error occurred";
}

// ═══════════════════════════════════════════════════════════════════
// REGISTRATION
// ═══════════════════════════════════════════════════════════════════

export interface SubmitRegistrationPayload {
  // Step 1
  firstName: string;
  middleName?: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  nationality: string;
  occupation: string;
  photoUrl?: string;
  // Step 2
  state: string;
  lga: string;
  fullAddress: string;
  dealershipName?: string;
  dealershipCategory?: string;
  yearsInOperation?: string;
  businessDescription?: string;
  // Step 3
  phonePrimary: string;
  phoneSecondary?: string;
  email: string;
  nokName: string;
  nokPhone: string;
  referralSource?: string;
}

export interface RegistrationResult {
  success: boolean;
  memberId: string;
  fullName: string;
}

/** Submit the full 3-step registration form */
export async function submitRegistration(
  payload: SubmitRegistrationPayload
): Promise<RegistrationResult> {
  try {
    const { data } = await client.post("/registration/submit", payload);
    return data;
  } catch (err) {
    throw new Error(extractError(err));
  }
}

/** Upload profile photo — returns { photoUrl } */
export async function uploadPhoto(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("photo", file);
  try {
    const { data } = await client.post("/registration/upload-photo", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data.photoUrl as string;
  } catch (err) {
    throw new Error(extractError(err));
  }
}

/** Get all states for dropdown */
export async function fetchStates(): Promise<{ name: string; code: string }[]> {
  const { data } = await client.get("/registration/states");
  return data.states;
}

/** Get LGAs for a given state name */
export async function fetchLgas(stateName: string): Promise<string[]> {
  const { data } = await client.get(
    `/registration/lgas/${encodeURIComponent(stateName)}`
  );
  return data.lgas;
}

/** Get active dealership categories */
export async function fetchCategories(): Promise<{ id: string; name: string }[]> {
  const { data } = await client.get("/registration/categories");
  return data.categories;
}

// ═══════════════════════════════════════════════════════════════════
// AUTH
// ═══════════════════════════════════════════════════════════════════

/** Create login account after registration */
export async function createLoginAccount(
  email: string,
  password: string,
  memberId: string,
  fullName: string

): Promise<void> {
  try {
    await client.post("/auth/register-user", { email, password, memberId, fullName });
  } catch (err) {
    throw new Error(extractError(err));
  }
}

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  user: { id: string; email: string };
}

/** Login with email + password */
export async function login(
  email: string,
  password: string
): Promise<LoginResult> {
  try {
    const { data } = await client.post("/auth/login", { email, password });
    return data;
  } catch (err) {
    throw new Error(extractError(err));
  }
}

// ═══════════════════════════════════════════════════════════════════
// MEMBER DASHBOARD
// ═══════════════════════════════════════════════════════════════════

export interface MemberProfile {
  memberId: string;
  accountStatus: string;
  registrationDate: string;
  bio: {
    first_name: string;
    middle_name: string | null;
    last_name: string;
    date_of_birth: string;
    gender: string;
    nationality: string;
    occupation: string;
    photo_url: string | null;
  };
  location: {
    state: string;
    lga: string;
    full_address: string;
    dealership_name: string | null;
    dealership_category: string | null;
    years_in_operation: number | null;
    business_description: string | null;
  };
  contact: {
    phone_primary: string;
    phone_secondary: string | null;
    email: string;
    nok_name: string;
    nok_phone: string;
    referral_source: string | null;
  };
}

/** Get logged-in member's full dashboard data */
export async function getMyProfile(): Promise<MemberProfile> {
  try {
    const { data } = await client.get("/members/me");
    return data.member;
  } catch (err) {
    throw new Error(extractError(err));
  }
}

export interface ContactUpdatePayload {
  phonePrimary?: string;
  phoneSecondary?: string;
  email?: string;
  nokName?: string;
  nokPhone?: string;
}

/** Update contact info (member self-service) */
export async function updateContact(payload: ContactUpdatePayload): Promise<void> {
  try {
    await client.patch("/members/me/contact", payload);
  } catch (err) {
    throw new Error(extractError(err));
  }
}

export interface AddressUpdatePayload {
  fullAddress?: string;
  businessDescription?: string;
}

/** Update address / dealership description (member self-service) */
export async function updateAddress(payload: AddressUpdatePayload): Promise<void> {
  try {
    await client.patch("/members/me/address", payload);
  } catch (err) {
    throw new Error(extractError(err));
  }
}

/** Update profile photo */
export async function updatePhoto(photoUrl: string): Promise<void> {
  try {
    await client.patch("/members/me/photo", { photoUrl });
  } catch (err) {
    throw new Error(extractError(err));
  }
}

// ═══════════════════════════════════════════════════════════════════
// QUERY / LOOKUP
// ═══════════════════════════════════════════════════════════════════

export interface QueryResult {
  found: boolean;
  profile?: MemberProfile;
  message?: string;
}

/** Public member lookup by ID or name */
export async function queryMember(
  searchTerm: string
): Promise<QueryResult> {
  try {
    // Detect if it's a member ID (starts with AMDON-)
    const isId = searchTerm.toUpperCase().startsWith("AMDON-");
    const params = isId ? { id: searchTerm } : { name: searchTerm };
    const { data } = await client.get("/query/member", { params });
    return data;
  } catch (err) {
    const e = err as AxiosError<{ found: boolean; message: string }>;
    if (e.response?.status === 404) {
      return { found: false, message: e.response.data.message };
    }
    throw new Error(extractError(err));
  }
}

// ═══════════════════════════════════════════════════════════════
// New auth endpoints
// ═══════════════════════════════════════════════════════════════

/** Verify email OTP after registration */
export async function verifyEmail(email: string, code: string): Promise<void> {
  try {
    await client.post("/auth/verify-email", { email, code });
  } catch (err) {
    throw new Error(extractError(err));
  }
}

/** Resend verification OTP */
export async function resendVerification(email: string, fullName: string): Promise<void> {
  try {
    await client.post("/auth/resend-verification", { email, fullName });
  } catch (err) {
    throw new Error(extractError(err));
  }
}

/** Request a password reset OTP */
export async function forgotPassword(email: string): Promise<void> {
  try {
    await client.post("/auth/forgot-password", { email });
  } catch (err) {
    throw new Error(extractError(err));
  }
}

/** Reset password using OTP code */
export async function resetPassword(
  email: string,
  code: string,
  newPassword: string
): Promise<void> {
  try {
    await client.post("/auth/reset-password", { email, code, newPassword });
  } catch (err) {
    throw new Error(extractError(err));
  }
}