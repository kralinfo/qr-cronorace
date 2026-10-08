// Responsabilidade única: gerar identificadores únicos para corridas.

/** @returns {string} */
export function generateRaceId() {
  return 'race_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8)
}
