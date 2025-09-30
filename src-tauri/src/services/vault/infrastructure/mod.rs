pub mod persistence;
pub mod vault_repository;

pub use vault_repository::VaultRepository;

// Re-export persistence functions for convenience
pub use persistence::{
    MetadataStorage, RecipientInfo, RecipientType, VaultMetadata, delete_vault, get_current_vault,
    get_vault, list_vaults, load_vault, save_vault, vault_exists,
};
