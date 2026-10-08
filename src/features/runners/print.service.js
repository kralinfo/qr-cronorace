// Responsabilidade única: abrir uma janela de impressão contendo o QR code do corredor.

/**
 * Abre uma nova janela/aba já formatada para impressão do QR code.
 * @param {string} qrDataUrl
 * @param {{ id: string, name: string, number?: string }} runner
 * @param {string} [raceName]
 */
export function printRunnerQRCode(qrDataUrl, runner, raceName) {
  const printWindow = window.open('', '_blank', 'width=420,height=560')
  if (!printWindow) return

  const numberHtml = runner.number
    ? `<div style="font-size:1.6rem;font-weight:800;color:#1e88e5;margin:4px 0;">Nº ${escapeHtml(runner.number)}</div>`
    : ''
  const raceHtml = raceName
    ? `<div style="font-size:0.95rem;font-weight:600;color:#455a64;margin-bottom:8px;">${escapeHtml(raceName)}</div>`
    : ''

  printWindow.document.write(`
    <html>
      <head>
        <title>QR - ${escapeHtml(runner.name)}</title>
        <style>
          body { font-family: system-ui, sans-serif; text-align:center; padding:20px; }
          img { width:240px; height:240px; margin: 8px 0; }
          h2 { margin: 0 0 4px; font-size: 1.4rem; }
          .id-tag { color:#78909c; font-size: 0.85rem; margin: 2px 0; }
        </style>
      </head>
      <body>
        ${raceHtml}
        <h2>${escapeHtml(runner.name)}</h2>
        ${numberHtml}
        <img src="${qrDataUrl}" alt="QR" />
        <div class="id-tag">ID: ${escapeHtml(runner.id)}</div>
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
