import type { Region } from '@shared/types'
import { getToken } from './oauth'
import { t } from './i18n'
import { store } from './store'

export class NotFoundError extends Error {}

export class AuthExpiredError extends Error {
  constructor() {
    super(t('err.authExpired'))
  }
}

interface RequestOptions {
  namespace?: 'profile' | 'static' | 'dynamic'

  optional?: boolean
}

class Limiter {
  private active = 0
  private queue: (() => void)[] = []

  constructor(private readonly max: number) {}

  async run<T>(fn: () => Promise<T>): Promise<T> {
    if (this.active >= this.max) {
      await new Promise<void>((resolve) => this.queue.push(resolve))
    }
    this.active++
    try {
      return await fn()
    } finally {
      this.active--
      this.queue.shift()?.()
    }
  }
}

const limiter = new Limiter(8)

function host(region: Region): string {
  return `https://${region}.api.blizzard.com`
}

export async function apiGet<T>(
  pathOrUrl: string,
  options: RequestOptions = {}
): Promise<T | null> {
  const token = getToken()
  if (!token) throw new AuthExpiredError()

  const settings = store.getSettings()
  const region = settings.region
  const namespace = options.namespace ?? 'profile'

  const url = pathOrUrl.startsWith('http')
    ? new URL(pathOrUrl)
    : new URL(pathOrUrl, host(region))

  if (!url.searchParams.has('namespace')) {
    url.searchParams.set('namespace', `${namespace}-${region}`)
  }
  if (!url.searchParams.has('locale')) {
    url.searchParams.set('locale', settings.locale)
  }

  return limiter.run(() => fetchWithRetry<T>(url, token.accessToken, options))
}

async function fetchWithRetry<T>(
  url: URL,
  accessToken: string,
  options: RequestOptions,
  attempt = 0
): Promise<T | null> {
  let res: Response
  try {
    res = await fetch(url, {
      headers: { authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(20_000)
    })
  } catch (err) {
    if (attempt < 2) {
      await sleep(500 * (attempt + 1))
      return fetchWithRetry<T>(url, accessToken, options, attempt + 1)
    }
    throw new Error(t('err.network', { message: (err as Error).message }))
  }

  if (res.status === 404) {
    if (options.optional) return null
    throw new NotFoundError(t('err.notFound', { path: url.pathname }))
  }

  if (res.status === 401 || res.status === 403) {
    throw new AuthExpiredError()
  }

  if (res.status === 429 || res.status >= 500) {
    if (attempt < 4) {
      const retryAfter = Number(res.headers.get('retry-after'))
      const delay = Number.isFinite(retryAfter) && retryAfter > 0
        ? retryAfter * 1000
        : 2 ** attempt * 400
      await sleep(delay)
      return fetchWithRetry<T>(url, accessToken, options, attempt + 1)
    }
    throw new Error(t('err.apiDown', { status: res.status, path: url.pathname }))
  }

  if (!res.ok) {
    throw new Error(t('err.api', { status: res.status, path: url.pathname }))
  }

  return (await res.json()) as T
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function localized(value: unknown): string {
  if (typeof value === 'string') return value
  if (value && typeof value === 'object') {
    const first = Object.values(value as Record<string, unknown>).find(
      (v) => typeof v === 'string'
    )
    return (first as string) ?? ''
  }
  return ''
}

export interface AccountProfileResponse {
  wow_accounts?: {
    id: number
    characters?: AccountCharacter[]
  }[]
}

export interface AccountCharacter {
  name: string
  id: number
  level: number
  realm: { name?: unknown; slug: string; id: number }
  playable_class: { id: number; name?: unknown }
  playable_race: { id: number; name?: unknown }
  faction: { type: string; name?: unknown }
  gender: { type: string }
  character: { href: string }
  protected_character?: { href: string }
}

export async function getAccountProfile(): Promise<AccountProfileResponse> {
  const data = await apiGet<AccountProfileResponse>('/profile/user/wow')
  return data ?? {}
}
