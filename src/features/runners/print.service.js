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
