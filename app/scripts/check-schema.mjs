import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const TYPES = resolve(ROOT, 'app', 'src', 'shared', 'types.ts')
const CORE = resolve(ROOT, 'addon', 'RerollHelper', 'Core.lua')

function read(path, pattern, label) {
  const match = readFileSync(path, 'utf8').match(pattern)
  if (!match) {
    console.error(`check-schema: ${label} introuvable dans ${path}`)
    process.exit(1)
  }
  return Number(match[1])
}

const app = read(TYPES, /EXPORT_SCHEMA_VERSION\s*=\s*(\d+)/, 'EXPORT_SCHEMA_VERSION')
const addon = read(CORE, /RH\.SCHEMA\s*=\s*(\d+)/, 'RH.SCHEMA')

if (app !== addon) {
  console.error(
    [
      '',
      `check-schema: desaccord de schema entre l'application et l'addon.`,
      `  app   (${TYPES}) : ${app}`,
      `  addon (${CORE}) : ${addon}`,
      '',
      `L'addon refusera le fichier exporte avec "Incompatible data format".`,
      `Mets les deux valeurs a la meme version avant de construire.`,
      ''
    ].join('\n')
  )
  process.exit(1)
}

console.log(`check-schema: app et addon en schema v${app}`)
