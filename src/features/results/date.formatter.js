// Responsabilidade única: formatação de datas para exibição em pt-BR.

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit'
})

/**
 * Formata uma string de data/hora (ISO ou timestamp) para o padrão pt-BR (dd/mm/aaaa hh:mm:ss).
 * Retorna o valor original caso não seja possível converter.
 * @param {string} dateTime
 * @returns {string}
 */
export function formatDateTimeBR(dateTime) {
  const parsed = new Date(dateTime)
  if (Number.isNaN(parsed.getTime())) return dateTime
  return DATE_TIME_FORMATTER.format(parsed)
}
