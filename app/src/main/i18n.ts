import { translator, type Translate } from '@shared/i18n'
import { store } from './store'

export const t: Translate = (key, params) => translator(store.getSettings().language)(key, params)
