import { generateRunnerQRCode } from './qrcode.service.js'


// Responsabilidade única: abrir uma janela formatada especialmente para impressoras térmicas (58mm/80mm) ou padrão.

/**
 * Abre uma nova janela/aba formatada para impressão em bobina térmica (58mm/80mm) ou convencional.
 * @param {string} qrDataUrl - Data URL do QR Code.
 * @param {{ id: string, name: string, number?: string }} runner - Dados do corredor.
 * @param {string} [raceName] - Nome da corrida.
 */
export function printRunnerQRCode(qrDataUrl, runner, raceName) {
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
