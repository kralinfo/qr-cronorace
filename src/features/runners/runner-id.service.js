// Responsabilidade única: gerar identificadores simples e legíveis para corredores, atrelados à corrida.

/**
 * Gera um id curto e legível para o corredor, combinando um trecho do id da corrida
 * com um número sequencial (ex: "a3f1-007").
 * @param {string} raceId
 * @param {number} sequenceNumber - posição do corredor dentro da corrida (1, 2, 3...).
 * @returns {string}
 */
export function generateRunnerId(raceId, sequenceNumber) {
  const raceSuffix = raceId.slice(-4)
  const sequence = String(sequenceNumber).padStart(3, '0')
  return `${raceSuffix}-${sequence}`
}
