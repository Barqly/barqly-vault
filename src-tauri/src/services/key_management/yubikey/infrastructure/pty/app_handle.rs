/// Global AppHandle management for binary path resolution
/// This module provides a way to access the Tauri AppHandle from anywhere in the app
/// to resolve bundled resource paths at runtime instead of compile-time
use once_cell::sync::OnceCell;
use std::sync::Arc;
use tauri::AppHandle;

static APP_HANDLE: OnceCell<Arc<AppHandle>> = OnceCell::new();

/// Initialize the global AppHandle instance
/// This should be called once during app startup
pub fn init_app_handle(handle: AppHandle) {
    let _ = APP_HANDLE.set(Arc::new(handle));
}

/// Get a reference to the global AppHandle
/// Returns None if not initialized (e.g., in tests or development)
pub fn get_app_handle() -> Option<Arc<AppHandle>> {
    APP_HANDLE.get().cloned()
}

/// Check if we're running in a bundled app context
pub fn is_bundled() -> bool {
    APP_HANDLE.get().is_some()
}
