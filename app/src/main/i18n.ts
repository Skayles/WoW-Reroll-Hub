import { translator, type Translate } from '@shared/i18n'
import { store } from './store'

/**
 * Traduction côté process main.
 *
 * Les messages d'erreur remontent tels quels dans l'interface, ils doivent donc
 * suivre la langue choisie. On relit le réglage à chaque appel plutôt que de
 * mémoriser un traducteur : un changement de langue prend effet immédiatement,
 * sans redémarrage.
 */
export const t: Translate = (key, params) => translator(store.getSettings().language)(key, params)
