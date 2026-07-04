const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
        Header, Footer, AlignmentType, LevelFormat,
        HeadingLevel, BorderStyle, WidthType, ShadingType,
        PageNumber, PageBreak } = require('docx');
const fs = require('fs');

const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const borders = { top: border, bottom: border, left: border, right: border };
const CW = 9360;

function h1(t) { return new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(t)] }); }
function h2(t) { return new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(t)] }); }
function h3(t) { return new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun(t)] }); }
function para(text) { return new Paragraph({ children: [new TextRun(text)], spacing: { after: 120 } }); }
function paraBold(label, text) {
  return new Paragraph({ children: [new TextRun({ text: label, bold: true }), new TextRun(text)], spacing: { after: 120 } });
}
function bullet(text) { return new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun(text)] }); }
function numbered(text) { return new Paragraph({ numbering: { reference: "numbers", level: 0 }, children: [new TextRun(text)] }); }
function spacer() { return new Paragraph({ children: [new TextRun("")], spacing: { after: 60 } }); }
function code(text) { return new Paragraph({ children: [new TextRun({ text, font: "Courier New", size: 20 })], spacing: { before: 80, after: 80 } }); }

function makeTable(headers, rows, colWidths) {
  const widths = colWidths || headers.map(() => Math.floor(CW / headers.length));
  const headerRow = new TableRow({
    children: headers.map((h, i) => new TableCell({
      borders, width: { size: widths[i], type: WidthType.DXA },
      shading: { fill: "1a1a1a", type: ShadingType.CLEAR },
      margins: { top: 80, bottom: 80, left: 120, right: 120 },
      children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, color: "FFFFFF", size: 20 })] })]
    }))
  });
  const dataRows = rows.map((row, ri) => new TableRow({
    children: row.map((cell, i) => new TableCell({
      borders, width: { size: widths[i], type: WidthType.DXA },
      shading: ri % 2 === 0 ? { fill: "F5F5F5", type: ShadingType.CLEAR } : undefined,
      margins: { top: 80, bottom: 80, left: 120, right: 120 },
      children: [new Paragraph({ children: [new TextRun({ text: String(cell), size: 20 })] })]
    }))
  }));
  return new Table({ width: { size: CW, type: WidthType.DXA }, columnWidths: widths, rows: [headerRow, ...dataRows] });
}

const doc = new Document({
  styles: {
    default: { document: { run: { font: "Arial", size: 22 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 32, bold: true, font: "Arial", color: "1a1a1a" },
        paragraph: { spacing: { before: 360, after: 200 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 28, bold: true, font: "Arial", color: "2C2C2A" },
        paragraph: { spacing: { before: 280, after: 160 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 24, bold: true, font: "Arial", color: "444441" },
        paragraph: { spacing: { before: 200, after: 120 }, outlineLevel: 2 } },
    ]
  },
  numbering: {
    config: [
      { reference: "bullets", levels: [{ level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "numbers", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
    ]
  },
  sections: [{
    properties: {
      page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } }
    },
    headers: {
      default: new Header({ children: [new Paragraph({ children: [new TextRun({ text: "CheapALot.com \u8fd0\u8425\u7b56\u7565\u4e0e AI \u5e93\u5b58\u81ea\u52a8\u5316\u65b9\u6848", size: 18, color: "888888" })], alignment: AlignmentType.RIGHT })] })
    },
    footers: {
      default: new Footer({ children: [new Paragraph({ children: [new TextRun({ text: "\u7b2c ", size: 18, color: "888888" }), new TextRun({ children: [PageNumber.CURRENT], size: 18, color: "888888" }), new TextRun({ text: " \u9875", size: 18, color: "888888" })], alignment: AlignmentType.CENTER })] })
    },
    children: [
      // === TITLE ===
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 2000, after: 200 },
        children: [new TextRun({ text: "CheapALot.com", size: 52, bold: true, color: "1a1a1a" })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 400 },
        children: [new TextRun({ text: "\u8fd0\u8425\u7b56\u7565\u4e0e AI \u5e93\u5b58\u81ea\u52a8\u5316\u65b9\u6848", size: 36, bold: true, color: "555555" })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 },
        children: [new TextRun({ text: "\u96f6\u5e93\u5b58 \u00b7 \u8f7b\u8d44\u4ea7 \u00b7 AI \u9a71\u52a8 \u00b7 \u9ad8\u6548\u7387", size: 24, color: "888888" })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 },
        children: [new TextRun({ text: "\u65e5\u671f: 2026\u5e747\u67084\u65e5", size: 20, color: "aaaaaa" })] }),
      new Paragraph({ children: [new PageBreak()] }),

      // === 1. EXECUTIVE SUMMARY ===
      h1("1. \u6267\u884c\u6458\u8981"),
      para("CheapALot.com \u662f\u4e00\u4e2a B2B \u6e05\u4ed3/\u9000\u8d27\u5e93\u5b58\u6279\u53d1\u5e73\u53f0\uff0c\u5b9a\u4f4d\u4e3a\u8fde\u63a5\u4f9b\u5e94\u5546\uff08\u82f1\u56fd\u6e05\u4ed3\u5546\u3001\u4e2d\u56fd\u4e49\u4e4c\u5de5\u5382\uff09\u4e0e\u56fd\u9645\u8d38\u6613\u4e70\u5bb6\u7684\u4e2d\u95f4\u5546\u3002\u672c\u65b9\u6848\u63d0\u51fa\u4e00\u5957\u4ee5 AI \u4e3a\u6838\u5fc3\u7684\u4f4e\u6210\u672c\u8fd0\u8425\u4f53\u7cfb\uff0c\u901a\u8fc7\u81ea\u52a8\u5316\u5e93\u5b58\u6293\u53d6\u3001\u4e0a\u67b6\u548c\u591a\u8bed\u8a00\u7ffb\u8bd1\uff0c\u5b9e\u73b0\u201c\u96f6\u5e93\u5b58\u3001\u8f7b\u8d44\u4ea7\u3001\u9ad8\u6548\u7387\u201d\u7684\u8fd0\u8425\u6a21\u5f0f\u3002"),
      spacer(),
      paraBold("\u6838\u5fc3\u6307\u6807\uff1a", ""),
      bullet("\u6708\u8fd0\u8425\u6210\u672c\uff1a\u00a350-100\uff08\u4e0d\u542b\u5e7f\u544a\uff09"),
      bullet("\u9884\u671f\u6708\u6536\u5165\uff1a\u00a31,000-10,000\uff0820-50 \u5355/\u6708\uff09"),
      bullet("\u4ea7\u54c1\u4e0a\u67b6\u901f\u5ea6\uff1a\u4ece 15 \u5206\u949f/\u4e2a \u2192 30 \u79d2/\u4e2a\uff08AI \u81ea\u52a8\u5316\uff09"),
      bullet("SEO \u8986\u76d6\uff1a20,000+ \u4ea7\u54c1\u9875\u9762 = \u6d77\u91cf\u957f\u5c3e\u5173\u952e\u8bcd\u8986\u76d6"),
      spacer(),

      // === 2. BUSINESS MODEL ===
      h1("2. \u5546\u4e1a\u6a21\u5f0f\u5206\u6790"),
      h2("2.1 \u5f53\u524d\u5b9a\u4f4d"),
      para("CheapALot.com \u7684\u5546\u4e1a\u6a21\u5f0f\u662f B2B \u5e93\u5b58\u6e05\u7b97\u4e2d\u95f4\u5546\uff08Trade-to-Trade\uff09\uff0c\u7c7b\u4f3c\u4e8e\u82f1\u56fd\u7684 Wholesale Clearance\u3001Gem Wholesale\u3001Marthill \u7b49\u516c\u53f8\uff0c\u4f46\u6709\u4ee5\u4e0b\u5dee\u5f02\u5316\uff1a"),
      spacer(),
      makeTable(
        ["\u7ef4\u5ea6", "\u4f20\u7edf\u6e05\u7b97\u5546", "CheapALot.com"],
        [
          ["\u76ee\u6807\u5ba2\u6237", "\u82f1\u56fd\u672c\u5730\u5c0f\u5546\u8d29", "\u5168\u7403\u8d38\u6613\u4e70\u5bb6\uff08EN/ES/AR \u4e09\u8bed\uff09"],
          ["\u5e93\u5b58\u6765\u6e90", "\u82f1\u56fd\u672c\u5730\u6e05\u4ed3", "\u82f1\u56fd\u6e05\u4ed3 + \u4e2d\u56fd\u4e49\u4e4c\u5de5\u5382\u76f4\u4f9b"],
          ["\u5e93\u5b58\u6a21\u5f0f", "\u81ea\u6709\u4ed3\u5e93\u56e4\u8d27", "\u865a\u62df\u5e93\u5b58 + \u9884\u552e\u5236"],
          ["\u6280\u672f\u9a71\u52a8", "\u4eba\u5de5\u4e0a\u67b6", "AI \u81ea\u52a8\u5316\u4e0a\u67b6"],
        ],
        [1800, 3500, 4060]
      ),
      spacer(),

      h2("2.2 \u76c8\u5229\u6a21\u5f0f"),
      h3("\u6a21\u5f0f\u4e00\uff1a\u5e93\u5b58\u5dee\u4ef7\uff08\u6838\u5fc3\uff09"),
      para("\u4ece\u6e05\u4ed3\u5546/\u9000\u8d27\u5546\u4ee5\u96f6\u552e\u4ef7 5-15% \u91c7\u8d2d\uff0c\u4ee5 20-40% \u552e\u51fa\u3002"),
      spacer(),
      paraBold("\u793a\u4f8b\uff1a", ""),
      bullet("\u91c7\u8d2d\uff1a500 \u4ef6\u6bdb\u7ed2\u73a9\u5177\u6258\u76d8 \u00a3150\uff08\u00a30.30/\u4ef6\uff09"),
      bullet("\u552e\u51fa\uff1a\u00a3450\uff08\u00a30.90/\u4ef6\uff09"),
      bullet("\u6bdb\u5229\uff1a\u00a3300\uff08\u5229\u6da6\u7387 200%\uff09"),
      spacer(),
      paraBold("\u5178\u578b\u6e05\u4ed3\u8d27\u6e90\uff1a", ""),
      bullet("Amazon Returns\uff08\u4e9a\u9a6c\u900a\u9000\u8d27\uff09"),
      bullet("Argos / Currys \u6e05\u4ed3"),
      bullet("Costco \u9000\u8d27\u6258\u76d8"),
      bullet("\u5de5\u5382\u5c3e\u8d27/\u8fc7\u5269\u5e93\u5b58"),
      spacer(),

      h3("\u6a21\u5f0f\u4e8c\uff1a\u4f63\u91d1/\u64ae\u5408"),
      para("\u8fde\u63a5\u4e2d\u56fd\u4e49\u4e4c\u5de5\u5382\u4f9b\u5e94\u5546\u4e0e\u82f1\u56fd/\u6b27\u6d32/\u4e2d\u4e1c\u4e70\u5bb6\uff0c\u6536\u53d6 5-10% \u4f63\u91d1\u3002\u4f9b\u5e94\u5546\u76f4\u63a5\u53d1\u8d27\uff0c\u65e0\u9700\u6301\u6709\u5e93\u5b58\u3002"),
      spacer(),

      h3("\u6a21\u5f0f\u4e09\uff1a\u589e\u503c\u670d\u52a1"),
      makeTable(
        ["\u670d\u52a1", "\u6536\u8d39", "\u8bf4\u660e"],
        [
          ["\u91cd\u65b0\u5206\u6863/\u5206\u7ea7", "\u00a325-50/\u6258\u76d8", "\u5c06\u6df7\u5408\u9000\u8d27\u6309\u54c1\u8d28\u5206\u7ea7"],
          ["\u56fd\u9645\u7269\u6d41\u5b89\u6392", "5-10% \u8fd0\u8d39\u52a0\u6210", "\u5b89\u6392\u6d77\u8fd0/\u7a7a\u8fd0\u5230\u76ee\u7684\u56fd"],
          ["\u8d28\u68c0\u62a5\u544a", "\u00a315/\u6258\u76d8", "\u63d0\u4f9b\u8be6\u7ec6\u8d28\u68c0\u7167\u7247\u548c\u62a5\u544a"],
          ["\u5b9a\u5236\u91c7\u8d2d", "5% \u4f63\u91d1\u8d39", "\u6309\u4e70\u5bb6\u9700\u6c42\u5b9a\u5411\u91c7\u8d2d"],
        ],
        [2500, 2200, 4660]
      ),
      spacer(),

      h2("2.3 \u6210\u672c\u7ed3\u6784"),
      makeTable(
        ["\u9879\u76ee", "\u6708\u6210\u672c", "\u8bf4\u660e"],
        [
          ["Vercel \u6258\u7ba1", "\u00a30", "\u514d\u8d39\u5c42"],
          ["GitHub", "\u00a30", "\u514d\u8d39\u5c42"],
          ["\u57df\u540d", "~\u00a31", "\u5e74\u4ed8\u5747\u646d"],
          ["GPT-4 API", "\u00a340-80", "\u5904\u7406\u5e93\u5b58\u6570\u636e"],
          ["Formspree", "\u00a30", "\u514d\u8d39\u5c42\uff0850 \u5c01/\u6708\uff09"],
          ["Google Ads\uff08\u53ef\u9009\uff09", "\u00a3150-400", "\u6309\u9700\u6295\u653e"],
          ["WhatsApp Business", "\u00a30", "\u514d\u8d39"],
          ["\u603b\u8ba1", "\u00a341-81", "\u4e0d\u542b\u5e7f\u544a"],
        ],
        [3000, 2000, 4360]
      ),
      spacer(),
      new Paragraph({ children: [new PageBreak()] }),

      // === 3. LOW-COST OPERATIONS ===
      h1("3. \u4f4e\u6210\u672c\u8fd0\u8425\u7b56\u7565"),
      h2("3.1 \u96f6\u5e93\u5b58\u6a21\u5f0f\uff08Pre-sell\uff09"),
      paraBold("\u6838\u5fc3\u601d\u8def\uff1a", "\u5148\u5356\u540e\u4e70\uff0c\u6c38\u4e0d\u56e4\u8d27"),
      spacer(),
      numbered("\u4f9b\u5e94\u5546\u53d1\u9001\u5e93\u5b58\u6e05\u5355\uff08WhatsApp/Email\uff09"),
      numbered("AI \u81ea\u52a8\u4e0a\u67b6\u5230\u7f51\u7ad9"),
      numbered("\u4e70\u5bb6\u4e0b\u5355 + \u652f\u4ed8\u5b9a\u91d1\uff0850%\uff09"),
      numbered("\u4f60\u4ece\u4f9b\u5e94\u5546\u91c7\u8d2d\uff08\u7528\u4e70\u5bb6\u5b9a\u91d1\uff09"),
      numbered("\u4f9b\u5e94\u5546\u76f4\u63a5\u53d1\u8d27\u7ed9\u4e70\u5bb6"),
      numbered("\u6536\u5c3e\u6b3e \u2192 \u5229\u6da6\u5230\u8d26"),
      spacer(),
      paraBold("\u4f18\u52bf\uff1a", ""),
      bullet("\u96f6\u5e93\u5b58\u6210\u672c\uff08\u65e0\u9700\u4ed3\u5e93\uff09"),
      bullet("\u96f6\u5e93\u5b58\u98ce\u9669\uff08\u4e0d\u4f1a\u6ede\u9500\uff09"),
      bullet("\u73b0\u91d1\u6d41\u5065\u5eb7\uff08\u5148\u6536\u6b3e\u518d\u91c7\u8d2d\uff09"),
      bullet("\u53ef\u65e0\u9650\u6269\u5c55\u54c1\u7c7b\uff08\u4e0d\u53d7\u4ed3\u5e93\u9650\u5236\uff09"),
      spacer(),
      paraBold("\u98ce\u9669\u63a7\u5236\uff1a", ""),
      bullet("\u53ea\u4e0e\u9a8c\u8bc1\u8fc7\u7684\u4f9b\u5e94\u5546\u5408\u4f5c"),
      bullet("\u4e70\u5bb6\u5b9a\u91d1 \u2265 50%\uff08\u8986\u76d6\u91c7\u8d2d\u6210\u672c\uff09"),
      bullet("\u8bbe\u7f6e 7-14 \u5929\u4ea4\u8d27\u671f\uff08\u7ed9\u4f9b\u5e94\u5546\u7559\u65f6\u95f4\uff09"),
      bullet("\u4f9b\u5e94\u5546\u8fdd\u7ea6 \u2192 \u5168\u989d\u9000\u6b3e + \u8d54\u507f"),
      spacer(),

      h2("3.2 \u4f9b\u5e94\u5546\u76f4\u53d1\u6a21\u5f0f\uff08Drop-ship\uff09"),
      para("\u4e0e\u4e49\u4e4c\u5de5\u5382/\u82f1\u56fd\u6e05\u4ed3\u5546\u5efa\u7acb\u76f4\u53d1\u534f\u8bae\uff1a"),
      makeTable(
        ["\u89d2\u8272", "\u804c\u8d23"],
        [
          ["CheapALot", "\u4e0a\u67b6\u3001\u8425\u9500\u3001\u63a5\u5355\u3001\u5ba2\u670d"],
          ["\u4f9b\u5e94\u5546", "\u6301\u6709\u5e93\u5b58\u3001\u6253\u5305\u3001\u53d1\u8d27"],
          ["\u4e70\u5bb6", "\u4e0b\u5355\u3001\u4ed8\u6b3e\u3001\u6536\u8d27"],
        ],
        [2500, 6860]
      ),
      spacer(),
      para("\u5229\u6da6\u5206\u914d\uff1a\u91c7\u8d2d\u4ef7 + 15-30% \u52a0\u4ef7 = \u552e\u4ef7"),
      spacer(),

      h2("3.3 AI \u9a71\u52a8\u7684\u5185\u5bb9\u751f\u4ea7"),
      para("\u4f20\u7edf\u65b9\u5f0f\uff1a\u4eba\u5de5\u4e0a\u67b6 1 \u4e2a\u4ea7\u54c1 = 15 \u5206\u949f\uff08\u62cd\u7167\u3001\u5199\u63cf\u8ff0\u3001\u5206\u7c7b\u3001\u5b9a\u4ef7\u3001\u7ffb\u8bd1\uff09"),
      para("AI \u65b9\u5f0f\uff1a\u4f9b\u5e94\u5546 WhatsApp \u4e00\u6761\u6d88\u606f \u2192 AI \u81ea\u52a8\u751f\u6210\u5b8c\u6574\u4ea7\u54c1\u9875\u9762\uff0830 \u79d2\uff09"),
      spacer(),
      paraBold("\u6548\u7387\u63d0\u5347\uff1a", "30 \u500d"),
      spacer(),
      new Paragraph({ children: [new PageBreak()] }),

      // === 4. AI INVENTORY PIPELINE ===
      h1("4. AI \u5e93\u5b58\u6293\u53d6\u4e0e\u4e0a\u67b6\u7cfb\u7edf"),
      h2("4.1 \u7cfb\u7edf\u67b6\u6784"),
      para("\u6574\u4e2a\u7cfb\u7edf\u5206\u4e3a\u56db\u5c42\uff1a\u6570\u636e\u6e90 \u2192 AI \u5904\u7406 \u2192 \u53d1\u5e03\u90e8\u7f72 \u2192 \u6d41\u91cf\u53d8\u73b0\u3002\u6bcf\u4e00\u5c42\u90fd\u53ef\u4ee5\u72ec\u7acb\u8fd0\u884c\u548c\u6269\u5c55\u3002"),
      spacer(),

      h2("4.2 \u6570\u636e\u6e90"),
      h3("\u6765\u6e90\u4e00\uff1aWhatsApp/Email \u6d88\u606f"),
      para("\u4f9b\u5e94\u5546\u901a\u8fc7 WhatsApp \u53d1\u9001\u5e93\u5b58\u4fe1\u606f\uff08\u6587\u5b57+\u56fe\u7247\uff09\uff0c\u662f\u6700\u5e38\u89c1\u7684\u65b9\u5f0f\u3002"),
      para("AI \u5904\u7406\u6d41\u7a0b\uff1a"),
      numbered("\u76d1\u542c WhatsApp Business API \u6216 Email \u6536\u4ef6\u7bb1"),
      numbered("\u63d0\u53d6\u6587\u5b57\u5185\u5bb9 \u2192 GPT-4 \u89e3\u6790\u4e3a\u7ed3\u6784\u5316\u6570\u636e"),
      numbered("\u4e0b\u8f7d\u9644\u4ef6\u56fe\u7247 \u2192 \u4f18\u5316\u538b\u7f29"),
      numbered("\u8f93\u51fa JSON \u4ea7\u54c1\u6570\u636e"),
      spacer(),
      paraBold("\u793a\u4f8b\u8f93\u5165\uff1a", ""),
      code('"500pcs \u6bdb\u7ed2\u73a9\u5177, \u00a30.30/pc, \u6df7\u5408\u6b3e\u5f0f, \u5168\u65b0\u672a\u62c6, \u8d77\u8ba2100\u4ef6, \u73b0\u8d27\u4f26\u6566\u4ed3\u5e93"'),
      paraBold("AI \u8f93\u51fa\uff1a", ""),
      code('{"id":"PL-2026-001","name":"Plush Toy Mixed Lot - 500pcs","category":"toys","price":0.30,"min_order":100,"stock":500,"status":"in_stock"}'),
      spacer(),

      h3("\u6765\u6e90\u4e8c\uff1aPDF/Excel \u5e93\u5b58\u6e05\u5355"),
      para("\u82f1\u56fd\u6e05\u4ed3\u5546\u7ecf\u5e38\u53d1\u9001 PDF \u6216 Excel \u683c\u5f0f\u7684\u5e93\u5b58\u6e05\u5355\u3002\u4f7f\u7528 GPT-4 Vision \u6216\u8868\u683c\u89e3\u6790\u63d0\u53d6\u6570\u636e\u3002"),
      spacer(),

      h3("\u6765\u6e90\u4e09\uff1a1688/Alibaba API"),
      para("\u4e2d\u56fd\u4f9b\u5e94\u5546\u5e73\u53f0\u7684\u4ea7\u54c1\u6570\u636e\u53ef\u4ee5\u901a\u8fc7 API \u6216\u7f51\u9875\u722c\u866b\u83b7\u53d6\u3002"),
      spacer(),

      h3("\u6765\u6e90\u56db\uff1a\u7ade\u54c1\u7f51\u7ad9\u722c\u866b"),
      para("\u5b9a\u65f6\u722c\u53d6\u7ade\u4e89\u5bf9\u624b\u7f51\u7ad9\uff08\u5982 wholesaleclearance.co.uk\u3001joblots.co.uk\uff09\uff0c\u76d1\u63a7\u5176\u65b0\u4ea7\u54c1\u548c\u4ef7\u683c\u53d8\u52a8\u3002"),
      spacer(),

      h2("4.3 AI \u5904\u7406\u7ba1\u9053"),
      para("\u56db\u4e2a\u6b65\u9aa4\u7684\u81ea\u52a8\u5316\u5904\u7406\uff1a"),
      spacer(),
      makeTable(
        ["\u6b65\u9aa4", "AI \u5de5\u5177", "\u8f93\u5165 \u2192 \u8f93\u51fa"],
        [
          ["1. \u89e3\u6790", "GPT-4 / Claude", "\u975e\u7ed3\u6784\u5316\u6587\u672c \u2192 \u7ed3\u6784\u5316 JSON"],
          ["2. \u589e\u5f3a", "GPT-4", "\u57fa\u7840\u6570\u636e \u2192 SEO \u63cf\u8ff0+\u5206\u7c7b+\u6807\u7b7e"],
          ["3. \u7ffb\u8bd1", "GPT-4 / DeepL", "\u82f1\u6587 \u2192 ES + AR \u7248\u672c"],
          ["4. \u56fe\u7247", "Sharp (Node.js)", "\u4f9b\u5e94\u5546\u56fe\u7247 \u2192 \u538b\u7f29/\u91cd\u547d\u540d/\u5b58\u50a8"],
        ],
        [1500, 2200, 5660]
      ),
      spacer(),

      h2("4.4 \u81ea\u52a8\u4e0a\u67b6\u6d41\u7a0b"),
      numbered("AI \u8f93\u51fa JSON \u6570\u636e \u2192 data/products.json"),
      numbered("\u6784\u5efa\u811a\u672c\u8bfb\u53d6 JSON \u2192 \u751f\u6210 HTML \u4ea7\u54c1\u5361\u7247"),
      numbered("\u6ce8\u5165\u5230 products.html \u6a21\u677f"),
      numbered("\u540c\u6b65\u751f\u6210 ES/AR \u7248\u672c"),
      numbered("\u66f4\u65b0 sitemap.xml"),
      numbered("Git commit + push \u2192 Vercel \u81ea\u52a8\u90e8\u7f72\uff0860 \u79d2\u5185\u4e0a\u7ebf\uff09"),
      spacer(),
      paraBold("\u6280\u672f\u6808\uff1a", "Node.js + EJS \u6a21\u677f\u5f15\u64ce\uff0cGitHub Actions \u5b9a\u65f6\u6267\u884c\uff08\u6bcf\u65e5/\u6bcf6\u5c0f\u65f6\uff09"),
      spacer(),
      new Paragraph({ children: [new PageBreak()] }),

      // === 5. INVENTORY SYNC ===
      h1("5. \u5e93\u5b58\u4fe1\u606f\u540c\u6b65\u673a\u5236"),
      h2("5.1 \u540c\u6b65\u7b56\u7565"),
      makeTable(
        ["\u65b9\u5f0f", "\u9891\u7387", "\u89e6\u53d1\u6761\u4ef6", "\u9002\u7528\u573a\u666f"],
        [
          ["\u5b9e\u65f6\u540c\u6b65", "\u5373\u65f6", "\u4f9b\u5e94\u5546 WhatsApp/Email \u65b0\u6d88\u606f", "\u65b0\u54c1\u4e0a\u67b6"],
          ["\u5b9a\u65f6\u540c\u6b65", "\u6bcf6\u5c0f\u65f6", "GitHub Actions \u5b9a\u65f6\u4efb\u52a1", "\u5e93\u5b58\u72b6\u6001\u66f4\u65b0"],
          ["\u624b\u52a8\u540c\u6b65", "\u6309\u9700", "\u7ba1\u7406\u5458\u8fd0\u884c\u811a\u672c", "\u6279\u91cf\u66f4\u65b0/\u4fee\u6b63"],
        ],
        [1800, 1500, 3060, 3000]
      ),
      spacer(),

      h2("5.2 \u5e93\u5b58\u72b6\u6001\u7ba1\u7406"),
      para("\u6bcf\u4e2a\u4ea7\u54c1\u6709 4 \u79cd\u72b6\u6001\uff1a"),
      makeTable(
        ["\u72b6\u6001", "\u989c\u8272\u6807\u8bc6", "\u8bf4\u660e"],
        [
          ["In Stock", "\u7eff\u8272", "\u6709\u5e93\u5b58\uff0c\u53ef\u4e0b\u5355"],
          ["Limited", "\u6a59\u8272", "\u5e93\u5b58\u7d27\u5f20\uff08<20% \u5269\u4f59\uff09"],
          ["Sold Out", "\u7070\u8272", "\u5df2\u552e\u5b8c\uff0c\u4fdd\u7559\u9875\u9762\uff08SEO \u4ef7\u503c\uff09"],
          ["Discontinued", "\u5220\u9664", "\u4f9b\u5e94\u5546\u4e0d\u518d\u4f9b\u5e94\uff0c\u4ece\u7f51\u7ad9\u79fb\u9664"],
        ],
        [2200, 1500, 5660]
      ),
      spacer(),

      h2("5.3 \u53d8\u66f4\u68c0\u6d4b\u4e0e\u589e\u91cf\u66f4\u65b0"),
      numbered("\u83b7\u53d6\u6700\u65b0\u4f9b\u5e94\u5546\u6570\u636e \u2192 new_products.json"),
      numbered("\u4e0e\u73b0\u6709 products.json \u5bf9\u6bd4\uff08diff\uff09"),
      numbered("\u53ea\u66f4\u65b0\u53d8\u5316\u7684\u4ea7\u54c1\uff1a\u65b0\u589e/\u4ef7\u683c\u53d8\u52a8/\u552e\u5b8c/\u4e0b\u67b6"),
      numbered("\u751f\u6210\u53d8\u66f4\u65e5\u5fd7 \u2192 changelog.md"),
      numbered("Git commit\uff08message \u63cf\u8ff0\u53d8\u66f4\u5185\u5bb9\uff09"),
      numbered("Push \u2192 Vercel \u81ea\u52a8\u90e8\u7f72"),
      spacer(),

      h2("5.4 Git \u7248\u672c\u63a7\u5236"),
      para("\u6bcf\u6b21\u5e93\u5b58\u66f4\u65b0 = \u4e00\u6b21 Git commit\uff0c\u63d0\u4f9b\uff1a"),
      bullet("\u5b8c\u6574\u7684\u53d8\u66f4\u5386\u53f2\uff08\u53ef\u8ffd\u6eaf\u6bcf\u6b21\u66f4\u65b0\uff09"),
      bullet("\u53ef\u56de\u6eda\u5230\u4efb\u4f55\u7248\u672c"),
      bullet("\u514d\u8d39\u7684\u6570\u636e\u5907\u4efd\uff08GitHub \u4e91\u7aef\uff09"),
      bullet("\u53d8\u66f4\u65e5\u5fd7\u81ea\u52a8\u751f\u6210"),
      spacer(),
      new Paragraph({ children: [new PageBreak()] }),

      // === 6. TRAFFIC ===
      h1("6. \u6d41\u91cf\u83b7\u53d6\u7b56\u7565"),
      h2("6.1 SEO \u7b56\u7565\uff08\u6838\u5fc3\u3001\u514d\u8d39\uff09"),
      paraBold("\u7b56\u7565\uff1a", "\u6bcf\u4e2a\u4ea7\u54c1\u9875 = \u4e00\u4e2a SEO \u7740\u9646\u9875"),
      spacer(),
      makeTable(
        ["\u6307\u6807", "\u76ee\u6807"],
        [
          ["\u4ea7\u54c1\u9875\u9762\u6570", "20,000+"],
          ["\u6bcf\u9875\u76ee\u6807\u5173\u952e\u8bcd", "3-5 \u4e2a\u957f\u5c3e\u8bcd"],
          ["\u9884\u8ba1\u603b\u5173\u952e\u8bcd\u8986\u76d6", "60,000-100,000"],
          ["\u9884\u8ba1\u6708\u81ea\u7136\u6d41\u91cf", "5,000-20,000 UV"],
        ],
        [4680, 4680]
      ),
      spacer(),
      paraBold("\u5173\u952e\u8bcd\u793a\u4f8b\uff1a", ""),
      bullet('"wholesale plush toys UK"'),
      bullet('"clearance stock pallets London"'),
      bullet('"job lot electrical goods"'),
      bullet('"bulk buy beauty products wholesale"'),
      bullet('"liquidation stock for resale"'),
      spacer(),
      paraBold("SEO \u6280\u672f\u8981\u70b9\uff1a", ""),
      bullet("\u6bcf\u4e2a\u4ea7\u54c1\u9875\u6709\u72ec\u7acb\u7684 title\u3001meta description"),
      bullet("Schema.org Product \u7ed3\u6784\u5316\u6570\u636e"),
      bullet("\u9762\u5305\u5c51\u5bfc\u822a"),
      bullet("\u5185\u90e8\u94fe\u63a5\uff08\u76f8\u5173\u4ea7\u54c1\u63a8\u8350\uff09"),
      bullet("\u591a\u8bed\u8a00 hreflang \u6807\u7b7e"),
      bullet("XML Sitemap \u81ea\u52a8\u66f4\u65b0"),
      bullet("\u9875\u9762\u52a0\u8f7d\u901f\u5ea6 < 2 \u79d2\uff08Vercel CDN\uff09"),
      spacer(),

      h2("6.2 Google Shopping Ads"),
      para("\u9488\u5bf9\u9ad8\u5229\u6da6\u4ea7\u54c1\u6295\u653e Google Shopping \u5e7f\u544a\uff1a"),
      makeTable(
        ["\u4ea7\u54c1\u7c7b\u522b", "\u5efa\u8bae CPC", "\u9884\u671f ROAS"],
        [
          ["\u5bb6\u5177", "\u00a30.50-1.00", "4-6x"],
          ["\u7535\u5b50\u4ea7\u54c1", "\u00a30.30-0.80", "3-5x"],
          ["\u73a9\u5177", "\u00a30.20-0.50", "5-8x"],
          ["\u7f8e\u5bb9", "\u00a30.15-0.40", "6-10x"],
        ],
        [3120, 3120, 3120]
      ),
      spacer(),

      h2("6.3 \u793e\u4ea4\u6d41\u91cf"),
      paraBold("Facebook \u6279\u53d1\u7fa4\u7ec4\uff1a", ""),
      bullet("\u641c\u7d22 \"UK Wholesale\", \"Job Lots UK\", \"Clearance Stock UK\" \u7b49\u7fa4\u7ec4"),
      bullet("\u6bcf\u65e5\u53d1\u5e03 2-3 \u4e2a\u7279\u4ef7\u4ea7\u54c1"),
      bullet("\u9644\u5e26\u7f51\u7ad9\u94fe\u63a5"),
      spacer(),
      paraBold("WhatsApp \u5e7f\u64ad\u5217\u8868\uff1a", ""),
      bullet("\u6ce8\u518c\u4e70\u5bb6\u52a0\u5165 WhatsApp \u8054\u7cfb\u4eba"),
      bullet("\u65b0\u54c1\u4e0a\u67b6 \u2192 \u7fa4\u53d1\u901a\u77e5"),
      bullet("\u8f6c\u5316\u7387\u8fdc\u9ad8\u4e8e\u90ae\u4ef6"),
      spacer(),

      h2("6.4 \u90ae\u4ef6\u8425\u9500"),
      bullet("\u6bcf\u5468\u53d1\u9001 \"New Stock Arrivals\" \u901a\u8baf"),
      bullet("\u4f7f\u7528 Mailchimp \u514d\u8d39\u5c42\uff08500 \u8ba2\u9605\u8005\uff09"),
      bullet("\u90ae\u4ef6\u5185\u5bb9 = \u672c\u5468\u65b0\u4e0a\u67b6\u4ea7\u54c1\u7cbe\u9009"),
      spacer(),
      new Paragraph({ children: [new PageBreak()] }),

      // === 7. ROADMAP ===
      h1("7. \u5b9e\u65bd\u8def\u7ebf\u56fe"),
      h2("Phase 1\uff1a\u57fa\u7840\u8bbe\u65bd\uff08\u7b2c 1-2 \u5468\uff09"),
      makeTable(
        ["\u4efb\u52a1", "\u5de5\u5177", "\u4ea7\u51fa"],
        [
          ["\u5c06\u4ea7\u54c1\u6570\u636e\u8fc1\u79fb\u5230 JSON", "\u624b\u52a8/\u811a\u672c", "data/products.json"],
          ["\u7f16\u5199 HTML \u6784\u5efa\u811a\u672c", "Node.js + EJS", "build.js"],
          ["\u914d\u7f6e Formspree \u8868\u5355", "Formspree", "\u53ef\u7528\u7684\u8be2\u76d8\u8868\u5355"],
          ["\u8bbe\u7f6e Google Analytics", "GA4", "\u6d41\u91cf\u8ffd\u8e2a"],
          ["\u8bbe\u7f6e Search Console", "GSC", "SEO \u76d1\u63a7"],
        ],
        [3000, 2500, 3860]
      ),
      spacer(),

      h2("Phase 2\uff1aAI \u7ba1\u9053\uff08\u7b2c 3-4 \u5468\uff09"),
      makeTable(
        ["\u4efb\u52a1", "\u5de5\u5177", "\u4ea7\u51fa"],
        [
          ["\u6784\u5efa WhatsApp \u76d1\u542c", "WhatsApp Business API", "\u81ea\u52a8\u63a5\u6536\u4f9b\u5e94\u5546\u6d88\u606f"],
          ["\u6784\u5efa AI \u89e3\u6790\u5668", "GPT-4 API + Python", "\u975e\u7ed3\u6784\u5316\u6587\u672c \u2192 JSON"],
          ["\u5b9e\u73b0\u81ea\u52a8\u7ffb\u8bd1", "GPT-4 / DeepL", "ES/AR \u81ea\u52a8\u7ffb\u8bd1"],
          ["\u56fe\u7247\u5904\u7406\u7ba1\u9053", "Sharp (Node.js)", "\u81ea\u52a8\u4e0b\u8f7d/\u538b\u7f29/\u547d\u540d"],
          ["GitHub Actions \u5b9a\u65f6\u4efb\u52a1", "GitHub Actions", "\u6bcf6\u5c0f\u65f6\u81ea\u52a8\u540c\u6b65"],
        ],
        [3000, 2500, 3860]
      ),
      spacer(),

      h2("Phase 3\uff1a\u6d41\u91cf\u4e0e\u4f18\u5316\uff08\u7b2c 5-8 \u5468\uff09"),
      makeTable(
        ["\u4efb\u52a1", "\u5de5\u5177", "\u4ea7\u51fa"],
        [
          ["SEO \u4f18\u5316", "\u624b\u52a8 + \u811a\u672c", "\u957f\u5c3e\u5173\u952e\u8bcd\u8986\u76d6"],
          ["Google Shopping \u6295\u653e", "Google Ads", "\u4ed8\u8d39\u6d41\u91cf"],
          ["Facebook \u7fa4\u7ec4\u63a8\u5e7f", "\u624b\u52a8", "\u793e\u4ea4\u6d41\u91cf"],
          ["\u90ae\u4ef6\u8425\u9500\u7cfb\u7edf", "Mailchimp", "\u6bcf\u5468\u901a\u8baf"],
          ["\u6570\u636e\u5206\u6790\u4e0e\u4f18\u5316", "GA4 + GSC", "\u6301\u7eed\u6539\u8fdb"],
        ],
        [3000, 2500, 3860]
      ),
      spacer(),
      new Paragraph({ children: [new PageBreak()] }),

      // === 8. TECH STACK ===
      h1("8. \u6280\u672f\u6808\u63a8\u8350"),
      makeTable(
        ["\u5c42", "\u6280\u672f", "\u6210\u672c"],
        [
          ["\u524d\u7aef", "\u539f\u751f HTML/CSS/JS\uff08\u73b0\u6709\uff09", "\u00a30"],
          ["\u6258\u7ba1", "Vercel \u514d\u8d39\u5c42", "\u00a30"],
          ["\u4ee3\u7801\u4ed3\u5e93", "GitHub \u514d\u8d39\u5c42", "\u00a30"],
          ["\u6570\u636e\u5c42", "JSON \u6587\u4ef6\uff08Git \u8ddf\u8e2a\uff09", "\u00a30"],
          ["AI \u5904\u7406", "GPT-4 API", "\u00a340-80/\u6708"],
          ["\u81ea\u52a8\u5316", "GitHub Actions", "\u00a30\uff08\u514d\u8d39 2000 \u5206\u949f/\u6708\uff09"],
          ["\u8868\u5355", "Formspree \u514d\u8d39\u5c42", "\u00a30"],
          ["\u90ae\u4ef6", "Mailchimp \u514d\u8d39\u5c42", "\u00a30"],
          ["\u5206\u6790", "Google Analytics 4", "\u00a30"],
          ["\u57df\u540d", "Namecheap/Cloudflare", "~\u00a310/\u5e74"],
          ["\u7ffb\u8bd1", "GPT-4 / DeepL", "\u5305\u542b\u5728 AI \u6210\u672c\u4e2d"],
        ],
        [2000, 4000, 3360]
      ),
      spacer(),

      // === 9. KEY SUCCESS FACTORS ===
      h1("9. \u5173\u952e\u6210\u529f\u56e0\u7d20"),
      numbered("\u4f9b\u5e94\u5546\u5173\u7cfb\uff1a\u5efa\u7acb 5-10 \u4e2a\u7a33\u5b9a\u7684\u4f9b\u5e94\u5546\u6e20\u9053\u662f\u7b2c\u4e00\u4f18\u5148\u7ea7"),
      numbered("AI \u7ba1\u9053\u53ef\u9760\u6027\uff1a\u89e3\u6790\u51c6\u786e\u7387 > 95%\uff0c\u51fa\u9519\u65f6\u6709\u4eba\u5de5\u5ba1\u6838\u673a\u5236"),
      numbered("SEO \u6267\u884c\u529b\uff1a\u4ea7\u54c1\u9875\u9762\u7684 title/description/schema \u5fc5\u987b\u9ad8\u8d28\u91cf"),
      numbered("\u54cd\u5e94\u901f\u5ea6\uff1a\u4e70\u5bb6\u8be2\u76d8 2 \u5c0f\u65f6\u5185\u56de\u590d\uff0cWhatsApp \u4f18\u5148"),
      numbered("\u7269\u6d41\u65b9\u6848\uff1a\u6709 2-3 \u4e2a\u53ef\u9760\u7684\u7269\u6d41\u5408\u4f5c\u4f19\u4f34\uff08\u82f1\u56fd\u56fd\u5185 + \u56fd\u9645\uff09"),
      spacer(),
      spacer(),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 400 },
        children: [new TextRun({ text: "--- \u6587\u6863\u7ed3\u675f ---", size: 20, color: "aaaaaa" })] }),
      new Paragraph({ alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "CheapALot.com \u00b7 A Lot of Stock. A Lot Cheap.", size: 20, color: "aaaaaa", italics: true })] }),
    ]
  }]
});

Packer.toBuffer(doc).then(buffer => {
  const outPath = "/Users/carokk/WorkBuddy/2026-07-04-11-05-45/CheapALot-Strategy.docx";
  fs.writeFileSync(outPath, buffer);
  console.log("DONE: " + outPath);
});
