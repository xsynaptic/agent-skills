use std::env;
use std::ffi::OsString;
use std::path::PathBuf;
use std::process::{Command, ExitCode};

const USAGE: &str = "usage: cargo xtask <check|fix|audit>";

const CHECK_STEPS: &[&[&str]] = &[
    &["fmt", "--all", "--check"],
    &["shear", "--locked", "--deny-warnings"],
    &[
        "deny", "--locked", "check", "bans", "licenses", "sources", "-D", "warnings",
    ],
    &[
        "clippy",
        "--workspace",
        "--all-targets",
        "--locked",
        "--",
        "-D",
        "warnings",
    ],
    &["test", "--workspace", "--locked"],
];

const FIX_STEPS: &[&[&str]] = &[
    &["fmt", "--all"],
    &[
        "clippy",
        "--fix",
        "--allow-dirty",
        "--allow-staged",
        "--workspace",
        "--all-targets",
        "--locked",
    ],
];

// Advisories turn red on news rather than on a change in the repo, so they stay out of the gate
const AUDIT_STEPS: &[&[&str]] = &[&["deny", "--locked", "check", "advisories", "-D", "warnings"]];

fn main() -> ExitCode {
    let mut args = env::args().skip(1);
    let task = args.next();
    if args.next().is_some() {
        eprintln!("{USAGE}");
        return ExitCode::FAILURE;
    }

    let succeeded = match task.as_deref() {
        Some("check") => run_steps(CHECK_STEPS),
        Some("fix") => run_steps(FIX_STEPS) && run_steps(CHECK_STEPS),
        Some("audit") => run_steps(AUDIT_STEPS),
        Some(_) | None => {
            eprintln!("{USAGE}");
            false
        }
    };
    if !succeeded {
        return ExitCode::FAILURE;
    }
    ExitCode::SUCCESS
}

// Output shows only on failure, so a passing step never buries the one that failed
fn run_steps(steps: &[&[&str]]) -> bool {
    let cargo = env::var_os("CARGO").unwrap_or_else(|| OsString::from("cargo"));
    let workspace_root = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("..");

    for step in steps {
        let output = match Command::new(&cargo)
            .args(*step)
            .current_dir(&workspace_root)
            .output()
        {
            Ok(output) => output,
            Err(error) => {
                eprintln!("xtask: could not run cargo: {error}");
                return false;
            }
        };
        if output.status.success() {
            continue;
        }
        eprint!(
            "{}{}",
            String::from_utf8_lossy(&output.stdout),
            String::from_utf8_lossy(&output.stderr)
        );
        eprintln!("xtask: `cargo {}` failed", step.join(" "));
        return false;
    }
    true
}
