#![allow(clippy::disallowed_macros)] // Binaries can use println!

fn main() {
    barqly_vault_lib::generate_typescript_bindings().expect("Failed to export TypeScript bindings");

    println!("✅ TypeScript bindings generated successfully at src-ui/src/bindings.ts");
}
