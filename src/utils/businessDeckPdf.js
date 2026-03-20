import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

function toFileSafePart(value) {
  return String(value || 'deal')
    .trim()
    .replace(/[^a-z0-9._-]+/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
    .slice(0, 50);
}

/** 16:9 page in mm — matches slide aspect (1280×720) for one slide per PDF page */
const PDF_PAGE_W_MM = 304.8;
const PDF_PAGE_H_MM = (PDF_PAGE_W_MM * 9) / 16;

/**
 * Rasterize each `.slide` with html2canvas into a 16:9 jsPDF page.
 * Avoids single-body html2pdf capture + A4 aspect mismatch.
 */
export async function renderBusinessDeckPdfArrayBuffer({ deckHtml, fileBaseName = 'business-deck' }) {
  if (!deckHtml || typeof deckHtml !== 'string') throw new Error('deckHtml is required');

  const fileName = `${toFileSafePart(fileBaseName)}.pdf`;

  const arrayBuffer = await new Promise((resolve, reject) => {
    const wrapper = document.createElement('div');
    wrapper.style.cssText =
      'position:fixed;top:0;left:0;width:1340px;height:800px;' +
      'overflow:hidden;opacity:0.001;pointer-events:none;z-index:2147483647;';

    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'width:1340px;height:800px;border:none;display:block;';

    const blob = new Blob([deckHtml], { type: 'text/html;charset=utf-8' });
    const blobUrl = URL.createObjectURL(blob);
    iframe.src = blobUrl;

    wrapper.appendChild(iframe);
    document.body.appendChild(wrapper);

    let done = false;
    const cleanup = () => {
      if (done) return;
      done = true;
      window.removeEventListener('message', onMessage);
      try {
        URL.revokeObjectURL(blobUrl);
      } catch {
        /* ignore */
      }
      try {
        document.body.removeChild(wrapper);
      } catch {
        /* ignore */
      }
    };

    const fixSvgGradientUrls = (root) => {
      const walk = (node) => {
        if (!node) return;
        if (node.getAttribute) {
          for (const a of ['fill', 'stroke', 'style']) {
            const v = node.getAttribute(a);
            if (v && /url\([^)]*#/.test(v)) {
              const fixed = v.replace(/url\([^)]*?(#[a-zA-Z0-9_-]+)\)/g, 'url($1)');
              if (fixed !== v) node.setAttribute(a, fixed);
            }
          }
        }
        for (const c of node.children || []) walk(c);
      };
      walk(root);
    };

    const onMessage = async (evt) => {
      if (!evt?.data || evt.data.type !== 'flipiq_deck_ready') return;
      try {
        const doc = iframe.contentDocument;
        const win = iframe.contentWindow;
        if (!doc?.body || !win) throw new Error('Iframe document not available');

        await new Promise((r) => setTimeout(r, 400));

        doc.documentElement.classList.add('pdf-export');

        fixSvgGradientUrls(doc.body);

        const slides = doc.querySelectorAll('.deck section.slide, .deck > .slide');
        if (!slides.length) throw new Error('No slides found in deck HTML');

        const pdf = new jsPDF({
          unit: 'mm',
          format: [PDF_PAGE_W_MM, PDF_PAGE_H_MM],
          orientation: 'landscape',
          compress: true,
        });

        const pageRatio = PDF_PAGE_W_MM / PDF_PAGE_H_MM;

        for (let i = 0; i < slides.length; i++) {
          const slideEl = slides[i];
          const canvas = await html2canvas(slideEl, {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            logging: false,
            backgroundColor: '#ffffff',
            scrollX: 0,
            scrollY: 0,
          });

          const imgData = canvas.toDataURL('image/jpeg', 0.92);
          if (i > 0) {
            pdf.addPage([PDF_PAGE_W_MM, PDF_PAGE_H_MM], 'landscape');
          }

          const cw = canvas.width;
          const ch = canvas.height;
          const imgRatio = cw / ch;
          let drawW = PDF_PAGE_W_MM;
          let drawH = PDF_PAGE_H_MM;
          let x = 0;
          let y = 0;
          if (imgRatio > pageRatio) {
            drawH = PDF_PAGE_W_MM / imgRatio;
            y = (PDF_PAGE_H_MM - drawH) / 2;
          } else {
            drawW = PDF_PAGE_H_MM * imgRatio;
            x = (PDF_PAGE_W_MM - drawW) / 2;
          }
          pdf.addImage(imgData, 'JPEG', x, y, drawW, drawH, undefined, 'FAST');
        }

        const ab = pdf.output('arraybuffer');
        cleanup();
        resolve(ab);
      } catch (e) {
        cleanup();
        reject(e);
      }
    };

    window.addEventListener('message', onMessage);

    iframe.onerror = () => {
      cleanup();
      reject(new Error('Deck iframe failed to load'));
    };

    setTimeout(() => {
      if (done) return;
      cleanup();
      reject(new Error('Timed out waiting for deck charts to render'));
    }, 45000);
  });

  return { arrayBuffer, fileName };
}
