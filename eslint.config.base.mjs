// Shared flat config. Workspaces run `eslint .` and pick this up from the repo root.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import security from 'eslint-plugin-security';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      'packages/**',
      '**/.next/**',
      '**/cdk.out/**',
      '**/coverage/**',
      '**/node_modules/**',
      '**/next-env.d.ts',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.strict,
  security.configs.recommended,
  {
    languageOptions: {
      globals: { ...globals.node },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-extraneous-class': 'off', // NestJS modules are decorated empty classes
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
    },
  },
  {
    // Operator CLI scripts: inputs are the operator's own CLI args and local files, not
    // untrusted request data, so these request-oriented rules don't apply.
    files: ['scripts/**/*.mjs'],
    rules: {
      'security/detect-object-injection': 'off',
      'security/detect-non-literal-fs-filename': 'off',
    },
  },
  {
    files: ['**/*.test.ts', '**/*.spec.ts'],
    rules: {
      // Tests index fixtures by variable keys; not a user-input path.
      'security/detect-object-injection': 'off',
    },
  },
);
