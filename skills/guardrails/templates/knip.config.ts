import type { KnipConfig } from 'knip';

export default {
	// A package entry's exports go unchecked by default, so dead public surface accretes unseen
	// A deliberate export takes `/** @public */` at the declaration rather than a widening here
	includeEntryExports: true,
	// Every entry, ignore, and ignoreDependencies item carries a note saying why knip cannot see it
} satisfies KnipConfig;
