// Responsabilidade única: ler planilhas (CSV/Excel) e extrair linhas de corredores para importação em lote.
import Papa from 'papaparse'
import * as XLSX from 'xlsx'

const COLUMN_ALIASES = {
  nome: ['nome', 'name', 'corredor', 'atleta', 'nome do corredor', 'nome_completo', 'nomecompleto', 'nome completo'],
  cpf: ['cpf'],
  numero: ['numero', 'número', 'nº', 'num', 'nro', 'n.º', 'bib', 'numero de peito', 'número de peito', 'numero de peito', 'number'],
  categoria: ['categoria', 'category', 'cat'],
}

/** Categorias pré-definidas permitidas para o campo categoria. */
export const VALID_CATEGORIES = ['Masculino', 'Feminino', 'PCD']

/** Mapeia variações comuns para o valor canônico. Retorna undefined se não reconhecido. */
const CATEGORY_ALIASES = {
  m: 'Masculino',
  masc: 'Masculino',
  masculino: 'Masculino',
  f: 'Feminino',
  fem: 'Feminino',
  feminino: 'Feminino',
  pcd: 'PCD',
}

/**
 * Normaliza a categoria informada para um dos valores predefinidos.
 * Retorna undefined quando não reconhecido (ou vazio).
 * @param {string|null|undefined} rawCategory
 * @returns {string|undefined}
 */
export function normalizeCategory(rawCategory) {
  if (rawCategory == null) return undefined
  const trimmed = String(rawCategory).trim()
  if (!trimmed) return undefined
  const key = trimmed.toLowerCase()
  if (CATEGORY_ALIASES[key]) return CATEGORY_ALIASES[key]
  // Aceita já canônico (ex: 'Masculino' digitado exatamente)
  for (const cat of VALID_CATEGORIES) {
    if (cat.toLowerCase() === key) return cat
  }
  return undefined
}

/**
 * Valida se a categoria está entre os valores predefinidos (ou está vazia/opcional).
 * @returns {{ valid: boolean, message?: string, normalized?: string }}
 */
export function validateCategory(rawCategory) {
  if (rawCategory == null) return { valid: true, normalized: undefined }
  const trimmed = String(rawCategory).trim()
  if (!trimmed) return { valid: true, normalized: undefined }
  const normalized = normalizeCategory(trimmed)
  if (!normalized) {
    return {
      valid: false,
      message: `Categoria inválida. Use: ${VALID_CATEGORIES.join(', ')}.`,
    }
  }
  return { valid: true, normalized }
}

/** @returns {Array<{key: string, label: string}>} */
export function expectedColumns() {
  return [
    { key: 'nome', label: 'Nome do corredor' },
    { key: 'cpf', label: 'CPF' },
    { key: 'numero', label: 'Número de peito' },
    { key: 'categoria', label: `Categoria (opcional: ${VALID_CATEGORIES.join(', ')})` },
  ]
}

function normalizeHeader(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[àáâãäå]/g, 'a')
    .replace(/[èéêë]/g, 'e')
    .replace(/[ìíîï]/g, 'i')
    .replace(/[òóôõö]/g, 'o')
    .replace(/[ùúûü]/g, 'u')
    .replace(/[ç]/g, 'c')
}

function mapHeader(header) {
  const norm = normalizeHeader(header)
  for (const [key, aliases] of Object.entries(COLUMN_ALIASES)) {
    if (aliases.includes(norm)) return key
  }
  return norm
}

/** Lê o conteúdo de um File como texto (UTF-8). */
export function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(reader.error)
    reader.readAsText(file)
  })
}

/** Lê o conteúdo de um File como ArrayBuffer (usado por .xlsx). */
export function readFileAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(reader.error)
    reader.readAsArrayBuffer(file)
  })
}

/**
 * Faz o parse de um arquivo CSV e retorna linhas mapeadas.
 * @returns {{ rows: Array<Record<string, any>>, errors: Array<any> }}
 */
export async function parseRunnersCsvFile(file) {
  const text = await readFileAsText(file)
  return new Promise((resolve, reject) => {
    Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: mapHeader,
      complete: (result) => {
        const rows = result.data.map((row, i) => ({ ...row, _line: i + 2 }))
        resolve({ rows, errors: result.errors })
      },
      error: (err) => reject(err),
    })
  })
}

/**
 * Faz o parse de um arquivo Excel (.xlsx) da primeira aba e retorna linhas mapeadas.
 * @returns {{ rows: Array<Record<string, any>>, errors: Array<any> }}
 */
export async function parseRunnersXlsxFile(file) {
  const buffer = await readFileAsArrayBuffer(file)
  const workbook = XLSX.read(buffer, { type: 'array' })
  const sheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[sheetName]
  const raw = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', blankrows: false })
  if (raw.length === 0) return { rows: [], errors: [] }
  const headerRow = raw[0]
  const mappedHeader = headerRow.map(mapHeader)
  const rows = raw.slice(1).map((row, i) => {
    const obj = { _line: i + 2 }
    mappedHeader.forEach((key, idx) => {
      obj[key] = row[idx]
    })
    return obj
  })
  return { rows, errors: [] }
}

/**
 * Detecta o tipo do arquivo e faz o parse adequado.
 * @param {File} file
 * @returns {{ rows: Array<Record<string, any>>, errors: Array<any> }}
 */
export async function parseRunnersFile(file) {
  const name = String(file.name ?? '').toLowerCase()
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
    return parseRunnersXlsxFile(file)
  }
  return parseRunnersCsvFile(file)
}
