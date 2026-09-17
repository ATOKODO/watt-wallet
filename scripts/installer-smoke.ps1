$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$installerPath = Join-Path $projectRoot 'src-tauri\target\release\bundle\nsis\Watt Wallet_0.1.0_x64-setup.exe'
$installPath = [System.IO.Path]::GetFullPath((Join-Path $projectRoot ('.cache\installer-smoke-' + [guid]::NewGuid().ToString('N'))))
$allowedRoot = [System.IO.Path]::GetFullPath((Join-Path $projectRoot '.cache')) + [System.IO.Path]::DirectorySeparatorChar
if (-not $installPath.StartsWith($allowedRoot, [System.StringComparison]::OrdinalIgnoreCase)) { throw 'Le dossier de test doit rester dans .cache du projet.' }
if (Test-Path -LiteralPath $installPath) { throw 'Le dossier de test existe déjà. Ne pas écraser une installation existante.' }
$registryKey = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\Watt Wallet'
if (Test-Path -LiteralPath $registryKey) { throw 'Watt Wallet est déjà installé pour ce compte. Test arrêté pour préserver cette installation.' }
if (-not (Test-Path -LiteralPath $installerPath)) { throw "Construire l’installateur avant ce test." }
$installed = $false
try {
    $process = Start-Process -FilePath $installerPath -ArgumentList @('/S', '/NS', "/D=$installPath") -WindowStyle Hidden -Wait -PassThru
    if ($process.ExitCode -ne 0) { throw "Échec de l’installation : $($process.ExitCode)" }
    $installed = $true
    $binary = Join-Path $installPath 'watt-wallet.exe'
    if (-not (Test-Path -LiteralPath $binary)) { throw 'Exécutable absent après installation.' }
    & node (Join-Path $PSScriptRoot 'verify-bundle-binary.mjs') (Join-Path $projectRoot 'src-tauri\target\release\watt-wallet.exe') $binary
    if ($LASTEXITCODE -ne 0) { throw 'Le binaire installé ne correspond pas au binaire compilé.' }
    & node (Join-Path $PSScriptRoot 'native-smoke.mjs') $binary
    if ($LASTEXITCODE -ne 0) { throw "Le test WebView2 de l’application installée a échoué." }
    Write-Output 'Installation NSIS silencieuse et application installée : OK.'
}
finally {
    if ($installed) {
        $uninstaller = Join-Path $installPath 'uninstall.exe'
        if (Test-Path -LiteralPath $uninstaller) {
            $uninstallProcess = Start-Process -FilePath $uninstaller -ArgumentList @('/S', "_?=$installPath") -WindowStyle Hidden -Wait -PassThru
            if ($uninstallProcess.ExitCode -ne 0) { throw "Échec de la désinstallation du test : $($uninstallProcess.ExitCode)" }
            if (Test-Path -LiteralPath $registryKey) { throw "L’entrée de désinstallation du test subsiste." }
            if (Test-Path -LiteralPath (Join-Path $installPath 'watt-wallet.exe')) { throw 'Le binaire installé subsiste après désinstallation.' }
            Write-Output 'Désinstallation NSIS et nettoyage de son entrée Windows : OK.'
        }
    }
}
