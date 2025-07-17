use directories::ProjectDirs;
use std::path::PathBuf;

pub fn get_log_dir() -> Option<PathBuf> {
    if let Some(proj_dirs) = ProjectDirs::from("com", "Barqly", "Vault") {
        let log_dir = proj_dirs.data_dir().join("logs");
        Some(log_dir)
    } else {
        None
    }
}
