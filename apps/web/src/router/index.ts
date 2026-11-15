import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "../stores/auth";

declare module "vue-router" {
  interface RouteMeta {
    public?: boolean;
  }
}

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/login", name: "login", component: () => import("../views/LoginView.vue"), meta: { public: true } },
    { path: "/", name: "dashboard", component: () => import("../views/DashboardView.vue") },
    { path: "/contrats", name: "contrats", component: () => import("../views/ContractsView.vue") },
    { path: "/paiements", name: "paiements", component: () => import("../views/PaymentsView.vue") },
    { path: "/alertes", name: "alertes", component: () => import("../views/AlertsView.vue") },
  ],
});

router.beforeEach(async (to) => {
  const auth = useAuthStore();
  if (!auth.bootstrapped) await auth.bootstrap();

  if (!auth.isAuthenticated && !to.meta.public) return { name: "login", query: { redirect: to.fullPath } };
  if (auth.isAuthenticated && to.name === "login") return { name: "dashboard" };
  return true;
});

export default router;
