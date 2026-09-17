use std::{fs, io::Write, path::PathBuf, sync::Mutex};
use tauri::Manager;

struct StorageLock(Mutex<()>);
struct StorageRoot(Option<PathBuf>);

fn app_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let path = match &app.state::<StorageRoot>().0 {
        Some(path) => path.clone(),
        None => app.path().app_data_dir().map_err(|e| e.to_string())?,
    };
    fs::create_dir_all(&path).map_err(|e| e.to_string())?;
    Ok(path)
}

fn atomic_write(path: &std::path::Path, bytes: &[u8]) -> Result<(), String> {
    let parent = path.parent().ok_or("Dossier de sauvegarde invalide")?;
    fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    let mut temp = tempfile::NamedTempFile::new_in(parent).map_err(|e| e.to_string())?;
    temp.write_all(bytes).map_err(|e| e.to_string())?;
    temp.as_file().sync_all().map_err(|e| e.to_string())?;
    temp.persist(path).map_err(|e| e.to_string())?;
    Ok(())
}

fn asset_path(app: &tauri::AppHandle, id: &str) -> Result<PathBuf, String> {
    if id.is_empty()
        || id.len() > 100
        || !id
            .bytes()
            .all(|b| b.is_ascii_alphanumeric() || b == b'-' || b == b'_')
    {
        return Err("Identifiant de ressource invalide".into());
    }
    Ok(app_dir(app)?.join("assets").join(format!("{id}.glb")))
}

#[tauri::command]
fn load_workspace(app: tauri::AppHandle) -> Result<Option<String>, String> {
    let path = app_dir(&app)?.join("workspace.json");
    match fs::read_to_string(path) {
        Ok(value) => Ok(Some(value)),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
fn save_workspace(
    app: tauri::AppHandle,
    lock: tauri::State<StorageLock>,
    json: String,
) -> Result<(), String> {
    if json.len() > 100 * 1024 * 1024 {
        return Err("Sauvegarde trop volumineuse".into());
    }
    let value: serde_json::Value = serde_json::from_str(&json).map_err(|e| e.to_string())?;
    if value.get("version").and_then(|v| v.as_u64()) != Some(1) {
        return Err("Version de sauvegarde inconnue".into());
    }
    let _guard = lock.0.lock().map_err(|e| e.to_string())?;
    atomic_write(&app_dir(&app)?.join("workspace.json"), json.as_bytes())
}

#[tauri::command]
fn read_asset(app: tauri::AppHandle, id: String) -> Result<Option<Vec<u8>>, String> {
    match fs::read(asset_path(&app, &id)?) {
        Ok(bytes) => Ok(Some(bytes)),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
fn write_asset(app: tauri::AppHandle, id: String, bytes: Vec<u8>) -> Result<(), String> {
    if bytes.len() > 20 * 1024 * 1024 || bytes.len() < 12 || &bytes[..4] != b"glTF" {
        return Err("Ressource GLB invalide".into());
    }
    atomic_write(&asset_path(&app, &id)?, &bytes)
}

pub fn run() {
    // Explicit smoke-test mode isolates both application data and WebView2's profile.
    let smoke_root = if std::env::args().any(|arg| arg == "--smoke-test") {
        Some(PathBuf::from(
            std::env::var_os("WATT_WALLET_SMOKE_DIR").expect("WATT_WALLET_SMOKE_DIR requis"),
        ))
    } else {
        None
    };
    let mut context = tauri::generate_context!();
    if let Some(root) = &smoke_root {
        for window in &mut context.config_mut().app.windows {
            window.visible = false;
            window.data_directory = Some(root.join("webview"));
        }
    }
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .manage(StorageLock(Mutex::new(())))
        .manage(StorageRoot(smoke_root))
        .invoke_handler(tauri::generate_handler![
            load_workspace,
            save_workspace,
            read_asset,
            write_asset
        ])
        .run(context)
        .expect("Impossible de démarrer Watt Wallet");
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn atomic_replace_preserves_complete_contents() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("workspace.json");
        atomic_write(&path, b"old").unwrap();
        atomic_write(&path, b"new complete content").unwrap();
        assert_eq!(fs::read(path).unwrap(), b"new complete content");
    }
}
