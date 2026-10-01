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

fn read_workspace(path: &std::path::Path) -> Result<Option<String>, String> {
    match fs::read_to_string(path) {
        Ok(value) => Ok(Some(value)),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

fn replace_workspace(
    root: &std::path::Path,
    json: &str,
    expected: Option<&str>,
) -> Result<(), String> {
    // A separate file keeps the lock stable while workspace.json is atomically replaced.
    let lock = fs::OpenOptions::new()
        .read(true)
        .write(true)
        .create(true)
        .truncate(false)
        .open(root.join("workspace.lock"))
        .map_err(|e| e.to_string())?;
    lock.lock().map_err(|e| e.to_string())?;
    let path = root.join("workspace.json");
    if read_workspace(&path)?.as_deref() != expected {
        return Err("WORKSPACE_CONFLICT".into());
    }
    atomic_write(&path, json.as_bytes())
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
    read_workspace(&path)
}

#[tauri::command]
fn save_workspace(
    app: tauri::AppHandle,
    lock: tauri::State<StorageLock>,
    json: String,
    expected_json: Option<String>,
) -> Result<(), String> {
    if json.len() > 100 * 1024 * 1024 {
        return Err("Sauvegarde trop volumineuse".into());
    }
    let value: serde_json::Value = serde_json::from_str(&json).map_err(|e| e.to_string())?;
    if value.get("version").and_then(|v| v.as_u64()) != Some(1) {
        return Err("Version de sauvegarde inconnue".into());
    }
    let _guard = lock.0.lock().map_err(|e| e.to_string())?;
    replace_workspace(&app_dir(&app)?, &json, expected_json.as_deref())
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
    #[test]
    fn stale_writer_cannot_replace_newer_workspace() {
        let dir = tempfile::tempdir().unwrap();
        replace_workspace(dir.path(), "initial", None).unwrap();
        replace_workspace(dir.path(), "first change", Some("initial")).unwrap();
        assert_eq!(
            replace_workspace(dir.path(), "stale change", Some("initial")),
            Err("WORKSPACE_CONFLICT".into())
        );
        assert_eq!(
            read_workspace(&dir.path().join("workspace.json"))
                .unwrap()
                .as_deref(),
            Some("first change")
        );
    }
    #[test]
    fn concurrent_writers_share_the_file_lock() {
        let dir = tempfile::tempdir().unwrap();
        replace_workspace(dir.path(), "initial", None).unwrap();
        let barrier = std::sync::Arc::new(std::sync::Barrier::new(2));
        let threads: Vec<_> = ["first", "second"]
            .into_iter()
            .map(|value| {
                let root = dir.path().to_path_buf();
                let barrier = barrier.clone();
                std::thread::spawn(move || {
                    barrier.wait();
                    replace_workspace(&root, value, Some("initial"))
                })
            })
            .collect();
        let results: Vec<_> = threads
            .into_iter()
            .map(|thread| thread.join().unwrap())
            .collect();
        assert_eq!(results.iter().filter(|result| result.is_ok()).count(), 1);
        assert_eq!(
            results
                .iter()
                .filter(|result| **result == Err("WORKSPACE_CONFLICT".into()))
                .count(),
            1
        );
    }
}
