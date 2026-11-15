import js from "@eslint/js";
import tseslint from "typescript-eslint";
import pluginVue from "eslint-plugin-vue";

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginVue.configs["flat/essential"],
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "**/.pgdata/**",
      "**/coverage/**",
      "apps/web/dev-dist/**",
      "apps/web/public/**",
    ],
  },
  {
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      // Les composants mono-mot (App,...) et vues sont des conventions acceptées ici.
      "vue/multi-word-component-names": "off",
    },
  },
  {
    // Permet au parser Vue de déléguer le <script setup lang="ts"> à typescript-eslint.
    files: ["**/*.vue"],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
      },
    },
  },
  {
    files: ["apps/web/**/*.{ts,vue}"],
    languageOptions: {
      globals: {
        window: "readonly",
        document: "readonly",
        navigator: "readonly",
        fetch: "readonly",
        FormData: "readonly",
        File: "readonly",
        Blob: "readonly",
        URL: "readonly",
        Image: "readonly",
        DragEvent: "readonly",
        ClipboardEvent: "readonly",
        MouseEvent: "readonly",
        KeyboardEvent: "readonly",
        HTMLInputElement: "readonly",
        HTMLDialogElement: "readonly",
        HTMLElement: "readonly",
        localStorage: "readonly",
      },
    },
  },
  {
    // Scripts et config Node en JS/CJS/MJS simple (pas de type-checking TS) :
    // on leur donne les globals Node et on désactive les règles TS qui n'ont
    // pas de sens hors fichiers .ts.
    files: ["**/*.cjs", "**/*.mjs", "**/*.config.js"],
    languageOptions: {
      globals: {
        process: "readonly",
        console: "readonly",
        require: "readonly",
        module: "writable",
        exports: "writable",
        __dirname: "readonly",
        __filename: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        URL: "readonly",
        Buffer: "readonly",
        global: "readonly",
      },
    },
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
);
