/**
 * @typedef {Object} ResultRow
 * @property {string} barcode - Código do corredor (coluna "Barcode").
 * @property {string} dateTime - Data/hora legível (coluna "Date & Time").
 * @property {string} timestamp - Timestamp bruto (coluna "Timestamp").
 * @property {string} [raceId] - Id da corrida à qual o resultado pertence.
 * @property {string} [runnerName] - Nome do corredor no momento da leitura (quando disponível).
 * @property {string|null} [runnerNumber] - Número do corredor quando disponível (ex.: chegada manual).
 */

/**
 * @typedef {ResultRow & { position: number }} PlacementResult
 */

export {}
