// Responsabilidade única: persistir qual corrida está ativa no dispositivo (localStorage).

const ACTIVE_RACE_KEY = 'pwa-qr-timing:active-race-id'

/** @returns {string | null} */
export function getStoredActiveRaceId() {
  return localStorage.getItem(ACTIVE_RACE_KEY)
}

/** @param {string} raceId */
export function setStoredActiveRaceId(raceId) {
  localStorage.setItem(ACTIVE_RACE_KEY, raceId)
}

export function clearStoredActiveRaceId() {
  localStorage.removeItem(ACTIVE_RACE_KEY)
}
