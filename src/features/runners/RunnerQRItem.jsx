// UI only: item da lista de corredores com ação para visualizar/baixar/imprimir seu QR code.
import React from 'react'
import { useRunnerQRCode } from './useRunnerQRCode.js'
import { printRunnerQRCode } from './print.service.js'
import { downloadDataUrl } from './download.service.js'
import { buildQRFilename } from './qr-filename.service.js'

/** @param {{ runner: import('./runners.types.js').Runner }} props */
export default function RunnerQRItem({ runner }) {
  const { qrDataUrl, loading, ensureQRCode } = useRunnerQRCode(runner)

  const handleToggleView = async () => {
    await ensureQRCode()
  }

  const handlePrint = async () => {
    const dataUrl = await ensureQRCode()
    printRunnerQRCode(dataUrl, runner)
  }

  const handleDownload = async () => {
    const dataUrl = await ensureQRCode()
    downloadDataUrl(dataUrl, buildQRFilename(runner))
  }

  return (
    <li className="runner-qr-item">
      <div className="runner-info">
        <strong>{runner.name}</strong>
      </div>
      <div className="runner-actions">
        <button onClick={handleToggleView} disabled={loading}>
          {qrDataUrl ? 'Atualizar QR' : 'Ver QR'}
        </button>
        <button onClick={handleDownload} disabled={loading}>Baixar</button>
        <button onClick={handlePrint} disabled={loading}>Imprimir</button>
      </div>
      {qrDataUrl && (
        <div className="runner-qr-preview">
          <img src={qrDataUrl} alt={`QR de ${runner.name}`} style={{ width: 120 }} />
        </div>
      )}
    </li>
  )
}

