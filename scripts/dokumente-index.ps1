$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$documentsRoot = Join-Path $projectRoot "assets\dokumente"
$jsonPath = Join-Path $documentsRoot "dateien.json"
$jsPath = Join-Path $documentsRoot "dateien.js"

if (-not (Test-Path $documentsRoot)) {
    New-Item -ItemType Directory -Path $documentsRoot -Force | Out-Null
}

$excludedNames = @("dateien.json", "dateien.js", ".gitkeep", "Thumbs.db", ".DS_Store")
$files = Get-ChildItem -Path $documentsRoot -File -Recurse | Where-Object {
    $excludedNames -notcontains $_.Name
} | Sort-Object FullName

$items = @()
foreach ($file in $files) {
    $relative = $file.FullName.Substring($documentsRoot.Length).TrimStart([char[]]@('\','/')).Replace('\','/')
    $items += [ordered]@{
        name      = $file.Name
        path      = $relative
        extension = $file.Extension.TrimStart('.').ToLowerInvariant()
        size      = [int64]$file.Length
        modified  = $file.LastWriteTime.ToString("yyyy-MM-ddTHH:mm:ssK")
    }
}

if ($items.Count -eq 0) {
    $json = "[]"
} else {
    $json = ConvertTo-Json -InputObject @($items) -Depth 4
}

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($jsonPath, $json + [Environment]::NewLine, $utf8NoBom)
[System.IO.File]::WriteAllText($jsPath, "window.SELLENCE_DOCUMENTS = " + $json + ";" + [Environment]::NewLine, $utf8NoBom)

Write-Host ""
Write-Host "SELLENCE Dokumentenliste aktualisiert." -ForegroundColor Cyan
Write-Host ("Gefundene Dateien: " + $items.Count) -ForegroundColor Green
Write-Host ("Ordner: " + $documentsRoot) -ForegroundColor DarkGray
Write-Host ""
