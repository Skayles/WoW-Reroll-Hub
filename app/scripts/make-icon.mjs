import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const OUT = resolve(ROOT, 'app', 'resources', 'icon.ico')
const LOGO = resolve(ROOT, 'logo.png')
const LOGO_SIZE = 512
const SIZES = [16, 32, 48, 64, 128, 256]
const SS = 4

const hex = (value) => [
  parseInt(value.slice(1, 3), 16),
  parseInt(value.slice(3, 5), 16),
  parseInt(value.slice(5, 7), 16)
]

const BG_TOP = hex('#212a38')
const BG_BOTTOM = hex('#0e1116')
const BORDER = hex('#3a465c')
const ACCENT = hex('#5ac8fa')
const GOLD = hex('#f0c674')

function roundedRectSdf(x, y, cx, cy, halfW, halfH, radius) {
  const dx = Math.abs(x - cx) - (halfW - radius)
  const dy = Math.abs(y - cy) - (halfH - radius)
  const outside = Math.hypot(Math.max(dx, 0), Math.max(dy, 0))
  return outside + Math.min(Math.max(dx, dy), 0) - radius
}

function blend(target, offset, color, alpha) {
  for (let channel = 0; channel < 3; channel++) {
    target[offset + channel] = target[offset + channel] * (1 - alpha) + color[channel] * alpha
  }
  target[offset + 3] = target[offset + 3] * (1 - alpha) + 255 * alpha
}

function render(size) {
  const big = size * SS
  const buffer = new Float64Array(big * big * 4)

  const cx = big / 2
  const cy = big / 2
  const half = big / 2
  const radius = big * 0.22

  for (let y = 0; y < big; y++) {
    for (let x = 0; x < big; x++) {
      const offset = (y * big + x) * 4

      const shape = roundedRectSdf(x + 0.5, y + 0.5, cx, cy, half, half, radius)
      const coverage = Math.min(Math.max(0.5 - shape, 0), 1)
      if (coverage <= 0) continue

      const t = y / big
      const bg = [0, 1, 2].map((c) => BG_TOP[c] + (BG_BOTTOM[c] - BG_TOP[c]) * t)
      blend(buffer, offset, bg, coverage)

      const edge = Math.min(Math.max(1 - Math.abs(shape + SS * 1.2) / (SS * 1.2), 0), 1)
      if (edge > 0) blend(buffer, offset, BORDER, edge * 0.85 * coverage)
    }
  }

  const bars = [
    { heightRatio: 0.34, color: ACCENT, alpha: 0.75 },
    { heightRatio: 0.52, color: ACCENT, alpha: 1 },
    { heightRatio: 0.7, color: GOLD, alpha: 1 }
  ]

  const barWidth = big * 0.15
  const gap = big * 0.075
  const totalWidth = bars.length * barWidth + (bars.length - 1) * gap
  const baseline = big * 0.78
  const barRadius = barWidth * 0.32

  bars.forEach((bar, index) => {
    const height = big * bar.heightRatio
    const left = (big - totalWidth) / 2 + index * (barWidth + gap)
    const barCx = left + barWidth / 2
    const barCy = baseline - height / 2

    for (let y = 0; y < big; y++) {
      for (let x = 0; x < big; x++) {
        const shape = roundedRectSdf(
          x + 0.5,
          y + 0.5,
          barCx,
          barCy,
          barWidth / 2,
          height / 2,
          barRadius
        )
        const coverage = Math.min(Math.max(0.5 - shape, 0), 1)
        if (coverage > 0) blend(buffer, (y * big + x) * 4, bar.color, coverage * bar.alpha)
      }
    }
  })

  const out = Buffer.alloc(size * size * 4)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0
      let g = 0
      let b = 0
      let a = 0
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const offset = ((y * SS + sy) * big + (x * SS + sx)) * 4
          r += buffer[offset]
          g += buffer[offset + 1]
          b += buffer[offset + 2]
          a += buffer[offset + 3]
        }
      }
      const count = SS * SS
      const offset = (y * size + x) * 4
      out[offset] = Math.round(r / count)
      out[offset + 1] = Math.round(g / count)
      out[offset + 2] = Math.round(b / count)
      out[offset + 3] = Math.round(a / count)
    }
  }
  return out
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  return table
})()

function crc32(buffer) {
  let crc = 0xffffffff
  for (const byte of buffer) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([length, body, crc])
}

function encodePng(rgba, size) {
  const raw = Buffer.alloc(size * (size * 4 + 1))
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4)
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ])
}

const images = SIZES.map((size) => ({ size, png: encodePng(render(size), size) }))

const header = Buffer.alloc(6)
header.writeUInt16LE(0, 0)
header.writeUInt16LE(1, 2)
header.writeUInt16LE(images.length, 4)

let offset = 6 + images.length * 16
const entries = images.map((image) => {
  const entry = Buffer.alloc(16)

  entry[0] = image.size >= 256 ? 0 : image.size
  entry[1] = image.size >= 256 ? 0 : image.size
  entry[2] = 0
  entry[3] = 0
  entry.writeUInt16LE(1, 4)
  entry.writeUInt16LE(32, 6)
  entry.writeUInt32BE(0, 8)
  entry.writeUInt32LE(image.png.length, 8)
  entry.writeUInt32LE(offset, 12)
  offset += image.png.length
  return entry
})

mkdirSync(dirname(OUT), { recursive: true })
writeFileSync(OUT, Buffer.concat([header, ...entries, ...images.map((i) => i.png)]))

console.log(`icon.ico écrit (${SIZES.join(', ')} px) -> ${OUT}`)

writeFileSync(LOGO, encodePng(render(LOGO_SIZE), LOGO_SIZE))
console.log(`logo.png écrit (${LOGO_SIZE} px) -> ${LOGO}`)
