import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform, Share } from 'react-native';
import { APP_HOME_URL, APP_NAME } from '@/lib/constants';

export interface ToolReportShellInput {
  title: string;
  tagline: string;
  generatedLabel: string;
  footer: string;
  bodyHtml: string;
}

let logoBase64Cache: string | null = null;

async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read logo'));
    reader.readAsDataURL(blob);
  });
}

async function getLogoBase64(): Promise<string> {
  if (logoBase64Cache) return logoBase64Cache;
  const asset = Asset.fromModule(require('../../assets/icon.png'));
  await asset.downloadAsync();
  const uri = asset.localUri ?? asset.uri;
  if (!uri) return '';

  if (Platform.OS === 'web') {
    try {
      const response = await fetch(uri);
      logoBase64Cache = await blobToDataUrl(await response.blob());
      return logoBase64Cache;
    } catch {
      return '';
    }
  }

  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  logoBase64Cache = `data:image/png;base64,${base64}`;
  return logoBase64Cache;
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function formatReportDecimal(value: number): string {
  return new Intl.NumberFormat('uz-UZ', { maximumFractionDigits: 1 }).format(value);
}

export function inputsHtml(rows: Array<{ label: string; value: string }>): string {
  return `<dl class="inputs">${rows
    .map(
      (row) =>
        `<dt>${escapeHtml(row.label)}</dt><dd>${escapeHtml(row.value)}</dd>`,
    )
    .join('')}</dl>`;
}

export function metricsGridHtml(
  cards: Array<{ label: string; value: string; accent?: boolean; danger?: boolean }>,
): string {
  return `<div class="grid">${cards
    .map((card) => {
      const cls = card.accent ? 'card accent' : card.danger ? 'card danger' : 'card';
      return `<div class="${cls}"><label>${escapeHtml(card.label)}</label><strong>${escapeHtml(card.value)}</strong></div>`;
    })
    .join('')}</div>`;
}

export function tableHtml(headers: string[], rows: string[][]): string {
  return `<table>
    <thead><tr>${headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead>
    <tbody>${rows
      .map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`)
      .join('')}</tbody>
  </table>`;
}

export function sectionHtml(title: string, content: string): string {
  return `<h2>${escapeHtml(title)}</h2>${content}`;
}

export function bannerHtml(text: string): string {
  return `<div class="banner">${escapeHtml(text)}</div>`;
}

export const REPORT_STYLES = `
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #171717; margin: 0; padding: 32px; }
  .header { display: flex; align-items: center; gap: 16px; padding: 20px 24px; background: #1e3a5f; border-radius: 12px; color: #fff; margin-bottom: 24px; }
  .header img { width: 56px; height: 56px; border-radius: 12px; }
  .brand h1 { margin: 0; font-size: 22px; font-weight: 700; }
  .brand p { margin: 4px 0 0; font-size: 13px; opacity: 0.9; }
  h2 { font-size: 18px; margin: 24px 0 12px; color: #1e3a5f; }
  .meta { font-size: 12px; color: #6b7280; margin-bottom: 20px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 8px; }
  .card { border: 1px solid #e5e7eb; border-radius: 10px; padding: 14px; }
  .card label { display: block; font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 4px; }
  .card strong { font-size: 16px; }
  .card.accent strong { color: #2563eb; }
  .card.danger strong { color: #dc2626; }
  .inputs { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 16px; font-size: 14px; margin-bottom: 8px; }
  .inputs dt { color: #6b7280; margin: 0; }
  .inputs dd { margin: 0 0 8px; font-weight: 600; }
  .banner { background: #ecfdf5; color: #047857; border-radius: 10px; padding: 14px; font-weight: 600; margin: 16px 0; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 8px; }
  th, td { border-bottom: 1px solid #e5e7eb; padding: 8px 6px; text-align: left; }
  th { color: #6b7280; font-weight: 600; font-size: 10px; text-transform: uppercase; }
  .lines { font-size: 14px; }
  .line { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f3f4f6; }
  .line span:first-child { color: #6b7280; }
  .footer { margin-top: 32px; padding-top: 16px; border-top: 2px solid #1e3a5f; text-align: center; color: #6b7280; font-size: 12px; }
  .footer strong { color: #2563eb; font-size: 14px; }
  .note { font-size: 12px; color: #6b7280; margin-top: 8px; }
`;

export async function buildToolReportHtml(input: ToolReportShellInput): Promise<string> {
  const logo = await getLogoBase64();
  const generatedAt = new Date().toLocaleString('uz-UZ');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>${REPORT_STYLES}</style>
</head>
<body>
  <div class="header">
    ${logo ? `<img src="${logo}" alt="${escapeHtml(APP_NAME)}" />` : ''}
    <div class="brand">
      <h1>${escapeHtml(APP_NAME)}</h1>
      <p>${escapeHtml(input.tagline)}</p>
    </div>
  </div>
  <h2>${escapeHtml(input.title)}</h2>
  <p class="meta">${escapeHtml(input.generatedLabel)}: ${escapeHtml(generatedAt)}</p>
  ${input.bodyHtml}
  <div class="footer">
    <strong>${escapeHtml(APP_NAME)}</strong><br />
    ${escapeHtml(input.footer)}<br />
    <a href="${APP_HOME_URL}">${APP_HOME_URL}</a>
  </div>
</body>
</html>`;
}

async function createPdfFromHtml(html: string): Promise<string> {
  const { uri } = await Print.printToFileAsync({ html, base64: false });
  return uri;
}

export async function saveToolReportPdf(html: string, dialogTitle: string): Promise<void> {
  if (Platform.OS === 'web') {
    await Print.printAsync({ html });
    return;
  }

  const uri = await createPdfFromHtml(html);
  if (!(await Sharing.isAvailableAsync())) return;

  await Sharing.shareAsync(uri, {
    mimeType: 'application/pdf',
    dialogTitle,
    UTI: 'com.adobe.pdf',
  });
}

export async function shareToolReport(html: string, title: string, message: string): Promise<void> {
  if (Platform.OS === 'web') {
    const body = `${message}\n\n${APP_HOME_URL}`;
    if (typeof navigator !== 'undefined' && navigator.share) {
      await navigator.share({ title, text: body, url: APP_HOME_URL });
      return;
    }
    await Share.share({ title, message: body });
    return;
  }

  const uri = await createPdfFromHtml(html);
  const body = `${message}\n\n${APP_HOME_URL}`;

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: title,
      UTI: 'com.adobe.pdf',
    });
    return;
  }

  await Share.share({ title, message: body, url: uri });
}

export function linesHtml(rows: Array<{ label: string; value: string }>): string {
  return `<div class="lines">${rows
    .map((row) => `<div class="line"><span>${escapeHtml(row.label)}</span><span>${escapeHtml(row.value)}</span></div>`)
    .join('')}</div>`;
}
