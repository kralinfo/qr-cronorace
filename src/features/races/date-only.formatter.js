// Responsabilidade única: formatação de datas (sem horário) para exibição em pt-BR.

const DATE_FORMATTER = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'UTC'
})

/**
 * Formata uma data no formato YYYY-MM-DD (sem componente de hora) para dd/mm/aaaa.
 * Usa UTC para evitar que o fuso horário local desloque o dia exibido.
 * @param {string} dateOnly
 * @returns {string}
 */
export function formatDateOnlyBR(dateOnly) {
  if (!dateOnly) return '—'
  const parsed = new Date(`${dateOnly}T00:00:00Z`)
  if (Number.isNaN(parsed.getTime())) return dateOnly
  return DATE_FORMATTER.format(parsed)
}
