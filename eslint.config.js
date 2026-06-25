import js from "@eslint/js";
import tseslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier";

export default tseslint.config(
  { ignores: ["dist/", "node_modules/", "captures/", ".auth/", ".husky/"] },
  {
    files: ["**/*.ts"],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.strictTypeChecked,
      ...tseslint.configs.stylisticTypeChecked,
    ],
    languageOptions: {
      parserOptions: {
        project: "./tsconfig.eslint.json",
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Numbers in template literals are fine; everything else stays restricted.
      "@typescript-eslint/restrict-template-expressions": ["error", { allowNumber: true }],
    },
  },
  {
    // Dev scripts and tests run via Node's TS stripping and talk to loosely-typed
    // surfaces (the MCP client SDK, the test harness); relax the type-aware rules
    // that fight those boundaries. Production code in src/ stays fully strict.
    files: ["scripts/**/*.ts", "test/**/*.ts"],
    rules: {
      "@typescript-eslint/no-floating-promises": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "@typescript-eslint/no-unnecessary-condition": "off",
      "@typescript-eslint/no-confusing-void-expression": "off",
      "@typescript-eslint/prefer-nullish-coalescing": "off",
      "@typescript-eslint/restrict-template-expressions": "off",
    },
  },
  eslintConfigPrettier,
);
