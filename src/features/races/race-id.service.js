// Responsabilidade única: gerar identificadores amigáveis e únicos para corridas.

const STOP_WORDS = new Set(['de', 'da', 'do', 'dos', 'das', 'e', 'em', 'a', 'o', 'as', 'os', 'para', 'com', 'no', 'na'])

/**
 * Gera um código legível para a corrida (ex: CRT-13102026 para "Corrida de Rua de Timbaúba").
 * @param {string} [name]
 * @param {string} [eventDate]
 * @param {Array<string>} [existingIds]
 * @returns {string}
 */
export function generateRaceId(name = '', eventDate = '', existingIds = []) {
  const cleanName = (name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()

  const words = cleanName
    .split(/[\s\-_]+/)
    .map(w => w.trim())
    .filter(Boolean)

  const significantWords = words.filter(w => !STOP_WORDS.has(w.toLowerCase()))
  const wordsToUse = significantWords.length > 0 ? significantWords : words

  let acronym = ''
  if (wordsToUse.length === 1) {
    const single = wordsToUse[0].replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
    acronym = single.slice(0, 4)
  } else {
    acronym = wordsToUse
      .map(w => {
        const clean = w.replace(/[^a-zA-Z0-9]/g, '')
        return clean.charAt(0)
      })
      .filter(Boolean)
      .join('')
      .toUpperCase()
  }

  if (!acronym) {
    acronym = 'COR'
  }

  let datePart = ''
  if (eventDate && /^\d{4}-\d{2}-\d{2}$/.test(eventDate)) {
    const [yyyy, mm, dd] = eventDate.split('-')
    datePart = `${dd}${mm}${yyyy}`
  } else {
    const now = new Date()
    const dd = String(now.getDate()).padStart(2, '0')
    const mm = String(now.getMonth() + 1).padStart(2, '0')
    const yyyy = String(now.getFullYear())
    datePart = `${dd}${mm}${yyyy}`
  }

  const baseCode = `${acronym}-${datePart}`
  let finalCode = baseCode
  let suffix = 2
  const existingSet = new Set(existingIds || [])

  while (existingSet.has(finalCode)) {
    finalCode = `${baseCode}-${suffix}`
    suffix++
  }

  return finalCode
}
