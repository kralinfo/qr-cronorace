// Responsabilidade única: abrir uma janela de impressão contendo o QR code do corredor.

/**
 * Abre uma nova janela/aba já formatada para impressão do QR code.
 * @param {string} qrDataUrl
 * @param {{ id: string, name: string }} runner
 */
export function printRunnerQRCode(qrDataUrl, runner) {
  const printWindow = window.open('', '_blank', 'width=400,height=500')
  if (!printWindow) return

  printWindow.document.write(`
    <html>
      <head>
        <title>QR - ${escapeHtml(runner.name)}</title>
        <style>
          body { font-family: system-ui, sans-serif; text-align:center; padding:24px; }
          img { width:240px; height:240px; }
          h2 { margin-bottom:4px; }
          p { color:#555; }
        </style>
      </head>
      <body>
        <h2>${escapeHtml(runner.name)}</h2>
        <p>id: ${escapeHtml(runner.id)}</p>
        <img src="${qrDataUrl}" alt="QR" />
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
