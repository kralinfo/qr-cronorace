import { generateRunnerQRCode } from './qrcode.service.js'


// Responsabilidade única: abrir uma janela formatada especialmente para impressoras térmicas (58mm/80mm) ou padrão.

/**
 * Abre uma nova janela/aba formatada para impressão em bobina térmica (58mm/80mm) ou convencional.
 * @param {string} qrDataUrl - Data URL do QR Code.
 * @param {{ id: string, name: string, number?: string }} runner - Dados do corredor.
 * @param {string} [raceName] - Nome da corrida.
 */
export function printRunnerQRCode(qrDataUrl, runner, raceName) {
  const numberHtml = runner.number
    ? `<div class="receipt-number">Nº ${escapeHtml(String(runner.number))}</div>`
    : ''
  const raceHtml = raceName
    ? `<div class="receipt-race">${escapeHtml(raceName)}</div>`
    : ''
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>QR - ${escapeHtml(runner.name)}</title>
        <style>
          @page {
            size: 58mm auto;
            margin: 0;
          }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            padding: 8px 4px;
            width: 58mm;
            max-width: 100%;
            font-family: system-ui, -apple-system, Roboto, sans-serif;
            text-align: center;
            background: #ffffff;
            color: #000000;
          }
          .receipt-number {
            font-size: 26px;
            font-weight: 900;
            margin: 4px 0 6px;
            line-height: 1;
            letter-spacing: 0.5px;
          }
          .receipt-qr {
            display: block;
            margin: 6px auto;
            width: 170px;
            height: 170px;
            image-rendering: pixelated;
          }
          .receipt-name {
            font-size: 16px;
            font-weight: 800;
            margin: 6px 0 2px;
            line-height: 1.25;
            word-break: break-word;
          }
          .receipt-race {
            font-size: 12px;
            margin-top: 2px;
            opacity: 0.75;
          }
          @media print {
            body {
              width: 58mm;
              padding: 4px 2px;
            }
          }
        </style>
      </head>
      <body>
        ${numberHtml}
        <img class="receipt-qr" src="${qrDataUrl}" alt="QR" />
        <div class="receipt-name">${escapeHtml(runner.name)}</div>
        ${raceHtml}
      </body>
    </html>
  `

  const printWindow = window.open('', '_blank', 'width=380,height=520')
  if (printWindow) {
    printWindow.document.open()
    printWindow.document.write(htmlContent)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => {
      try {
        printWindow.print()
      } catch (e) {
        console.error(e)
      }
    }, 250)
    return
  }

  // Fallback quando window.open é bloqueado (comum em Safari iOS)
  const iframe = document.createElement('iframe')
  iframe.style.position = 'fixed'
  iframe.style.right = '0'
  iframe.style.bottom = '0'
  iframe.style.width = '0'
  iframe.style.height = '0'
  iframe.style.border = '0'
  document.body.appendChild(iframe)

  const doc = iframe.contentWindow?.document || iframe.contentDocument
  if (doc) {
    doc.open()
    doc.write(htmlContent)
    doc.close()
    setTimeout(() => {
      try {
        iframe.contentWindow?.focus()
        iframe.contentWindow?.print()
      } catch (e) {
        console.error(e)
      } finally {
        setTimeout(() => {
          if (iframe.parentNode) iframe.parentNode.removeChild(iframe)
        }, 3000)
      }
    }, 350)
  }
}

/**
 * Imprime em lote (uma única janela de impressão) os QR codes dos corredores informados.
 * @param {Array<{ id: string, name: string, number?: string }>} runners
 * @param {string} [raceName]
 * @returns {Promise<void>}
 */
export async function printRunnersQRCodeBatch(runners, raceName) {
  if (!runners || runners.length === 0) return

  const items = await Promise.all(
    runners.map(async (runner) => {
      const qrDataUrl = await generateRunnerQRCode(runner)
      return { runner, qrDataUrl }
    })
  )

  const cardsHtml = items.map(({ runner, qrDataUrl }) => `
    <div class="receipt-card">
      ${runner.number ? `<div class="receipt-number">Nº ${escapeHtml(runner.number)}</div>` : ''}
      <img class="receipt-qr" src="${qrDataUrl}" alt="QR" />
      <div class="receipt-name">${escapeHtml(runner.name)}</div>
      ${raceName ? `<div class="receipt-race">${escapeHtml(raceName)}</div>` : ''}
    </div>
  `).join('')

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>QR Codes em Lote</title>
        <style>
          @page { size: 58mm auto; margin: 0; }
          * { box-sizing: border-box; }
          body { margin: 0; padding: 0; font-family: system-ui, -apple-system, Roboto, sans-serif; background: #fff; color: #000; }
          .receipt-card { width: 58mm; max-width: 100%; padding: 8px 4px; text-align: center; page-break-after: always; }
          .receipt-card:last-child { page-break-after: auto; }
          .receipt-number { font-size: 26px; font-weight: 900; margin: 4px 0 6px; line-height: 1; }
          .receipt-qr { display: block; margin: 6px auto; width: 170px; height: 170px; image-rendering: pixelated; }
          .receipt-name { font-size: 16px; font-weight: 800; margin: 6px 0 2px; line-height: 1.25; word-break: break-word; }
          .receipt-race { font-size: 12px; margin-top: 2px; opacity: 0.8; }
          @media print { body { width: 58mm; } }
        </style>
      </head>
      <body>
        ${cardsHtml}
      </body>
    </html>
  `

  const printWindow = window.open('', '_blank', 'width=420,height=640')
  if (printWindow) {
    printWindow.document.open()
    printWindow.document.write(htmlContent)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => {
      try { printWindow.print() } catch (e) { console.error(e) }
    }, 400)
    return
  }

  const iframe = document.createElement('iframe')
  iframe.style.position = 'fixed'
  iframe.style.right = '0'
  iframe.style.bottom = '0'
  iframe.style.width = '0'
  iframe.style.height = '0'
  iframe.style.border = '0'
  document.body.appendChild(iframe)
  const doc = iframe.contentWindow?.document || iframe.contentDocument
  if (doc) {
    doc.open()
    doc.write(htmlContent)
    doc.close()
    setTimeout(() => {
      try {
        iframe.contentWindow?.focus()
        iframe.contentWindow?.print()
      } catch (e) { console.error(e) } finally {
        setTimeout(() => { if (iframe.parentNode) iframe.parentNode.removeChild(iframe) }, 4000)
      }
    }, 500)
  }
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/**
 * Abre janela de impressão formatada em folha A4 com a tabela de corredores para salvar em PDF ou imprimir.
 * @param {Array<{ id: string, name: string, number?: string, category?: string }>} runners
 * @param {string} [raceName]
 * @param {string} [distanceKm]
 */
export function printRunnersTablePDF(runners, raceName, distanceKm) {
  if (!runners || runners.length === 0) return

  const sorted = runners

  const rowsHtml = sorted.map((r) => `
    <tr>
      <td style="text-align: center; font-weight: 800; font-family: monospace;">${escapeHtml(r.number || '—')}</td>
      <td style="font-weight: 700;">${escapeHtml(r.name || '—')}</td>
      <td>${escapeHtml(r.category || 'Geral')}</td>
    </tr>
  `).join('')

  const dateNow = new Date().toLocaleDateString('pt-BR')

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Tabela de Corredores - ${escapeHtml(raceName || 'Corrida')}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 12mm 14mm;
          }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            padding: 10px;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #111827;
            background: #fff;
          }
          .pdf-header {
            border-bottom: 2px solid #6b21a8;
            padding-bottom: 10px;
            margin-bottom: 14px;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
          }
          .pdf-title {
            font-size: 20px;
            font-weight: 900;
            color: #581c87;
            text-transform: uppercase;
            margin: 0 0 4px 0;
            letter-spacing: 0.03em;
          }
          .pdf-subtitle {
            font-size: 13px;
            color: #4b5563;
            margin: 0;
            font-weight: 500;
          }
          .pdf-meta {
            text-align: right;
            font-size: 12px;
            color: #374151;
          }
          .pdf-count-badge {
            display: inline-block;
            background: #f3e8ff;
            color: #6b21a8;
            font-weight: 800;
            padding: 3px 8px;
            border-radius: 6px;
            font-size: 13px;
            margin-bottom: 3px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12.5px;
          }
          th {
            background: #f8fafc;
            border-top: 1.5px solid #cbd5e1;
            border-bottom: 2px solid #94a3b8;
            padding: 8px 10px;
            text-align: left;
            font-weight: 800;
            color: #1e293b;
            text-transform: uppercase;
            font-size: 11px;
            letter-spacing: 0.05em;
          }
          td {
            border-bottom: 1px solid #e2e8f0;
            padding: 7px 10px;
            vertical-align: middle;
          }
          tr:nth-child(even) td {
            background: #fdfcff;
          }
          .pdf-footer {
            margin-top: 16px;
            padding-top: 8px;
            border-top: 1px solid #e2e8f0;
            display: flex;
            justify-content: space-between;
            font-size: 11px;
            color: #94a3b8;
          }
          @media print {
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="pdf-header">
          <div>
            <h1 class="pdf-title">${escapeHtml(raceName || 'Corrida')}</h1>
            <p class="pdf-subtitle">
              Lista Oficial de Corredores Cadastrados ${distanceKm ? `• Percurso: ${escapeHtml(distanceKm)}` : ''}
            </p>
          </div>
          <div class="pdf-meta">
            <div class="pdf-count-badge">${sorted.length} inscritos</div>
            <div>Data de emissão: ${dateNow}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 75px; text-align: center;">Nº PEITO</th>
              <th>NOME DO CORREDOR</th>
              <th style="width: 220px;">CATEGORIA</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div class="pdf-footer">
          <span>Sistema de Cronometragem QR CronoRace</span>
          <span>Página 1</span>
        </div>
      </body>
    </html>
  `

  // Imprime diretamente sem abrir nova aba (o navegador abre direto a caixa de impressão/salvar como PDF na mesma tela)
  const iframe = document.createElement('iframe')
  iframe.style.position = 'fixed'
  iframe.style.right = '0'
  iframe.style.bottom = '0'
  iframe.style.width = '0'
  iframe.style.height = '0'
  iframe.style.border = '0'
  iframe.style.opacity = '0'
  iframe.style.pointerEvents = 'none'
  document.body.appendChild(iframe)

  const doc = iframe.contentWindow?.document || iframe.contentDocument
  if (doc) {
    doc.open()
    doc.write(htmlContent)
    doc.close()
    setTimeout(() => {
      try {
        iframe.contentWindow?.focus()
        iframe.contentWindow?.print()
      } catch (e) {
        console.error('Erro ao acionar impressão:', e)
      } finally {
        setTimeout(() => {
          if (iframe.parentNode) iframe.parentNode.removeChild(iframe)
        }, 3000)
      }
    }, 250)
  }
}
