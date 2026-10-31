// UI: Modal moderno para inscrição em lote de corredores via planilha (Excel .xlsx / .csv).
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRunners } from './useRunners.js'
import {
  parseRunnersFile,
  expectedColumns,
  normalizeSex,
  normalizeLocal,
  normalizeSpecial,
  buildCanonicalCategory,
  downloadRunnersTemplateXlsx,
  downloadRunnersTemplateCsv,
} from './import-runners.service.js'
import { getRaceById } from '../races/races.repository.js'
import {
  capitalizeName,
  formatRunnerNumber,
  maskCpf,
  normalizeCpf,
} from './runner-formatter.service.js'
import { normalizeComparable } from './runners.repository.js'
import { useDialog } from '../../shared/DialogProvider.jsx'
import { IconClose, IconUpload, IconDownload, IconCheck } from '../../shared/Icons.jsx'

const ACCEPTED_EXTENSIONS = '.xlsx,.xls,.csv'

export default function ImportRunnersModal({ raceId, onClose }) {
  const { runners, createRunnersBatch, loading: loadingRunners } = useRunners(raceId)
  const dialog = useDialog()

  const [file, setFile] = useState(null)
  const [fileName, setFileName] = useState('')
  const [rawRows, setRawRows] = useState([])
  const [parseError, setParseError] = useState(null)
  const [importing, setImporting] = useState(false)
  const [importedCount, setImportedCount] = useState(0)
  const [showSummary, setShowSummary] = useState(false)
  const [confirmingPartial, setConfirmingPartial] = useState(false)
  const [race, setRace] = useState(null)
  const [raceLoading, setRaceLoading] = useState(Boolean(raceId))
  const [filterPreview, setFilterPreview] = useState('ALL') // 'ALL' | 'VALID' | 'ERROR'
  const [isDragOver, setIsDragOver] = useState(false)

  const fileInputRef = useRef(null)
  const columns = expectedColumns()

  useEffect(() => {
    if (!raceId) {
      setRace(null)
      setRaceLoading(false)
      return
    }
    setRaceLoading(true)
    getRaceById(raceId)
      .then((r) => setRace(r ?? null))
      .catch(() => setRace(null))
      .finally(() => setRaceLoading(false))
  }, [raceId])

  const isRaceRunning = Boolean(race?.startTime && !race?.endTime)
  const isRaceFinished = Boolean(race?.endTime)

  // Indexa corredores já cadastrados na corrida atual
  const existing = useMemo(() => {
    const byNumber = new Map()
    const byName = new Map()
    for (const r of (runners || [])) {
      if (r.number) byNumber.set(normalizeComparable(r.number), r)
      if (r.name) byName.set(normalizeComparable(r.name), r)
    }
    return { byNumber, byName }
  }, [runners])

  // Processa e valida linha por linha
  const prepareRow = useCallback(
    (row, line) => {
      const errors = []

      // 1. Número
      const rawNumber = String(row.numero ?? '').trim()
      const numberDigits = rawNumber.replace(/\D/g, '')
      if (!rawNumber) {
        errors.push('Número de peito obrigatório')
      } else if (!numberDigits || !/^\d+$/.test(rawNumber)) {
        errors.push('Número deve conter apenas dígitos numéricos')
      }

      // 2. Nome
      const rawName = String(row.nome ?? '').trim()
      if (!rawName) {
        errors.push('Nome obrigatório')
      } else if (rawName.length < 2) {
        errors.push('Nome muito curto')
      }

      // 3. Sexo
      const rawSex = row.sexo
      const normalizedSex = normalizeSex(rawSex)
      if (rawSex == null || String(rawSex).trim() === '') {
        // Tenta inferir se veio na coluna de categoria antiga
        const rawCat = String(row.categoria ?? '').toUpperCase()
        if (rawCat.includes('FEM')) {
          // infere FEMININO
        } else if (rawCat.includes('MASC')) {
          // infere MASCULINO
        } else {
          errors.push('Sexo obrigatório (M ou F)')
        }
      } else if (!normalizedSex) {
        errors.push('Sexo inválido (informe M para Masculino ou F para Feminino)')
      }

      // 4. Local
      const rawLocal = row.local
      const localNorm = normalizeLocal(rawLocal)
      if (!localNorm.valid) {
        errors.push('Local inválido (use L para Local ou V para Visitante)')
      }

      // 5. Categoria Especial (PCD ou +60 ou 60)
      let rawSpecial = row.especial
      if ((rawSpecial == null || String(rawSpecial).trim() === '') && row.categoria) {
        const catStr = String(row.categoria).toUpperCase()
        if (catStr.includes('PCD')) rawSpecial = 'PCD'
        else if (catStr.includes('60') || catStr.includes('IDOSO')) rawSpecial = '+60'
      }
      const specialNorm = normalizeSpecial(rawSpecial)
      if (!specialNorm.valid) {
        errors.push('Categoria especial inválida (use PCD, +60, 60 ou deixe vazio)')
      }

      const formattedName = capitalizeName(rawName)
      const formattedNumber = numberDigits ? formatRunnerNumber(numberDigits) : rawNumber

      // Determina categoria final
      let effectiveSex = normalizedSex
      if (!effectiveSex) {
        const rawCat = String(row.categoria ?? '').toUpperCase()
        if (rawCat.includes('FEM')) effectiveSex = 'FEMININO'
        else if (rawCat.includes('MASC')) effectiveSex = 'MASCULINO'
      }

      const finalCategory = buildCanonicalCategory({
        sex: effectiveSex || 'MASCULINO',
        isLocal: localNorm.isLocal,
        special: specialNorm.special,
        rawCategory: String(row.categoria ?? '')
      })

      return {
        _line: line,
        _rawNumber: rawNumber,
        _rawName: rawName,
        _rawSex: rawSex,
        _rawLocal: rawLocal,
        _rawSpecial: rawSpecial,
        formatted: {
          number: formattedNumber,
          name: formattedName,
          sex: effectiveSex,
          isLocal: localNorm.isLocal,
          special: specialNorm.special,
          category: finalCategory,
          cpf: row.cpf ? String(row.cpf).trim() : ''
        },
        errors,
      }
    },
    []
  )

  // Validação cruzada (duplicidades na planilha e contra o banco)
  const preparedRows = useMemo(() => {
    const seenNumbers = new Map()
    const seenNames = new Map()

    return rawRows.map((row) => {
      const base = prepareRow(row, row._line)
      const { formatted } = base

      // Checa duplicidade de número na própria planilha
      if (formatted.number) {
        const numKey = normalizeComparable(formatted.number)
        if (numKey) {
          if (seenNumbers.has(numKey)) {
            base.errors.push(`Número ${formatted.number} duplicado na linha ${seenNumbers.get(numKey)} da planilha`)
          } else {
            seenNumbers.set(numKey, base._line)
          }

          // Checa se já existe no banco de dados da corrida
          const existingRunner = existing.byNumber.get(numKey)
          if (existingRunner) {
            base.errors.push(`Número ${formatted.number} já cadastrado nesta corrida ("${existingRunner.name}")`)
          }
        }
      }

      // Checa duplicidade de nome na própria planilha
      if (formatted.name) {
        const nameKey = normalizeComparable(formatted.name)
        if (nameKey) {
          if (seenNames.has(nameKey)) {
            base.errors.push(`Nome "${formatted.name}" duplicado na linha ${seenNames.get(nameKey)} da planilha`)
          } else {
            seenNames.set(nameKey, base._line)
          }

          // Checa se já existe no banco de dados da corrida
          const existingRunnerName = existing.byName.get(nameKey)
          if (existingRunnerName) {
            base.errors.push(`Nome "${formatted.name}" já cadastrado nesta corrida (Nº ${existingRunnerName.number || '—'})`)
          }
        }
      }

      base.status = base.errors.length ? 'error' : 'ok'
      return base
    })
  }, [rawRows, existing, prepareRow])

  const validRows = useMemo(() => preparedRows.filter((r) => r.status === 'ok'), [preparedRows])
  const errorRows = useMemo(() => preparedRows.filter((r) => r.status === 'error'), [preparedRows])

  const displayedRows = useMemo(() => {
    if (filterPreview === 'VALID') return validRows
    if (filterPreview === 'ERROR') return errorRows
    return preparedRows
  }, [preparedRows, validRows, errorRows, filterPreview])

  const processFile = async (f) => {
    if (!f) return
    setFile(f)
    setFileName(f.name)
    setParseError(null)
    setRawRows([])
    setShowSummary(false)
    setConfirmingPartial(false)
    try {
      const { rows: parsed, errors } = await parseRunnersFile(f)
      // Remove linhas totalmente vazias
      const meaningfulRows = parsed.filter((r) =>
        Object.entries(r).some(([k, v]) => k !== '_line' && v != null && String(v).trim() !== '')
      )
      if (meaningfulRows.length === 0) {
        setParseError('A planilha selecionada está vazia ou não contém dados de corredores.')
        setFile(null)
        return
      }
      setRawRows(meaningfulRows)
      if (errors.length) {
        setParseError(`Atenção: ${errors.length} aviso(s) durante a leitura do arquivo. Confira os dados abaixo.`)
      }
    } catch (err) {
      setParseError(`Não foi possível ler a planilha: ${err?.message || err}`)
      setFile(null)
    }
  }

  const handleFileChange = (e) => {
    const f = e.target.files?.[0]
    if (f) processFile(f)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragOver(false)
    const f = e.dataTransfer.files?.[0]
    if (f) processFile(f)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = () => {
    setIsDragOver(false)
  }

  const handleExecuteImport = async (rowsToImport) => {
    if (!rowsToImport.length || !raceId || raceId === 'ALL') return
    if (isRaceRunning || isRaceFinished) return

    setImporting(true)
    try {
      const payload = rowsToImport.map((r) => ({
        number: r.formatted.number,
        name: r.formatted.name,
        category: r.formatted.category,
        cpf: r.formatted.cpf,
      }))

      const res = await createRunnersBatch(payload, raceId)
      if (res.success) {
        setImportedCount(res.count)
        setShowSummary(true)
      } else {
        dialog.alert(res.error?.message || 'Ocorreu um erro ao salvar os corredores.')
      }
    } catch (err) {
      console.error(err)
      dialog.alert(err?.message || 'Erro durante a importação em lote.')
    } finally {
      setImporting(false)
      setConfirmingPartial(false)
    }
  }

  const handleStartImport = () => {
    if (errorRows.length > 0) {
      setConfirmingPartial(true)
      return
    }
    handleExecuteImport(validRows)
  }

  const handleReset = () => {
    setFile(null)
    setFileName('')
    setRawRows([])
    setParseError(null)
    setShowSummary(false)
    setConfirmingPartial(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const missingRace = !raceId || raceId === 'ALL'
  const canImport = validRows.length > 0 && !importing && !missingRace && !isRaceRunning && !isRaceFinished

  return (
    <div
      className="arm-backdrop"
      onClick={(e) => { if (e.target === e.currentTarget && !importing) onClose() }}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="arm-dialog"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 860, maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}
      >
        {/* Topbar */}
        <div className="arm-topbar" style={{ paddingBottom: 14 }}>
          <div className="arm-heading-group">
            <div className="arm-badge-row">
              <span className="arm-header-pill">INSCRIÇÃO EM LOTE</span>
              <span className="arm-header-pill dist">EXCEL / CSV</span>
            </div>
            <h2 className="arm-main-title">Importar Corredores por Planilha</h2>
            <p className="arm-main-subtitle">
              Cadastre múltiplos participantes de uma só vez a partir de planilhas organizadas ou geradas por IA.
            </p>
          </div>
          <button
            type="button"
            className="arm-close-icon-btn"
            onClick={onClose}
            disabled={importing}
            title="Fechar"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {missingRace && (
            <div style={{ background: 'rgba(245, 158, 11, 0.15)', border: '1px solid #f59e0b', color: '#fbbf24', padding: '12px 16px', borderRadius: 12, fontSize: '0.88rem', fontWeight: 600 }}>
              ⚠️ Salve ou selecione uma corrida ativa antes de importar a planilha.
            </div>
          )}
          {isRaceRunning && (
            <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#fca5a5', padding: '12px 16px', borderRadius: 12, fontSize: '0.88rem', fontWeight: 600 }}>
              ⚠️ Esta corrida já está em andamento. Não é permitido importar novos corredores após a largada.
            </div>
          )}
          {isRaceFinished && (
            <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#fca5a5', padding: '12px 16px', borderRadius: 12, fontSize: '0.88rem', fontWeight: 600 }}>
              ⚠️ Esta corrida já foi encerrada.
            </div>
          )}

          {/* SUCESSO / RESUMO */}
          {showSummary ? (
            <div style={{
              background: 'rgba(34, 197, 94, 0.12)',
              border: '1.5px solid #22c55e',
              borderRadius: 16,
              padding: '32px 20px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 14
            }}>
              <div style={{ width: 54, height: 54, borderRadius: '50%', background: 'rgba(34,197,94,0.2)', color: '#4ade80', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>
                ✓
              </div>
              <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, color: '#f0fdf4' }}>
                Importação Concluída com Sucesso!
              </h3>
              <p style={{ margin: 0, color: '#86efac', fontSize: '0.95rem', maxWidth: 450 }}>
                <strong>{importedCount}</strong> corredor(es) foram cadastrados com sucesso na corrida e já estão disponíveis com QR Code e prontos para cronometragem.
              </p>
              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <button
                  type="button"
                  className="arm-save-pdf-btn"
                  onClick={onClose}
                  style={{ padding: '10px 24px', fontSize: '0.9rem' }}
                >
                  Concluir e Voltar à Corrida
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  style={{
                    padding: '10px 18px',
                    borderRadius: 10,
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid #2a1f45',
                    color: '#c084fc',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: 'pointer'
                  }}
                >
                  Importar outra planilha
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* ETAPA 1: BAIXAR MODELO */}
              <div style={{
                background: 'rgba(124, 58, 237, 0.08)',
                border: '1px solid rgba(124, 58, 237, 0.25)',
                borderRadius: 14,
                padding: '14px 18px',
                display: 'flex',
                flexDirection: 'column',
                gap: 10
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#e9d5ff' }}>
                      1. Baixar modelo de planilha
                    </h4>
                    <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#c4b5fd' }}>
                      Planilha formatada com as colunas certas e guia com instruções completas para Humanos e IA.
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      type="button"
                      onClick={downloadRunnersTemplateXlsx}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '8px 14px',
                        borderRadius: 10,
                        background: 'linear-gradient(135deg, #7c3aed, #9333ea)',
                        border: 'none',
                        color: '#fff',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        boxShadow: '0 2px 10px rgba(124,58,237,0.3)'
                      }}
                      title="Baixar planilha Excel com abas de Inscrições e Instruções"
                    >
                      <IconDownload size={15} /> Baixar Modelo (.XLSX)
                    </button>
                    <button
                      type="button"
                      onClick={downloadRunnersTemplateCsv}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '8px 12px',
                        borderRadius: 10,
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid #2a1f45',
                        color: '#ddd6fe',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                      title="Baixar em formato CSV padrão"
                    >
                      .CSV
                    </button>
                  </div>
                </div>

                {/* Dica de colunas / IA */}
                <div style={{
                  background: 'rgba(15, 10, 30, 0.6)',
                  border: '1px dashed rgba(168, 85, 247, 0.3)',
                  borderRadius: 10,
                  padding: '8px 12px',
                  fontSize: '0.78rem',
                  color: '#cbd5e1',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  flexWrap: 'wrap'
                }}>
                  <span style={{ color: '#c084fc', fontWeight: 800 }}>Colunas:</span>
                  <span><strong>Número</strong> (0010)</span>
                  <span><strong>Nome</strong> (João Silva)</span>
                  <span><strong>Sexo</strong> (M ou F)</span>
                  <span><strong>Local</strong> (L ou V)</span>
                  <span><strong>Categoria especial</strong> (PCD, +60 ou 60)</span>
                </div>
              </div>

              {/* ETAPA 2: UPLOAD DA PLANILHA */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#f8fafc' }}>
                  2. Enviar planilha preenchida
                </h4>

                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: `2px dashed ${isDragOver ? '#c084fc' : file ? '#8b5cf6' : '#3b2d60'}`,
                    background: isDragOver ? 'rgba(168, 85, 247, 0.15)' : file ? 'rgba(124, 58, 237, 0.08)' : 'rgba(21, 16, 38, 0.8)',
                    borderRadius: 14,
                    padding: '24px 20px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={ACCEPTED_EXTENSIONS}
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 32, opacity: 0.9 }}>📊</span>
                    <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#f1f5f9' }}>
                      {file ? fileName : 'Arraste sua planilha preenchida aqui ou clique para selecionar'}
                    </span>
                    <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                      Formatos aceitos: <strong>.xlsx</strong>, <strong>.xls</strong> ou <strong>.csv</strong>
                    </span>
                  </div>
                </div>

                {parseError && (
                  <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#fca5a5', padding: '10px 14px', borderRadius: 10, fontSize: '0.82rem' }}>
                    {parseError}
                  </div>
                )}
              </div>

              {/* ETAPA 3: PRÉVIA E VALIDAÇÕES */}
              {rawRows.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#f8fafc' }}>
                        3. Prévia das Inscrições
                      </h4>
                      <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                        ({rawRows.length} linha{rawRows.length !== 1 ? 's' : ''})
                      </span>
                    </div>

                    {/* Filtros da prévia */}
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        type="button"
                        onClick={() => setFilterPreview('ALL')}
                        style={{
                          padding: '4px 10px',
                          borderRadius: 8,
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          border: '1px solid #2a1f45',
                          background: filterPreview === 'ALL' ? '#7c3aed' : 'rgba(255,255,255,0.04)',
                          color: filterPreview === 'ALL' ? '#fff' : '#94a3b8'
                        }}
                      >
                        Todos ({rawRows.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setFilterPreview('VALID')}
                        style={{
                          padding: '4px 10px',
                          borderRadius: 8,
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          border: '1px solid #2a1f45',
                          background: filterPreview === 'VALID' ? '#15803d' : 'rgba(255,255,255,0.04)',
                          color: filterPreview === 'VALID' ? '#fff' : '#4ade80'
                        }}
                      >
                        ✓ Válidos ({validRows.length})
                      </button>
                      {errorRows.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setFilterPreview('ERROR')}
                          style={{
                            padding: '4px 10px',
                            borderRadius: 8,
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            border: '1px solid #ef4444',
                            background: filterPreview === 'ERROR' ? '#b91c1c' : 'rgba(239,68,68,0.1)',
                            color: filterPreview === 'ERROR' ? '#fff' : '#f87171'
                          }}
                        >
                          ✕ Com erro ({errorRows.length})
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Tabela de prévia */}
                  <div style={{
                    maxHeight: 250,
                    overflowY: 'auto',
                    border: '1px solid #2a1f45',
                    borderRadius: 12,
                    background: '#0d0920'
                  }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
                      <thead style={{ position: 'sticky', top: 0, background: '#120d26', borderBottom: '1px solid #2a1f45', zIndex: 2 }}>
                        <tr>
                          <th style={{ padding: '8px 10px', color: '#a78bfa', width: 45, textAlign: 'center' }}>Linha</th>
                          <th style={{ padding: '8px 10px', color: '#a78bfa', width: 75 }}>Nº Peito</th>
                          <th style={{ padding: '8px 10px', color: '#a78bfa' }}>Nome</th>
                          <th style={{ padding: '8px 10px', color: '#a78bfa', width: 60 }}>Sexo</th>
                          <th style={{ padding: '8px 10px', color: '#a78bfa', width: 65 }}>Local</th>
                          <th style={{ padding: '8px 10px', color: '#a78bfa', width: 80 }}>Especial</th>
                          <th style={{ padding: '8px 10px', color: '#a78bfa', width: 140 }}>Categoria Final</th>
                          <th style={{ padding: '8px 10px', color: '#a78bfa', width: 80, textAlign: 'center' }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {displayedRows.length === 0 ? (
                          <tr>
                            <td colSpan={8} style={{ padding: 20, textAlign: 'center', color: '#64748b', fontStyle: 'italic' }}>
                              Nenhum registro para o filtro selecionado.
                            </td>
                          </tr>
                        ) : (
                          displayedRows.map((r) => {
                            const isErr = r.status === 'error'
                            return (
                              <tr
                                key={r._line}
                                style={{
                                  borderBottom: '1px solid rgba(42,31,69,0.5)',
                                  background: isErr ? 'rgba(239, 68, 68, 0.08)' : 'transparent'
                                }}
                              >
                                <td style={{ padding: '7px 10px', textAlign: 'center', color: '#64748b' }}>{r._line}</td>
                                <td style={{ padding: '7px 10px', fontFamily: 'monospace', fontWeight: 800, color: '#f8fafc' }}>
                                  {r.formatted.number || '—'}
                                </td>
                                <td style={{ padding: '7px 10px', fontWeight: 600, color: '#e2e8f0' }}>
                                  {r.formatted.name || '—'}
                                </td>
                                <td style={{ padding: '7px 10px', color: r.formatted.sex === 'FEMININO' ? '#f472b6' : '#60a5fa' }}>
                                  {r.formatted.sex === 'FEMININO' ? '♀ F' : r.formatted.sex === 'MASCULINO' ? '♂ M' : '—'}
                                </td>
                                <td style={{ padding: '7px 10px', color: r.formatted.isLocal ? '#4ade80' : '#94a3b8' }}>
                                  {r.formatted.isLocal ? 'Local' : 'Visitante'}
                                </td>
                                <td style={{ padding: '7px 10px', color: '#c084fc' }}>
                                  {r.formatted.special || '—'}
                                </td>
                                <td style={{ padding: '7px 10px' }}>
                                  <span style={{
                                    display: 'inline-block',
                                    padding: '2px 8px',
                                    borderRadius: 6,
                                    fontSize: '0.72rem',
                                    fontWeight: 700,
                                    background: 'rgba(124, 58, 237, 0.2)',
                                    color: '#ddd6fe',
                                    border: '1px solid rgba(124, 58, 237, 0.4)',
                                    whiteSpace: 'nowrap'
                                  }}>
                                    {r.formatted.category}
                                  </span>
                                </td>
                                <td style={{ padding: '7px 10px', textAlign: 'center' }}>
                                  {isErr ? (
                                    <span
                                      style={{
                                        display: 'inline-block',
                                        padding: '2px 6px',
                                        borderRadius: 6,
                                        background: 'rgba(239, 68, 68, 0.25)',
                                        color: '#f87171',
                                        fontWeight: 800,
                                        fontSize: '0.7rem'
                                      }}
                                      title={r.errors.join('; ')}
                                    >
                                      ✕ Erro
                                    </span>
                                  ) : (
                                    <span style={{
                                      display: 'inline-block',
                                      padding: '2px 6px',
                                      borderRadius: 6,
                                      background: 'rgba(34, 197, 94, 0.2)',
                                      color: '#4ade80',
                                      fontWeight: 800,
                                      fontSize: '0.7rem'
                                    }}>
                                      ✓ OK
                                    </span>
                                  )}
                                </td>
                              </tr>
                            )
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Detalhamento dos erros */}
                  {errorRows.length > 0 && (
                    <div style={{
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      borderRadius: 10,
                      padding: '10px 14px',
                      maxHeight: 110,
                      overflowY: 'auto'
                    }}>
                      <div style={{ fontWeight: 700, fontSize: '0.8rem', color: '#f87171', marginBottom: 4 }}>
                        Atenção: {errorRows.length} linha(s) possuem inconformidades:
                      </div>
                      {errorRows.map((r) => (
                        <div key={r._line} style={{ fontSize: '0.75rem', color: '#fca5a5', lineHeight: 1.4 }}>
                          • <strong>Linha {r._line}</strong>: {r.errors.join(' | ')}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Confirmação quando há erros parciais */}
                  {confirmingPartial && errorRows.length > 0 && (
                    <div style={{
                      background: 'rgba(245, 158, 11, 0.15)',
                      border: '1.5px solid #f59e0b',
                      borderRadius: 12,
                      padding: '14px 16px',
                      color: '#fef3c7'
                    }}>
                      <h4 style={{ margin: '0 0 6px', fontSize: '0.9rem', color: '#fbbf24' }}>
                        ⚠️ A planilha contém {errorRows.length} registro(s) com erro
                      </h4>
                      <p style={{ margin: '0 0 12px', fontSize: '0.82rem', color: '#fef3c7' }}>
                        Deseja importar agora os <strong>{validRows.length} corredores válidos</strong> ou prefere cancelar para corrigir a planilha?
                      </p>
                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          onClick={() => handleExecuteImport(validRows)}
                          disabled={importing}
                          style={{
                            padding: '8px 16px',
                            borderRadius: 8,
                            background: '#7c3aed',
                            border: 'none',
                            color: '#fff',
                            fontWeight: 700,
                            fontSize: '0.82rem',
                            cursor: 'pointer'
                          }}
                        >
                          {importing ? 'Importando...' : `Importar apenas os ${validRows.length} válidos`}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmingPartial(false)}
                          disabled={importing}
                          style={{
                            padding: '8px 14px',
                            borderRadius: 8,
                            background: 'rgba(255,255,255,0.06)',
                            border: '1px solid #2a1f45',
                            color: '#cbd5e1',
                            fontWeight: 600,
                            fontSize: '0.82rem',
                            cursor: 'pointer'
                          }}
                        >
                          Corrigir e reenviar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        {!showSummary && (
          <div style={{
            padding: '14px 20px',
            borderTop: '1px solid #2a1f45',
            background: '#120d24',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 10
          }}>
            <button
              type="button"
              onClick={handleReset}
              disabled={importing || !file}
              style={{
                padding: '8px 14px',
                borderRadius: 8,
                background: 'transparent',
                border: '1px solid #2a1f45',
                color: '#94a3b8',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: file ? 'pointer' : 'default',
                opacity: file ? 1 : 0.5
              }}
            >
              Limpar seleção
            </button>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                onClick={onClose}
                disabled={importing}
                style={{
                  padding: '9px 16px',
                  borderRadius: 10,
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid #2a1f45',
                  color: '#e2e8f0',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleStartImport}
                disabled={!canImport || loadingRunners || confirmingPartial}
                style={{
                  padding: '9px 20px',
                  borderRadius: 10,
                  background: canImport ? 'linear-gradient(135deg, #7c3aed, #9333ea)' : 'rgba(124,58,237,0.3)',
                  border: 'none',
                  color: '#fff',
                  fontSize: '0.88rem',
                  fontWeight: 800,
                  letterSpacing: '0.02em',
                  cursor: canImport ? 'pointer' : 'not-allowed',
                  boxShadow: canImport ? '0 4px 16px rgba(124,58,237,0.4)' : 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  transition: 'all 0.15s ease'
                }}
              >
                {importing ? (
                  <>Cadastrando corredores...</>
                ) : (
                  <>
                    <IconUpload size={16} />
                    Confirmar Inscrição ({validRows.length})
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
