import eslintComments from '@eslint-community/eslint-plugin-eslint-comments';
import eslint from '@eslint/js';
import perfectionist from 'eslint-plugin-perfectionist';
import unicorn from 'eslint-plugin-unicorn';
import { defineConfig, includeIgnoreFile } from 'eslint/config';
import globals from 'globals';
import path from 'node:path';
import tseslint from 'typescript-eslint';

// ESLint walks gitignored paths unless told
// Hoisted, since unicorn reads a call inside `defineConfig` as a side effect
const gitignored = includeIgnoreFile(path.join(import.meta.dirname, '.gitignore'));

// Globals Node lacks; `window` in server code is a bug that the DOM lib hides from tsc
const browserOnlyGlobals = Object.keys(globals.browser)
	.filter((name) => !Object.hasOwn(globals.nodeBuiltin, name))
	.map((name) => ({ message: 'Browser code lives under src/client.', name }));

const clientGlobals = {
	...Object.fromEntries(Object.keys(globals.nodeBuiltin).map((name) => [name, 'off' as const])),
	...globals.browser,
};

export default defineConfig(
	gitignored,
	eslint.configs.recommended,
	tseslint.configs.strictTypeChecked,
	tseslint.configs.stylisticTypeChecked,
	unicorn.configs.recommended,
	perfectionist.configs['recommended-natural'],
	{
		languageOptions: {
			globals: { ...globals.builtin, ...globals.nodeBuiltin },
			parserOptions: { projectService: true },
		},
		// A suppression outlives the problem it was written for; a stale one fails on its own
		linterOptions: { reportUnusedDisableDirectives: 'error' },
		plugins: { '@eslint-community/eslint-comments': eslintComments },
		rules: {
			'@eslint-community/eslint-comments/require-description': [
				'error',
				{ ignore: ['eslint-enable'] },
			],
			// Numbers read the same in a message as they do in code; strict bans them with every other type
			'@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
			// Its fixer moves declarations blind to what depends on their order
			'perfectionist/sort-modules': 'off',
			// Its order is the reverse of perfectionist/sort-classes, which fixes where this only suggests
			'unicorn/consistent-class-member-order': 'off',
			// Lowercase hex to match Prettier
			'unicorn/number-literal-case': ['error', { hexadecimalValue: 'lowercase' }],
			// Guard clauses state one reason to leave each; this merges them
			'unicorn/prefer-combined-guards': 'off',
			// Fixes to ES2025 helpers the es2023 lib rejects
			'unicorn/prefer-iterator-to-array': 'off',
			// Rewrites a flat guard-clause ladder into a ternary chain
			'unicorn/prefer-ternary': 'off',
			// Blows a one-line tag comment up into three lines
			'unicorn/single-line-block-comment-style': 'off',
		},
	},
	{
		// Ceilings that make an agent decompose; an existing repo starts at its worst case and ratchets down
		rules: {
			complexity: ['warn', { max: 8, variant: 'modified' }],
			'max-depth': ['warn', 3],
			'max-lines-per-function': ['warn', { max: 100, skipBlankLines: true, skipComments: true }],
			'max-params': ['warn', 3],
			'max-statements': ['warn', 25],
		},
	},
	{
		extends: [tseslint.configs.disableTypeChecked],
		files: ['**/*.{js,mjs,cjs}'],
	},
	{
		// A suite's length is a table of cases, not a complexity signal
		files: ['**/*.test.ts'],
		rules: {
			'max-lines-per-function': 'off',
			'max-statements': 'off',
		},
	},
	{
		// typescript-eslint turns `no-undef` off for TS files, and without it these globals bind nothing
		files: ['src/client/**/*.ts'],
		languageOptions: { globals: clientGlobals },
		rules: { 'no-undef': 'error' },
	},
	{
		// `no-undef` cannot guard this side; it misreads type namespaces such as `NodeJS`
		files: ['src/**/*.ts'],
		ignores: ['src/client/**'],
		rules: { 'no-restricted-globals': ['error', ...browserOnlyGlobals] },
	},
);
