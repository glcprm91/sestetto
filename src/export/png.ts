import fontUrl from '@fontsource-variable/archivo/files/archivo-latin-wdth-normal.woff2?url';

const SVG_NS = 'http://www.w3.org/2000/svg';

/** Il carattere va incorporato nell'SVG: un'immagine non vede i font della pagina. */
async function embeddedFontCss(): Promise<string> {
  try {
    const blob = await (await fetch(fontUrl)).blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
    return `@font-face{font-family:'Archivo Variable';font-weight:100 900;font-stretch:62% 125%;src:url(${dataUrl}) format('woff2');}`;
  } catch {
    return '';
  }
}

/** Copia autonoma del campo: niente classi CSS, spostamenti scritti come attributi. */
async function standaloneSvg(svg: SVGSVGElement): Promise<{ xml: string; width: number; height: number }> {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  const box = svg.viewBox.baseVal;
  clone.setAttribute('xmlns', SVG_NS);
  clone.setAttribute('width', String(box.width));
  clone.setAttribute('height', String(box.height));
  clone.querySelectorAll('[data-export="skip"]').forEach((node) => node.remove());
  clone.querySelectorAll<SVGGElement>('[data-x]').forEach((group) => {
    group.setAttribute('transform', `translate(${group.dataset.x} ${group.dataset.y})`);
    group.style.removeProperty('transform');
  });
  const css = await embeddedFontCss();
  if (css) {
    const style = document.createElementNS(SVG_NS, 'style');
    style.textContent = css;
    clone.insertBefore(style, clone.firstChild);
  }
  return { xml: new XMLSerializer().serializeToString(clone), width: box.width, height: box.height };
}

export async function downloadPng(svg: SVGSVGElement, fileName: string): Promise<void> {
  const { xml, width, height } = await standaloneSvg(svg);
  const image = new Image();
  image.decoding = 'sync';
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error('Immagine non generata'));
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}`;
  });
  // Qualche istante perché il browser applichi il carattere incorporato.
  await new Promise((resolve) => setTimeout(resolve, 80));

  const scale = 1.5;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas non disponibile');
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('Immagine non generata');
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
