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

/**
 * Remove qualquer caractere não numérico do CPF.
 * @param {string|null|undefined} rawCpf
 * @returns {string}
 */
export function normalizeCpf(rawCpf) {
  return String(rawCpf || '').replace(/\D/g, '')
}

/**
 * Aplica máscara de CPF progressiva: 000.000.000-00.
 * @param {string|null|undefined} rawCpf
 * @returns {string}
 */
export function maskCpf(rawCpf) {
  const digits = normalizeCpf(rawCpf).slice(0, 11)
  if (!digits) return ''
  if (digits.length <= 3) return digits
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`
}

/**
 * Valida o preenchimento do CPF do corredor.
 * Garante que foram informados os 11 dígitos necessários para formatação e controle de duplicidade.
 * @param {string|null|undefined} rawCpf
 * @returns {{ valid: boolean, message?: string }}
 */
export function validateCpf(rawCpf) {
  const digits = normalizeCpf(rawCpf)
  if (!digits) {
    return { valid: false, message: 'Informe o CPF do corredor.' }
  }
  if (digits.length !== 11) {
    return { valid: false, message: 'O CPF deve conter exatamente 11 números.' }
  }
  return { valid: true }
}

