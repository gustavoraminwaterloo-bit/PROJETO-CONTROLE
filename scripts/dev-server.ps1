# Servidor estático simples para desenvolvimento local, sem depender de Node/Python.
# Serve a pasta public/ deste projeto. Uso: powershell -File scripts/dev-server.ps1 [-Port 8843]
#
# Isto NÃO substitui o Netlify Function (netlify/functions/api.js) — sem "netlify dev" (que
# requer Node.js instalado), as chamadas de API real não funcionam aqui. Para desenvolver a
# interface sem backend configurado, abra o site com ?mock=1 (modo de demonstração local).

param(
  [int]$Port = 8843
)

$Root = Join-Path (Split-Path -Parent $PSScriptRoot) "public"
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Start()
Write-Output "Servindo $Root em http://localhost:$Port/ (modo demo: http://localhost:$Port/?mock=1)"

$mime = @{
  '.html' = 'text/html; charset=utf-8'
  '.js'   = 'text/javascript; charset=utf-8'
  '.css'  = 'text/css; charset=utf-8'
  '.json' = 'application/json; charset=utf-8'
  '.png'  = 'image/png'
  '.svg'  = 'image/svg+xml'
}

while ($listener.IsListening) {
  $ctx = $listener.GetContext()
  $req = $ctx.Request
  $res = $ctx.Response
  try {
    $path = $req.Url.AbsolutePath
    if ($path -eq '/') { $path = '/index.html' }
    $filePath = Join-Path $Root ($path.TrimStart('/'))
    if (Test-Path $filePath -PathType Leaf) {
      $ext = [System.IO.Path]::GetExtension($filePath)
      $contentType = $mime[$ext]
      if (-not $contentType) { $contentType = 'application/octet-stream' }
      $bytes = [System.IO.File]::ReadAllBytes($filePath)
      $res.ContentType = $contentType
      $res.ContentLength64 = $bytes.Length
      $res.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
      $res.StatusCode = 404
      $msg = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found: $path")
      $res.OutputStream.Write($msg, 0, $msg.Length)
    }
  } catch {
  } finally {
    $res.OutputStream.Close()
  }
}
