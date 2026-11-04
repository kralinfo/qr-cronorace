// Responsabilidade única: gerenciar e persistir as configurações da etiqueta térmica adesiva (dimensões, gap e calibração de avanço).

const STORAGE_KEY = 'pwa-qr-timing:thermal-label-settings'

export const DEFAULT_THERMAL_SETTINGS = {
  // Dimensões do adesivo do usuário (bobina 55mm com adesivo de 50mm de largura útil e 80mm de comprimento)
  labelWidthMm: 50,     // Largura útil do adesivo na bobina (50mm = 384-400 dots)
  labelLengthMm: 80,    // Comprimento do adesivo no sentido do rolo (80mm = 640 dots)
  gapMm: 4.0,           // Espaçamento entre adesivos no rolo (típico 2mm a 3mm = 16 a 24 dots)
  cutterFeedMm: 21.5,   // Distância da cabeça térmica até a serra de corte da impressora (18mm = 144 dots)
  feedAdjustMm: 0,      // Calibração fina de avanço (+/- mm para acertar o corte no milímetro)
  useGapSensor: false   // Envia comando Form Feed (0x0C) caso a impressora use sensor de gap/marca preta
}

const listeners = new Set()

/**
 * Retorna as configurações salvas ou padrão.
 * @returns {typeof DEFAULT_THERMAL_SETTINGS}
 */
export function getThermalLabelSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_THERMAL_SETTINGS }
    const parsed = JSON.parse(raw)
    return {
      ...DEFAULT_THERMAL_SETTINGS,
      ...parsed,
      labelWidthMm: Number(parsed.labelWidthMm) || DEFAULT_THERMAL_SETTINGS.labelWidthMm,
      labelLengthMm: Number(parsed.labelLengthMm) || DEFAULT_THERMAL_SETTINGS.labelLengthMm,
      gapMm: typeof parsed.gapMm === 'number' && parsed.gapMm !== 2.5 && parsed.gapMm !== 5.5 ? parsed.gapMm : DEFAULT_THERMAL_SETTINGS.gapMm,
      cutterFeedMm: typeof parsed.cutterFeedMm === 'number' && parsed.cutterFeedMm !== 18.0 && parsed.cutterFeedMm !== 15.5 && parsed.cutterFeedMm !== 17.5 && parsed.cutterFeedMm !== 18.5 && parsed.cutterFeedMm !== 19.0 && parsed.cutterFeedMm !== 19.5 ? parsed.cutterFeedMm : DEFAULT_THERMAL_SETTINGS.cutterFeedMm,
      feedAdjustMm: typeof parsed.feedAdjustMm === 'number' ? parsed.feedAdjustMm : DEFAULT_THERMAL_SETTINGS.feedAdjustMm,
      useGapSensor: Boolean(parsed.useGapSensor)
    }
  } catch (e) {
    console.warn('Erro ao carregar configurações de etiqueta térmica:', e)
    return { ...DEFAULT_THERMAL_SETTINGS }
  }
}

/**
 * Salva as novas configurações de etiqueta térmica.
 * @param {Partial<typeof DEFAULT_THERMAL_SETTINGS>} patch
 */
export function saveThermalLabelSettings(patch) {
  const current = getThermalLabelSettings()
  const updated = { ...current, ...patch }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  } catch (e) {
    console.error('Falha ao salvar configurações de etiqueta térmica no localStorage:', e)
  }
  notifyListeners(updated)
  return updated
}

/**
 * Notifica ouvintes de alteração nas configurações.
 * @param {typeof DEFAULT_THERMAL_SETTINGS} settings
 */
function notifyListeners(settings) {
  for (const listener of listeners) {
    try {
      listener(settings)
    } catch (e) {
      console.error(e)
    }
  }
}

/**
 * Inscreve um componente para receber atualizações em tempo real.
 * @param {(settings: typeof DEFAULT_THERMAL_SETTINGS) => void} callback
 * @returns {() => void}
 */
export function subscribeThermalLabelSettings(callback) {
  listeners.add(callback)
  callback(getThermalLabelSettings())
  return () => listeners.delete(callback)
}

