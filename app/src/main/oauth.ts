import { shell } from 'electron'
import http from 'node:http'
import crypto from 'node:crypto'
import { store } from './store'
import { t } from './i18n'

const AUTHORIZE_URL = 'https://oauth.battle.net/authorize'
const TOKEN_URL = 'https://oauth.battle.net/token'
const USERINFO_URL = 'https://oauth.battle.net/userinfo'

/** Le seul scope nécessaire : il donne accès à /profile/user/wow. */
const SCOPE = 'wow.profile'

export interface StoredToken {
  accessToken: string
  expiresAt: number
  battletag: string | null
}

let memoryToken: StoredToken | null = null

export function redirectUri(port: number): string {
  return `http://localhost:${port}/callback`
}

export function getToken(): StoredToken | null {
  if (!memoryToken) memoryToken = store.loadToken()
  if (memoryToken && memoryToken.expiresAt <= Date.now()) return null
  return memoryToken
}

export function clearToken(): void {
  memoryToken = null
  store.clearToken()
}

function html(title: string, message: string, accent: string, lang: string): string {
  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8">
<title>${title}</title><style>
body{margin:0;height:100vh;display:flex;align-items:center;justify-content:center;
background:#12151c;color:#e6e8ee;font:16px/1.6 system-ui,Segoe UI,sans-serif}
.card{max-width:420px;padding:32px;border:1px solid #262b36;border-radius:14px;background:#171b24;text-align:center}
h1{margin:0 0 8px;font-size:19px;color:${accent}}p{margin:0;color:#9aa4b2}
</style></head><body><div class="card"><h1>${title}</h1><p>${message}</p></div></body></html>`
}

/**
 * Flux Authorization Code sur boucle locale.
 *
 * Battle.net exige un client confidentiel (client_secret à l'échange), donc pas
 * de PKCE seul : l'utilisateur crée son propre client sur develop.battle.net et
 * renseigne l'ID + le secret dans les réglages. Rien n'est transmis ailleurs
 * qu'à Blizzard.
 */
export async function authorize(): Promise<StoredToken> {
  const settings = store.getSettings()
  if (!settings.clientId || !settings.clientSecret) {
    throw new Error(t('err.credentialsMissing'))
  }

  const port = settings.oauthPort
  const lang = settings.language
  const state = crypto.randomBytes(16).toString('hex')
  const uri = redirectUri(port)

  const code = await new Promise<string>((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url ?? '/', `http://localhost:${port}`)
      if (url.pathname !== '/callback') {
        res.writeHead(404).end()
        return
      }

      const error = url.searchParams.get('error')
      const returnedState = url.searchParams.get('state')
      const returnedCode = url.searchParams.get('code')

      const fail = (msg: string): void => {
        res.writeHead(400, { 'content-type': 'text/html; charset=utf-8' })
        res.end(html(t('oauth.page.failed'), msg, '#ff6b6b', lang))
        server.close()
        reject(new Error(msg))
      }

      if (error) return fail(t('err.oauthDenied', { error }))
      if (returnedState !== state) return fail(t('err.oauthState'))
      if (!returnedCode) return fail(t('err.oauthNoCode'))

      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
      res.end(html(t('oauth.page.ok'), t('oauth.page.okBody'), '#5ac8fa', lang))
      server.close()
      resolve(returnedCode)
    })

    server.on('error', (err: NodeJS.ErrnoException) => {
      reject(
        err.code === 'EADDRINUSE'
          ? new Error(t('err.portInUse', { port }))
          : err
      )
    })

    // 127.0.0.1 seulement : le serveur ne doit jamais être joignable depuis le réseau.
    server.listen(port, '127.0.0.1', () => {
      const params = new URLSearchParams({
        client_id: settings.clientId,
        scope: SCOPE,
        state,
        redirect_uri: uri,
        response_type: 'code'
      })
      void shell.openExternal(`${AUTHORIZE_URL}?${params.toString()}`)
    })

    setTimeout(() => {
      if (server.listening) {
        server.close()
        reject(new Error(t('err.oauthTimeout')))
      }
    }, 5 * 60 * 1000)
  })

  const token = await exchangeCode(code, uri, settings.clientId, settings.clientSecret)
  memoryToken = token
  store.saveToken(token)
  return token
}

async function exchangeCode(
  code: string,
  uri: string,
  clientId: string,
  clientSecret: string
): Promise<StoredToken> {
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      authorization: `Basic ${basic}`,
      'content-type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: uri
    })
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(
      t('err.tokenExchange', { status: res.status, uri, body: body.slice(0, 200) })
    )
  }

  const json = (await res.json()) as { access_token: string; expires_in: number }
  const expiresAt = Date.now() + (json.expires_in ?? 86400) * 1000
  const battletag = await fetchBattletag(json.access_token)
  return { accessToken: json.access_token, expiresAt, battletag }
}

async function fetchBattletag(accessToken: string): Promise<string | null> {
  try {
    const res = await fetch(USERINFO_URL, {
      headers: { authorization: `Bearer ${accessToken}` }
    })
    if (!res.ok) return null
    const json = (await res.json()) as { battletag?: string }
    return json.battletag ?? null
  } catch {
    return null
  }
}
