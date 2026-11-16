# Rust guardrails

The Rust branch of [`guardrails`](SKILL.md). The rules there apply; this file names the owners and the setup.

| Concern | Owner |
| --- | --- |
| Types, unused code within a crate | `rustc` |
| Formatting | rustfmt |
| Code quality, house style, banned patterns, complexity | Clippy |
| Unused dependencies | cargo-shear |
| Licences, banned crates, sources | cargo-deny |
| Boundaries, cycles | Cargo: a crate is a boundary, and crates can't form a cycle |
| Test strength | cargo-mutants, as an audit |

Duplication is a **gap**, as are a `pub` item no other crate uses (rustc's dead-code analysis stops at the crate's edge) and what a dependency's build script runs. Advisories run as an audit.

## Setup

[`templates/rust/`](templates/rust/) holds the house configuration. The notes in it are reasons, so keep them in the copy.

1. **Survey.** Read `Cargo.toml`, `Cargo.lock`, and any config these tools already have. Check each template against its tool's docs for the installed version.
2. **Install** cargo-deny and cargo-shear (`cargo install --locked`).
3. **Copy the templates.** Merge `Cargo.toml` into the root manifest, and give every member `[lints] workspace = true` and `publish = false` unless it ships to crates.io. Set the `deny.toml` targets to where the code ships. An application pins `rust-toolchain.toml` to the current stable; a library, or a crate someone else builds from its checkout (a Zed extension), leaves it out and tests on stable, the toolchain its builders actually have.
4. **Lock the graph.** Every step runs `--locked`, so run `cargo generate-lockfile` in a new repo, or `cargo update --workspace` once the xtask joins an existing one.
5. **Go green.** Run `cargo xtask fix`, then `cargo xtask check`.
6. **Tell the agents** with the gate lines from [SKILL.md](SKILL.md), as `cargo xtask check` and `cargo xtask fix`.

Git hooks are optional: install Lefthook, copy `lefthook.yml`, and run `lefthook install`.

## The gate

`cargo xtask check|fix|audit` is the gate: an `xtask` crate in the workspace plus the alias in `.cargo/config.toml`, so it runs anywhere cargo does, and the repo's other dev tasks join it there. The xtask inherits the workspace lints; a project that bans printing or `Command` gives it a crate-level `#![expect]`. A repo with another language runs those tools from the xtask too, through its package manager's scripts (`pnpm run format:check`), so that lockfile pins them.

Clippy and cargo-deny run with `-D warnings`, and cargo-shear with `--deny-warnings`. Cargo's own manifest warnings fail nothing and show only beside a failure, so read a plain `cargo check` after editing a manifest. `cargo add` and `cargo remove` update the lockfile; after a hand edit, `cargo update --workspace` does.

`cargo shear --fix` stays out of `fix`: it deletes a dependency an agent has not wired up yet. A dependency added ahead of its first use goes on `[package.metadata.cargo-shear] ignored` with a note.

## Suppressions

- `#[expect(lint, reason = "...")]` on the item, or `#![expect(...)]` when a whole crate shares the reason. `allow_attributes` fails every outer `#[allow]`, and an `#[expect]` whose lint stops firing fails on its own. Clippy's help line suggests `#[allow]`; write the `#[expect]`.
- A member can't loosen the workspace's lints (Cargo refuses a table beside `[lints] workspace = true`), so the exception goes on the code.
- cargo-deny takes a `reason` on each ban and a note on each licence exception.

One hatch goes unwatched: `allow_attributes` misses an inner `#![allow]`.

## Existing repos

- Turn the tools on in this order: rustfmt, Clippy's default groups, `pedantic`, the restriction lints, cargo-shear, then cargo-deny.
- Fix one lint at a time: `cargo clippy --fix --allow-dirty --allow-staged -- -A clippy::all -A clippy::pedantic -A clippy::restriction -W clippy::<lint>`.
- The ceilings are `too-many-lines-threshold` and `too-many-arguments-threshold` in `clippy.toml`.

## Growing the guardrails

The ban is a `disallowed-methods` or `disallowed-types` entry in `clippy.toml`, `{ path = "...", reason = "..." }`, and Clippy prints the `reason` under the error. One `clippy.toml` covers the workspace, so a ban can't be scoped to files: ban it everywhere, and let the one module that owns the call carry the `#[expect]`. A crate that contradicts the design goes in cargo-deny's `[bans] deny`.

## CI

CI installs what the gate needs and runs `cargo xtask check`. Jobs a dev machine can't reproduce, such as a library's minimum-version check or other operating systems, sit beside it.

- Install cargo-deny and cargo-shear at exact versions (`taiki-e/install-action` takes `tool@version`): under `-D warnings`, a tool release can turn the gate red with no change in the repo.
- A library published to crates.io declares `rust-version`. Clippy's `incompatible_msrv` flags std APIs newer than it, and a CI job running `cargo +<rust-version> check --locked` covers language features and dependencies.
- A weekly scheduled workflow runs `cargo xtask audit`; nothing else does.

## Audits

- **cargo-mutants** is the mutation tester. Read the `missed` mutants in `mutants.out/`.
- **`cargo xtask audit`** checks advisories.
- **Miri** catches undefined behaviour in a crate that expects `unsafe_code`. It needs nightly.
