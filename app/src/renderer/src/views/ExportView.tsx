import { useState } from 'react'
import type { ExportResult } from '@shared/types'
import type { Hub } from '../state'

export default function ExportView({ hub }: { hub: Hub }): JSX.Element {
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
        text: `Export réussi : ${result.characterCount} personnages écrits dans l'addon.`
      })
    } else if (result) {
      hub.setBanner({ kind: 'error', text: result.error ?? 'Export échoué.' })
    }
  }

  return (
    <div className="stack">
      <section className="panel">
        <h2>
          Export vers l'addon
          <span className="hint">{visible.length} personnages seront écrits</span>
        </h2>

        <ol className="steps">
          <li>
            <strong>Ferme World of Warcraft</strong> (ou au minimum, prévois un{' '}
            <code>/reload</code> après l'export : le jeu ne relit les fichiers d'addon qu'au
            chargement).
          </li>
          <li>
            Clique sur <strong>Exporter maintenant</strong> : l'application copie l'addon{' '}
            <strong>RerollHelper</strong> dans ton dossier <code>Interface/AddOns</code> et y écrit
            les données de tous tes persos.
          </li>
          <li>
            En jeu, active l'addon dans la liste, puis tape <strong>/rh</strong> (ou{' '}
            <strong>/reroll</strong>) pour ouvrir le récapitulatif.
          </li>
        </ol>

        <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
          <button className="btn primary" onClick={() => void runExport()} disabled={!configured}>
            Exporter maintenant
          </button>
          <button
            className="btn"
            onClick={async () => {
              const text = await hub.run(() => window.api.exporter.preview())
              setPreview(text ?? null)
            }}
          >
            Aperçu du fichier
          </button>
          <button
            className="btn"
            onClick={async () => {
              const result = await hub.run(() => window.api.exporter.saveAs())
              setLast(result)
            }}
            title="Enregistre le même fichier ailleurs, pour le copier à la main sur une autre machine."
          >
            Enregistrer sous…
          </button>
          {last?.ok && last.filePath && (
            <button
              className="btn small"
              onClick={() => void window.api.system.revealPath(last.filePath!)}
            >
              Ouvrir le dossier
            </button>
          )}
        </div>

        {!configured && (
          <p className="faint" style={{ marginTop: 12 }}>
            Configure d'abord le dossier World of Warcraft dans <strong>Réglages</strong>.
          </p>
        )}

        {last?.ok && (
          <p className="faint" style={{ marginTop: 12 }}>
            Dernier export : <code>{last.filePath}</code>
            {last.addonInstalled === false &&
              " — les fichiers de l'addon n'ont pas été trouvés à côté de l'application, seules les données ont été écrites."}
          </p>
        )}
      </section>

      <section className="panel">
        <h2>
          Ce que reçoit l'addon
          <span className="hint">par personnage</span>
        </h2>
        <ul className="faint" style={{ margin: 0, paddingLeft: 18, lineHeight: 1.9 }}>
          <li>Identité : nom, royaume, classe, spécialisation, rôle, faction, guilde, niveau.</li>
          <li>Progression : ilvl équipé et maximum, score Mythique+, pièces de tier, raids.</li>
          <li>
            Contenu à focus : classement des droptimizers importés, avec le gain moyen des trois
            meilleurs objets.
          </li>
          <li>Objets prioritaires : les meilleures améliorations et leur contenu d'origine.</li>
          <li>Correctifs : enchantements manquants, châsses vides, slots en retard.</li>
          <li>Ta note libre écrite dans la fiche du personnage.</li>
        </ul>
      </section>

      {preview !== null && (
        <section className="panel">
          <h2>
            Aperçu
            <span className="hint">Data/Export.lua</span>
          </h2>
          <div className="code-preview">{preview}</div>
        </section>
      )}
    </div>
  )
}
