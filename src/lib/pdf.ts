import { marked } from 'marked';
import { JSDOM } from 'jsdom';
import puppeteer from 'puppeteer-core';

const isDev = process.env.NODE_ENV !== 'production';

export async function renderMarkdownToPdf(markdown: string) {
  const html = transformMarkdownToHtml(markdown);
  const executablePath = await resolveChromiumExecutable();
  if (!executablePath) {
    throw new Error('Aucun binaire Chromium disponible. Définissez CHROMIUM_PATH ou installez @sparticuz/chromium.');
  }

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    executablePath,
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '1.5cm', bottom: '1.5cm', left: '1.5cm', right: '1.5cm' },
    });
    return pdfBuffer;
  } finally {
    await browser.close();
  }
}

function transformMarkdownToHtml(markdown: string) {
  const rendered = marked.parse(markdown, { mangle: false, headerIds: false }) as string;
  const dom = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>');
  const { document } = dom.window;

  const style = document.createElement('style');
  style.textContent = getStyles();
  document.head.appendChild(style);

  const body = document.querySelector('body');
  if (!body) throw new Error('Unable to create PDF template');
  body.innerHTML = `<article class="resume">${rendered}</article>`;

  return dom.serialize();
}

function getStyles() {
  return `
    :root {
      color-scheme: light;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 14px;
      line-height: 1.5;
      color: #1f2933;
    }

    body {
      margin: 0;
      padding: 0;
      background: #f8fafc;
    }

    .resume {
      max-width: 740px;
      margin: 0 auto;
      padding: 32px;
      background: #ffffff;
      border-radius: 24px;
      box-shadow: 0 20px 40px rgba(15, 23, 42, 0.12);
    }

    h1, h2, h3 {
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 8px;
    }

    h1 {
      font-size: 28px;
      letter-spacing: 0.02em;
      text-transform: uppercase;
    }

    h2 {
      font-size: 18px;
      margin-top: 24px;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 4px;
    }

    h3 {
      font-size: 15px;
      margin-top: 16px;
    }

    p {
      margin: 6px 0;
    }

    ul {
      margin: 12px 0;
      padding-left: 18px;
    }

    ul li {
      margin-bottom: 6px;
    }

    strong {
      font-weight: 600;
    }

    em {
      font-style: italic;
    }

    .badge {
      display: inline-flex;
      gap: 6px;
      align-items: center;
      padding: 4px 10px;
      border-radius: 9999px;
      background: rgba(79, 70, 229, 0.12);
      color: #4338ca;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      font-weight: 600;
    }
  `;
}

async function resolveChromiumExecutable() {
  const chromiumEnv = process.env.CHROMIUM_PATH;
  if (chromiumEnv) {
    return chromiumEnv;
  }

  try {
    const { default: chromium } = await import('@sparticuz/chromium');
    return await chromium.executablePath();
  } catch (error) {
    if (isDev) {
      console.warn('[PDF] Chromium non disponible :', error);
    }
    return null;
  }
}
