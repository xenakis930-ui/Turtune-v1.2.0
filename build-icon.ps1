Add-Type -AssemblyName System.Drawing
$src = "C:\Users\USER\Downloads\tor.png"
$bmp = [System.Drawing.Bitmap]::FromFile($src)
$w = $bmp.Width; $h = $bmp.Height
$keyed = New-Object System.Drawing.Bitmap($w, $h, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
for ($y = 0; $y -lt $h; $y++) { for ($x = 0; $x -lt $w; $x++) { $c = $bmp.GetPixel($x, $y); $a = [int][Math]::Max([Math]::Max($c.R, $c.G), $c.B); $keyed.SetPixel($x, $y, [System.Drawing.Color]::FromArgb($a, $c.R, $c.G, $c.B)) } }
$minX = $w; $minY = $h; $maxX = 0; $maxY = 0
for ($y = 0; $y -lt $h; $y++) { for ($x = 0; $x -lt $w; $x++) { if ($keyed.GetPixel($x, $y).A -gt 12) { if ($x -lt $minX) { $minX = $x }; if ($x -gt $maxX) { $maxX = $x }; if ($y -lt $minY) { $minY = $y }; if ($y -gt $maxY) { $maxY = $y } } } }
$cropW = $maxX - $minX + 1; $cropH = $maxY - $minY + 1
$crop = New-Object System.Drawing.Bitmap($cropW, $cropH, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($crop); $g.DrawImage($keyed, (New-Object System.Drawing.Rectangle(0,0,$cropW,$cropH)), (New-Object System.Drawing.Rectangle($minX,$minY,$cropW,$cropH)), [System.Drawing.GraphicsUnit]::Pixel); $g.Dispose()

function New-Square([System.Drawing.Image]$img, [int]$size, [single]$pad) {
  $canvas = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($canvas); $g.Clear([System.Drawing.Color]::Transparent)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $p = [int]($size * $pad); $avail = $size - 2 * $p
  $scale = [Math]::Min($avail / $img.Width, $avail / $img.Height)
  $dw = [int]($img.Width * $scale); $dh = [int]($img.Height * $scale)
  $dx = [int](($size - $dw) / 2); $dy = [int](($size - $dh) / 2)
  $g.DrawImage($img, $dx, $dy, $dw, $dh); $g.Dispose()
  return $canvas
}

$sizes = @(256, 128, 64, 48, 32, 16)
$pngs = @{}
foreach ($s in $sizes) {
  $sq = New-Square $crop $s 0.06
  $ms = New-Object System.IO.MemoryStream
  $sq.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
  $pngs[$s] = $ms.ToArray()
  $sq.Dispose()
}

# Escribir .ico manualmente (header + directorio + PNGs)
$fs = [System.IO.File]::OpenWrite("C:\Users\USER\Documents\Proyecto predeterminado\octave\build\icon.ico")
$bw = New-Object System.IO.BinaryWriter($fs)
$bw.Write([uint16]0); $bw.Write([uint16]1); $bw.Write([uint16]$sizes.Count)
$offset = 6 + 16 * $sizes.Count
foreach ($s in $sizes) {
  if ($s -eq 256) { $bw.Write([byte]0); $bw.Write([byte]0) } else { $bw.Write([byte]$s); $bw.Write([byte]$s) }
  $bw.Write([byte]0); $bw.Write([byte]0); $bw.Write([uint16]1); $bw.Write([uint16]32)
  $bw.Write([uint32]$pngs[$s].Length); $bw.Write([uint32]$offset)
  $offset += $pngs[$s].Length
}
foreach ($s in $sizes) { $bw.Write($pngs[$s]) }
$bw.Close(); $fs.Close()

$pngs[256].CopyTo([IO.File]::OpenWrite("C:\Users\USER\Documents\Proyecto predeterminado\octave\build\icon.png"))
$pngs[64].CopyTo([IO.File]::OpenWrite("C:\Users\USER\Documents\Proyecto predeterminado\octave\public\favicon.png"))
$pngs[256].CopyTo([IO.File]::OpenWrite("C:\Users\USER\Documents\Proyecto predeterminado\octave\src\assets\turtune.png"))
$crop.Dispose(); $keyed.Dispose(); $bmp.Dispose()
Write-Output "ICO multi-size generado:"
Get-ChildItem "C:\Users\USER\Documents\Proyecto predeterminado\octave\build" | Select-Object Name, Length