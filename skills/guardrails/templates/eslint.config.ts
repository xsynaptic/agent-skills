import eslintComments from '@eslint-community/eslint-plugin-eslint-comments';
import eslint from '@eslint/js';
import perfectionist from 'eslint-plugin-perfectionist';
import unicorn from 'eslint-plugin-unicorn';
import { defineConfig } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// A scoped block that redefines `no-restricted-syntax` spreads this back in; ESLint replaces rule options wholesale
const restrictedSyntax = [
	{
		message: 'Re-export named symbols explicitly; `export *` hides what a module exposes.',
		selector: 'ExportAllDeclaration',
	},
	{
		message: 'Separate type imports into their own `import type` statement.',
		selector: 'ImportDeclaration[importKind="value"] ImportSpecifier[importKind="type"]',
	},
];

// Globals Node lacks; `window` in server code is a bug that the DOM lib hides from tsc
const browserOnlyGlobals = Object.keys(globals.browser).filter(
	(name) => !Object.hasOwn(globals.nodeBuiltin, name),
);

export default defineConfig(
	{ ignores: ['**/dist/**', '**/.cache/**', '**/temp/**', '.claude/worktrees/**'] },
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
			'@typescript-eslint/array-type': ['error', { default: 'generic' }],
			'@typescript-eslint/consistent-type-imports': [
				'error',
				{ fixStyle: 'separate-type-imports', prefer: 'type-imports' },
			],
			'@typescript-eslint/no-unused-vars': [
				'error',
				{
					argsIgnorePattern: '^_',
					caughtErrorsIgnorePattern: '^_',
					destructuredArrayIgnorePattern: '^_',
					ignoreRestSiblings: true,
					varsIgnorePattern: '^_',
				},
			],
			// The expanded form names its target twice and reads as the assignment it is
			'logical-assignment-operators': ['error', 'never'],
			'no-restricted-syntax': ['error', ...restrictedSyntax],
			// Its fixer moves declarations blind to what depends on their order
			'perfectionist/sort-modules': 'off',
			// Its order is the reverse of perfectionist/sort-classes, which fixes where this only suggests
			'unicorn/consistent-class-member-order': 'off',
			'unicorn/consistent-conditional-object-spread': ['error', 'ternary'],
			// The exact inverse of the core `logical-assignment-operators` above
			'unicorn/logical-assignment-operators': 'off',
			// Schema composition and data pipelines legitimately reach 4
			'unicorn/max-nested-calls': ['error', { max: 4 }],
			// Short conventional names (db, env, args) read fine
			'unicorn/name-replacements': 'off',
			// Passing a named predicate (`.filter(isPublished)`) is the house pattern
			'unicorn/no-array-callback-reference': 'off',
			// Lowercase hex to match Prettier
			'unicorn/number-literal-case': ['error', { hexadecimalValue: 'lowercase' }],
			// Guard clauses state one reason to leave each; these two merge or invert them
			'unicorn/prefer-combined-guards': 'off',
			'unicorn/prefer-early-return': 'off',
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
		languageOptions: {
			globals: {
				...Object.fromEntries(Object.keys(globals.nodeBuiltin).map((name) => [name, 'off'])),
				...globals.browser,
			},
		},
		rules: { 'no-undef': 'error' },
	},
	{
		// `no-undef` cannot guard this side; it misreads type namespaces such as `NodeJS`
		files: ['src/**/*.ts'],
		ignores: ['src/client/**'],
		rules: {
			'no-restricted-globals': [
				'error',
				...browserOnlyGlobals.map((name) => ({
					message: 'Browser code lives under src/client.',
					name,
				})),
			],
		},
	},
);
