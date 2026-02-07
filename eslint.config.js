import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
      // Progressive strictness: warn now, enforce later via lint:strict
      // TODO: Tighten to "error" once all `any` types are resolved
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
  // E2E / Playwright tests — no React rules, relax any
  {
    files: ["e2e/**/*.{ts,tsx}"],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    rules: {
      "react-hooks/rules-of-hooks": "off",
      "react-refresh/only-export-components": "off",
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  // Supabase edge functions — Deno runtime, no React
  {
    files: ["supabase/functions/**/*.{ts,tsx}"],
    rules: {
      "react-hooks/rules-of-hooks": "off",
      "react-refresh/only-export-components": "off",
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
);
