// Responsabilidade única: ler e converter arquivos/texto CSV em linhas de objetos.

/** Ordem posicional usada quando o CSV não possui linha de cabeçalho. */
const POSITIONAL_COLUMNS = ['Barcode', 'Date & Time', 'Timestamp']

/**
 * Lê um File (input type="file") como texto.
 * @param {File} file
 * @returns {Promise<string>}
 */
export function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(reader.error)
    reader.readAsText(file)
  })
}

/**
 * Faz o parse de um texto CSV simples (com suporte a campos entre aspas) em objetos.
 * Se a primeira linha contiver os cabeçalhos esperados, usa-a como cabeçalho;
 * caso contrário, assume a ordem posicional [Barcode, Date & Time, Timestamp].
 * @param {string} text
 * @returns {Array<Record<string, string>>}
 */
export function parseCSVText(text) {
  const rows = splitCSVLines(text)
  if (rows.length === 0) return []

  const header = hasKnownHeader(rows[0]) ? rows[0].map(h => h.trim()) : POSITIONAL_COLUMNS
  const dataRows = hasKnownHeader(rows[0]) ? rows.slice(1) : rows

  return dataRows
    .filter(cols => cols.some(c => c.trim() !== ''))
    .map(cols => Object.fromEntries(header.map((key, i) => [key, (cols[i] ?? '').trim()])))
}

/** @param {string[]} cols @returns {boolean} */
function hasKnownHeader(cols) {
  const normalized = cols.map(c => c.trim().toLowerCase())
  return POSITIONAL_COLUMNS.some(col => normalized.includes(col.toLowerCase()))
}

/**
 * Lê e faz parse de um arquivo CSV diretamente.
 * @param {File} file
 * @returns {Promise<Array<Record<string, string>>>}
 */
export async function parseCSVFile(file) {
  const text = await readFileAsText(file)
  return parseCSVText(text)
}

/** @param {string} text @returns {string[][]} */
function splitCSVLines(text) {
  const lines = text.split(/\r\n|\n|\r/).filter(line => line.length > 0)
  return lines.map(parseCSVLine)
}

/** @param {string} line @returns {string[]} */
function parseCSVLine(line) {
  const cols = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (inQuotes) {
      if (char === '"' && line[i + 1] === '"') { current += '"'; i++ }
      else if (char === '"') { inQuotes = false }
      else { current += char }
    } else if (char === '"') {
      inQuotes = true
    } else if (char === ',') {
      cols.push(current); current = ''
    } else {
      current += char
    }
  }
  cols.push(current)
  return cols
}
