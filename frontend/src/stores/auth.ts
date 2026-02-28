import { create } from "zustand";
import api from "@/lib/api";

interface Tenant { tenantId: string; tenantName: string; tenantSlug: string; }
interface User { id: string; email: string; displayName: string | null; isPlatformAdmin: boolean; tenantId?: string | null; permissions?: string[]; }

interface AuthState {
  user: User | null;
  tenants: Tenant[];
  currentTenant: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchMe: () => Promise<void>;
  switchTenant: (tenantId: string) => Promise<void>;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  tenants: [],
  currentTenant: null,
  loading: true,

  login: async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    // Store token for Bearer auth fallback (cookie may not work on http)
    if (data.token) {
      localStorage.setItem("auth_token", data.token);
      api.defaults.headers.common["Authorization"] = `Bearer ${data.token}`;
    }
    set({ user: data.user, tenants: data.tenants, currentTenant: data.currentTenant, loading: false });
  },

  logout: async () => {
    try { await api.post("/auth/logout"); } catch {}
    localStorage.removeItem("auth_token");
    delete api.defaults.headers.common["Authorization"];
    set({ user: null, tenants: [], currentTenant: null });
  },

  fetchMe: async () => {
    // Restore token from localStorage
    const token = localStorage.getItem("auth_token");
    if (token) {
      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    }
    try {
      const { data } = await api.get("/auth/me");
      set({ user: data.user, tenants: data.tenants, currentTenant: data.user.tenantId, loading: false });
    } catch {
      localStorage.removeItem("auth_token");
      delete api.defaults.headers.common["Authorization"];
      set({ user: null, loading: false });
    }
  },

  switchTenant: async (tenantId) => {
    await api.post("/auth/switch-tenant", { tenantId });
    set({ currentTenant: tenantId });
    window.location.reload();
  },
}));
