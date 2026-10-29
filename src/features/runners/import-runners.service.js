// Responsabilidade única: ler planilhas (CSV/Excel), validar e normalizar linhas de corredores para importação em lote, além de gerar modelos.
import Papa from 'papaparse'
import * as XLSX from 'xlsx'

export const COLUMN_ALIASES = {
  numero: ['numero', 'número', 'nº', 'num', 'nro', 'n.º', 'bib', 'numero de peito', 'número de peito', 'number', 'inscricao', 'inscrição', 'n°'],
  nome: ['nome', 'name', 'corredor', 'atleta', 'nome do corredor', 'nome_completo', 'nomecompleto', 'nome completo'],
  sexo: ['sexo', 'sex', 'genero', 'gênero', 'gender'],
  local: ['local', 'localidade', 'origem', 'cidade', 'visitante', 'residencia', 'residente'],
  especial: ['categoria especial', 'categoria_especial', 'especial', 'condicao', 'condição', 'pcd', 'pcd/60', 'pcd_60', 'obs', 'observacao', 'observação'],
  cpf: ['cpf', 'documento'],
  categoria: ['categoria', 'category', 'cat'],
}

/**
 * Normaliza o valor de sexo.
 * Aceita variações como M, F, Masculino, Feminino.
 * @param {any} val
 * @returns {'MASCULINO' | 'FEMININO' | null}
 */
export function normalizeSex(val) {
  if (val == null) return null
  const clean = String(val).trim().toUpperCase()
  if (!clean) return null
  if (clean === 'M' || clean === 'MASC' || clean === 'MASCULINO' || clean === 'HOMEM' || clean === '1') {
    return 'MASCULINO'
  }
  if (clean === 'F' || clean === 'FEM' || clean === 'FEMININO' || clean === 'MULHER' || clean === '2') {
    return 'FEMININO'
  }
  return null
}

/**
 * Normaliza o valor de localidade (Local vs Visitante).
 * Padrão quando vazio ou omitido: false (Visitante).
 * @param {any} val
 * @returns {{ isLocal: boolean, valid: boolean }}
 */
export function normalizeLocal(val) {
  if (val == null || String(val).trim() === '') {
    return { isLocal: false, valid: true } // Vazio = padrão Visitante
  }
  const clean = String(val).trim().toUpperCase()
  if (clean === 'L' || clean === 'LOCAL' || clean === 'SIM' || clean === 'S' || clean === '1' || clean === 'TRUE') {
    return { isLocal: true, valid: true }
  }
  if (clean === 'V' || clean === 'VISITANTE' || clean === 'NAO' || clean === 'NÃO' || clean === 'N' || clean === '0' || clean === 'FALSE') {
    return { isLocal: false, valid: true }
  }
  return { isLocal: false, valid: false }
}

/**
 * Normaliza a categoria especial (PCD ou +60).
 * @param {any} val
 * @returns {{ special: '' | 'PCD' | '+60', valid: boolean }}
 */
export function normalizeSpecial(val) {
  if (val == null || String(val).trim() === '' || String(val).trim() === '-') {
    return { special: '', valid: true }
  }
  const clean = String(val).trim().toUpperCase()
  if (clean === 'PCD' || clean === 'P.C.D.' || clean === 'DEFICIENTE' || clean.includes('PCD')) {
    return { special: 'PCD', valid: true }
  }
  // Aceita +60, 60, 60+, '60 anos', 'maior de 60', 'idoso', etc.
  if (
    clean === '+60' ||
    clean === '60+' ||
    clean === '60' ||
    clean.includes('60') ||
    clean.includes('IDOSO') ||
    clean.includes('SENIOR') ||
    clean.includes('SÊNIOR') ||
    clean.includes('MASTER')
  ) {
    return { special: '+60', valid: true }
  }
  return { special: '', valid: false }
}

/**
 * Constrói a categoria canônica usada no sistema.
 * @param {{ sex: 'MASCULINO' | 'FEMININO', isLocal: boolean, special?: '' | 'PCD' | '+60', rawCategory?: string }} params
 * @returns {string}
 */
export function buildCanonicalCategory({ sex, isLocal, special = '', rawCategory = '' }) {
  // Se já veio uma categoria completa do sistema (ex: fallback)
  if (!sex && rawCategory) {
    const rawUpper = rawCategory.trim().toUpperCase()
    if (rawUpper.includes('MASC') || rawUpper.includes('FEM')) {
      return rawUpper
    }
  }

  const isFem = sex === 'FEMININO'
  const base = isLocal
    ? (isFem ? 'LOCAL FEM' : 'LOCAL MASC')
    : (isFem ? 'FEMININO' : 'MASCULINO')

  return special ? `${base} | ${special}` : base
}

/** Colunas esperadas na planilha modelo. */
export function expectedColumns() {
  return [
    { key: 'numero', label: 'Número', obrigatorio: true, exemplo: '0010' },
    { key: 'nome', label: 'Nome', obrigatorio: true, exemplo: 'João da Silva' },
    { key: 'sexo', label: 'Sexo (M ou F)', obrigatorio: true, exemplo: 'M' },
    { key: 'local', label: 'Local (L ou V)', obrigatorio: false, exemplo: 'L' },
    { key: 'especial', label: 'Categoria especial (PCD, +60 ou 60)', obrigatorio: false, exemplo: '60' },
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
 * @returns {Promise<{ rows: Array<Record<string, any>>, errors: Array<any> }>}
 */
export async function parseRunnersCsvFile(file) {
  const text = await readFileAsText(file)
  return new Promise((resolve, reject) => {
    Papa.parse(text, {
      header: true,
      skipEmptyLines: 'greedy',
      transformHeader: mapHeader,
      complete: (result) => {
        const rows = result.data.map((row, i) => ({ ...row, _line: i + 2 }))
        resolve({ rows, errors: result.errors || [] })
      },
      error: (err) => reject(err),
    })
  })
}

/**
 * Faz o parse de um arquivo Excel (.xlsx) da primeira aba e retorna linhas mapeadas.
 * @returns {Promise<{ rows: Array<Record<string, any>>, errors: Array<any> }>}
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
 * @returns {Promise<{ rows: Array<Record<string, any>>, errors: Array<any> }>}
 */
export async function parseRunnersFile(file) {
  const name = String(file.name ?? '').toLowerCase()
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
    return parseRunnersXlsxFile(file)
  }
  return parseRunnersCsvFile(file)
}

/**
 * Gera e faz o download de uma planilha Excel modelo (.xlsx)
 * com aba de Inscrições e aba de Instruções claras para Humanos e IA.
 */
export function downloadRunnersTemplateXlsx() {
  const wb = XLSX.utils.book_new()

  // Aba 1: Inscrições
  const dataInscricoes = [
    ['Número', 'Nome', 'Sexo', 'Local', 'Categoria especial'],
    ['0010', 'Breno Henrique', 'M', 'L', ''],
    ['0020', 'Bruno Silva', 'M', 'V', ''],
    ['0040', 'Silmara Santos', 'F', 'V', ''],
    ['0045', 'Fernando Costa', 'M', 'L', '60'],
    ['0050', 'Roberto Almeida', 'M', 'V', 'PCD'],
    ['0060', 'Bebel Pereira', 'F', 'L', ''],
  ]
  const wsInscricoes = XLSX.utils.aoa_to_sheet(dataInscricoes)

  // Largura das colunas
  wsInscricoes['!cols'] = [
    { wch: 10 }, // Número
    { wch: 28 }, // Nome
    { wch: 10 }, // Sexo
    { wch: 10 }, // Local
    { wch: 22 }, // Categoria especial
  ]

  XLSX.utils.book_append_sheet(wb, wsInscricoes, 'Inscrições')

  // Aba 2: Instruções para IA e Organizadores
  const dataInstrucoes = [
    ['GUIA DE PREENCHIMENTO DA PLANILHA (HUMANOS & INTELIGÊNCIA ARTIFICIAL)'],
    [''],
    ['CAMPO', 'OBRIGATÓRIO?', 'VALORES ACEITOS', 'EXEMPLO', 'DESCRIÇÃO'],
    ['Número', 'SIM', 'Apenas dígitos numéricos', '0010, 25, 100', 'Número de peito do corredor. Não pode ser duplicado.'],
    ['Nome', 'SIM', 'Nome completo do atleta', 'João da Silva', 'Nome e sobrenome do participante.'],
    ['Sexo', 'SIM', 'M ou F (ou Masculino / Feminino)', 'M ou F', 'Gênero da categoria: M para masculino, F para feminino.'],
    ['Local', 'NÃO', 'L (Local) ou V (Visitante)', 'L ou V', 'L para morador local/da cidade; V para visitante. Vazio = Visitante.'],
    ['Categoria especial', 'NÃO', 'PCD, +60 ou 60 (ou vazio)', 'PCD, +60, 60 ou vazio', 'PCD para deficiência; +60 ou 60 para 60 anos ou mais. Vazio se padrão.'],
    [''],
    ['INSTRUÇÃO PARA PROMPTS DE IA:'],
    ['Se você possui listas separadas (ex: Masculino Local, Feminino Visitante, PCDs), envie esta planilha junto com as listas para uma IA (como ChatGPT, Gemini ou Claude) com o comando:'],
    ['"Organize a lista de corredores anexa nas colunas exatas da aba Inscrições desta planilha: Número, Nome, Sexo (M/F), Local (L/V), Categoria especial (PCD/+60 ou vazio)."'],
  ]
  const wsInstrucoes = XLSX.utils.aoa_to_sheet(dataInstrucoes)
  wsInstrucoes['!cols'] = [
    { wch: 20 },
    { wch: 15 },
    { wch: 32 },
    { wch: 20 },
    { wch: 55 },
  ]
  XLSX.utils.book_append_sheet(wb, wsInstrucoes, 'Instruções')

  XLSX.writeFile(wb, 'modelo-inscricao-corredores.xlsx')
}

/**
 * Gera e faz o download de um arquivo CSV modelo.
 */
export function downloadRunnersTemplateCsv() {
  const header = 'Número,Nome,Sexo,Local,Categoria especial'
  const rows = [
    '0010,Breno Henrique,M,L,',
    '0020,Bruno Silva,M,V,',
    '0040,Silmara Santos,F,V,',
    '0045,Fernando Costa,M,L,+60',
    '0050,Roberto Almeida,M,V,PCD',
    '0060,Bebel Pereira,F,L,',
  ]
  const csv = [header, ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'modelo-inscricao-corredores.csv'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
