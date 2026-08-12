#!/usr/bin/env node
/**
 * generate-faq.js
 * Builds faq.html (+ es/faq.html, ar/faq.html) from a single EN/ES/AR Q&A source.
 * Output pages are fully crawlable (visible Q&A text) with FAQPage + BreadcrumbList
 * structured data — strong GEO signal for AI search engines.
 */

'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const SITE = 'https://www.cheapalot.com';

// ---- Q&A source (optimized for "how to source from China" type queries) ----
const QA = [
  {
    q: { en: 'What is CheapALot?', es: '¿Qué es CheapALot?', ar: 'ما هو CheapALot؟' },
    a: {
      en: 'CheapALot is a Yiwu, China-based B2B wholesale and sourcing company with 20+ years of export experience. We supply wholesale clearance stock and overstock from £0.10 per unit, act as your Yiwu purchasing agent, help businesses sell excess inventory, and handle export logistics to 30+ countries.',
      es: 'CheapALot es una empresa B2B de ventas al por mayor y abastecimiento con base en Yiwu, China, con más de 20 años de experiencia en exportación. Suministramos stock de liquidación y excedentes desde £0.10 por unidad, actuamos como su agente de compras en Yiwu, ayudamos a las empresas a vender su inventario excedente y gestionamos la logística de exportación a más de 30 países.',
      ar: 'CheapALot هي شركة جملة واستيراد B2B مقرها مدينة ييوو في الصين، بخبرة تصديرية تزيد عن 20 عاماً. نوفر بضائع التخفيضات والفائض من 0.10 جنيه إسترليني للوحدة، ونعمل كوكيل مشتريات لك في ييوو، ونساعد الشركات على بيع مخزونها الفائض، ونتولى الشحن والتصدير إلى أكثر من 30 دولة.'
    }
  },
  {
    q: { en: 'What does a Yiwu sourcing agent do?', es: '¿Qué hace un agente de abastecimiento en Yiwu?', ar: 'ماذا يفعل وكيل الشراء في ييوو؟' },
    a: {
      en: 'A Yiwu sourcing agent acts as your local buyer in China. CheapALot finds suppliers inside the world\'s largest wholesale market, verifies factories, negotiates prices, arranges samples, performs pre-shipment quality control, and follows up production — so you can source any product without travelling to China.',
      es: 'Un agente de abastecimiento en Yiwu actúa como su comprador local en China. CheapALot encuentra proveedores en el mercado mayorista más grande del mundo, verifica fábricas, negocia precios, gestiona muestras, realiza control de calidad previo al envío y supervisa la producción, para que pueda abastecer cualquier producto sin viajar a China.',
      ar: 'وكيل الشراء في ييوو يعمل كمشتري محلي لك في الصين. تتولى CheapALot إيجاد الموردين داخل أكبر سوق جملة في العالم، والتحقق من المصانع، والتفاوض على الأسعار، وتجهيز العينات، وإجراء فحص الجودة قبل الشحن، ومتابعة الإنتاج — حتى تستورد أي منتج دون السفر إلى الصين.'
    }
  },
  {
    q: { en: 'Are you a factory or a trading company?', es: '¿Son una fábrica o una empresa comercial?', ar: 'هل أنتم مصنع أم شركة تجارية؟' },
    a: {
      en: 'CheapALot is a Yiwu-based trading and sourcing company, not a single factory. This is an advantage: we are neutral and source from thousands of verified factories across China to get you the best price and the right product, rather than pushing one factory\'s catalog.',
      es: 'CheapALot es una empresa comercial y de abastecimiento con base en Yiwu, no una sola fábrica. Esto es una ventaja: somos neutrales y abastecemos de miles de fábricas verificadas en China para obtener el mejor precio y el producto adecuado, en lugar de promover el catálogo de una sola fábrica.',
      ar: 'CheapALot هي شركة تجارة واستيراد مقرها ييوو، وليست مصنعاً واحداً. وهذا ميزة: نحن محايدون ونشتري من آلاف المصانع المعتمدة في الصين لنحصل لك على أفضل سعر والمنتج المناسب، بدلاً من الترويج لكتالوج مصنع واحد.'
    }
  },
  {
    q: { en: 'What is the minimum order quantity (MOQ)?', es: '¿Cuál es el pedido mínimo (MOQ)?', ar: 'ما هي الكمية الدنيا للطلب (MOQ)؟' },
    a: {
      en: 'For clearance stock, the minimum order is £250 with no minimum quantity per product line — you can mix and match across categories. For sourcing-agent orders, the MOQ depends on the factory; we always confirm the exact MOQ in your quote before you commit.',
      es: 'Para el stock de liquidación, el pedido mínimo es de £250 sin cantidad mínima por línea de producto; puede combinar categorías. Para pedidos de agente de abastecimiento, el MOQ depende de la fábrica; siempre confirmamos el MOQ exacto en su cotización antes de comprometerse.',
      ar: 'بالنسبة لبضائع التخفيضات، الحد الأدنى للطلب 250 جنيهاً إسترلينياً دون حد أدنى لكل صنف — يمكنك الخلط بين الفئات. أما طلبات وكيل الشراء، فالحد الأدنى يعتمد على المصنع؛ نؤكد دائماً الرقم الدقيق في عرض السعر قبل الالتزام.'
    }
  },
  {
    q: { en: 'Do you sell to the public, or trade only?', es: '¿Venden al público o solo a empresas?', ar: 'هل تبيعون للأفراد أم للشركات فقط؟' },
    a: {
      en: 'CheapALot is a trade-to-trade (B2B) only platform. You need a registered business to purchase. Registration is free and instant, and gives you access to wholesale pricing and the sourcing-agent service.',
      es: 'CheapALot es una plataforma solo B2B (empresa a empresa). Necesita un negocio registrado para comprar. El registro es gratuito e instantáneo, y le da acceso a precios al por mayor y al servicio de agente de abastecimiento.',
      ar: 'CheapALot منصة خاصة بالشركات فقط (B2B). يلزم وجود سجل تجاري للشراء. التسجيل مجاني وفوري، ويمنحك أسعار الجملة وخدمة وكيل الشراء.'
    }
  },
  {
    q: { en: 'What is clearance stock, overstock and tail goods?', es: '¿Qué son el stock de liquidación, el excedente y los bienes residuales?', ar: 'ما هي بضائع التخفيضات والفائض والبقايا؟' },
    a: {
      en: 'These are surplus goods sold far below retail: clearance stock (end-of-line and discontinued items), overstock (excess inventory a factory needs to offload), and tail goods (customer returns, mixed lots and salvage). CheapALot buys these in bulk and resells from as little as £0.10 per unit — ideal for discount stores and resellers.',
      es: 'Son bienes excedentes vendidos muy por debajo del precio minorista: stock de liquidación (fin de línea y artículos descontinuados), excedente (inventario excesivo que una fábrica necesita liquidar) y bienes residuales (devoluciones, lotes mezclados y salvamento). CheapALot los compra al por mayor y los revende desde £0.10 por unidad, ideales para tiendas de descuento y revendedores.',
      ar: 'هي بضائع فائضة تُباع بأقل بكثير من سعر التجزئة: تخفيضات (خطوط منتهية وأصناف متوقفة)، وفائض (مخزون زائد تحتاج المصانع لتصريفه)، وبقايا (مرتجعات و lotes مختلطة وإنقاذ). تشتريها CheapALot بالجملة وتعيد بيعها من 0.10 جنيه للوحدة — مثالية لمتاجر التخفيضات والموزعين.'
    }
  },
  {
    q: { en: 'How do I place an order with CheapALot?', es: '¿Cómo realizo un pedido con CheapALot?', ar: 'كيف أضع طلباً مع CheapALot؟' },
    a: {
      en: 'The process is simple: (1) send an inquiry via WhatsApp or the contact form with the products you want; (2) receive a quote with price, MOQ and lead time; (3) pay a deposit to confirm; (4) we handle QC and production where needed; (5) pay the balance before shipment; (6) we dispatch and send tracking. For stock items dispatch is within 24–72 hours.',
      es: 'El proceso es simple: (1) envíe una consulta por WhatsApp o el formulario de contacto con los productos que desea; (2) reciba una cotización con precio, MOQ y plazo; (3) pague un depósito para confirmar; (4) gestionamos el control de calidad y la producción según corresponda; (5) pague el saldo antes del envío; (6) despachamos y enviamos el seguimiento. Para stock, el despacho es en 24–72 horas.',
      ar: 'العملية بسيطة: (1) أرسل استفساراً عبر واتساب أو نموذج الاتصال بالمنتجات المطلوبة؛ (2) تلقَّ عرض سعر يشمل السعر والحد الأدنى والمهلة؛ (3) ادفع عربوناً للتأكيد؛ (4) نتولى فحص الجودة والإنتاج عند الحاجة؛ (5) ادفع المتبقي قبل الشحن؛ (6) نشحن ونرسل رقم التتبع. بالنسبة لبضائع المخزون، الشحن خلال 24–72 ساعة.'
    }
  },
  {
    q: { en: 'What payment methods and terms do you accept?', es: '¿Qué métodos y condiciones de pago aceptan?', ar: 'ما طرق وأساليب الدفع التي تقبلونها؟' },
    a: {
      en: 'We accept T/T bank transfer and major wire methods. Standard terms are a deposit to confirm the order and the balance paid before shipment. For established clients we can discuss tailored arrangements. We never ask for full payment before production is verified.',
      es: 'Aceptamos transferencia bancaria (T/T) y métodos de giro comunes. Los términos estándar son un depósito para confirmar el pedido y el saldo antes del envío. Para clientes consolidados podemos discutir arreglos a medida. Nunca pedimos el pago completo antes de verificar la producción.',
      ar: 'نقبل التحويل البنكي (T/T) وطرق الحوالة الشائعة. الشروط القياسية: عربون لتأكيد الطلب والباقي قبل الشحن. للعملاء الدائمين يمكن مناقشة ترتيبات خاصة. لا نطلب الدفع الكامل قبل التحقق من الإنتاج.'
    }
  },
  {
    q: { en: 'Do you ship DDP (Delivered Duty Paid)?', es: '¿Envían DDP (Entregado con Derechos Pagados)?', ar: 'هل توفرون الشحن DDP (تسليم ضريبي مدفوع)؟' },
    a: {
      en: 'Yes. For many destinations we offer DDP (Delivered Duty Paid), meaning we handle freight, import duties and taxes and deliver to your door with no extra charges on arrival. This is popular with UK and EU buyers who want predictable landed costs. Ask us whether DDP is available for your country.',
      es: 'Sí. Para muchos destinos ofrecemos DDP (Entregado con Derechos Pagados), lo que significa que gestionamos el flete, los aranceles de importación y los impuestos y entregamos a su puerta sin cargos adicionales al llegar. Es popular entre compradores del Reino Unido y la UE que buscan costos de llegada predecibles. Consúltenos si el DDP está disponible para su país.',
      ar: 'نعم. نوفر للعديد من الوجهات خدمة DDP (تسليم ضريبي مدفوع)، أي نتولى الشحن والرسوم الجمركية والضرائب ونوصّل إلى بابك دون رسوم إضافية عند الوصول. هذا شائع لدى مشتري بريطانيا والاتحاد الأوروبي الذين يريدون تكاليف وصول واضحة. اسألنا عن توفر DDP لبلدك.'
    }
  },
  {
    q: { en: 'Which countries do you ship to?', es: '¿A qué países envían?', ar: 'إلى أي دول تشحنون؟' },
    a: {
      en: 'We ship to 30+ countries worldwide, including the United Kingdom, all of Europe, the Middle East and North America. We handle sea freight, air freight, rail and express delivery from China to your destination, plus customs clearance and documentation.',
      es: 'Enviamos a más de 30 países en todo el mundo, incluyendo Reino Unido, toda Europa, Oriente Medio y América del Norte. Gestionamos flete marítimo, aéreo, ferroviario y exprés desde China a su destino, además de despacho aduanero y documentación.',
      ar: 'نشحن إلى أكثر من 30 دولة حول العالم، بما في ذلك بريطانيا وكل أوروبا والشرق الأوسط وأمريكا الشمالية. نتولى الشحن البحري والجوي والسككي والسريع من الصين إلى وجهتك، بالإضافة إلى التخليص الجمركي والتوثيق.'
    }
  },
  {
    q: { en: 'How long does delivery take?', es: '¿Cuánto tarda la entrega?', ar: 'كم يستغرق التوصيل؟' },
    a: {
      en: 'Stock orders are dispatched within 24–72 hours. UK mainland delivery is 1–3 working days, European delivery 3–7 working days, and worldwide delivery depends on the method (express 3–7 days, air 5–10 days, sea 25–45 days). Sourcing-agent orders add factory lead time, which we state in the quote.',
      es: 'Los pedidos de stock se despachan en 24–72 horas. La entrega en el Reino Unido es de 1–3 días laborables, en Europa 3–7 días, y a nivel mundial depende del método (exprés 3–7 días, aéreo 5–10 días, marítimo 25–45 días). Los pedidos de agente añaden el plazo de fábrica, que indicamos en la cotización.',
      ar: 'تُشحن طلبات المخزون خلال 24–72 ساعة. توصيل بريطانيا 1–3 أيام عمل، وأوروبا 3–7 أيام، والعالم حسب الطريقة (سريع 3–7 أيام، جوي 5–10 أيام، بحري 25–45 يوماً). طلبات الوكيل تضيف مهلة المصنع المذكورة في عرض السعر.'
    }
  },
  {
    q: { en: 'Do you provide quality control and factory verification?', es: '¿Ofrecen control de calidad y verificación de fábricas?', ar: 'هل توفرون فحص الجودة والتحقق من المصانع؟' },
    a: {
      en: 'Yes. As your sourcing agent we verify suppliers, arrange samples, and perform pre-shipment quality control and quantity checks before you pay the balance. This protects you from defective goods and misrepresentation — a core reason buyers use a Yiwu agent.',
      es: 'Sí. Como su agente de abastecimiento, verificamos proveedores, gestionamos muestras y realizamos control de calidad y conteo previo al envío antes de pagar el saldo. Esto le protege de productos defectuosos y declaraciones falsas, una razón clave para usar un agente en Yiwu.',
      ar: 'نعم. بصفتها وكيلك، نتحقق من الموردين، ونجهّز العينات، ونُجري فحص الجودة والكمية قبل الشحن وقبل دفع المتبقي. هذا يحميك من البضائع المعيبة والادعاءات الخاطئة — وهو سبب جوهري لاستخدام وكيل في ييوو.'
    }
  },
  {
    q: { en: 'Can you source products not listed on the website?', es: '¿Pueden abastecer productos no listados en el sitio web?', ar: 'هل يمكنكم استيراد منتجات غير موجودة في الموقع؟' },
    a: {
      en: 'Absolutely. The Yiwu market has millions of products. Send us a photo, link or description of what you need and we will find suppliers, verify them, sample, negotiate and ship. Our sourcing-agent service covers any product made or traded in China.',
      es: 'Por supuesto. El mercado de Yiwu tiene millones de productos. Envíenos una foto, enlace o descripción de lo que necesita y encontraremos proveedores, los verificaremos, muestreamos, negociaremos y enviaremos. Nuestro servicio de agente cubre cualquier producto fabricado o comercializado en China.',
      ar: 'بالتأكيد. سوق ييوو يضم ملايين المنتجات. أرسل لنا صورة أو رابطاً أو وصفاً لما تحتاجه وسنجد الموردين، ونوثقهم، ونجهّز العينات، ونتفاوض ونشحن. تغطي خدمة الوكيل أي منتج يُصنّع أو يُتاجر به في الصين.'
    }
  },
  {
    q: { en: 'How do I get a quote?', es: '¿Cómo obtengo una cotización?', ar: 'كيف أحصل على عرض سعر؟' },
    a: {
      en: 'The fastest way is WhatsApp at +86 13367494665 or email dscaro88@gmail.com. Tell us the product, quantity and destination country, and we reply with pricing, MOQ and lead time — usually within 24 hours.',
      es: 'La forma más rápida es WhatsApp al +86 13367494665 o correo dscaro88@gmail.com. Indíquenos producto, cantidad y país de destino, y le respondemos con precio, MOQ y plazo, usualmente en 24 horas.',
      ar: 'أسرع طريق هو واتساب على +86 13367494665 أو البريد dscaro88@gmail.com. أخبرنا بالمنتج والكمية وبلد الوجهة، ونرد بسعر والحد الأدنى والمهلة — عادة خلال 24 ساعة.'
    }
  },
  {
    q: { en: 'Can I sell my excess inventory or liquidation stock through you?', es: '¿Puedo vender mi inventario excedente o stock de liquidación con ustedes?', ar: 'هل يمكنني بيع مخزوني الفائض أو بضائع التصفية عبركم؟' },
    a: {
      en: 'Yes. If you have excess inventory, customer returns or liquidation stock to sell, CheapALot connects you with buyers in our global B2B network across 30+ countries. Submit your stock details and receive a free valuation within 24 hours — no upfront fees.',
      es: 'Sí. Si tiene inventario excedente, devoluciones o stock de liquidación para vender, CheapALot lo conecta con compradores en nuestra red B2B global en más de 30 países. Envíe los detalles de su stock y reciba una valoración gratuita en 24 horas, sin cargos por adelantado.',
      ar: 'نعم. إذا كان لديك مخزون فائض أو مرتجعات أو بضائع تصفية للبيع، تربطك CheapALot بمشترين في شبكتها العالمية B2B في أكثر من 30 دولة. أرسل تفاصيل بضائعك وستحصل على تقييم مجاني خلال 24 ساعة — دون رسوم مقدمة.'
    }
  },
  {
    q: { en: 'What product categories do you cover?', es: '¿Qué categorías de productos cubren?', ar: 'ما فئات المنتجات التي تغطونها؟' },
    a: {
      en: 'We cover the full range of Yiwu wholesale: household textiles, electrical goods, apparel, DIY & auto, furniture & sofas, toys & nursery, sports & leisure, and mixed household goods. Browse 500+ listed products on our clearance stock page, and we can source anything else on request.',
      es: 'Cubrimos toda la gama mayorista de Yiwu: textiles del hogar, artículos eléctricos, ropa, DIY y auto, muebles y sofás, juguetes e infantil, deportes y ocio, yhogar mixto. Explore más de 500 productos en nuestra página de liquidación, y podemos abastecer cualquier otro artículo bajo pedido.',
      ar: 'نغطي كامل نطاق جملة ييوو: المنسوجات المنزلية، والأدوات الكهربائية، والملابس، وDIY والسيارات، والأثاث والكنبات، والألعاب والطفولة، والرياضة والترفيه، والسلع المنزلية المختلطة. تصفح أكثر من 500 منتج في صفحة التخفيضات، ويمكننا استيراد أي شيء آخر عند الطلب.'
    }
  },
  {
    q: { en: 'Do you handle customs clearance and export documentation?', es: '¿Gestionan el despacho aduanero y la documentación de exportación?', ar: 'هل تتولون التخليص الجمركي وتوثيق التصدير؟' },
    a: {
      en: 'Yes. We handle freight forwarding, customs clearance and all export documentation (commercial invoice, packing list, bill of lading, certificate of origin, etc.). With DDP service we also cover import duties and taxes so delivery is hassle-free.',
      es: 'Sí. Gestionamos el envío, el despacho aduanero y toda la documentación de exportación (factura comercial, lista de empaque, conocimiento de embarque, certificado de origen, etc.). Con el servicio DDP también cubrimos aranceles e impuestos de importación para una entrega sin complicaciones.',
      ar: 'نعم. نتولى الشحن والتخليص الجمركي وكل وثائق التصدير (فاتورة تجارية، قائمة تعبئة، بوليصة شحن، شهادة منشأ وغيرها). ومع خدمة DDP نغطي أيضاً الرسوم والضرائب الجمركية لتوصيل بلا متاعب.'
    }
  },
  {
    q: { en: 'How can I contact CheapALot?', es: '¿Cómo puedo contactar a CheapALot?', ar: 'كيف يمكنني التواصل مع CheapALot؟' },
    a: {
      en: 'WhatsApp: +86 13367494665 (fastest). Email: dscaro88@gmail.com. Office: Yiwu, Zhejiang, China. We respond to all inquiries within 24 hours, in English, Spanish or Arabic.',
      es: 'WhatsApp: +86 13367494665 (el más rápido). Correo: dscaro88@gmail.com. Oficina: Yiwu, Zhejiang, China. Respondemos a todas las consultas en 24 horas, en inglés, español o árabe.',
      ar: 'واتساب: +86 13367494665 (الأسرع). البريد: dscaro88@gmail.com. المكتب: ييوو، تشجيانغ، الصين. نرد على جميع الاستفسارات خلال 24 ساعة، بالإنجليزية أو الإسبانية أو العربية.'
    }
  }
];

const NAV = {
  en: { home: 'Home', stock: 'Clearance Stock', about: 'About Us', sell: 'Sell Your Stock', contact: 'Contact', sourcing: 'Sourcing Agent', faq: 'FAQ' },
  es: { home: 'Inicio', stock: 'Stock de Liquidación', about: 'Sobre Nosotros', sell: 'Vende tu Stock', contact: 'Contacto', sourcing: 'Agente de Compras', faq: 'Preguntas Frecuentes' },
  ar: { home: 'الرئيسية', stock: 'تخفيضات الجملة', about: 'من نحن', sell: 'بيع مخزونك', contact: 'اتصل بنا', sourcing: 'وكيل الشراء', faq: 'الأسئلة الشائعة' }
};

function buildPage(lang) {
  const p = lang === 'en' ? '' : '../';
  const url = lang === 'en' ? SITE + '/faq.html' : SITE + '/' + lang + '/faq.html';
  const nav = NAV[lang];
  const n = (href, label, active) => `<a href="${p}${href}"${active ? ' class="active"' : ''}>${label}</a>`;
  const dir = lang === 'ar' ? ' dir="rtl"' : '';

  const faqHtml = QA.map((item, i) => {
    const q = item.q[lang], a = item.a[lang];
    return `                <div class="faq-item">
                    <h3 class="faq-q"><span class="faq-num">${i + 1}.</span> ${q}</h3>
                    <div class="faq-a">${a}</div>
                </div>`;
  }).join('\n');

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": QA.map(item => ({
      "@type": "Question",
      "name": item.q[lang],
      "acceptedAnswer": { "@type": "Answer", "text": item.a[lang] }
    }))
  };
  const crumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": SITE + '/' },
      { "@type": "ListItem", "position": 2, "name": nav.faq, "item": url }
    ]
  };

  const desc = {
    en: 'Frequently asked questions about CheapALot — Yiwu sourcing agent, wholesale clearance stock, MOQ, DDP shipping, payments, quality control and how to buy from China.',
    es: 'Preguntas frecuentes sobre CheapALot — agente de abastecimiento en Yiwu, stock de liquidación al por mayor, MOQ, envío DDP, pagos, control de calidad y cómo comprar en China.',
    ar: 'أسئلة شائعة عن CheapALot — وكيل شراء في ييوو، تخفيضات الجملة، الحد الأدنى للطلب، الشحن DDP، الدفع، فحص الجودة، وكيفية الشراء من الصين.'
  }[lang];

  return `<!DOCTYPE html>
<html lang="${lang}"${dir}>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${nav.faq} | CheapALot — Yiwu Sourcing & Wholesale</title>
    <meta name="description" content="${desc}">
    <meta name="robots" content="index, follow">
    <link rel="canonical" href="${url}">
    <link rel="alternate" hreflang="en" href="${SITE}/faq.html">
    <link rel="alternate" hreflang="es" href="${SITE}/es/faq.html">
    <link rel="alternate" hreflang="ar" href="${SITE}/ar/faq.html">
    <link rel="alternate" hreflang="x-default" href="${SITE}/faq.html">
    <link rel="stylesheet" href="${p}css/style.css">
    <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700;900&family=Oswald:wght@500;600;700&family=Bebas+Neue&display=swap" rel="stylesheet">
    <meta property="og:type" content="article">
    <meta property="og:title" content="${nav.faq} | CheapALot — Yiwu Sourcing & Wholesale">
    <meta property="og:description" content="${desc}">
    <meta property="og:url" content="${url}">
    <meta property="og:site_name" content="CheapALot">
    <meta property="og:image" content="${SITE}/images/hero-bg.jpg">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${nav.faq} | CheapALot">
    <meta name="twitter:description" content="${desc}">
    <meta name="twitter:image" content="${SITE}/images/hero-bg.jpg">
    <script type="application/ld+json">
${JSON.stringify(crumbLd, null, 2)}
    </script>
    <script type="application/ld+json">
${JSON.stringify(faqLd, null, 2)}
    </script>
</head>
<body>
    <div class="top-bar">
        <div class="container top-bar-inner">
            <div class="top-left">
                <span class="top-icon">📍</span>
                <span><strong>Yiwu, China</strong> — The World's Largest Wholesale Market</span>
                <span class="top-divider">|</span>
                <span class="top-icon">⏱</span>
                <span>20+ Years Export Experience</span>
            </div>
            <div class="top-right">
                <span class="lang-switcher">
                    <a href="/faq.html"${lang === 'en' ? ' class="lang-active"' : ''}>🇬🇧 EN</a>
                    <a href="/es/faq.html"${lang === 'es' ? ' class="lang-active"' : ''}>🇪🇸 ES</a>
                    <a href="/ar/faq.html"${lang === 'ar' ? ' class="lang-active"' : ''}>🇸🇦 AR</a>
                </span>
                <span class="trade-badge">⚡ TRADE ONLY · MIN ORDER £250</span>
            </div>
        </div>
    </div>

    <header class="main-header">
        <div class="container header-inner">
            <a href="${p}index.html" class="logo">
                <span class="logo-icon">📦</span>
                <span class="logo-text">Cheap<span class="logo-highlight">ALot</span></span>
            </a>
            <nav class="main-nav">
                ${n('index.html', nav.home)}
                ${n('products.html', nav.stock)}
                ${n('about.html', nav.about)}
                ${n('sell.html', nav.sell)}
                ${n('faq.html', nav.faq, true)}
                ${n('contact.html', nav.contact)}
                ${n('index.html#sourcing', nav.sourcing, false, true)}
            </nav>
            <div class="header-right">
                <select class="header-lang" onchange="location = this.value;">
                    <option value="/faq.html"${lang === 'en' ? ' selected' : ''}>🇬🇧 EN</option>
                    <option value="/es/faq.html"${lang === 'es' ? ' selected' : ''}>🇪🇸 ES</option>
                    <option value="/ar/faq.html"${lang === 'ar' ? ' selected' : ''}>🇸🇦 AR</option>
                </select>
            </div>
        </div>
    </header>

    <section class="page-hero">
        <div class="container">
            <h1>${nav.faq}</h1>
            <p>Yiwu Sourcing, Wholesale Clearance Stock & How to Buy from China</p>
        </div>
    </section>

    <section class="page-content">
        <div class="container">
            <div class="faq-wrap"${lang === 'ar' ? ' dir="rtl"' : ''}>
${faqHtml}
            </div>
            <div class="faq-cta">
                <h2>${lang === 'es' ? '¿Listo para empezar?' : lang === 'ar' ? 'هل أنت مستعد للبدء؟' : 'Ready to get started?'}</h2>
                <p>${lang === 'es' ? 'Contáctenos por WhatsApp o correo para una cotización gratuita en 24 horas.' : lang === 'ar' ? 'تواصل معنا عبر واتساب أو البريد للحصول على عرض سعر مجاني خلال 24 ساعة.' : 'Contact us on WhatsApp or email for a free quote within 24 hours.'}</p>
                <a href="${p}contact.html" class="btn btn-primary">${nav.contact}</a>
                <a href="${p}products.html" class="btn btn-secondary">${nav.stock}</a>
            </div>
        </div>
    </section>

    <footer class="main-footer">
        <div class="container">
            <div class="footer-grid">
                <div class="footer-col">
                    <h4>CheapALot</h4>
                    <p>Yiwu-based B2B trade platform. 20+ years export experience. Wholesale clearance stock from 1p/unit. China sourcing agent services.</p>
                    <p class="footer-contact"><strong>WhatsApp:</strong> +86 13367494665</p>
                    <p class="footer-contact"><strong>Email:</strong> dscaro88@gmail.com</p>
                </div>
                <div class="footer-col">
                    <h4>${lang === 'es' ? 'Enlaces Rápidos' : lang === 'ar' ? 'روابط سريعة' : 'Quick Links'}</h4>
                    <a href="${p}index.html">${nav.home}</a>
                    <a href="${p}products.html">${nav.stock}</a>
                    <a href="${p}about.html">${nav.about}</a>
                    <a href="${p}sell.html">${nav.sell}</a>
                    <a href="${p}faq.html">${nav.faq}</a>
                    <a href="${p}contact.html">${nav.contact}</a>
                </div>
                <div class="footer-col">
                    <h4>${lang === 'es' ? 'Nuestros Servicios' : lang === 'ar' ? 'خدماتنا' : 'Our Services'}</h4>
                    <a href="${p}index.html#sourcing">${nav.sourcing}</a>
                    <a href="${p}index.html#stock">${nav.stock}</a>
                    <a href="${p}sell.html">${nav.sell}</a>
                    <a href="${p}index.html#logistics">${lang === 'es' ? 'Exportación y Logística' : lang === 'ar' ? 'التصدير واللوجستيات' : 'Export & Logistics'}</a>
                </div>
                <div class="footer-col">
                    <h4>${lang === 'es' ? 'Legal e Info' : lang === 'ar' ? 'قانوني ومعلومات' : 'Legal & Info'}</h4>
                    <a href="${p}terms.html">${lang === 'es' ? 'Términos y Condiciones' : lang === 'ar' ? 'الشروط والأحكام' : 'Terms & Conditions'}</a>
                    <a href="${p}sitemap.xml">${lang === 'es' ? 'Mapa del Sitio' : lang === 'ar' ? 'خريطة الموقع' : 'Sitemap'}</a>
                </div>
            </div>
            <div class="footer-bottom">
                <p>&copy; 2024 CheapALot.com — All Rights Reserved. Yiwu, China.</p>
                <p>Trade-only B2B platform. Minimum order £250. Prices from 1p/unit.</p>
            </div>
        </div>
    </footer>

    <script src="${p}js/main.js"></script>
</body>
</html>
`;
}

['en', 'es', 'ar'].forEach(lang => {
  const out = lang === 'en' ? 'faq.html' : lang + '/faq.html';
  fs.writeFileSync(path.join(ROOT, out), buildPage(lang));
  console.log('  ✓ ' + out);
});
console.log('FAQ pages generated.');
