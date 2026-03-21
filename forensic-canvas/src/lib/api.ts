export type ApiError = {
  message: string;
  status: number;
  code?: string;
  requestId?: string;
};

export type SessionUser = {
  email?: string;
};

export type CaseRecord = {
  case_id: string;
  title?: string;
  description?: string;
  created_at?: string;
};

export type SketchMutationResponse = {
  signed_image_url?: string;
  image_url?: string;
  version?: number;
  refinement_mode?: string;
  fallback_used?: boolean;
  fallback_reason?: string;
  img2img?: {
    strength?: number;
    guidance_scale?: number;
    num_inference_steps?: number;
  };
};

export type TimelineResponse = {
  timeline?: Array<{
    event_type?: string;
    payload?: {
      signed_image_url?: string;
      image_url?: string;
      created_at?: string;
    };
  }>;
  sketches?: Array<{ signed_image_url?: string; image_url?: string }>;
};

export const ACCESS_TOKEN_KEY = "access_token";
export const USER_EMAIL_KEY = "user_email";
export const CURRENT_CASE_ID_KEY = "current_case_id";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").trim();

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  authenticated?: boolean;
};

type ApiSuccessEnvelope<T = unknown> = {
  success?: boolean;
  error?: string;
  error_model?: {
    message?: string;
    code?: string;
    request_id?: string;
  };
} & T;

function authHeaders() {
  const token = localStorage.getItem(ACCESS_TOKEN_KEY) || "";
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function toApiUrl(path: string): string {
  if (!API_BASE_URL) return path;
  if (/^https?:\/\//i.test(path)) return path;
  const base = API_BASE_URL.replace(/\/$/, "");
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${base}${suffix}`;
}

async function parseJsonSafe(response: Response): Promise<any> {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

function asApiError(status: number, data: any): ApiError {
  const message = data?.error_model?.message || data?.error || `Request failed (${status})`;
  const code = data?.error_model?.code;
  const requestId = data?.error_model?.request_id;
  return { message, status, code, requestId };
}

function withDefaultHeaders(options: RequestOptions): HeadersInit {
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (options.authenticated) {
    return { ...headers, ...authHeaders() };
  }
  return headers;
}

async function apiRequest<TResponse extends Record<string, unknown> = Record<string, unknown>>(
  path: string,
  options: RequestOptions = {},
): Promise<ApiSuccessEnvelope<TResponse>> {
  const response = await fetch(toApiUrl(path), {
    method: options.method || "GET",
    headers: withDefaultHeaders(options),
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  const data = (await parseJsonSafe(response)) as ApiSuccessEnvelope<TResponse>;
  if (!response.ok || !data.success) {
    const requestId = response.headers.get("X-Request-Id") || data?.error_model?.request_id || undefined;
    const err = asApiError(response.status, data);
    if (requestId) err.requestId = requestId;
    if (response.status === 401) {
      clearSession();
      if (typeof window !== "undefined" && window.location.pathname !== "/") {
        window.location.assign("/");
      }
    }
    throw err;
  }

  return data;
}

export function isAuthenticated(): boolean {
  return !!(localStorage.getItem(ACCESS_TOKEN_KEY) || "").trim();
}

export function currentUserEmail(): string {
  return localStorage.getItem(USER_EMAIL_KEY) || "";
}

export function clearSession() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(USER_EMAIL_KEY);
  localStorage.removeItem(CURRENT_CASE_ID_KEY);
}

export function setSession(accessToken: string, user?: SessionUser) {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken || "");
  localStorage.setItem(USER_EMAIL_KEY, user?.email || "");
}

export function getCurrentCaseId(): string {
  return (localStorage.getItem(CURRENT_CASE_ID_KEY) || "").trim();
}

export function setCurrentCaseId(caseId: string) {
  localStorage.setItem(CURRENT_CASE_ID_KEY, (caseId || "").trim());
}

export async function login(email: string, password: string) {
  return apiRequest("/auth/login", {
    method: "POST",
    body: { email, password },
  });
}

export async function signup(email: string, password: string) {
  return apiRequest("/auth/signup", {
    method: "POST",
    body: { email, password },
  });
}

export async function resetPassword(email: string) {
  return apiRequest("/auth/password-reset", {
    method: "POST",
    body: { email },
  });
}

export async function listCases(): Promise<CaseRecord[]> {
  const data = await apiRequest<{ cases?: CaseRecord[] }>("/cases/list", {
    authenticated: true,
  });
  return data.cases || [];
}

export async function createCase(title: string, description: string): Promise<CaseRecord> {
  const data = await apiRequest<{ case?: CaseRecord }>("/cases/create", {
    method: "POST",
    body: { title, description },
    authenticated: true,
  });
  return data.case as CaseRecord;
}

export async function getCase(caseId: string): Promise<CaseRecord> {
  const data = await apiRequest<{ case?: CaseRecord }>(`/cases/${encodeURIComponent(caseId)}`, {
    authenticated: true,
  });
  return data.case as CaseRecord;
}

export async function generateSketch(caseId: string, description: string, model?: string): Promise<SketchMutationResponse> {
  return apiRequest("/sketch/generate", {
    method: "POST",
    body: { case_id: caseId, description, model: model || undefined },
    authenticated: true,
  });
}

export async function addRefinement(input: {
  caseId: string;
  description: string;
  refinement: string;
  attributeType: string;
  xCoord?: string;
  yCoord?: string;
  strength?: number;
  guidanceScale?: number;
}): Promise<SketchMutationResponse> {
  const payload: any = {
    case_id: input.caseId,
    description: input.description,
    refinement: input.refinement,
    attribute_type: input.attributeType,
    refinement_mode: "img2img",
  };

  if ((input.xCoord || "").trim()) payload.x_coord = Number(input.xCoord);
  if ((input.yCoord || "").trim()) payload.y_coord = Number(input.yCoord);
  if (typeof input.strength === "number") payload.strength = input.strength;
  if (typeof input.guidanceScale === "number") payload.guidance_scale = input.guidanceScale;

  return apiRequest("/refine/add", {
    method: "POST",
    body: payload,
    authenticated: true,
  });
}

export async function getTimeline(caseId: string): Promise<TimelineResponse> {
  return apiRequest(`/cases/${encodeURIComponent(caseId)}/timeline`, {
    authenticated: true,
  });
}
