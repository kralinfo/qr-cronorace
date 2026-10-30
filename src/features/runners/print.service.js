import { generateRunnerThermalLabel } from './barcode.service.js'

// Responsabilidade única: abrir janela/iframe de impressão formatada especialmente para impressoras térmicas e etiquetas adesivas de ~8.8 cm (88mm x 48mm) ou PDF.

/**
 * Abre janela de impressão formatada exatamente no tamanho do adesivo térmico (~8.8 cm).
 * Todas as informações (Número, Nome com destaque, Categoria e Código de Barras bem grande) estão 100% no mesmo sentido horizontal.
 * @param {string} [qrDataUrl] - Data URL (opcional).
 * @param {{ id: string, name: string, number?: string, category?: string }} runner - Dados do corredor.
 * @param {string} [raceName] - Nome da corrida.
 */
export async function printRunnerQRCode(qrDataUrl, runner, raceName) {
  const labelUrl = runner
    ? await generateRunnerThermalLabel(runner, { rotatedForThermal: false })
    : qrDataUrl

  const htmlContent = '<!DOCTYPE html>' +
    '<html>' +
      '<head>' +
        '<meta charset="utf-8" />' +
        '<title>Etiqueta Adesiva - ' + escapeHtml(runner ? runner.name : '') + '</title>' +
        '<style>' +
          '@page {' +
            'size: 88mm 48mm;' +
            'margin: 0;' +
          '}' +
          '* { box-sizing: border-box; }' +
          'html, body {' +
            'margin: 0;' +
            'padding: 0;' +
            'width: 88mm;' +
            'height: 48mm;' +
            'max-width: 88mm;' +
            'max-height: 48mm;' +
            'overflow: hidden;' +
            'background: #ffffff;' +
            'display: flex;' +
            'justify-content: center;' +
            'align-items: center;' +
          '}' +
          '.label-img {' +
            'width: 100%;' +
            'height: 100%;' +
            'object-fit: contain;' +
            'display: block;' +
          '}' +
          '@media print {' +
            'body {' +
              'width: 88mm;' +
              'height: 48mm;' +
            '}' +
          '}' +
        '</style>' +
      '</head>' +
      '<body>' +
        '<img class="label-img" src="' + labelUrl + '" alt="Etiqueta Adesiva" />' +
      '</body>' +
    '</html>';

  const printWindow = window.open('', '_blank', 'width=450,height=520');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      try {
        printWindow.print();
      } catch (e) {
        console.error(e);
      }
    }, 250);
    return;
  }

  // Fallback quando window.open é bloqueado
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document || iframe.contentDocument;
  if (doc) {
    doc.open();
    doc.write(htmlContent);
    doc.close();
    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (e) {
        console.error(e);
      } finally {
        setTimeout(() => {
          if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
        }, 3000);
      }
    }, 350);
  }
}

/**
 * Imprime em lote as etiquetas adesivas dos corredores informados.
 * Cada etiqueta possui o tamanho exato de 88mm e quebra de página automática.
 * @param {Array<{ id: string, name: string, number?: string, category?: string }>} runners
 * @param {string} [raceName]
 * @returns {Promise<void>}
 */
export async function printRunnersQRCodeBatch(runners, raceName) {
  if (!runners || runners.length === 0) return;

  const items = await Promise.all(
    runners.map(async (runner) => {
      const labelUrl = await generateRunnerThermalLabel(runner, { rotatedForThermal: false });
      return { runner, labelUrl };
    })
  );

  const cardsHtml = items.map(({ runner, labelUrl }) =>
    '<div class="label-card">' +
      '<img class="label-card-img" src="' + labelUrl + '" alt="Etiqueta" />' +
    '</div>'
  ).join('');

  const htmlContent = '<!DOCTYPE html>' +
    '<html>' +
      '<head>' +
        '<meta charset="utf-8" />' +
        '<title>Etiquetas Adesivas em Lote</title>' +
        '<style>' +
          '@page {' +
            'size: 88mm 48mm;' +
            'margin: 0;' +
          '}' +
          '* { box-sizing: border-box; }' +
          'body {' +
            'margin: 0;' +
            'padding: 0;' +
            'background: #fff;' +
          '}' +
          '.label-card {' +
            'width: 88mm;' +
            'height: 48mm;' +
            'max-width: 88mm;' +
            'max-height: 48mm;' +
            'page-break-after: always;' +
            'overflow: hidden;' +
            'display: flex;' +
            'justify-content: center;' +
            'align-items: center;' +
          '}' +
          '.label-card:last-child {' +
            'page-break-after: auto;' +
          '}' +
          '.label-card-img {' +
            'width: 100%;' +
            'height: 100%;' +
            'object-fit: contain;' +
          '}' +
          '@media print {' +
            'body {' +
              'width: 88mm;' +
            '}' +
            '.label-card {' +
              'height: 48mm;' +
            '}' +
          '}' +
        '</style>' +
      '</head>' +
      '<body>' +
        cardsHtml +
      '</body>' +
    '</html>';

  const printWindow = window.open('', '_blank', 'width=450,height=640');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      try { printWindow.print(); } catch (e) { console.error(e); }
    }, 400);
    return;
  }

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);
  const doc = iframe.contentWindow?.document || iframe.contentDocument;
  if (doc) {
    doc.open();
    doc.write(htmlContent);
    doc.close();
    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (e) { console.error(e) } finally {
        setTimeout(() => { if (iframe.parentNode) iframe.parentNode.removeChild(iframe); }, 4000);
      }
    }, 500);
  }
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Abre janela de impressão formatada em folha A4 com a tabela de corredores para salvar em PDF ou imprimir.
 * @param {Array<{ id: string, name: string, number?: string, category?: string }>} runners
 * @param {string} [raceName]
 * @param {string} [distanceKm]
 */
export function printRunnersTablePDF(runners, raceName, distanceKm) {
  if (!runners || runners.length === 0) return;

  const sorted = runners;

  const rowsHtml = sorted.map((r) =>
    '<tr>' +
      '<td style="text-align: center; font-weight: 800; font-family: monospace;">' + escapeHtml(r.number || '-') + '</td>' +
      '<td style="font-weight: 700;">' + escapeHtml(r.name || '-') + '</td>' +
      '<td>' + escapeHtml(r.category || 'Geral') + '</td>' +
    '</tr>'
  ).join('');

  const dateNow = new Date().toLocaleDateString('pt-BR');

  const htmlContent = '<!DOCTYPE html>' +
    '<html>' +
      '<head>' +
        '<meta charset="utf-8" />' +
        '<title>Tabela de Corredores - ' + escapeHtml(raceName || 'Corrida') + '</title>' +
        '<style>' +
          '@page {' +
            'size: A4 portrait;' +
            'margin: 12mm 14mm;' +
          '}' +
          '* { box-sizing: border-box; }' +
          'body {' +
            'margin: 0;' +
            'padding: 10px;' +
            'font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;' +
            'color: #111827;' +
            'background: #fff;' +
          '}' +
          '.pdf-header {' +
            'border-bottom: 2px solid #6b21a8;' +
            'padding-bottom: 10px;' +
            'margin-bottom: 14px;' +
            'display: flex;' +
            'justify-content: space-between;' +
            'align-items: flex-end;' +
          '}' +
          '.pdf-title {' +
            'font-size: 20px;' +
            'font-weight: 900;' +
            'color: #581c87;' +
            'text-transform: uppercase;' +
            'margin: 0 0 4px 0;' +
            'letter-spacing: 0.03em;' +
          '}' +
          '.pdf-subtitle {' +
            'font-size: 13px;' +
            'color: #4b5563;' +
            'margin: 0;' +
            'font-weight: 500;' +
          '}' +
          '.pdf-meta {' +
            'text-align: right;' +
            'font-size: 12px;' +
            'color: #374151;' +
          '}' +
          '.pdf-count-badge {' +
            'display: inline-block;' +
            'background: #f3e8ff;' +
            'color: #6b21a8;' +
            'font-weight: 800;' +
            'padding: 3px 8px;' +
            'border-radius: 6px;' +
            'font-size: 13px;' +
            'margin-bottom: 3px;' +
          '}' +
          'table {' +
            'width: 100%;' +
            'border-collapse: collapse;' +
            'font-size: 12.5px;' +
          '}' +
          'th {' +
            'background: #f8fafc;' +
            'border-top: 1.5px solid #cbd5e1;' +
            'border-bottom: 2px solid #94a3b8;' +
            'padding: 8px 10px;' +
            'text-align: left;' +
            'font-weight: 800;' +
            'color: #1e293b;' +
            'text-transform: uppercase;' +
            'font-size: 11px;' +
            'letter-spacing: 0.05em;' +
          '}' +
          'td {' +
            'border-bottom: 1px solid #e2e8f0;' +
            'padding: 7px 10px;' +
            'vertical-align: middle;' +
          '}' +
          'tr:nth-child(even) td {' +
            'background: #fdfcff;' +
          '}' +
          '.pdf-footer {' +
            'margin-top: 16px;' +
            'padding-top: 8px;' +
            'border-top: 1px solid #e2e8f0;' +
            'display: flex;' +
            'justify-content: space-between;' +
            'font-size: 11px;' +
            'color: #94a3b8;' +
          '}' +
          '@media print {' +
            'body { padding: 0; }' +
          '}' +
        '</style>' +
      '</head>' +
      '<body>' +
        '<div class="pdf-header">' +
          '<div>' +
            '<h1 class="pdf-title">' + escapeHtml(raceName || 'Corrida') + '</h1>' +
            '<p class="pdf-subtitle">' +
              'Lista Oficial de Corredores Cadastrados ' + (distanceKm ? ' · Percurso: ' + escapeHtml(distanceKm) : '') +
            '</p>' +
          '</div>' +
          '<div class="pdf-meta">' +
            '<div class="pdf-count-badge">' + sorted.length + ' inscritos</div>' +
            '<div>Data de emissão: ' + dateNow + '</div>' +
          '</div>' +
        '</div>' +
        '<table>' +
          '<thead>' +
            '<tr>' +
              '<th style="width: 75px; text-align: center;">Nº PEITO</th>' +
              '<th>NOME DO CORREDOR</th>' +
              '<th style="width: 220px;">CATEGORIA</th>' +
            '</tr>' +
          '</thead>' +
          '<tbody>' +
            rowsHtml +
          '</tbody>' +
        '</table>' +
        '<div class="pdf-footer">' +
          '<span>Sistema de Cronometragem QR CronoRace</span>' +
          '<span>Página 1</span>' +
        '</div>' +
      '</body>' +
    '</html>';

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.opacity = '0';
  iframe.style.pointerEvents = 'none';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document || iframe.contentDocument;
  if (doc) {
    doc.open();
    doc.write(htmlContent);
    doc.close();
    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (e) {
        console.error('Erro ao acionar impressão:', e);
      } finally {
        setTimeout(() => {
          if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
        }, 3000);
      }
    }, 250);
  }
}
