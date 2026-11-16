# Rust guardrails

The Rust branch of [`guardrails`](SKILL.md). The rules there apply; this file names the owners and the setup.

| Concern | Owner |
| --- | --- |
| Types, unused code within a crate | `rustc` |
| Formatting | rustfmt |
| Code quality, house style, banned patterns, complexity | Clippy |
| Unused dependencies | cargo-shear |
| Licences, banned crates, sources, build scripts | cargo-deny |
| Boundaries, cycles | Cargo: a crate is a boundary, and crates can't form a cycle |
| Test strength | cargo-mutants, as an audit |

Duplication is a **gap**, and so is a `pub` item no other crate uses, since rustc's dead-code analysis stops at the crate's edge. Advisories run as an audit.

## Setup

[`templates/rust/`](templates/rust/) holds the house configuration. The notes in it are reasons, so keep them in the copy.

1. **Survey.** Read `Cargo.toml`, `Cargo.lock`, and any config these tools already have. Check each template against its tool's docs for the installed version.
2. **Install** cargo-deny and cargo-shear (`cargo install --locked`).
3. **Copy the templates.** Merge `Cargo.toml` into the root manifest, and give every member `[lints] workspace = true` and `publish = false` unless it ships to crates.io. Set the toolchain `channel` to the current stable, and the `deny.toml` targets to where the code ships.
4. **Lock the graph.** Every step runs `--locked`, so run `cargo generate-lockfile` in a new repo, or `cargo update --workspace` once the xtask joins an existing one.
5. **Go green.** Run `cargo xtask fix`, then `cargo xtask check`. cargo-deny fails on every build script in the graph: read each `build.rs` before listing its crate in `allow-build-scripts`.
6. **Tell the agents** with the gate lines from [SKILL.md](SKILL.md), as `cargo xtask check` and `cargo xtask fix`.

Git hooks are optional: install Lefthook, copy `lefthook.yml`, and run `lefthook install`.

## The gate

`cargo xtask check|fix|audit` is the gate: an `xtask` crate in the workspace plus the alias in `.cargo/config.toml`, so it runs anywhere cargo does, and the repo's other dev tasks join it there. The xtask inherits the workspace lints; a project that bans printing or `Command` gives it a crate-level `#![expect]`.

Clippy and cargo-deny run with `-D warnings`, and cargo-shear with `--deny-warnings`. Cargo's own manifest warnings fail nothing and show only beside a failure, so read a plain `cargo check` after editing a manifest. `cargo add` and `cargo remove` update the lockfile; after a hand edit, `cargo update --workspace` does.

`cargo shear --fix` stays out of `fix`: it deletes a dependency an agent has not wired up yet. A dependency added ahead of its first use goes on `[package.metadata.cargo-shear] ignored` with a note.

## Suppressions

- `#[expect(lint, reason = "...")]` on the item, or `#![expect(...)]` when a whole crate shares the reason. `allow_attributes` fails every outer `#[allow]`, and an `#[expect]` whose lint stops firing fails on its own. Clippy's help line suggests `#[allow]`; write the `#[expect]`.
- A member can't loosen the workspace's lints (Cargo refuses a table beside `[lints] workspace = true`), so the exception goes on the code.
- cargo-deny takes a `reason` on each ban and a note on each licence exception.

Two hatches go unwatched: `allow_attributes` misses an inner `#![allow]`, and a crate that leaves the graph stays on `allow-build-scripts`.

## Existing repos

- Turn the tools on in this order: rustfmt, Clippy's default groups, `pedantic`, the restriction lints, cargo-shear, then cargo-deny.
- Fix one lint at a time: `cargo clippy --fix --allow-dirty --allow-staged -- -A clippy::all -A clippy::pedantic -A clippy::restriction -W clippy::<lint>`.
- The ceilings are `too-many-lines-threshold`, `too-many-arguments-threshold`, and `excessive-nesting-threshold` in `clippy.toml`.

## Growing the guardrails

The ban is a `disallowed-methods` or `disallowed-types` entry in `clippy.toml`, `{ path = "...", reason = "..." }`, and Clippy prints the `reason` under the error. One `clippy.toml` covers the workspace, so a ban can't be scoped to files: ban it everywhere, and let the one module that owns the call carry the `#[expect]`. A crate that contradicts the design goes in cargo-deny's `[bans] deny`.

## Audits

- **cargo-mutants** is the mutation tester. Read the `missed` mutants in `mutants.out/`.
- **`cargo xtask audit`** checks advisories.
- **Miri** catches undefined behaviour in a crate that expects `unsafe_code`. It needs nightly.
