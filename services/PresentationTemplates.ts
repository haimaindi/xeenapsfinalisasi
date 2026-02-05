
import pptxgen from 'pptxgenjs';

/**
 * XEENAPS UNIVERSAL TEMPLATES V37
 * FIX: Branded Card Backgrounds (Primary Color with 80% Transparency) & Opsi B Stacking
 */

interface ThemeConfig {
  primaryColor: string;
  secondaryColor: string;
}

/**
 * Parsing Markdown (**bold**, *italic*) dengan sinkronisasi ukuran font per segmen
 */
const parseRichText = (text: string, baseOptions: pptxgen.TextPropsOptions): pptxgen.TextProps[] => {
  const parts: pptxgen.TextProps[] = [];
  const cleanStr = String(text || "").replace(/<[^>]+>/g, '').trim();
  const regex = /(\*\*.*?\*\*|\*.*?\*)/g;
  const segments = cleanStr.split(regex);

  segments.forEach(segment => {
    const options = { ...baseOptions }; // Memastikan fontSize & fontFace selalu ikut
    
    if (segment.startsWith('**') && segment.endsWith('**')) {
      parts.push({ 
        text: segment.slice(2, -2), 
        options: { ...options, bold: true } 
      });
    } else if (segment.startsWith('*') && segment.endsWith('*')) {
      parts.push({ 
        text: segment.slice(1, -1), 
        options: { ...options, italic: true } 
      });
    } else if (segment) {
      parts.push({ 
        text: segment, 
        options: options 
      });
    }
  });

  return parts.length > 0 ? parts : [{ text: cleanStr, options: baseOptions }];
};

/**
 * Logika Smart Resize. 
 * lineSpacing sekarang mengembalikan nilai dalam POINTS (fontSize * multiplier)
 */
const getDynamicConfig = (text: string, type: 'title' | 'body' | 'cover' = 'body') => {
  const len = String(text || "").length;
  let fontSize = 11;
  let spacingMultiplier = 1.1;

  if (type === 'cover') {
    if (len > 250) fontSize = 11;
    else if (len > 180) fontSize = 13;
    else if (len > 120) fontSize = 16;
    else if (len > 70) fontSize = 20;
    else fontSize = 28;
    spacingMultiplier = 1.2;
  } else if (type === 'title') {
    fontSize = len > 65 ? 9 : 11;
  } else {
    if (len > 1500) { fontSize = 8; spacingMultiplier = 1.0; }
    else if (len > 1000) { fontSize = 9; spacingMultiplier = 1.05; }
    else if (len > 600) { fontSize = 10; spacingMultiplier = 1.1; }
    else if (len < 250) { fontSize = 18; spacingMultiplier = 1.4; } // Perbaikan: Font 18pt untuk teks sedikit
    else { fontSize = 11.5; spacingMultiplier = 1.3; }
  }

  // PENTING: lineSpacing di pptxgenjs adalah Point. 
  // Jika kita beri 1.5, maka baris akan tumpuk. Harus fontSize * multiplier.
  const lineSpacing = Math.floor(fontSize * spacingMultiplier);

  return { fontSize, lineSpacing };
};

const drawFooterLogo = (slide: pptxgen.Slide, logoBase64?: string) => {
  if (logoBase64) {
    slide.addImage({ data: logoBase64, x: 9.35, y: 5.15, w: 0.35, h: 0.35 });
  }
};

const drawHeader = (slide: pptxgen.Slide, title: string, theme: ThemeConfig) => {
  const primary = theme.primaryColor.replace('#', '');
  const secondary = theme.secondaryColor.replace('#', '');
  const config = getDynamicConfig(title, 'title');

  slide.addShape('rect', { x: 0, y: 0, w: 10, h: 0.65, fill: { color: primary } });
  slide.addShape('rect', { x: 0, y: 0.65, w: 10, h: 0.08, fill: { color: secondary } });
  
  slide.addText(String(title).toUpperCase(), {
    x: 0.5, y: 0.1, w: 9.0, h: 0.45,
    fontSize: config.fontSize, fontFace: 'Inter', color: 'FFFFFF', bold: true, align: 'left', valign: 'middle'
  });
};

export const drawCoverUniversal = (slide: pptxgen.Slide, title: string, presenters: string[], theme: ThemeConfig, logoBase64?: string) => {
  const primary = theme.primaryColor.replace('#', '');
  const secondary = theme.secondaryColor.replace('#', '');
  const config = getDynamicConfig(title, 'cover');
  slide.background = { color: 'FFFFFF' };
  
  slide.addShape('rect', { x: 4.5, y: 0.5, w: 1.0, h: 0.06, fill: { color: primary } });

  // Menggunakan h yang luas dan lineSpacing berbasis point yang benar
  slide.addText(String(title).toUpperCase(), { 
    x: 0.5, y: 0.8, w: 9.0, h: 3.8, 
    fontSize: config.fontSize, 
    fontFace: 'Inter', 
    color: primary, 
    bold: true, 
    align: 'center', 
    valign: 'middle', 
    lineSpacing: config.lineSpacing, // Sekarang dalam Points (misal 24 atau 32)
    wrap: true
  });

  slide.addShape('rect', { x: 3.5, y: 4.8, w: 3.0, h: 0.03, fill: { color: secondary } });

  slide.addText(presenters.join(' • ').toUpperCase(), { 
    x: 1.0, y: 5.0, w: 8.0, h: 0.4, 
    fontSize: 10, fontFace: 'Inter', color: '64748B', bold: true, align: 'center', charSpacing: 2
  });
  
  drawFooterLogo(slide, logoBase64);
};

export const drawContentUniversal = (slide: pptxgen.Slide, title: string, content: string, theme: ThemeConfig, logoBase64?: string) => {
  slide.background = { color: 'FFFFFF' };
  drawHeader(slide, title, theme);
  const primary = theme.primaryColor.replace('#', '');
  const config = getDynamicConfig(content, 'body');
  
  // Perbaikan: Fill menggunakan primary color dengan transparansi 80% (20% opacity)
  slide.addShape('roundRect', { 
    x: 0.4, y: 0.9, w: 9.2, h: 4.2, 
    fill: { color: primary, transparency: 95 }, 
    line: { color: primary, width: 0.5, transparency: 50 }, 
    rectRadius: 0.05 
  });

  const richParts = parseRichText(content, { fontSize: config.fontSize, fontFace: 'Inter', color: '1E293B' });

  slide.addText(richParts, { 
    x: 0.7, y: 1.1, w: 8.6, h: 3.8, align: 'center', valign: 'middle', lineSpacing: config.lineSpacing, wrap: true 
  });

  drawFooterLogo(slide, logoBase64);
};

export const drawContentTwoColumn = (slide: pptxgen.Slide, title: string, contents: {left: string, right: string}, theme: ThemeConfig, logoBase64?: string) => {
  slide.background = { color: 'FFFFFF' };
  drawHeader(slide, title, theme);
  const primary = theme.primaryColor.replace('#', '');
  
  [
    { x: 0.4, text: contents.left },
    { x: 5.0, text: contents.right }
  ].forEach(col => {
    const config = getDynamicConfig(col.text, 'body');
    // Perbaikan: Fill menggunakan primary color dengan transparansi 80%
    slide.addShape('roundRect', { 
      x: col.x, y: 0.9, w: 4.6, h: 4.2, 
      fill: { color: primary, transparency: 95 }, 
      line: { color: primary, width: 0.5, transparency: 50 }, 
      rectRadius: 0.05 
    });
    
    const richParts = parseRichText(col.text, { fontSize: Math.min(config.fontSize, 9.5), fontFace: 'Inter', color: '1E293B' });
    slide.addText(richParts, { x: col.x + 0.2, y: 1.1, w: 4.2, h: 3.8, align: 'left', valign: 'top', lineSpacing: config.lineSpacing, wrap: true });
  });
  
  drawFooterLogo(slide, logoBase64);
};

export const drawContentThreeColumn = (slide: pptxgen.Slide, title: string, items: {h: string, b: string}[], theme: ThemeConfig, logoBase64?: string) => {
  slide.background = { color: 'FFFFFF' };
  drawHeader(slide, title, theme);
  const primary = theme.primaryColor.replace('#', '');
  
  items.slice(0, 3).forEach((item, i) => {
    const x = 0.3 + (i * 3.15);
    const config = getDynamicConfig(item.b, 'body');
    // Perbaikan: Fill menggunakan primary color dengan transparansi 80%
    slide.addShape('roundRect', { 
      x, y: 0.9, w: 3.1, h: 4.2, 
      fill: { color: primary, transparency: 95 }, 
      line: { color: primary, width: 0.5, transparency: 50 }, 
      rectRadius: 0.05 
    });
    
    slide.addText(String(item.h || "").toUpperCase(), { 
      x: x + 0.1, y: 1.0, w: 2.9, h: 0.4, fontSize: 9, fontFace: 'Inter', color: primary, bold: true, align: 'center', wrap: true 
    });
    
    const richParts = parseRichText(item.b, { fontSize: Math.min(config.fontSize, 9), fontFace: 'Inter', color: '475569' });
    slide.addText(richParts, { x: x + 0.15, y: 1.5, w: 2.8, h: 3.4, align: 'left', valign: 'top', lineSpacing: config.lineSpacing, wrap: true });
  });
  
  drawFooterLogo(slide, logoBase64);
};

export const drawContentTwoByTwo = (slide: pptxgen.Slide, title: string, cards: {h: string, b: string}[], theme: ThemeConfig, logoBase64?: string) => {
  slide.background = { color: 'FFFFFF' };
  drawHeader(slide, title, theme);
  const primary = theme.primaryColor.replace('#', '');
  const positions = [{x: 0.4, y: 0.9}, {x: 5.0, y: 0.9}, {x: 0.4, y: 3.1}, {x: 5.0, y: 3.1}];
  
  positions.forEach((pos, i) => {
    const card = cards[i] || { h: "Point", b: "Detail" };
    const config = getDynamicConfig(card.b, 'body');
    // Perbaikan: Fill menggunakan primary color dengan transparansi 80%
    slide.addShape('roundRect', { 
      x: pos.x, y: pos.y, w: 4.6, h: 2.1, 
      fill: { color: primary, transparency: 95 }, 
      line: { color: primary, width: 0.5, transparency: 50 },
      rectRadius: 0.1 
    });
    
    slide.addText(String(card.h || "").toUpperCase(), { 
      x: pos.x + 0.2, y: pos.y + 0.1, w: 4.2, h: 0.4, fontSize: 9.5, fontFace: 'Inter', color: primary, bold: true, wrap: true });
    
    const richParts = parseRichText(card.b, { fontSize: Math.min(config.fontSize, 9), fontFace: 'Inter', color: '475569' });
    slide.addText(richParts, { x: pos.x + 0.2, y: pos.y + 0.5, w: 4.2, h: 1.5, valign: 'top', lineSpacing: config.lineSpacing, wrap: true });
  });
  
  drawFooterLogo(slide, logoBase64);
};

export const drawContentStacking = (slide: pptxgen.Slide, title: string, points: {h: string, b: string}[], theme: ThemeConfig, logoBase64?: string) => {
  slide.background = { color: 'FFFFFF' };
  drawHeader(slide, title, theme);
  const primary = theme.primaryColor.replace('#', '');
  
  // Perbaikan: Opsi B (3 Card) dengan tinggi 1.30 dan Fill Transparansi 80%
  points.slice(0, 3).forEach((p, i) => {
    const y = 0.95 + (i * 1.45); // Penyesuaian jarak vertikal agar seimbang
    const config = getDynamicConfig(p.b, 'body');
    slide.addShape('roundRect', { 
      x: 0.4, y, w: 9.2, h: 1.30, 
      fill: { color: primary, transparency: 95 }, 
      line: { color: primary, width: 0.5, transparency: 50 }, 
      rectRadius: 0.05 
    });
    
    slide.addText(String(p.h || "").toUpperCase(), { x: 0.6, y: y + 0.1, w: 2.5, h: 1.10, fontSize: 9, fontFace: 'Inter', color: primary, bold: true, valign: 'middle', wrap: true });
    
    const richParts = parseRichText(p.b, { fontSize: Math.min(config.fontSize, 9.5), fontFace: 'Inter', color: '475569' });
    slide.addText(richParts, { x: 3.3, y: y + 0.1, w: 6.1, h: 1.10, valign: 'middle', lineSpacing: config.lineSpacing, wrap: true });
  });
  
  drawFooterLogo(slide, logoBase64);
};

export const drawReferenceUniversal = (slide: pptxgen.Slide, title: string, refs: string[], theme: ThemeConfig, logoBase64?: string) => {
  slide.background = { color: 'FFFFFF' };
  drawHeader(slide, title, theme);
  const primary = theme.primaryColor.replace('#', '');
  
  const textContent = refs.join('\n\n');
  const config = getDynamicConfig(textContent, 'body');

  // Perbaikan: Background card menggunakan warna primer dengan transparansi 80%
  slide.addShape('roundRect', { 
    x: 0.4, y: 0.9, w: 9.2, h: 4.2, 
    fill: { color: primary, transparency: 95 }, 
    line: { color: primary, width: 0.5, transparency: 50 }, 
    rectRadius: 0.05 
  });

  slide.addText(textContent, { 
    x: 0.7, y: 1.1, w: 8.6, h: 3.8, fontSize: config.fontSize, fontFace: 'Inter', color: '475569', valign: 'top', lineSpacing: config.lineSpacing, wrap: true 
  });

  drawFooterLogo(slide, logoBase64);
};

// Aliases
export const drawContentStrategic = drawContentUniversal;
export const drawContentBentoGrid = drawContentTwoByTwo;
export const drawContentStandard = drawContentUniversal;
export const drawContentComparison = drawContentTwoColumn;
export const drawContentFocus = drawContentUniversal;
export const drawContentFocusWithCenter = drawContentUniversal;
export const drawContentThreePillars = drawContentThreeColumn;
export const drawContentProcess = drawContentStacking;
export const drawReferenceMinimal = drawReferenceUniversal;
export const drawCoverModern = drawCoverUniversal;
