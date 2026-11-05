import eslintComments from "@eslint-community/eslint-plugin-eslint-comments";
import eslint from "@eslint/js";
import perfectionist from "eslint-plugin-perfectionist";
import unicorn from "eslint-plugin-unicorn";
import { defineConfig, globalIgnores, includeIgnoreFile } from "eslint/config";
import path from "node:path";
import tseslint from "typescript-eslint";

// ESLint walks gitignored paths, such as agent scratch under .claude, unless told otherwise
const gitignored = includeIgnoreFile(
  path.join(import.meta.dirname, ".gitignore"),
);

// Configs written for other repos, importing packages this one never installs
const foreignConfigs = globalIgnores(["skills/guardrails/templates"]);

export default defineConfig(
  gitignored,
  foreignConfigs,
  eslint.configs.recommended,
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  unicorn.configs.recommended,
  perfectionist.configs["recommended-natural"],
  {
    languageOptions: { parserOptions: { projectService: true } },
    linterOptions: { reportUnusedDisableDirectives: "error" },
    plugins: { "@eslint-community/eslint-comments": eslintComments },
    rules: {
      "@eslint-community/eslint-comments/require-description": "error",
      // An empty string means absent, so `||` on a string is meant
      "@typescript-eslint/prefer-nullish-coalescing": [
        "error",
        { ignorePrimitives: { string: true } },
      ],
      "@typescript-eslint/restrict-template-expressions": [
        "error",
        { allowNumber: true },
      ],
      // Its fixer moves declarations blind to what depends on their order
      "perfectionist/sort-modules": "off",
      // JSON speaks `null` for absent
      "unicorn/no-null": "off",
      // Rewrites a flat guard-clause ladder into a ternary chain
      "unicorn/prefer-ternary": "off",
    },
  },
);
