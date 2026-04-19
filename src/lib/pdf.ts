// ─── PDF Builder ─────────────────────────────────────────────────────────────
// Multi-page PDF generation with no external dependencies.
// Coordinates: origin is bottom-left of page (PDF standard).
// Y decreases as we add content downward.

const PAGE_W = 612;
const PAGE_H = 792;
const ML = 50;            // left margin
const MR = 50;            // right margin
const MT = 50;            // top margin
const MB = 60;            // bottom margin (leaves room for footer)
const CW = PAGE_W - ML - MR;  // content width = 512
const TOP_Y = PAGE_H - MT;    // 742 — starting y for content

// Escape PDF string literals (handles non-ASCII via octal escapes)
function esc(s: string): string {
  let out = '';
  for (let i = 0; i < s.length; i++) {
    const code = s.charCodeAt(i);
    if (s[i] === '\\') { out += '\\\\'; }
    else if (s[i] === '(') { out += '\\('; }
    else if (s[i] === ')') { out += '\\)'; }
    else if (code >= 0x20 && code <= 0x7e) { out += s[i]; }
    else { out += '\\' + code.toString(8).padStart(3, '0'); }
  }
  return out;
}

// Helvetica glyph widths at 1pt (AFM metrics, subset)
const GW: Record<string, number> = {
  ' ': 0.278, '!': 0.278, '"': 0.355, '#': 0.556, '$': 0.556, '%': 0.889,
  '&': 0.667, "'": 0.191, '(': 0.333, ')': 0.333, '*': 0.389, '+': 0.584,
  ',': 0.278, '-': 0.333, '.': 0.278, '/': 0.278,
  '0': 0.556, '1': 0.556, '2': 0.556, '3': 0.556, '4': 0.556,
  '5': 0.556, '6': 0.556, '7': 0.556, '8': 0.556, '9': 0.556,
  ':': 0.278, ';': 0.278, '<': 0.584, '=': 0.584, '>': 0.584, '?': 0.556,
  '@': 1.015, 'A': 0.667, 'B': 0.667, 'C': 0.722, 'D': 0.722, 'E': 0.667,
  'F': 0.611, 'G': 0.778, 'H': 0.722, 'I': 0.278, 'J': 0.500, 'K': 0.667,
  'L': 0.556, 'M': 0.833, 'N': 0.722, 'O': 0.778, 'P': 0.667, 'Q': 0.778,
  'R': 0.722, 'S': 0.667, 'T': 0.611, 'U': 0.722, 'V': 0.667, 'W': 0.944,
  'X': 0.667, 'Y': 0.667, 'Z': 0.611,
  '[': 0.278, '\\': 0.278, ']': 0.278, '^': 0.469, '_': 0.556, '`': 0.333,
  'a': 0.556, 'b': 0.556, 'c': 0.500, 'd': 0.556, 'e': 0.556, 'f': 0.278,
  'g': 0.556, 'h': 0.556, 'i': 0.222, 'j': 0.222, 'k': 0.500, 'l': 0.222,
  'm': 0.833, 'n': 0.556, 'o': 0.556, 'p': 0.556, 'q': 0.556, 'r': 0.333,
  's': 0.500, 't': 0.278, 'u': 0.556, 'v': 0.500, 'w': 0.722, 'x': 0.500,
  'y': 0.500, 'z': 0.500,
};

function charW(ch: string, sz: number): number {
  return (GW[ch] ?? 0.5) * sz;
}

function strW(text: string, sz: number): number {
  return [...text].reduce((w, ch) => w + charW(ch, sz), 0);
}

function wrapText(text: string, sz: number, maxW: number): string[] {
  const result: string[] = [];
  for (const rawLine of text.split('\n')) {
    if (!rawLine.trim()) { result.push(''); continue; }
    const words = rawLine.split(' ');
    let line = '';
    for (const word of words) {
      if (!word) continue;
      const candidate = line ? line + ' ' + word : word;
      if (strW(candidate, sz) <= maxW) {
        line = candidate;
      } else {
        if (line) result.push(line);
        line = word; // even if a single word is wider, just add it
      }
    }
    if (line) result.push(line);
  }
  return result.length > 0 ? result : [''];
}

interface PageState {
  ops: string[];
  y: number;
}

// ─── PdfBuilder ───────────────────────────────────────────────────────────────

export class PdfBuilder {
  private pages: PageState[] = [];
  private pg!: PageState;
  private footerCity = '';

  constructor() {
    this._newPage();
  }

  private _newPage(): void {
    this.pg = { ops: [], y: TOP_Y };
    this.pages.push(this.pg);
  }

  private _need(h: number): void {
    if (this.pg.y - h < MB) this._newPage();
  }

  // Low-level drawing primitives (use q/Q to isolate state changes)
  private _fillRect(x: number, y: number, w: number, h: number, r: number, g: number, b: number): void {
    this.pg.ops.push(`q\n${r} ${g} ${b} rg\n${x} ${y} ${w} ${h} re\nf\nQ`);
  }

  private _strokeRect(x: number, y: number, w: number, h: number, r: number, g: number, b: number, lw = 0.5): void {
    this.pg.ops.push(`q\n${lw} w\n${r} ${g} ${b} RG\n${x} ${y} ${w} ${h} re\nS\nQ`);
  }

  private _hline(x1: number, y: number, x2: number, r: number, g: number, b: number, lw = 0.5): void {
    this.pg.ops.push(`q\n${lw} w\n${r} ${g} ${b} RG\n${x1} ${y} m\n${x2} ${y} l\nS\nQ`);
  }

  private _vline(x: number, y1: number, y2: number, r: number, g: number, b: number, lw = 0.3): void {
    this.pg.ops.push(`q\n${lw} w\n${r} ${g} ${b} RG\n${x} ${y1} m\n${x} ${y2} l\nS\nQ`);
  }

  private _text(
    x: number, y: number,
    text: string, sz: number,
    bold: boolean,
    r: number, g: number, b: number,
  ): void {
    const fn = bold ? 'F2' : 'F1';
    this.pg.ops.push(`q\nBT\n/${fn} ${sz} Tf\n${r} ${g} ${b} rg\n${x} ${y} Td\n(${esc(text)}) Tj\nET\nQ`);
  }

  // ── Public builder methods ─────────────────────────────────────────────────

  /** Large heading with green accent bar */
  addTitle(text: string): this {
    const sz = 20;
    const lines = wrapText(text, sz, CW - 10);
    const h = lines.length * (sz + 6) + 36;
    this._need(h);
    // top accent bar — drawn above text, separated to avoid overlap with ascenders
    this._fillRect(ML, this.pg.y - 4, CW, 4, 0.09, 0.56, 0.40);
    this.pg.y -= 24;
    for (const ln of lines) {
      this._text(ML, this.pg.y, ln, sz, true, 0.06, 0.09, 0.16);
      this.pg.y -= sz + 6;
    }
    this.pg.y -= 6;
    return this;
  }

  /** Small grey subtitle / meta line */
  addMeta(text: string): this {
    const sz = 9;
    this._need(sz + 14);
    this._text(ML, this.pg.y, text, sz, false, 0.45, 0.48, 0.55);
    this.pg.y -= sz + 16;
    return this;
  }

  /** Section heading (green, uppercase, underline) */
  addH1(text: string): this {
    const sz = 11;
    this._need(sz + 22);
    this.pg.y -= 8;
    this._text(ML, this.pg.y, text.toUpperCase(), sz, true, 0.09, 0.56, 0.40);
    this.pg.y -= sz + 5;
    this._hline(ML, this.pg.y, ML + CW, 0.09, 0.56, 0.40, 0.75);
    this.pg.y -= 8;
    return this;
  }

  /** Sub-heading (dark, normal case) */
  addH2(text: string): this {
    const sz = 10;
    this._need(sz + 14);
    this.pg.y -= 4;
    this._text(ML, this.pg.y, text, sz, true, 0.12, 0.14, 0.20);
    this.pg.y -= sz + 10;
    return this;
  }

  /** Body paragraph with word-wrap */
  addParagraph(text: string, small = false): this {
    if (!text.trim()) return this;
    const sz = small ? 9 : 10;
    const lh = sz + 4;
    const lines = wrapText(text, sz, CW);
    const firstChunk = Math.min(lines.length, 8);
    this._need(firstChunk * lh + 8);
    for (const ln of lines) {
      if (this.pg.y - lh < MB) this._newPage();
      if (!ln) { this.pg.y -= 6; continue; }
      this._text(ML, this.pg.y, ln, sz, false, 0.12, 0.14, 0.20);
      this.pg.y -= lh;
    }
    this.pg.y -= 8;
    return this;
  }

  /** Horizontal row of stat boxes (label + large value) */
  addStatRow(stats: Array<{ label: string; value: string; accent?: boolean }>): this {
    const n = stats.length;
    if (n === 0) return this;
    const colW = CW / n;
    const h = 50;
    this._need(h + 10);
    this._fillRect(ML, this.pg.y - h, CW, h, 0.96, 0.97, 0.99);
    this._strokeRect(ML, this.pg.y - h, CW, h, 0.87, 0.89, 0.93);
    for (let i = 0; i < n; i++) {
      const x = ML + i * colW + 8;
      const { label, value, accent = false } = stats[i];
      this._text(x, this.pg.y - 15, label.toUpperCase(), 7, false, 0.45, 0.48, 0.55);
      const [vr, vg, vb] = accent ? [0.09, 0.56, 0.40] : [0.06, 0.09, 0.16];
      this._text(x, this.pg.y - 36, value, 14, true, vr, vg, vb);
      if (i < n - 1) {
        this._vline(ML + (i + 1) * colW, this.pg.y, this.pg.y - h, 0.87, 0.89, 0.93);
      }
    }
    this.pg.y -= h + 12;
    return this;
  }

  /** Data table with headers and alternating row backgrounds */
  addTable(headers: string[], rows: string[][], colRatios?: number[]): this {
    if (rows.length === 0) return this;
    const n = headers.length;
    const totalR = colRatios?.reduce((a, b) => a + b, 0) ?? n;
    const colWs = Array.from({ length: n }, (_, i) =>
      colRatios ? (colRatios[i] / totalR) * CW : CW / n
    );
    const HEADER_H = 20;
    const ROW_H = 16;

    const renderHeader = (): void => {
      this._fillRect(ML, this.pg.y - HEADER_H, CW, HEADER_H, 0.06, 0.09, 0.16);
      let x = ML;
      for (let c = 0; c < n; c++) {
        this._text(x + 6, this.pg.y - 14, (headers[c] ?? '').toUpperCase(), 7, true, 1, 1, 1);
        x += colWs[c];
      }
      this.pg.y -= HEADER_H;
    };

    this._need(HEADER_H + ROW_H * 2);
    renderHeader();

    for (let r = 0; r < rows.length; r++) {
      if (this.pg.y - ROW_H < MB) {
        this._newPage();
        renderHeader();
      }
      if (r % 2 === 1) {
        this._fillRect(ML, this.pg.y - ROW_H, CW, ROW_H, 0.96, 0.97, 0.99);
      }
      let x = ML;
      for (let c = 0; c < n; c++) {
        const maxChars = Math.max(4, Math.floor((colWs[c] - 12) / (9 * 0.45)));
        const cell = String(rows[r][c] ?? '');
        const display = cell.length > maxChars ? cell.slice(0, maxChars - 2) + '..' : cell;
        this._text(x + 6, this.pg.y - ROW_H + 4, display, 9, false, 0.12, 0.14, 0.20);
        x += colWs[c];
      }
      this.pg.y -= ROW_H;
    }
    this._hline(ML, this.pg.y, ML + CW, 0.87, 0.89, 0.93);
    this.pg.y -= 12;
    return this;
  }

  /** Highlight callout box with coloured left accent */
  addCallout(text: string, type: 'success' | 'warn' | 'info' = 'success'): this {
    const sz = 9;
    const lines = wrapText(text, sz, CW - 24);
    const h = lines.length * (sz + 3) + 16;
    this._need(h + 8);
    const [cr, cg, cb] = type === 'success' ? [0.09, 0.56, 0.40]
      : type === 'warn' ? [0.85, 0.40, 0.09]
      : [0.25, 0.50, 0.95];
    this._fillRect(ML, this.pg.y - h, CW, h, 0.91, 0.97, 0.95);
    this._fillRect(ML, this.pg.y - h, 3, h, cr, cg, cb);
    let ty = this.pg.y - 11;
    for (const ln of lines) {
      if (ln) this._text(ML + 12, ty, ln, sz, false, 0.06, 0.20, 0.14);
      ty -= sz + 3;
    }
    this.pg.y -= h + 10;
    return this;
  }

  /** Thin horizontal rule */
  addDivider(): this {
    this._need(16);
    this.pg.y -= 8;
    this._hline(ML, this.pg.y, ML + CW, 0.87, 0.89, 0.93);
    this.pg.y -= 8;
    return this;
  }

  addSpace(pt = 10): this {
    this.pg.y -= pt;
    return this;
  }

  /** Set persistent footer text (rendered when build() is called) */
  setFooter(cityName: string): this {
    this.footerCity = cityName;
    return this;
  }

  private _renderFooters(): void {
    const dateStr = new Date().toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
    for (const page of this.pages) {
      const saved = this.pg;
      this.pg = page;
      this._hline(ML, 50, ML + CW, 0.87, 0.89, 0.93);
      this._text(ML, 36, 'CONFIDENTIAL — FOR OFFICIAL USE ONLY', 7, false, 0.45, 0.48, 0.55);
      this._text(ML + CW - 95, 36, dateStr, 7, false, 0.45, 0.48, 0.55);
      if (this.footerCity) {
        this._text(ML, 22, `${this.footerCity} Urban Heat Mitigation Program`, 7, true, 0.09, 0.56, 0.40);
      }
      this.pg = saved;
    }
  }

  /** Compile all pages into a valid PDF buffer */
  build(): Buffer {
    this._renderFooters();

    const N = this.pages.length;
    // Object layout:
    //   1: Catalog
    //   2: Pages
    //   3..N+2: Page descriptors
    //   N+3..2N+2: Content streams
    //   2N+3: Font /F1 (Helvetica)
    //   2N+4: Font /F2 (Helvetica-Bold)
    const F1 = 2 * N + 3;
    const F2 = 2 * N + 4;
    const objects: string[] = [];

    objects.push(`1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj`);

    const kids = Array.from({ length: N }, (_, i) => `${i + 3} 0 R`).join(' ');
    objects.push(`2 0 obj\n<< /Type /Pages /Kids [${kids}] /Count ${N} >>\nendobj`);

    for (let i = 0; i < N; i++) {
      objects.push(
        `${i + 3} 0 obj\n` +
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}]\n` +
        `/Resources << /Font << /F1 ${F1} 0 R /F2 ${F2} 0 R >> >>\n` +
        `/Contents ${N + i + 3} 0 R >>\nendobj`,
      );
    }

    for (let i = 0; i < N; i++) {
      const stream = this.pages[i].ops.join('\n');
      const byteLen = Buffer.byteLength(stream, 'utf-8');
      objects.push(
        `${N + i + 3} 0 obj\n<< /Length ${byteLen} >>\nstream\n${stream}\nendstream\nendobj`,
      );
    }

    objects.push(`${F1} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj`);
    objects.push(`${F2} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj`);

    let pdf = '%PDF-1.4\n';
    const offsets: number[] = [0]; // xref free-list head

    for (const obj of objects) {
      offsets.push(pdf.length);
      pdf += `${obj}\n`;
    }

    const xrefOffset = pdf.length;
    pdf += `xref\n0 ${objects.length + 1}\n`;
    pdf += '0000000000 65535 f \n';
    for (let i = 1; i < offsets.length; i++) {
      pdf += `${offsets[i].toString().padStart(10, '0')} 00000 n \n`;
    }
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

    return Buffer.from(pdf, 'utf-8');
  }
}

// ─── Legacy compat ────────────────────────────────────────────────────────────

export function createSimplePdf(lines: string[]): Buffer {
  const b = new PdfBuilder();
  if (lines.length > 0) b.addTitle(lines[0]);
  for (const ln of lines.slice(1)) b.addParagraph(ln);
  return b.build();
}
