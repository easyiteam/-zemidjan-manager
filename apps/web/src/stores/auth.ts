import { defineStore } from "pinia";
import * as authApi from "../api/auth";
import type { AuthUser } from "../api/types";

export const useAuthStore = defineStore("auth", {
  state: () => ({
    accessToken: null as string | null,
    user: null as AuthUser | null,
    /** true une fois qu'on a tenté de restaurer la session au démarrage. */
    bootstrapped: false,
  }),
  getters: {
    isAuthenticated: (state) => !!state.accessToken,
  },
  actions: {
    async login(email: string, password: string) {
      const { accessToken, user } = await authApi.login({ email, password });
      this.accessToken = accessToken;
      this.user = user;
    },

    async logout() {
      await authApi.logout();
      this.accessToken = null;
      this.user = null;
    },

    /** Tente de restaurer une session via le cookie de refresh (ex: F5). */
    async bootstrap() {
      if (this.bootstrapped) return;
      try {
        const result = await authApi.refresh();
        if (result) {
          this.accessToken = result.accessToken;
          this.user = result.user;
        }
      } finally {
        this.bootstrapped = true;
      }
    },

    /** Utilisé par le client API quand une requête répond 401. */
    async refreshToken(): Promise<string | null> {
      const result = await authApi.refresh();
      if (!result) {
        this.accessToken = null;
        this.user = null;
        return null;
      }
      this.accessToken = result.accessToken;
      this.user = result.user;
      return result.accessToken;
    },
  },
});
