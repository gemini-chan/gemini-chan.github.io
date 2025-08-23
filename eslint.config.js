import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ["dist/", "node_modules/", "*.config.js", "*.config.ts", ".cache/"],
  },
  {
    files: ["**/*.ts"],
    extends: [
      ...tseslint.configs.recommended,
    ],
    rules: {},
  },
  {
    files: ["**/*.test.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-unused-expressions": "off"
    }
  }
);