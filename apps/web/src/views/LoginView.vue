<script setup lang="ts">
import { ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth";
import { ApiError } from "../api/client";

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();

const email = ref("");
const password = ref("");
const error = ref("");
const loading = ref(false);

async function onSubmit() {
  error.value = "";
  if (!email.value || !password.value) {
    error.value = "Veuillez renseigner email et mot de passe.";
    return;
  }
  loading.value = true;
  try {
    await auth.login(email.value.trim(), password.value);
    const redirect = typeof route.query.redirect === "string" ? route.query.redirect : "/";
    router.replace(redirect);
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : "Email ou mot de passe incorrect.";
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 16px">
    <form class="card" style="width: min(360px, 100%)" @submit.prevent="onSubmit">
      <div class="logo" style="justify-content: center; margin-bottom: 18px"><b>ZM//</b> Zémidjan Manager</div>
      <label class="f"><span>Email</span><input v-model="email" type="email" autocomplete="username" required /></label>
      <label class="f"><span>Mot de passe</span><input v-model="password" type="password" autocomplete="current-password" required /></label>
      <p v-if="error" class="warn note" role="alert">{{ error }}</p>
      <button type="submit" class="btn pri" style="width: 100%; justify-content: center" :disabled="loading">
        {{ loading ? "Connexion…" : "Se connecter" }}
      </button>
    </form>
  </div>
</template>
