pub mod application;
pub mod domain;
pub mod infrastructure;

pub use application::VaultManager;
pub use domain::{VaultError, VaultResult};

// Re-export infrastructure persistence functions (replacing storage::vault_store)
pub use infrastructure::{
    MetadataStorage, RecipientInfo, RecipientType, VaultMetadata, delete_vault, get_current_vault,
    get_vault, list_vaults, load_vault, save_vault, vault_exists,
};
