// Responsabilidade única: formatação de dados do corredor (nome com iniciais maiúsculas e número com 4 dígitos).

/**
 * Coloca as iniciais do nome em maiúscula e o restante em minúscula.
 * Exemplo: "joao da silva" -> "Joao Da Silva"
 * @param {string|null|undefined} rawName
 * @returns {string}
 */
export function capitalizeName(rawName) {
  if (!rawName) return ''
  return String(rawName)
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

/**
 * Formata o número do corredor para ter no mínimo 4 dígitos completando com zeros à esquerda.
 * Exemplos:
 * "8"    -> "0008"
 * "08"   -> "0008"
 * "008"  -> "0008"
 * "0008" -> "0008"
 * "123"  -> "0123"
 * @param {string|number|null|undefined} rawNumber
 * @returns {string}
 */
export function formatRunnerNumber(rawNumber) {
  if (!rawNumber && rawNumber !== 0) return ''
  const digitsOnly = String(rawNumber).replace(/\D/g, '')
  if (!digitsOnly) return ''
  return digitsOnly.padStart(4, '0')
}
