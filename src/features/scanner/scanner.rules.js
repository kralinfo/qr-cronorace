// Responsabilidade única: construir o registro de chegada a partir dos dados lidos no QR.

/**
 * Monta o resultado de chegada a partir do payload decodificado do QR, do instante da leitura
 * e da corrida ativa.
 * @param {{ id: string, name: string|null }} runnerData
 * @param {string} raceId
 * @param {Date} [readAt]
 * @returns {import('../results/results.types.js').ResultRow}
 */
export function buildArrivalResult(runnerData, raceId, readAt = new Date()) {
  return {
    barcode: runnerData.id,
    dateTime: readAt.toISOString(),
    timestamp: String(readAt.getTime()),
    raceId
  }
}

/**
 * Verifica se o corredor lido pertence à corrida ativa.
 * Prioriza o raceId embutido no QR; caso ausente (QRs antigos), usa o raceId do cadastro.
 * @param {{ raceId: string|null }} runnerData - dados decodificados do QR.
 * @param {{ raceId: string }|undefined|null} runnerRecord - corredor encontrado no cadastro (se houver).
 * @param {string|null|undefined} activeRaceId
 * @returns {boolean}
 */
export function belongsToActiveRace(runnerData, runnerRecord, activeRaceId) {
  const runnerRaceId = runnerData.raceId ?? runnerRecord?.raceId ?? null
  return Boolean(activeRaceId && runnerRaceId === activeRaceId)
}

/**
 * Verifica se a corrida está encerrada.
 * @param {{ endTime?: string|null }|undefined|null} race
 * @returns {boolean}
 */
export function isRaceFinished(race) {
  return Boolean(race?.endTime)
}

/**
 * Valida se é permitido registrar a chegada para a corrida e corredor.
 * @param {{
 *   race: { id?: string, endTime?: string|null } | undefined | null,
 *   runnerData: { id: string, raceId: string|null },
 *   runnerRecord: { raceId: string } | undefined | null,
 *   activeRaceId: string | null | undefined
 * }} params
 * @returns {{ valid: boolean, errorType?: 'race-finished'|'invalid-race'|'error', message?: string }}
 */
export function validateArrivalScan({ race, runnerData, runnerRecord, activeRaceId }) {
  if (isRaceFinished(race)) {
    return {
      valid: false,
      errorType: 'race-finished',
      message: 'Esta corrida já foi encerrada! Não é permitido registrar novas chegadas.'
    }
  }

  if (!activeRaceId) {
    return {
      valid: false,
      errorType: 'error',
      message: 'Nenhuma corrida ativa selecionada.'
    }
  }

  if (!belongsToActiveRace(runnerData, runnerRecord, activeRaceId)) {
    return {
      valid: false,
      errorType: 'invalid-race',
      message: 'Este corredor está cadastrado em outra corrida. Verifique se ele pertence a esta corrida.'
    }
  }

  return { valid: true }
}


