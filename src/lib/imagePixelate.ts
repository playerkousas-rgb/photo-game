export type PixelateOptions = {
  pixelSize: number
  grid: boolean
  gridColor: string
  gridAlpha: number
  background: 'transparent' | 'white'
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

export function pixelateToCanvas(
  source: HTMLImageElement | HTMLCanvasElement,
  dest: HTMLCanvasElement,
  opts: PixelateOptions,
) {
  const { pixelSize, grid, gridColor, gridAlpha, background } = opts

  const w = source instanceof HTMLCanvasElement ? source.width : source.naturalWidth
  const h = source instanceof HTMLCanvasElement ? source.height : source.naturalHeight

  dest.width = w
  dest.height = h

  const ctx = dest.getContext('2d', { willReadFrequently: true })
  if (!ctx) return

  // Background for export when transparency is not desired
  ctx.clearRect(0, 0, w, h)
  if (background === 'white') {
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, w, h)
  }

  // Draw the source at native resolution onto an offscreen canvas so we can sample
  const off = document.createElement('canvas')
  off.width = w
  off.height = h
  const offCtx = off.getContext('2d', { willReadFrequently: true })
  if (!offCtx) return

  offCtx.imageSmoothingEnabled = true
  offCtx.clearRect(0, 0, w, h)
  offCtx.drawImage(source, 0, 0, w, h)

  const size = Math.max(1, Math.round(pixelSize))
  const cols = Math.ceil(w / size)
  const rows = Math.ceil(h / size)

  // Render blocks with average color per cell
  for (let cy = 0; cy < rows; cy++) {
    for (let cx = 0; cx < cols; cx++) {
      const x = cx * size
      const y = cy * size
      const cellW = Math.min(size, w - x)
      const cellH = Math.min(size, h - y)

      const img = offCtx.getImageData(x, y, cellW, cellH).data
      let r = 0,
        g = 0,
        b = 0,
        a = 0
      const count = img.length / 4
      for (let i = 0; i < img.length; i += 4) {
        r += img[i]!
        g += img[i + 1]!
        b += img[i + 2]!
        a += img[i + 3]!
      }

      const rr = Math.round(r / count)
      const gg = Math.round(g / count)
      const bb = Math.round(b / count)
      const aa = clamp(Math.round(a / count), 0, 255) / 255

      ctx.fillStyle = `rgba(${rr}, ${gg}, ${bb}, ${aa})`
      ctx.fillRect(x, y, cellW, cellH)
    }
  }

  // Optional grid
  if (grid) {
    ctx.save()
    ctx.globalAlpha = clamp(gridAlpha, 0, 1)
    ctx.strokeStyle = gridColor
    ctx.lineWidth = 1

    // Crisp 1px lines
    ctx.translate(0.5, 0.5)

    for (let x = 0; x <= w; x += size) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, h)
      ctx.stroke()
    }

    for (let y = 0; y <= h; y += size) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(w, y)
      ctx.stroke()
    }

    ctx.restore()
  }
}

export function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) reject(new Error('Failed to export image'))
        else resolve(blob)
      },
      type,
      quality,
    )
  })
}
