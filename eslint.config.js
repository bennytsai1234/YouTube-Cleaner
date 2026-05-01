import js from "@eslint/js";
import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import globals from "globals";

const tampermonkeyGlobals = {
  GM_info: "readonly",
  GM_addStyle: "readonly",
  GM_setValue: "readonly",
  GM_getValue: "readonly",
  GM_registerMenuCommand: "readonly",
  GM_unregisterMenuCommand: "readonly",
  trustedTypes: "readonly",
};

export default [
  {
    ignores: [
      "node_modules/**",
      "playwright-report/**",
      "test-results/**",
      "youtube-homepage-cleaner.user.js",
    ],
  },
  js.configs.recommended,
  {
    files: ["src/**/*.ts", "test/**/*.ts"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
      globals: {
        ...globals.browser,
        ...globals.es2021,
        ...globals.greasemonkey,
        ...tampermonkeyGlobals,
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { varsIgnorePattern: "^GM_|err|e" },
      ],
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-this-alias": "off",
      "@typescript-eslint/ban-ts-comment": "off",
      "no-undef": "off",
      "no-empty": "warn",
    },
  },
];
