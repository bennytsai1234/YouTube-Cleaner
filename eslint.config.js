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

const GM_STORAGE_CALL = {
  selector: "CallExpression[callee.name=/^GM_(getValue|setValue|deleteValue|listValues)$/]",
  message: "設定讀寫只透過 ConfigManager（src/core/config.ts）。",
};

// 直接改 display／visibility 會讓 clearFilterState 還原不了。
const STYLE_VISIBILITY_CHANGE = [
  {
    selector: "AssignmentExpression[left.object.property.name='style'][left.property.name=/^(display|visibility)$/]",
    message: "隱藏與還原元素走 src/features/dom-visibility.ts（hideElement／clearFilterState）。",
  },
  {
    selector:
      "CallExpression[callee.object.property.name='style'][callee.property.name=/^(setProperty|removeProperty)$/][arguments.0.value=/^(display|visibility)$/]",
    message: "隱藏與還原元素走 src/features/dom-visibility.ts（hideElement／clearFilterState）。",
  },
];

export default [
  {
    ignores: [
      "node_modules/**",
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
  {
    files: ["src/**/*.ts"],
    rules: { "no-restricted-syntax": ["error", GM_STORAGE_CALL, ...STYLE_VISIBILITY_CHANGE] },
  },
  // ConfigManager 本身，和自己存介面語言的 I18N（例外的理由見 CODING_STANDARDS.md）。
  {
    files: ["src/core/config.ts", "src/ui/i18n.ts"],
    rules: { "no-restricted-syntax": ["error", ...STYLE_VISIBILITY_CHANGE] },
  },
  {
    files: ["src/features/dom-visibility.ts"],
    rules: { "no-restricted-syntax": ["error", GM_STORAGE_CALL] },
  },
];
