/**
 * Regenerate PWA icons from public/logo.png
 * Run: node scripts/generate-pwa-icons.mjs
 */
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pub = path.join(root, "public");
const logo = path.join(pub, "logo.png");

const ps = `
Add-Type -AssemblyName System.Drawing
$src = '${logo.replace(/'/g, "''")}'
$base = '${pub.replace(/'/g, "''")}'

function Save-Resized($path, $size) {
  $img = [System.Drawing.Image]::FromFile($src)
  $bmp = New-Object System.Drawing.Bitmap $size, $size
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.Clear([System.Drawing.Color]::FromArgb(248,249,246))
  $pad = [int]($size * 0.08)
  $inner = $size - 2 * $pad
  $g.DrawImage($img, $pad, $pad, $inner, $inner)
  $g.Dispose()
  $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
  $img.Dispose()
}

function Save-Rounded($path, $size) {
  $img = [System.Drawing.Image]::FromFile($src)
  $bmp = New-Object System.Drawing.Bitmap $size, $size
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.Clear([System.Drawing.Color]::Transparent)
  $radius = [int]($size * 0.22)
  $path2 = New-Object System.Drawing.Drawing2D.GraphicsPath
  $r = $radius * 2
  $path2.AddArc(0, 0, $r, $r, 180, 90)
  $path2.AddArc($size - $r, 0, $r, $r, 270, 90)
  $path2.AddArc($size - $r, $size - $r, $r, $r, 0, 90)
  $path2.AddArc(0, $size - $r, $r, $r, 90, 90)
  $path2.CloseFigure()
  $g.SetClip($path2)
  $pad = [int]($size * 0.06)
  $g.DrawImage($img, $pad, $pad, $size - 2*$pad, $size - 2*$pad)
  $g.ResetClip()
  $g.Dispose()
  $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
  $img.Dispose()
}

Save-Resized (Join-Path $base 'icon-192.png') 192
Save-Resized (Join-Path $base 'icon-512.png') 512
Save-Rounded (Join-Path $base 'icon-shortcut.png') 192
Write-Output 'PWA icons generated'
`;

execSync(`powershell -NoProfile -Command "${ps.replace(/"/g, '\\"').replace(/\n/g, "; ")}"`, {
  stdio: "inherit",
  cwd: root,
});
