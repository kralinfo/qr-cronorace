// Responsabilidade única: gerar identificadores simples e legíveis para corredores, atrelados à corrida.

/**
 * Gera um id único para o corredor, combinando o raceId completo com um número sequencial.
 * Usa o raceId inteiro (não apenas um trecho) para garantir que corredores de corridas
 * diferentes NUNCA tenham o mesmo id — evitando sobrescrita acidental no Firestore.
 *
 * Formato: "{raceId}-r{sequência com 4 dígitos}"
 * Exemplo: "CRT-06112026-r0001", "CTB-06112026-r0001" → ids distintos mesmo na mesma data.
 *
 * @param {string} raceId
 * @param {number} sequenceNumber - posição do corredor dentro da corrida (1, 2, 3...).
 * @returns {string}
 */
export function generateRunnerId(raceId, sequenceNumber) {
  const sequence = String(sequenceNumber).padStart(4, '0')
  return `${raceId}-r${sequence}`
}
