// Responsabilidade única: abrir uma janela formatada especialmente para impressoras térmicas (58mm/80mm) ou padrão.

/**
 * Abre uma nova janela/aba formatada para impressão em bobina térmica (58mm/80mm) ou convencional.
 * @param {string} qrDataUrl - Data URL do QR Code.
 * @param {{ id: string, name: string, number?: string }} runner - Dados do corredor.
 * @param {string} [raceName] - Nome da corrida.
 */
export function printRunnerQRCode(qrDataUrl, runner, raceName) {
  const printWindow = window.open('', '_blank', 'width=380,height=520')
  if (!printWindow) return

  const numberHtml = runner.number
    ? `<div class="receipt-number">Nº ${escapeHtml(runner.number)}</div>`
    : ''
  const raceHtml = raceName
    ? `<div class="receipt-race">${escapeHtml(raceName)}</div>`
    : ''

  printWindow.document.write(`
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
          .receipt-race {
            font-size: 11px;
            font-weight: 700;
            margin-bottom: 4px;
            line-height: 1.2;
            word-break: break-word;
          }
          .receipt-name {
            font-size: 15px;
            font-weight: 800;
            margin: 2px 0;
            line-height: 1.2;
            word-break: break-word;
          }
          .receipt-number {
            font-size: 24px;
            font-weight: 900;
            margin: 4px 0;
            line-height: 1;
            letter-spacing: 0.5px;
          }
          .receipt-qr {
            display: block;
            margin: 6px auto;
            width: 160px;
            height: 160px;
            image-rendering: pixelated;
          }
          .receipt-id {
            font-size: 10px;
            font-family: monospace;
            margin: 4px 0 2px;
          }
          .receipt-footer {
            font-size: 9px;
            margin-top: 6px;
            border-top: 1px dashed #000000;
            padding-top: 4px;
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
        ${raceHtml}
        <div class="receipt-name">${escapeHtml(runner.name)}</div>
        ${numberHtml}
        <img class="receipt-qr" src="${qrDataUrl}" alt="QR" />
        <div class="receipt-id">${runner.cpf ? `CPF: ${escapeHtml(runner.cpf)}` : `ID: ${escapeHtml(runner.id)}`}</div>
        <div class="receipt-footer">PWA QR Timing</div>
      </body>
    </html>
  `)
  printWindow.document.close()
  printWindow.focus()
  printWindow.onload = () => printWindow.print()
}

/** @param {string} value @returns {string} */
function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}
