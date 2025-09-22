#!/usr/bin/env rustscript
//! A standalone script to generate TypeScript bindings for proof of concept
//! Run with: rustc generate-bindings.rs && ./generate-bindings

use tauri_specta::{Builder, collect_commands};
use specta_typescript::Typescript;

// Import the commands we've annotated
use barqly_vault_lib::commands::vault_commands::{
    create_vault, list_vaults, get_current_vault, set_current_vault, delete_vault,
    init_yubikey_for_vault, register_yubikey_for_vault,
};
use barqly_vault_lib::commands::yubikey_commands::streamlined::list_yubikeys;

fn main() {
    println!("Generating TypeScript bindings...");

    let mut builder = Builder::<tauri::Wry>::new()
        .commands(collect_commands![
            // Vault commands (annotated with #[specta::specta])
            create_vault,
            list_vaults,
            get_current_vault,
            set_current_vault,
            delete_vault,
            // YubiKey vault integration (annotated)
            init_yubikey_for_vault,
            register_yubikey_for_vault,
            // Streamlined YubiKey commands (annotated)
            list_yubikeys,
        ]);

    builder
        .export(Typescript::default(), "../src-ui/src/bindings.ts")
        .expect("Failed to export typescript bindings");

    println!("TypeScript bindings generated successfully!");
}