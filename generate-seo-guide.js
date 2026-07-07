const docx = require('docx');
const { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle, PageBreak, ShadingType } = docx;
const fs = require('fs');

const RED = 'e63946';
const DARK = '1d3557';
const LIGHT_BG = 'f1faee';
const BORDER = 'a8dadc';

function heading(text, level) {
  return new Paragraph({
    heading: level,
    children: [new TextRun({ text, bold: true, color: level === HeadingLevel.HEADING_1 ? RED : DARK, size: level === HeadingLevel.HEADING_1 ? 32 : 26 })]
  });
}

function para(text, opts) {
  opts = opts || {};
  return new Paragraph({
    spacing: { after: 120, before: opts.before || 0 },
    children: [new TextRun({ text, size: 22, bold: opts.bold, color: opts.color, italics: opts.italics })]
  });
}

function bullet(text) {
  return new Paragraph({
    bullet: { level: 0 },
    spacing: { after: 60 },
    children: [new TextRun({ text, size: 22 })]
  });
}

function numItem(num, text) {
  return new Paragraph({
    spacing: { after: 60 },
    children: [new TextRun({ text: num + '. ', bold: true, size: 22, color: RED }), new TextRun({ text, size: 22 })]
  });
}

function spacer() {
  return new Paragraph({ children: [] });
}

function tableCell(text, opts) {
  opts = opts || {};
  return new TableCell({
    shading: opts.bg ? { fill: opts.bg, type: ShadingType.CLEAR } : undefined,
    children: [new Paragraph({ children: [new TextRun({ text, size: 20, bold: opts.bold, color: opts.color })] })]
  });
}

const doc = new Document({
  sections: [{
    properties: {},
    children: [
      // Title
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 600, after: 200 },
        children: [new TextRun({ text: 'CheapALot.com', size: 44, bold: true, color: RED })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
        children: [new TextRun({ text: 'Google Search Console \u8bbe\u7f6e\u6307\u5357\n\u4e0e SEO \u4f18\u5316\u7b56\u7565', size: 28, color: DARK })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 600 },
        children: [new TextRun({ text: '2026\u5e747\u6708 | \u7248\u672c 1.0', size: 20, color: '999999', italics: true })]
      }),

      // Table of Contents
      heading('\u76ee\u5f55', HeadingLevel.HEADING_1),
      para('1. Google Search Console \u8bbe\u7f6e\u6b65\u9aa4'),
      para('2. \u7f51\u7ad9\u9a8c\u8bc1\u65b9\u6cd5'),
      para('3. \u63d0\u4ea4 Sitemap'),
      para('4. \u5f53\u524d SEO \u72b6\u6001\u5ba1\u8ba1'),
      para('5. SEO \u4f18\u5316\u5efa\u8bae'),
      para('6. \u5173\u952e\u8bcd\u7b56\u7565'),
      para('7. \u5185\u5bb9\u8425\u9500\u7b56\u7565'),
      para('8. \u6280\u672f SEO \u6e05\u5355'),

      new Paragraph({ children: [new PageBreak()] }),

      // Chapter 1
      heading('1. Google Search Console \u8bbe\u7f6e\u6b65\u9aa4', HeadingLevel.HEADING_1),
      spacer(),
      para('\u7b2c\u4e00\u6b65\uff1a\u6253\u5f00 Google Search Console', { bold: true }),
      numItem('1', '\u8bbf\u95ee https://search.google.com/search-console'),
      numItem('2', '\u4f7f\u7528\u4f60\u7684 Google \u8d26\u53f7\u767b\u5f55\uff08\u5efa\u8bae\u4f7f\u7528 dniyahair@gmail.com\uff09'),
      numItem('3', '\u70b9\u51fb\u201c\u6dfb\u52a0\u8d44\u6e90\u201d\uff08Add Property\uff09'),
      spacer(),
      para('\u7b2c\u4e8c\u6b65\uff1a\u9009\u62e9\u9a8c\u8bc1\u65b9\u5f0f', { bold: true }),
      para('\u6709\u4e24\u79cd\u9009\u62e9\uff1a'),
      bullet('\u5b57\u6bb5\u524d\u7f00\uff08https://cheapalot.com\uff09\u2014\u2014 \u63a8\u8350\uff01\u9002\u7528\u4e8e\u6574\u4e2a\u57df\u540d'),
      bullet('URL \u524d\u7f00\uff08https://cheapalot.com/\uff09\u2014\u2014 \u53ea\u9002\u7528\u4e8e\u5355\u4e2a\u9875\u9762'),
      spacer(),
      para('\u5efa\u8bae\u9009\u62e9\u201c\u5b57\u6bb5\u524d\u7f00\u201d\u65b9\u5f0f\uff0c\u8fd9\u6837\u53ef\u4ee5\u8986\u76d6\u6574\u4e2a\u7f51\u7ad9\u5305\u62ec\u5b50\u76ee\u5f55\uff08/es/ \u548c /ar/\uff09\u3002', { italics: true }),

      new Paragraph({ children: [new PageBreak()] }),

      // Chapter 2
      heading('2. \u7f51\u7ad9\u9a8c\u8bc1\u65b9\u6cd5', HeadingLevel.HEADING_1),
      spacer(),
      para('\u65b9\u6cd5\u4e00\uff1aHTML \u6587\u4ef6\u9a8c\u8bc1\uff08\u6700\u7b80\u5355\uff09', { bold: true, color: RED }),
      numItem('1', 'Google \u4f1a\u63d0\u4f9b\u4e00\u4e2a\u9a8c\u8bc1\u6587\u4ef6\uff0c\u540d\u79f0\u7c7b\u4f3c google1234567890abcdef.html'),
      numItem('2', '\u4e0b\u8f7d\u8be5\u6587\u4ef6'),
      numItem('3', '\u5c06\u6587\u4ef6\u653e\u5165\u9879\u76ee\u6839\u76ee\u5f55\uff08\u4e0e index.html \u540c\u7ea7\uff09'),
      numItem('4', 'Git \u63d0\u4ea4\u5e76\u63a8\u9001\u5230 GitHub\uff0cVercel \u81ea\u52a8\u90e8\u7f72'),
      numItem('5', '\u70b9\u51fb Google Search Console \u4e2d\u7684\u201c\u9a8c\u8bc1\u201d\u6309\u94ae'),
      spacer(),
      para('\u65b9\u6cd5\u4e8c\uff1aHTML Meta \u6807\u7b7e\u9a8c\u8bc1', { bold: true, color: RED }),
      numItem('1', 'Google \u4f1a\u63d0\u4f9b\u4e00\u4e2a meta \u6807\u7b7e\u4ee3\u7801'),
      numItem('2', '\u5c06\u4ee3\u7801\u6dfb\u52a0\u5230 index.html \u7684 <head> \u90e8\u5206'),
      numItem('3', '\u5982: <meta name="google-site-verification" content="YOUR_CODE" />'),
      numItem('4', '\u63d0\u4ea4\u5e76\u63a8\u9001\u5230 GitHub'),
      spacer(),
      para('\u65b9\u6cd5\u4e09\uff1aDNS TXT \u8bb0\u5f55\u9a8c\u8bc1\uff08\u9002\u7528\u4e8e\u57df\u540d\u524d\u7f00\u65b9\u5f0f\uff09', { bold: true, color: RED }),
      numItem('1', '\u5728\u4f60\u7684\u57df\u540d\u670d\u52a1\u5546\uff08\u5982 Cloudflare/Namecheap\uff09\u7ba1\u7406\u9762\u677f\u4e2d\u6dfb\u52a0 TXT \u8bb0\u5f55'),
      numItem('2', 'Google \u4f1a\u63d0\u4f9b\u5177\u4f53\u7684 TXT \u8bb0\u5f55\u503c'),
      numItem('3', '\u6dfb\u52a0\u540e\u70b9\u51fb\u201c\u9a8c\u8bc1\u201d\uff08DNS \u4f20\u64ad\u53ef\u80fd\u9700\u8981 24 \u5c0f\u65f6\uff09'),
      spacer(),
      para('\u2705 \u63a8\u8350\uff1a\u4f7f\u7528\u65b9\u6cd5\u4e00\uff08HTML \u6587\u4ef6\uff09\uff0c\u6700\u7b80\u5355\u5feb\u6377\u3002', { bold: true, color: RED }),

      new Paragraph({ children: [new PageBreak()] }),

      // Chapter 3
      heading('3. \u63d0\u4ea4 Sitemap', HeadingLevel.HEADING_1),
      spacer(),
      para('\u9a8c\u8bc1\u6210\u529f\u540e\uff0c\u7acb\u5373\u63d0\u4ea4 Sitemap\uff1a', { bold: true }),
      numItem('1', '\u5728 Google Search Console \u5de6\u4fa7\u83dc\u5355\u70b9\u51fb\u201cSitemap\u201d'),
      numItem('2', '\u5728\u8f93\u5165\u6846\u4e2d\u8f93\u5165\uff1asitemap.xml'),
      numItem('3', '\u70b9\u51fb\u201c\u63d0\u4ea4\u201d'),
      numItem('4', 'Google \u4f1a\u5728 24-48 \u5c0f\u65f6\u5185\u62d3\u53d6\u5e76\u7d22\u5f15\u7f51\u7ad9\u9875\u9762'),
      spacer(),
      para('\u5f53\u524d Sitemap \u5305\u542b\u7684\u9875\u9762\uff1a', { bold: true }),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({ children: [
            tableCell('URL', { bold: true, bg: DARK, color: 'ffffff' }),
            tableCell('\u66f4\u65b0\u9891\u7387', { bold: true, bg: DARK, color: 'ffffff' }),
            tableCell('\u4f18\u5148\u7ea7', { bold: true, bg: DARK, color: 'ffffff' })
          ]}),
          new TableRow({ children: [tableCell('cheapalot.com/'), tableCell('\u6bcf\u65e5'), tableCell('1.0')] }),
          new TableRow({ children: [tableCell('cheapalot.com/products.html'), tableCell('\u6bcf\u65e5'), tableCell('0.9')] }),
          new TableRow({ children: [tableCell('cheapalot.com/about.html'), tableCell('\u6bcf\u6708'), tableCell('0.7')] }),
          new TableRow({ children: [tableCell('cheapalot.com/sell.html'), tableCell('\u6bcf\u6708'), tableCell('0.8')] }),
          new TableRow({ children: [tableCell('cheapalot.com/contact.html'), tableCell('\u6bcf\u6708'), tableCell('0.7')] }),
          new TableRow({ children: [tableCell('cheapalot.com/terms.html'), tableCell('\u6bcf\u6708'), tableCell('0.5')] }),
          new TableRow({ children: [tableCell('cheapalot.com/es/'), tableCell('\u6bcf\u65e5'), tableCell('0.9')] }),
          new TableRow({ children: [tableCell('cheapalot.com/ar/'), tableCell('\u6bcf\u65e5'), tableCell('0.9')] })
        ]
      }),
      spacer(),
      para('\u26a0\ufe0f \u6ce8\u610f\uff1a\u5f53\u524d Sitemap \u672a\u5305\u542b ES/AR \u7248\u672c\u7684 products/about/sell/contact/terms \u9875\u9762\u3002\u5efa\u8bae\u8865\u5145\u3002', { color: RED }),

      new Paragraph({ children: [new PageBreak()] }),

      // Chapter 4
      heading('4. \u5f53\u524d SEO \u72b6\u6001\u5ba1\u8ba1', HeadingLevel.HEADING_1),
      spacer(),
      para('\u4ee5\u4e0b\u662f\u7ecf\u8fc7\u5ba1\u8ba1\u7684\u7f51\u7ad9 SEO \u73b0\u72b6\uff1a', { bold: true }),
      spacer(),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({ children: [
            tableCell('SEO \u9879\u76ee', { bold: true, bg: DARK, color: 'ffffff' }),
            tableCell('\u72b6\u6001', { bold: true, bg: DARK, color: 'ffffff' }),
            tableCell('\u8bf4\u660e', { bold: true, bg: DARK, color: 'ffffff' })
          ]}),
          new TableRow({ children: [tableCell('Meta Description', { bold: true }), tableCell('\u2705 \u5b8c\u6574', { color: '2a9d8f' }), tableCell('175\u5b57\u7b26\uff0c\u542b\u5173\u952e\u8bcd')] }),
          new TableRow({ children: [tableCell('Meta Keywords', { bold: true }), tableCell('\u2705 \u5b8c\u6574', { color: '2a9d8f' }), tableCell('50+\u5173\u952e\u8bcd')] }),
          new TableRow({ children: [tableCell('Canonical URL', { bold: true }), tableCell('\u2705 \u5b8c\u6574', { color: '2a9d8f' }), tableCell('\u6bcf\u9875\u9762\u5df2\u8bbe\u7f6e')] }),
          new TableRow({ children: [tableCell('Hreflang \u6807\u7b7e', { bold: true }), tableCell('\u2705 \u5b8c\u6574', { color: '2a9d8f' }), tableCell('EN/ES/AR/x-default')] }),
          new TableRow({ children: [tableCell('Open Graph', { bold: true }), tableCell('\u2705 \u5b8c\u6574', { color: '2a9d8f' }), tableCell('og:type/title/desc/url')] }),
          new TableRow({ children: [tableCell('Structured Data', { bold: true }), tableCell('\u2705 \u5b8c\u6574', { color: '2a9d8f' }), tableCell('Organization + WebSite schema')] }),
          new TableRow({ children: [tableCell('Robots.txt', { bold: true }), tableCell('\u2705 \u5b8c\u6574', { color: '2a9d8f' }), tableCell('\u5141\u8bb8\u5168\u90e8\u722c\u866b')] }),
          new TableRow({ children: [tableCell('Sitemap.xml', { bold: true }), tableCell('\u2705 \u5b58\u5728', { color: '2a9d8f' }), tableCell('\u9700\u8865\u5145ES/AR\u5b50\u9875\u9762')] }),
          new TableRow({ children: [tableCell('Mobile Friendly', { bold: true }), tableCell('\u2705 \u5b8c\u6574', { color: '2a9d8f' }), tableCell('viewport meta \u5df2\u8bbe\u7f6e')] }),
          new TableRow({ children: [tableCell('SSL/HTTPS', { bold: true }), tableCell('\u2705 \u5b8c\u6574', { color: '2a9d8f' }), tableCell('Vercel \u81ea\u52a8\u63d0\u4f9b')] }),
          new TableRow({ children: [tableCell('Page Speed', { bold: true }), tableCell('\u2705 \u8f83\u5feb', { color: '2a9d8f' }), tableCell('\u9759\u6001\u7ad9\uff0cCDN\u52a0\u901f')] }),
          new TableRow({ children: [tableCell('Twitter Card', { bold: true }), tableCell('\u26a0\ufe0f \u7f3a\u5931', { color: RED }), tableCell('\u9700\u6dfb\u52a0 twitter:card meta')] }),
          new TableRow({ children: [tableCell('Google Search Console', { bold: true }), tableCell('\u274c \u672a\u8bbe\u7f6e', { color: RED }), tableCell('\u9700\u9a8c\u8bc1\u5e76\u63d0\u4ea4sitemap')] }),
          new TableRow({ children: [tableCell('Bing Webmaster', { bold: true }), tableCell('\u274c \u672a\u8bbe\u7f6e', { color: RED }), tableCell('\u53ef\u9009\uff0c\u8865\u5145\u6d41\u91cf')] })
        ]
      }),

      new Paragraph({ children: [new PageBreak()] }),

      // Chapter 5
      heading('5. SEO \u4f18\u5316\u5efa\u8bae', HeadingLevel.HEADING_1),
      spacer(),
      para('5.1 \u7d27\u6025\u4f18\u5316\uff08\u672c\u5468\u5b8c\u6210\uff09', { bold: true, color: RED }),
      numItem('1', '\u8bbe\u7f6e Google Search Console\uff08\u6309\u4e0a\u8ff0\u6b65\u9aa4\uff09'),
      numItem('2', '\u63d0\u4ea4 sitemap.xml \u5230 Google Search Console'),
      numItem('3', '\u8865\u5145 sitemap.xml \u4e2d\u7f3a\u5931\u7684 ES/AR \u5b50\u9875\u9762 URL'),
      numItem('4', '\u6dfb\u52a0 Twitter Card meta \u6807\u7b7e\u5230\u6240\u6709 HTML \u9875\u9762'),
      numItem('5', '\u6dfb\u52a0 manifest.json \u94fe\u63a5\u5230 HTML head'),
      spacer(),
      para('5.2 \u91cd\u8981\u4f18\u5316\uff08\u672c\u6708\u5b8c\u6210\uff09', { bold: true, color: DARK }),
      numItem('1', '\u4e3a\u6bcf\u4e2a\u4ea7\u54c1\u521b\u5efa\u72ec\u7acb\u9875\u9762\uff08\u52a9\u63d0\u5347\u957f\u5c3eSEO\uff09'),
      numItem('2', '\u6dfb\u52a0\u535a\u5ba2/\u8d44\u8baf\u9875\u9762\uff08\u5982Yiwu\u91c7\u8d2d\u6307\u5357\u3001\u8fdb\u53e3\u6559\u7a0b\uff09'),
      numItem('3', '\u8bbe\u7f6e Bing Webmaster Tools\uff08\u514d\u8d39\u8865\u5145\u6d41\u91cf\uff09'),
      numItem('4', '\u6dfb\u52a0 breadcrumb \u9762\u5305\u5c51\u5bfc\u822a\u53ca\u7ed3\u6784\u5316\u6570\u636e'),
      spacer(),
      para('5.3 \u957f\u671f\u4f18\u5316\uff083-6\u4e2a\u6708\uff09', { bold: true, color: DARK }),
      numItem('1', '\u521b\u5efa\u4ea7\u54c1\u5206\u7c7b\u9875\u9762\uff08\u5982 /category/household.html\uff09'),
      numItem('2', '\u6dfb\u52a0 FAQ \u7ed3\u6784\u5316\u6570\u636e\uff08\u83b7\u53d6\u7cbe\u9009\u7247\u6bb5\uff09'),
      numItem('3', '\u5b9e\u73b0 Programmatic SEO\uff0820,000+\u9875\u9762\uff09'),
      numItem('4', '\u6dfb\u52a0\u4ea7\u54c1\u8bc4\u8bba/\u8bc4\u5206\u7ed3\u6784\u5316\u6570\u636e'),

      new Paragraph({ children: [new PageBreak()] }),

      // Chapter 6
      heading('6. \u5173\u952e\u8bcd\u7b56\u7565', HeadingLevel.HEADING_1),
      spacer(),
      para('\u6838\u5fc3\u5173\u952e\u8bcd\uff08\u9ad8\u641c\u7d22\u91cf\u3001\u9ad8\u610f\u56fe\uff09\uff1a', { bold: true }),
      bullet('wholesale clearance stock UK'),
      bullet('B2B liquidation pallets'),
      bullet('Yiwu sourcing agent'),
      bullet('China factory direct wholesale'),
      bullet('bulk buy clearance stock'),
      bullet('surplus stock buyers'),
      bullet('customer returns wholesale'),
      bullet('import from China agent'),
      bullet('end of line stock wholesale'),
      bullet('pallet deals wholesale'),
      spacer(),
      para('\u957f\u5c3e\u5173\u952e\u8bcd\uff08\u4f4e\u7ade\u4e89\u3001\u9ad8\u8f6c\u5316\uff09\uff1a', { bold: true }),
      bullet('wholesale refuse sacks bulk buy 2000 pcs'),
      bullet('mixed confectionery pallet 200kg wholesale'),
      bullet('Yiwu market procurement agent for UK'),
      bullet('clearance stock from 1p per unit bulk'),
      bullet('customer returns pallets London UK'),
      bullet('wholesale stationery pens 1000 pcs minimum'),
      bullet('surplus inventory buyer free valuation'),
      bullet('China export agent door to door delivery'),
      spacer(),
      para('\u591a\u8bed\u8a00\u5173\u952e\u8bcd\uff1a', { bold: true }),
      bullet('\u897f\u73ed\u7259\u8bed: stock mayorista barato, liquidacion B2B, agente de compras China'),
      bullet('\u963f\u62c9\u4f2f\u8bed: \u062a\u062c\u0627\u0631\u0629 \u062c\u0645\u0644\u0629, \u062a\u0635\u0641\u064a\u0629 \u0627\u0644\u0633\u0644\u0639, \u0648\u0643\u064a\u0644 \u0645\u0634\u062a\u0631\u064a\u0627\u062a \u0627\u0644\u0635\u064a\u0646'),

      new Paragraph({ children: [new PageBreak()] }),

      // Chapter 7
      heading('7. \u5185\u5bb9\u8425\u9500\u7b56\u7565', HeadingLevel.HEADING_1),
      spacer(),
      para('7.1 \u535a\u5ba2/\u8d44\u8baf\u9875\u9762', { bold: true, color: RED }),
      para('\u521b\u5efa\u4ee5\u4e0b\u5185\u5bb9\u9875\u9762\uff0c\u6bcf\u7bc7\u7ea6 1500-2000 \u5b57\uff1a'),
      bullet('Yiwu \u91c7\u8d2d\u6307\u5357\uff1a\u5982\u4f55\u4ece\u4e49\u4e4c\u8fdb\u8d27'),
      bullet('\u6e05\u5e93\u5e93\u5b58\u9009\u8d2d\u6280\u5de7\uff1a\u5982\u4f55\u6311\u9009\u4f18\u8d28\u6e05\u5e93\u8d27'),
      bullet('\u82f1\u56fd\u8fdb\u53e3\u6d41\u7a0b\u8be6\u89e3\uff1a\u5173\u7a0e\u3001\u7a0e\u53f7\u3001\u7269\u6d41'),
      bullet('\u6df7\u88c5\u6258\u76d8\u8d2d\u4e70\u6307\u5357\uff1a\u4ec0\u4e48\u662f\u5ba2\u6237\u9000\u8d27\u3001B\u7ea7\u8d27'),
      bullet('\u4ece 1p \u5230 1\u82f1\u9551\uff1a\u6279\u53d1\u5b9a\u4ef7\u7b56\u7565\u89e3\u6790'),
      spacer(),
      para('7.2 \u793e\u4ea4\u5a92\u4f53\u5f15\u6d41', { bold: true, color: RED }),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({ children: [
            tableCell('\u5e73\u53f0', { bold: true, bg: DARK, color: 'ffffff' }),
            tableCell('\u7b56\u7565', { bold: true, bg: DARK, color: 'ffffff' }),
            tableCell('\u9891\u7387', { bold: true, bg: DARK, color: 'ffffff' })
          ]}),
          new TableRow({ children: [tableCell('Facebook'), tableCell('\u6279\u53d1\u7fa4\u7ec4 + \u9875\u9762\u5e16\u5b50'), tableCell('\u6bcf\u65e5')] }),
          new TableRow({ children: [tableCell('WhatsApp'), tableCell('\u5e7f\u64ad\u5217\u8868 + \u72b6\u6001'), tableCell('\u6bcf\u65e5')] }),
          new TableRow({ children: [tableCell('LinkedIn'), tableCell('\u4e13\u4e1a\u6587\u7ae0 + \u4ea7\u54c1\u5e16'), tableCell('\u6bcf\u5468 2-3 \u7bc7')] }),
          new TableRow({ children: [tableCell('YouTube'), tableCell('\u4ed3\u5e93\u5b9e\u62cd\u89c6\u9891'), tableCell('\u6bcf\u5468 1 \u4e2a')] }),
          new TableRow({ children: [tableCell('TikTok'), tableCell('\u4ea7\u54c1\u5f00\u7bb1/\u6d4b\u8bd5'), tableCell('\u6bcf\u5468 2-3 \u4e2a')] })
        ]
      }),

      new Paragraph({ children: [new PageBreak()] }),

      // Chapter 8
      heading('8. \u6280\u672f SEO \u6e05\u5355', HeadingLevel.HEADING_1),
      spacer(),
      para('\u4ee5\u4e0b\u662f\u5b8c\u6574\u7684\u6280\u672f SEO \u68c0\u67e5\u6e05\u5355\uff1a', { bold: true }),
      spacer(),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({ children: [
            tableCell('\u68c0\u67e5\u9879', { bold: true, bg: DARK, color: 'ffffff' }),
            tableCell('\u72b6\u6001', { bold: true, bg: DARK, color: 'ffffff' }),
            tableCell('\u5907\u6ce8', { bold: true, bg: DARK, color: 'ffffff' })
          ]}),
          new TableRow({ children: [tableCell('Title \u6807\u7b7e\u4f18\u5316'), tableCell('\u2705'), tableCell('< 60\u5b57\u7b26\uff0c\u542b\u5173\u952e\u8bcd')] }),
          new TableRow({ children: [tableCell('Meta Description'), tableCell('\u2705'), tableCell('< 160\u5b57\u7b26')] }),
          new TableRow({ children: [tableCell('H1 \u6807\u7b7e'), tableCell('\u2705'), tableCell('\u6bcf\u9875 1 \u4e2a')] }),
          new TableRow({ children: [tableCell('H2-H3 \u7ed3\u6784'), tableCell('\u2705'), tableCell('\u5c42\u6b21\u6e05\u6670')] }),
          new TableRow({ children: [tableCell('\u56fe\u7247 alt \u5c5e\u6027'), tableCell('\u26a0\ufe0f'), tableCell('\u90e8\u5206\u7f3a\u5931\uff0c\u9700\u8865\u5145')] }),
          new TableRow({ children: [tableCell('\u5185\u90e8\u94fe\u63a5\u7ed3\u6784'), tableCell('\u2705'), tableCell('\u5bfc\u822a\u83dc\u5355\u5b8c\u6574')] }),
          new TableRow({ children: [tableCell('URL \u7ed3\u6784'), tableCell('\u2705'), tableCell('\u7b80\u6d01\u3001\u8bed\u4e49\u5316')] }),
          new TableRow({ children: [tableCell('Canonical \u6807\u7b7e'), tableCell('\u2705'), tableCell('\u6bcf\u9875\u5df2\u8bbe\u7f6e')] }),
          new TableRow({ children: [tableCell('Hreflang \u6807\u7b7e'), tableCell('\u2705'), tableCell('EN/ES/AR')] }),
          new TableRow({ children: [tableCell('Structured Data'), tableCell('\u2705'), tableCell('Organization + WebSite')] }),
          new TableRow({ children: [tableCell('Open Graph'), tableCell('\u2705'), tableCell('\u793e\u4ea4\u5206\u4eab')] }),
          new TableRow({ children: [tableCell('Twitter Card'), tableCell('\u274c'), tableCell('\u9700\u6dfb\u52a0')] }),
          new TableRow({ children: [tableCell('Sitemap.xml'), tableCell('\u2705'), tableCell('\u9700\u8865\u5145ES/AR\u5b50\u9875')] }),
          new TableRow({ children: [tableCell('Robots.txt'), tableCell('\u2705'), tableCell('\u5141\u8bb8\u5168\u90e8\u722c\u866b')] }),
          new TableRow({ children: [tableCell('HTTPS'), tableCell('\u2705'), tableCell('Vercel\u63d0\u4f9b')] }),
          new TableRow({ children: [tableCell('Core Web Vitals'), tableCell('\u2705'), tableCell('\u9759\u6001\u7ad9\u8868\u73b0\u4f18')] }),
          new TableRow({ children: [tableCell('Mobile Friendly'), tableCell('\u2705'), tableCell('viewport \u5df2\u8bbe\u7f6e')] }),
          new TableRow({ children: [tableCell('PWA Manifest'), tableCell('\u26a0\ufe0f'), tableCell('manifest.json \u5df2\u521b\u5efa\uff0c\u9700\u94fe\u63a5')] }),
          new TableRow({ children: [tableCell('Google Search Console'), tableCell('\u274c'), tableCell('\u5f85\u9a8c\u8bc1')] }),
          new TableRow({ children: [tableCell('Bing Webmaster'), tableCell('\u274c'), tableCell('\u5efa\u8bae\u8bbe\u7f6e')] })
        ]
      }),
      spacer(),
      spacer(),
      para('\u5feb\u901f\u884c\u52a8\u6e05\u5355\uff1a', { bold: true, color: RED }),
      spacer(),
      numItem('1', '\u8bbf\u95ee https://search.google.com/search-console \u5e76\u767b\u5f55'),
      numItem('2', '\u6dfb\u52a0 cheapalot.com \u4e3a\u8d44\u6e90'),
      numItem('3', '\u4e0b\u8f7d Google \u63d0\u4f9b\u7684\u9a8c\u8bc1 HTML \u6587\u4ef6'),
      numItem('4', '\u5c06\u6587\u4ef6\u653e\u5165\u9879\u76ee\u6839\u76ee\u5f55'),
      numItem('5', '\u6267\u884c: git add . && git commit -m "verify: google search console" && git push origin main'),
      numItem('6', '\u7b49\u5f85 Vercel \u90e8\u7f72\u5b8c\u6210\uff081-2\u5206\u949f\uff09'),
      numItem('7', '\u5728 Google Search Console \u70b9\u51fb\u201c\u9a8c\u8bc1\u201d'),
      numItem('8', '\u63d0\u4ea4 sitemap.xml'),
      numItem('9', '\u5b8c\u6210\uff01\u7b49\u5f85 Google \u7d22\u5f15\u4f60\u7684\u7f51\u7ad9\uff0824-48\u5c0f\u65f6\uff09'),
      spacer(),
      spacer(),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: '\u2014\u2014 \u6587\u6863\u7ed3\u675f \u2014\u2014', size: 20, color: '999999', italics: true })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: 'CheapALot.com SEO Guide v1.0 | 2026-07', size: 18, color: 'cccccc' })]
      })
    ]
  }]
});

Packer.toBuffer(doc).then(function(buffer) {
  fs.writeFileSync('/Users/carokk/WorkBuddy/2026-07-04-11-05-45/CheapALot-SEO-Guide.docx', buffer);
  console.log('Generated: CheapALot-SEO-Guide.docx');
}).catch(function(err) {
  console.error('Error:', err.message);
  process.exit(1);
});
