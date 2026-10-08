/**
 * @typedef {Object} Race
 * @property {string} id - Identificador único da corrida.
 * @property {string} name - Nome da corrida.
 * @property {string} createdAt - Data/hora de criação (ISO).
 * @property {string|null} [eventDate] - Data prevista para a realização da corrida (YYYY-MM-DD).
 * @property {string|null} [startTime] - Horário da largada (ISO), usado para calcular o tempo de prova de cada corredor.
 * @property {string|null} [endTime] - Horário de encerramento da corrida (ISO). Quando definido, o cronômetro para de contar.
 * @property {number|null} [distanceKm] - Distância da prova em quilômetros.
 */

export {}
