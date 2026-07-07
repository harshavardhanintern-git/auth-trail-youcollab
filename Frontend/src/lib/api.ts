import axios from "axios";

const BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
  (import.meta.env.DEV ? "http://localhost:5000" : "");

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
});

/**
 * Clerk session token bridge.
 *
 * <AuthBootstrap /> registers Clerk's `getToken` here as soon as the Clerk
 * SDK loads. Every API request then carries a fresh, short-lived Clerk
 * session token — Clerk handles rotation/refresh internally, so no manual
 * refresh queue is needed.
 */
type TokenGetter = () => Promise<string | null>;

let getClerkToken: TokenGetter | null = null;

export const setAuthTokenGetter = (getter: TokenGetter | null) => {
  getClerkToken = getter;
};

apiClient.interceptors.request.use(async (config) => {
  if (getClerkToken) {
    try {
      const token = await getClerkToken();
      if (token) config.headers.Authorization = `Bearer ${token}`;
    } catch {
      /* not signed in — send the request unauthenticated */
    }
  }
  return config;
});

export const unwrap = <T,>(d: { data?: T } | T): T => {
  if (d && typeof d === "object" && "data" in (d as Record<string, unknown>)) {
    return (d as { data: T }).data;
  }
  return d as T;
};
