// UI only: modal para importar corredores em lote a partir de uma planilha CSV ou Excel (.xlsx).
// Cada linha deve conter: nome, cpf, número (de peito) e categoria (opcional).
import React, { useCallback, useMemo, useState } from 'react'
import { useRunners } from './useRunners.js'
import {
  parseRunnersFile,
  expectedColumns,
} from './import-runners.service.js'
import {
  maskCpf,
  normalizeCpf,
  validateCpf,
  capitalizeName,
  formatRunnerNumber,
} from './runner-formatter.service.js'
import { normalizeComparable } from './runners.repository.js'
import Modal from '../../shared/Modal.jsx'
import { IconClose, IconUpload, IconDownload, IconCheck } from '../../shared/Icons.jsx'

const ACCEPTED_EXTENSIONS = '.csv,.xlsx'

export default function ImportRunnersModal({ raceId, onClose }) {
  const { runners, createRunner, loading: loadingRunners } = useRunners(raceId)

  const [file, setFile] = useState(null)
  const [fileName, setFileName] = useState('')
  const [rawRows, setRawRows] = useState([])
  const [parseError, setParseError] = useState(null)
  const [importing, setImporting] = useState(false)
  const [importedCount, setImportedCount] = useState(0)
  const [errorCount, setErrorCount] = useState(0)
  const [showSummary, setShowSummary] = useState(false)
  const [confirmingImport, setConfirmingImport] = useState(false)

  const columns = expectedColumns()

  // Corredores já cadastrados nesta corrida, indexados para checagem de duplicidade.
  const existing = useMemo(() => {
    const byCpf = new Map()
    const byNumber = new Map()
    const byName = new Map()
    for (const r of runners) {
      const cpf = normalizeCpf(r.cpf)
      if (cpf) byCpf.set(cpf, r)
      if (r.number) byNumber.set(normalizeComparable(r.number), r)
      byName.set(normalizeComparable(r.name), r)
    }
    return { byCpf, byNumber, byName }
  }, [runners])

  const prepareRow = useCallback(
    (row, line) => {
      const errors = []
      const rawName = String(row.nome ?? '').trim()
      const rawCpf = String(row.cpf ?? '')
      const rawNumber = String(row.numero ?? '')
      const rawCategory = String(row.categoria ?? '').trim()

      if (!rawName) errors.push('Nome obrigatório')

      const cpfValidation = validateCpf(rawCpf)
      if (!cpfValidation.valid) errors.push(cpfValidation.message || 'CPF inválido')

      const numberDigits = rawNumber.replace(/\D/g, '')
      if (!numberDigits) errors.push('Número de peito obrigatório')
      else if (!/^\d+$/.test(numberDigits)) errors.push('Número deve conter apenas dígitos')

      const formattedName = capitalizeName(rawName)
      const formattedCpf = maskCpf(rawCpf)
      const formattedNumber = formatRunnerNumber(numberDigits)
      const normalizedDigitsCpf = normalizeCpf(rawCpf)

      return {
        _line: line,
        _rawName: rawName,
        formatted: {
          name: formattedName,
          cpf: formattedCpf,
          number: formattedNumber,
          category: rawCategory,
        },
        errors,
      }
    },
    []
  )

  // Valida duplicidades dentro da planilha e contra corredores já cadastrados na corrida.
  const preparedRows = useMemo(() => {
    const seenCpf = new Map()
    const seenNumber = new Map()
    const seenName = new Map()

    return rawRows.map((row) => {
      const base = prepareRow(row, row._line)
      const { formatted } = base

      const addDuplicate = (kind, value, line) => {
        if (!value) return
        base.errors.push(`${kind} duplicado na linha ${line} da planilha`)
      }

      const cpfKey = normalizeCpf(formatted.cpf)
      if (cpfKey) {
        if (seenCpf.has(cpfKey)) addDuplicate('CPF', cpfKey, seenCpf.get(cpfKey))
        else seenCpf.set(cpfKey, base._line)
        const existingWithCpf = existing.byCpf.get(cpfKey)
        if (existingWithCpf) {
          base.errors.push(
            `CPF já cadastrado nesta corrida ("${existingWithCpf.name}", Nº ${existingWithCpf.number || '—'})`
          )
        }
      }

      const numberKey = normalizeComparable(formatted.number)
      if (numberKey) {
        if (seenNumber.has(numberKey)) addDuplicate('Número', numberKey, seenNumber.get(numberKey))
        else seenNumber.set(numberKey, base._line)
        const existingWithNumber = existing.byNumber.get(numberKey)
        if (existingWithNumber) {
          base.errors.push(`Número já cadastrado nesta corrida ("${existingWithNumber.name}")`)
        }
      }

      const nameKey = normalizeComparable(formatted.name)
      if (nameKey) {
        if (seenName.has(nameKey)) addDuplicate('Nome', nameKey, seenName.get(nameKey))
        else seenName.set(nameKey, base._line)
        const existingWithName = existing.byName.get(nameKey)
        if (existingWithName) {
          base.errors.push(`Nome já cadastrado nesta corrida (Nº ${existingWithName.number || '—'})`)
        }
      }

      base.status = base.errors.length ? 'error' : 'ok'
      return base
    })
  }, [rawRows, existing, prepareRow])

  const handleFileChange = async (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setFileName(f.name)
    setParseError(null)
    setRawRows([])
    setShowSummary(false)
    try {
      const { rows: parsed, errors } = await parseRunnersFile(f)
      setRawRows(parsed.filter((r) => Object.values(r).some((v) => v != null && String(v).trim() !== '')))
      if (errors.length) {
        setParseError(`A planilha teve ${errors.length} problema(s) ao ser lida. Verifique o formato do arquivo.`)
      }
    } catch (err) {
      setParseError(`Não foi possível ler a planilha: ${err?.message || err}`)
      setFile(null)
    }
  }

  const handleDownloadTemplate = () => {
    const header = columns.map((c) => c.key).join(',')
    const csvField = (v) => {
      const s = String(v ?? '')
      return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
    }
    const example = [
      csvField('João Silva da Costa'),
      csvField('123.456.789-01'),
      csvField('0104'),
      csvField('Masculino 30-39'),
    ].join(',')
    const csv = `${header}\n${example}\n`
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'modelo-importacao-corredores.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleImport = async () => {
    const valid = preparedRows.filter((r) => r.status === 'ok')
    if (!valid.length || !raceId || raceId === 'ALL') return

    // Se há linhas com erro, pede confirmação antes de importar apenas os válidos
    if (errorRowCount > 0) {
      setConfirmingImport(true)
      return
    }

    await runImport(valid)
  }

  const runImport = async (valid) => {
    setImporting(true)
    setImportedCount(0)
    setErrorCount(0)
    let imported = 0
    let failed = 0
    for (const row of valid) {
      const result = await createRunner(
        row.formatted.name,
        row.formatted.number,
        row.formatted.cpf,
        raceId,
        row.formatted.category
      )
      if (result) imported += 1
      else failed += 1
    }
    setImportedCount(imported)
    setErrorCount(failed)
    setImporting(false)
    setShowSummary(true)
    setFile(null)
    setFileName('')
    setRawRows([])
    setConfirmingImport(false)
  }

  const handleConfirmImportValidOnly = () => {
    const valid = preparedRows.filter((r) => r.status === 'ok')
    runImport(valid)
  }

  const validCount = preparedRows.filter((r) => r.status === 'ok').length
  const errorRowCount = preparedRows.filter((r) => r.status === 'error').length

  const canImport = validCount > 0 && !importing && Boolean(raceId) && raceId !== 'ALL'

  const missingRace = !raceId || raceId === 'ALL'

  return (
    <div
      className="modal-overlay import-runner-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      role="dialog"
      aria-modal="true"
    >
      <div className="modal-sheet import-runner-sheet" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 640 }}>
        <div className="modal-header">
          <h2 className="modal-title">Importar corredores de planilha</h2>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Fechar modal"
          >
            <IconClose size={16} />
          </button>
        </div>
        <div className="modal-body">
          {missingRace && (
            <div style={{ background: 'var(--amber-bg)', border: '1px solid rgba(255,149,0,0.2)', color: 'var(--amber-text)', padding: '10px 14px', borderRadius: '10px', fontSize: '0.88rem', marginBottom: 12 }}>
              Selecione uma corrida específica antes de importar a planilha.
            </div>
          )}
          <p style={{ margin: '0 0 8px', fontSize: '0.92rem', color: 'var(--text-secondary)' }}>
            Envie uma planilha (<strong>.csv</strong> ou <strong>.xlsx</strong>) com as colunas:
          </p>
          <ul className="import-columns" style={{ margin: '0 0 12px', paddingLeft: 18, fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
            {columns.map((c) => (
              <li key={c.key}>{c.label}</li>
            ))}
          </ul>
          <p style={{ margin: '0 0 10px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Dica: baixe o modelo abaixo, preencha com o Excel/Planilhas Google e exporte como CSV (UTF-8).
          </p>
          <button
            type="button"
            className="secondary-btn"
            onClick={handleDownloadTemplate}
            disabled={importing}
            style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <IconDownload size={16} /> Baixar modelo de planilha (CSV)
          </button>

          {parseError && (
            <div style={{ background: 'var(--red-bg)', border: '1px solid rgba(255,59,48,0.2)', color: 'var(--red-text)', padding: '10px 14px', borderRadius: '10px', fontSize: '0.88rem', marginBottom: 12 }}>
              {parseError}
            </div>
          )}

          <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, marginBottom: 6 }}>
            Selecionar planilha
          </label>
          <input
            type="file"
            accept={ACCEPTED_EXTENSIONS}
            onChange={handleFileChange}
            disabled={importing || missingRace}
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid var(--border-medium)',
              borderRadius: '10px',
              background: 'var(--card)',
              fontSize: '0.9rem',
              marginBottom: 12,
            }}
          />
          {file && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 12 }}>
              <span style={{ color: 'var(--accent)' }}><IconUpload size={14} /></span>
              <span title={fileName}>{fileName.length > 48 ? fileName.slice(0, 45) + '...' : fileName}</span>
            </div>
          )}

          {rawRows.length > 0 && (
            <section style={{ marginTop: 8 }}>
              <p style={{ margin: '0 0 8px', fontSize: '0.88rem', fontWeight: 600 }}>
                Pré-visualização ({rawRows.length} linha(s) encontrada(s))
              </p>
              <table className="import-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', marginBottom: 10 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '6px 8px', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: '0.8rem' }}>Linha</th>
                    <th style={{ textAlign: 'left', padding: '6px 8px', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: '0.8rem' }}>Nome</th>
                    <th style={{ textAlign: 'left', padding: '6px 8px', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: '0.8rem' }}>CPF</th>
                    <th style={{ textAlign: 'left', padding: '6px 8px', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: '0.8rem' }}>Número</th>
                    <th style={{ textAlign: 'left', padding: '6px 8px', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: '0.8rem' }}>Categoria</th>
                    <th style={{ textAlign: 'left', padding: '6px 8px', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: '0.8rem' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {preparedRows.map((row) => (
                    <tr key={String(row._line) + row.formatted.name} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '6px 8px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>{row._line}</td>
                      <td style={{ padding: '6px 8px' }}>{row._rawName || '—'}</td>
                      <td style={{ padding: '6px 8px' }}>{row.formatted.cpf || '—'}</td>
                      <td style={{ padding: '6px 8px' }}>{row.formatted.number || '—'}</td>
                      <td style={{ padding: '6px 8px' }}>{row.formatted.category || '—'}</td>
                      <td style={{ padding: '6px 8px' }}>
                        {row.status === 'ok' ? (
                          <span style={{ color: 'var(--green-text)', fontSize: '0.8rem', fontWeight: 600 }}>
                            <IconCheck size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} /> OK
                          </span>
                        ) : (
                          <span style={{ color: 'var(--red-text)', fontSize: '0.8rem', fontWeight: 600 }}>Erro</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {errorRowCount > 0 && (
                <div style={{ marginTop: 6 }}>
                  {preparedRows
                    .filter((r) => r.status === 'error')
                    .map((r) => (
                      <div key={String(r._line)} style={{ fontSize: '0.8rem', color: 'var(--red-text)', marginBottom: 4 }}>
                        Linha {r._line}: {r.errors.join('; ')}
                      </div>
                    ))}
                </div>
              )}
            </section>
          )}

          {showSummary && (
            <div style={{ background: 'var(--green-bg)', border: '1px solid rgba(52,199,89,0.2)', color: 'var(--green-text)', padding: '12px 14px', borderRadius: '10px', fontSize: '0.9rem', marginTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <IconCheck size={18} />
              <span>
                <strong>{importedCount} corredor(es) importado(s) com sucesso.</strong>
                {errorCount > 0 ? ` ${errorCount} não puderam ser importados (veja os erros acima).` : ''}
              </span>
            </div>
          )}

          {validCount > 0 && !showSummary && !importing && (
            <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                type="button"
                className="primary-btn"
                onClick={handleImport}
                disabled={!canImport || loadingRunners}
              >
                {importing ? 'Importando...' : `Importar ${validCount} corredor(es)`}
              </button>
              <button
                type="button"
                className="secondary-btn"
                onClick={() => {
                  setFile(null)
                  setFileName('')
                  setRawRows([])
                  setParseError(null)
                  setShowSummary(false)
                  setConfirmingImport(false)
                }}
              >
                Escolher outro arquivo
              </button>
            </div>
          )}

          {/* Diálogo de confirmação quando há erros */}
          {confirmingImport && errorRowCount > 0 && (
            <div style={{
              background: 'var(--amber-bg)',
              border: '1px solid rgba(255,149,0,0.2)',
              color: 'var(--amber-text)',
              padding: '14px 16px',
              borderRadius: '10px',
              marginTop: 12,
              fontSize: '0.9rem',
              lineHeight: 1.5
            }}>
              <p style={{ margin: '0 0 12px', fontWeight: 600 }}>
                Encontramos <strong>{errorRowCount} linha(s) com erro(s)</strong> na planilha.
              </p>
              <p style={{ margin: '0 0 14px' }}>
                Deseja importar apenas os <strong>{validCount} registro(s) válido(s)</strong> agora,
                ou prefere corrigir a planilha e importar novamente?
              </p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="primary-btn"
                  onClick={handleConfirmImportValidOnly}
                  disabled={importing}
                >
                  Importar apenas os válidos
                </button>
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setConfirmingImport(false)}
                  disabled={importing}
                >
                  Corrigir e importar novamente
                </button>
              </div>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
          <button type="button" className="secondary-btn" onClick={onClose} disabled={importing || confirmingImport}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}
