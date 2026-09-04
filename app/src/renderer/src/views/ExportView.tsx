import { useState } from 'react'
import type { ExportResult } from '@shared/types'
import type { Hub } from '../state'

export default function ExportView({ hub }: { hub: Hub }): JSX.Element {
  const { t } = hub
  const [preview, setPreview] = useState<string | null>(null)
  const [last, setLast] = useState<ExportResult | null>(null)

  const visible = hub.characters.filter((c) => !hub.data.hidden.includes(c.id))
  const configured = Boolean(hub.settings?.wowPath)

  const runExport = async (): Promise<void> => {
    const result = await hub.run(() => window.api.exporter.run())
    setLast(result)
    if (result?.ok) {
      hub.setBanner({
        kind: 'ok',
        text: t('export.success', { count: result.characterCount ?? 0 })
      })
    } else if (result) {
      hub.setBanner({ kind: 'error', text: result.error ?? t('export.failed') })
    }
  }

  return (
    <div className="stack">
      <section className="panel">
        <h2>
          {t('export.title')}
          <span className="hint">{t('export.hint', { count: visible.length })}</span>
        </h2>

        <ol className="steps">
          <li>{t('export.step1')}</li>
          <li>{t('export.step2')}</li>
          <li>{t('export.step3')}</li>
        </ol>

        <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
          <button className="btn primary" onClick={() => void runExport()} disabled={!configured}>
            {t('export.run')}
          </button>
          <button
            className="btn"
            onClick={async () => {
              const text = await hub.run(() => window.api.exporter.preview())
              setPreview(text ?? null)
            }}
          >
            {t('export.preview')}
          </button>
          <button
            className="btn"
            onClick={async () => {
              const result = await hub.run(() => window.api.exporter.saveAs())
              setLast(result)
            }}
            title={t('export.saveAsHint')}
          >
            {t('export.saveAs')}
          </button>
          {last?.ok && last.filePath && (
            <button
              className="btn small"
              onClick={() => void window.api.system.revealPath(last.filePath!)}
            >
              {t('export.openFolder')}
            </button>
          )}
        </div>

        {!configured && (
          <p className="faint" style={{ marginTop: 12 }}>
            {t('export.needPath')}
          </p>
        )}

        {last?.ok && (
          <p className="faint" style={{ marginTop: 12 }}>
            {t('export.last', { path: last.filePath ?? '' })}
            {last.addonInstalled === false && t('export.noAddonSource')}
          </p>
        )}
      </section>

      <section className="panel">
        <h2>
          {t('export.contents')}
          <span className="hint">{t('export.contents.hint')}</span>
        </h2>
        <ul className="faint" style={{ margin: 0, paddingLeft: 18, lineHeight: 1.9 }}>
          <li>{t('export.contents.identity')}</li>
          <li>{t('export.contents.progress')}</li>
          <li>{t('export.contents.focus')}</li>
          <li>{t('export.contents.bySlot')}</li>
          <li>{t('export.contents.fixes')}</li>
          <li>{t('export.contents.note')}</li>
        </ul>
      </section>

      {preview !== null && (
        <section className="panel">
          <h2>
            {t('export.previewTitle')}
            <span className="hint">Data/Export.lua</span>
          </h2>
          <div className="code-preview">{preview}</div>
        </section>
      )}
    </div>
  )
}
