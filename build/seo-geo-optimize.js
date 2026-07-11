#!/usr/bin/env node
/**
 * SEO + GEO Optimization Script for CheapALot.com
 * 
 * Adds missing SEO elements to all 17 HTML files:
 * - Meta descriptions (where missing)
 * - Open Graph tags (all sub-pages)
 * - Twitter Card localization (es/ar pages)
 * - Hreflang tags (products pages)
 * - Robots meta tags (products pages)
 * - JSON-LD structured data (all pages):
 *   - Organization + ContactPoint
 *   - BreadcrumbList
 *   - ItemList (products pages)
 *   - Service schema (about/sell)
 *   - WebPage + Speakable (GEO)
 *   - FAQPage (enhanced for AI engines)
 * 
 * GEO (Generative Engine Optimization) features:
 * - Speakable schema for voice search
 * - Comprehensive FAQ for AI citation
 * - HowTo schema for sourcing process
 * - Semantic content markup
 */

const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://cheapalot.com';
const SITE_NAME = 'CheapALot';
const DEFAULT_IMAGE = `${BASE_URL}/images/hero-bg.jpg`;
const TODAY = new Date().toISOString().split('T')[0];

// ─── Page configurations ───────────────────────────────────────────────────────

const pages = {
  // English pages
  'index.html': {
    type: 'home', lang: 'en', path: '/',
    title: 'CheapALot.com | Yiwu Sourcing Agent & Wholesale Stock From 1p',
    desc: 'Based in Yiwu, the world\'s largest wholesale market. 20+ years of export experience. We offer: extreme cheap clearance stock from 1p/unit, China sourcing agent services, factory-direct procurement, quality control, export & logistics. Buy stock or sell your excess inventory. Global B2B trade platform.',
    ogTitle: 'CheapALot.com | Yiwu Sourcing Agent & Wholesale Stock From 1p',
    ogDesc: 'Based in Yiwu, the world\'s largest wholesale market. 20+ years export experience. Clearance stock from 1p/unit. Sourcing agent, factory direct, quality control, export & logistics.',
    twTitle: 'CheapALot.com | Yiwu Sourcing Agent & Wholesale From 1p',
    twDesc: 'Yiwu-based. 20+ years. Clearance stock from 1p. Sourcing agent, factory direct, QC, export.',
  },
  'products.html': {
    type: 'products', lang: 'en', path: '/products.html',
    title: 'Wholesale Products & Stock List | CheapALot - Yiwu Sourcing',
    desc: 'Browse 500+ wholesale products from Yiwu, China. Toys, jewelry, flowers, crafts, photo frames, porcelain and more. Factory-direct prices from £0.10/unit. B2B trade only. Sourcing agent services available.',
    ogTitle: 'Wholesale Products from Yiwu | CheapALot - 500+ Items',
    ogDesc: 'Browse 500+ wholesale products direct from Yiwu, China. Toys, jewelry, crafts, flowers and more. Factory-direct prices. B2B trade only.',
    twTitle: 'Wholesale Products from Yiwu | CheapALot',
    twDesc: '500+ wholesale products from Yiwu, China. Factory-direct prices. B2B trade only.',
  },
  'about.html': {
    type: 'about', lang: 'en', path: '/about.html',
    title: 'About CheapALot | Yiwu Sourcing Agent & Wholesale Experts',
    desc: 'Learn about CheapALot - your trusted Yiwu sourcing agent with 20+ years of export experience. Based in the world\'s largest wholesale market in Yiwu, China. We help global buyers source products, manage quality control, and handle export logistics.',
    ogTitle: 'About CheapALot | Yiwu Sourcing Agent with 20+ Years Experience',
    ogDesc: 'Your trusted Yiwu sourcing agent. 20+ years export experience. Based in the world\'s largest wholesale market. Factory-direct procurement, QC, export logistics.',
    twTitle: 'About CheapALot | Yiwu Sourcing Agent',
    twDesc: 'Based in Yiwu, the world\'s largest wholesale market. 20+ years export experience. Your trusted China trade partner.',
  },
  'sell.html': {
    type: 'sell', lang: 'en', path: '/sell.html',
    title: 'Sell Your Excess Stock | CheapALot - Global B2B Buyer Network',
    desc: 'Have excess inventory or liquidation stock to sell? CheapALot connects you with buyers in our global B2B network across 30+ countries. Get a valuation within 24 hours. No upfront fees.',
    ogTitle: 'Sell Your Excess Stock | CheapALot - 30+ Countries',
    ogDesc: 'Got excess inventory? We connect you with buyers in 30+ countries. Free valuation within 24 hours. No upfront fees.',
    twTitle: 'Sell Your Stock | CheapALot',
    twDesc: 'Got excess inventory or returns? We connect you with buyers in 30+ countries. Free valuation within 24 hours.',
  },
  'contact.html': {
    type: 'contact', lang: 'en', path: '/contact.html',
    title: 'Contact CheapALot | Yiwu Sourcing Agent & Wholesale Inquiries',
    desc: 'Contact CheapALot for sourcing inquiries, wholesale stock requests, or to sell your inventory. Based in Yiwu, China. WhatsApp, email, and online forms available. Response within 24 hours.',
    ogTitle: 'Contact CheapALot | Sourcing & Wholesale Inquiries',
    ogDesc: 'Contact us for Yiwu sourcing, wholesale stock, or to sell inventory. WhatsApp, email, online forms. Response within 24 hours.',
    twTitle: 'Contact CheapALot | Get a Quote',
    twDesc: 'Contact us for wholesale clearance stock, sourcing services, or to sell your inventory. Based in Yiwu, China.',
  },
  'terms.html': {
    type: 'terms', lang: 'en', path: '/terms.html',
    title: 'Terms & Conditions | CheapALot - B2B Wholesale Platform',
    desc: 'Terms and Conditions for using CheapALot.com B2B wholesale platform. Read our terms of service, privacy policy, returns policy, and trade buyer agreement.',
    ogTitle: 'Terms & Conditions | CheapALot',
    ogDesc: 'Terms and conditions for CheapALot.com - B2B wholesale and Yiwu sourcing platform.',
    twTitle: 'Terms & Conditions | CheapALot',
    twDesc: 'Terms and conditions for CheapALot.com - B2B wholesale clearance stock platform.',
  },
  // Spanish pages
  'es/index.html': {
    type: 'home', lang: 'es', path: '/es/',
    title: 'CheapALot.com | Agente de Compras en Yiwu y Stock de Liquidacion Desde 1p',
    desc: 'Basados en Yiwu, el mercado mayorista mas grande del mundo. 20+ anos de experiencia en exportacion. Ofrecemos: stock de liquidacion desde 1p/unidad, servicios de agente de compras en China, adquisicion directa de fabrica, control de calidad y logistica de exportacion.',
    ogTitle: 'CheapALot.com | Agente de Compras en Yiwu y Stock Desde 1p',
    ogDesc: 'Basados en Yiwu. 20+ anos de experiencia. Stock de liquidacion desde 1p/unidad. Agente de compras, fabrica directa, control de calidad, exportacion.',
    twTitle: 'CheapALot | Agente de Compras en Yiwu',
    twDesc: 'Basados en Yiwu. Stock desde 1p. Agente de compras, control de calidad, exportacion.',
  },
  'es/products.html': {
    type: 'products', lang: 'es', path: '/es/products.html',
    title: 'Productos Mayoristas | CheapALot - Lista de Stock de Yiwu',
    desc: 'Explore mas de 500 productos mayoristas de Yiwu, China. Juguetes, joyeria, flores, manualidades, marcos de fotos, porcelana y mas. Precios directos de fabrica desde £0.10/unidad. Solo para empresas B2B.',
    ogTitle: 'Productos Mayoristas de Yiwu | CheapALot - 500+ Articulos',
    ogDesc: 'Explore 500+ productos mayoristas directos de Yiwu, China. Juguetes, joyeria, manualidades y mas. Precios de fabrica. Solo B2B.',
    twTitle: 'Productos Mayoristas | CheapALot',
    twDesc: '500+ productos mayoristas de Yiwu, China. Precios de fabrica. Solo B2B.',
  },
  'es/about.html': {
    type: 'about', lang: 'es', path: '/es/about.html',
    title: 'Sobre CheapALot | Agente de Compras en Yiwu y Expertos',
    desc: 'Conozca CheapALot - su agente de compras de confianza en Yiwu con mas de 20 anos de experiencia en exportacion. Basados en el mercado mayorista mas grande del mundo en Yiwu, China.',
    ogTitle: 'Sobre CheapALot | Agente de Compras en Yiwu',
    ogDesc: 'Su agente de compras de confianza en Yiwu. 20+ anos de experiencia en exportacion. Adquisicion directa, control de calidad, logistica.',
    twTitle: 'Sobre CheapALot | Agente en Yiwu',
    twDesc: 'Basados en Yiwu, el mercado mayorista mas grande del mundo. 20+ anos de experiencia en exportacion.',
  },
  'es/sell.html': {
    type: 'sell', lang: 'es', path: '/es/sell.html',
    title: 'Venda Su Stock | CheapALot - Red Global B2B',
    desc: 'Tiene exceso de inventario o stock de liquidacion para vender? CheapALot lo conecta con compradores en nuestra red B2B global en mas de 30 paises. Obtenga una valoracion en 24 horas.',
    ogTitle: 'Venda Su Stock | CheapALot - 30+ Paises',
    ogDesc: 'Tiene exceso de inventario? Lo conectamos con compradores en 30+ paises. Valoracion gratis en 24 horas.',
    twTitle: 'Venda Su Stock | CheapALot',
    twDesc: 'Exceso de inventario? Lo conectamos con compradores en 30+ paises. Valoracion gratis en 24 horas.',
  },
  'es/contact.html': {
    type: 'contact', lang: 'es', path: '/es/contact.html',
    title: 'Contacto | CheapALot - Agente de Compras en Yiwu',
    desc: 'Contacte a CheapALot para consultas de compras, solicitudes de stock mayorista, o para vender su inventario. Basados en Yiwu, China. Respuesta en 24 horas.',
    ogTitle: 'Contacto | CheapALot - Consultas',
    ogDesc: 'Contactenos para compras en Yiwu, stock mayorista, o vender inventario. Respuesta en 24 horas.',
    twTitle: 'Contacto | CheapALot',
    twDesc: 'Contactenos para stock mayorista, servicios de compras, o vender inventario. Basados en Yiwu, China.',
  },
  'es/terms.html': {
    type: 'terms', lang: 'es', path: '/es/terms.html',
    title: 'Terminos y Condiciones | CheapALot - Plataforma B2B',
    desc: 'Terminos y Condiciones para usar la plataforma B2B de CheapALot.com. Lea nuestros terminos de servicio, politica de privacidad y politica de devoluciones.',
    ogTitle: 'Terminos y Condiciones | CheapALot',
    ogDesc: 'Terminos y condiciones para CheapALot.com - plataforma B2B y agente de compras en Yiwu.',
    twTitle: 'Terminos y Condiciones | CheapALot',
    twDesc: 'Terminos y condiciones para CheapALot.com - plataforma mayorista B2B.',
  },
  // Arabic pages
  'ar/index.html': {
    type: 'home', lang: 'ar', path: '/ar/',
    title: 'CheapALot.com | وكيل مشتريات في ييوو ومخزون تصفية بسعر يبدأ من 1 بنس',
    desc: 'مقرنا في ييوو، أكبر سوق جملة في العالم. أكثر من 20 عاماً من الخبرة في التصدير. نقدم: مخزون تصفية بأسعار تبدأ من 1 بنس للوحدة، خدمات وكيل مشتريات في الصين، شراء مباشر من المصنع، مراقبة الجودة، وخدمات التصدير واللوجستيات.',
    ogTitle: 'CheapALot.com | وكيل مشتريات في ييوو ومخزون من 1 بنس',
    ogDesc: 'مقرنا في ييوو. أكثر من 20 عاماً من الخبرة. مخزون تصفية من 1 بنس. وكيل مشتريات، مصنع مباشر، مراقبة الجودة، تصدير.',
    twTitle: 'CheapALot | وكيل مشتريات في ييوو',
    twDesc: 'مقرنا في ييوو. مخزون من 1 بنس. وكيل مشتريات، مراقبة الجودة، تصدير.',
  },
  'ar/products.html': {
    type: 'products', lang: 'ar', path: '/ar/products.html',
    title: 'منتجات الجملة | CheapALot - قائمة مخزون ييوو',
    desc: 'تصفح أكثر من 500 منتج جملة من ييوو، الصين. ألعاب، مجوهرات، زهور، حرف يدوية، أطر صور، خزف والمزيد. أسعار مباشرة من المصنع تبدأ من £0.10 للوحدة. للشركات B2B فقط.',
    ogTitle: 'منتجات الجملة من ييوو | CheapALot - 500+ منتج',
    ogDesc: 'تصفح 500+ منتج جملة مباشر من ييوو، الصين. ألعاب، مجوهرات، حرف يدوية والمزيد. أسعار المصنع. B2B فقط.',
    twTitle: 'منتجات الجملة | CheapALot',
    twDesc: '500+ منتج جملة من ييوو، الصين. أسعار المصنع. B2B فقط.',
  },
  'ar/about.html': {
    type: 'about', lang: 'ar', path: '/ar/about.html',
    title: 'حول CheapALot | وكيل مشتريات ييوو والخبراء',
    desc: 'تعرف على CheapALot - وكيل المشتريات الموثوق في ييوو بأكثر من 20 عاماً من الخبرة في التصدير. مقرنا في أكبر سوق جملة في العالم في ييوو، الصين.',
    ogTitle: 'حول CheapALot | وكيل مشتريات في ييوو',
    ogDesc: 'وكيل المشتريات الموثوق في ييوو. أكثر من 20 عاماً من الخبرة. شراء مباشر، مراقبة الجودة، لوجستيات.',
    twTitle: 'حول CheapALot | وكيل في ييوو',
    twDesc: 'مقرنا في ييوو، أكبر سوق جملة في العالم. أكثر من 20 عاماً من الخبرة في التصدير.',
  },
  'ar/sell.html': {
    type: 'sell', lang: 'ar', path: '/ar/sell.html',
    title: 'بع مخزونك | CheapALot - شبكة B2B عالمية',
    desc: 'هل لديك مخزون فائض أو مخزون تصفية للبيع؟ يربطك CheapALot بمشترين في شبكتنا العالمية B2B في أكثر من 30 دولة. احصل على تقييم خلال 24 ساعة.',
    ogTitle: 'بع مخزونك | CheapALot - 30+ دولة',
    ogDesc: 'هل لديك مخزون فائض؟ نربطك بمشترين في 30+ دولة. تقييم مجاني خلال 24 ساعة.',
    twTitle: 'بع مخزونك | CheapALot',
    twDesc: 'مخزون فائض؟ نربطك بمشترين في 30+ دولة. تقييم مجاني خلال 24 ساعة.',
  },
  'ar/contact.html': {
    type: 'contact', lang: 'ar', path: '/ar/contact.html',
    title: 'اتصل بنا | CheapALot - وكيل مشتريات ييوو',
    desc: 'اتصل بـ CheapALot لاستفسارات المشتريات، طلبات مخزون الجملة، أو لبيع مخزونك. مقرنا في ييوو، الصين. رد خلال 24 ساعة.',
    ogTitle: 'اتصل بنا | CheapALot - استفسارات',
    ogDesc: 'اتصل بنا للمشتريات في ييوو، مخزون الجملة، أو بيع المخزون. رد خلال 24 ساعة.',
    twTitle: 'اتصل بنا | CheapALot',
    twDesc: 'اتصل بنا لمخزون الجملة، خدمات المشتريات، أو بيع المخزون. مقرنا في ييوو، الصين.',
  },
  'ar/terms.html': {
    type: 'terms', lang: 'ar', path: '/ar/terms.html',
    title: 'الشروط والأحكام | CheapALot - منصة B2B',
    desc: 'الشروط والأحكام لاستخدام منصة CheapALot.com B2B. اقرأ شروط الخدمة وسياسة الخصوصية وسياسة الإرجاع.',
    ogTitle: 'الشروط والأحكام | CheapALot',
    ogDesc: 'الشروط والأحكام لـ CheapALot.com - منصة B2B ووكيل مشتريات في ييوو.',
    twTitle: 'الشروط والأحكام | CheapALot',
    twDesc: 'الشروط والأحكام لـ CheapALot.com - منصة جملة B2B.',
  },
};

// ─── Breadcrumb data per page type ────────────────────────────────────────────

const breadcrumbNames = {
  en: { home: 'Home', products: 'Products', about: 'About Us', sell: 'Sell Stock', contact: 'Contact', terms: 'Terms' },
  es: { home: 'Inicio', products: 'Productos', about: 'Sobre Nosotros', sell: 'Vender Stock', contact: 'Contacto', terms: 'Terminos' },
  ar: { home: 'الرئيسية', products: 'المنتجات', about: 'من نحن', sell: 'بيع المخزون', contact: 'اتصل بنا', terms: 'الشروط' },
};

// ─── Builder functions ────────────────────────────────────────────────────────

function buildHreflang(pagePath) {
  return `    <link rel="alternate" hreflang="en" href="${BASE_URL}${pagePath}">
    <link rel="alternate" hreflang="es" href="${BASE_URL}/es${pagePath.replace(/^\//, '/')}">
    <link rel="alternate" hreflang="ar" href="${BASE_URL}/ar${pagePath.replace(/^\//, '/')}">
    <link rel="alternate" hreflang="x-default" href="${BASE_URL}${pagePath}">`;
}

function buildOG(page) {
  const locale = page.lang === 'en' ? 'en_GB' : page.lang === 'es' ? 'es_ES' : 'ar_AR';
  const ogType = page.type === 'home' ? 'website' : 'article';
  return `    <meta property="og:type" content="${ogType}">
    <meta property="og:title" content="${page.ogTitle}">
    <meta property="og:description" content="${page.ogDesc}">
    <meta property="og:url" content="${BASE_URL}${page.path}">
    <meta property="og:site_name" content="${SITE_NAME}">
    <meta property="og:image" content="${DEFAULT_IMAGE}">
    <meta property="og:locale" content="${locale}">`;
}

function buildTwitter(page) {
  return `    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${page.twTitle}">
    <meta name="twitter:description" content="${page.twDesc}">
    <meta name="twitter:image" content="${DEFAULT_IMAGE}">`;
}

function buildOrganizationSchema() {
  return `    <script type="application/ld+json">
    {
        "@context": "https://schema.org",
        "@type": "Organization",
        "name": "CheapALot",
        "url": "${BASE_URL}",
        "logo": "${BASE_URL}/images/logo.png",
        "description": "Yiwu-based B2B trade platform offering wholesale clearance stock from 1p/unit, China sourcing agent services, factory-direct procurement, quality control, and export logistics. 20+ years of export experience.",
        "email": "info@cheapalot.com",
        "telephone": "+447435712880",
        "address": {
            "@type": "PostalAddress",
            "addressLocality": "Yiwu",
            "addressRegion": "Zhejiang",
            "addressCountry": "CN"
        },
        "areaServed": ["GB", "EU", "Worldwide"],
        "sameAs": [
            "https://wa.me/447435712880"
        ]
    }
    </script>`;
}

function buildBreadcrumbSchema(page) {
  const names = breadcrumbNames[page.lang];
  const pageName = names[page.type] || page.type;
  const homeUrl = page.lang === 'en' ? `${BASE_URL}/` : `${BASE_URL}/${page.lang}/`;
  const pageUrl = `${BASE_URL}${page.path}`;

  return `    <script type="application/ld+json">
    {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {
                "@type": "ListItem",
                "position": 1,
                "name": "${names.home}",
                "item": "${homeUrl}"
            },
            {
                "@type": "ListItem",
                "position": 2,
                "name": "${pageName}",
                "item": "${pageUrl}"
            }
        ]
    }
    </script>`;
}

function buildWebPageSchema(page) {
  const pageTypes = {
    home: 'WebSite',
    products: 'CollectionPage',
    about: 'AboutPage',
    sell: 'WebPage',
    contact: 'ContactPage',
    terms: 'WebPage',
  };
  const type = pageTypes[page.type] || 'WebPage';

  if (type === 'WebSite') return ''; // Home page already has WebSite schema

  return `    <script type="application/ld+json">
    {
        "@context": "https://schema.org",
        "@type": "${type}",
        "name": "${page.title}",
        "description": "${page.desc}",
        "url": "${BASE_URL}${page.path}",
        "isPartOf": {
            "@type": "WebSite",
            "name": "CheapALot",
            "url": "${BASE_URL}"
        },
        "publisher": {
            "@type": "Organization",
            "name": "CheapALot",
            "url": "${BASE_URL}"
        }
    }
    </script>`;
}

function buildSpeakableSchema(page) {
  // GEO: Speakable schema for voice search optimization
  const cssSelector = page.type === 'home' ? ['.hero-section', '.faq-section'] : ['.page-hero', '.main-content'];
  return `    <script type="application/ld+json">
    {
        "@context": "https://schema.org",
        "@type": "WebPageElement",
        "isAccessibleForFree": true,
        "cssSelector": ${JSON.stringify(cssSelector)}
    }
    </script>`;
}

function buildItemListSchema(page) {
  // For products page - ItemList schema
  return `    <script type="application/ld+json">
    {
        "@context": "https://schema.org",
        "@type": "ItemList",
        "name": "Wholesale Products from Yiwu",
        "description": "Browse wholesale products direct from Yiwu, China - the world's largest wholesale market. Factory-direct prices.",
        "url": "${BASE_URL}${page.path}",
        "numberOfItems": "500+",
        "itemListOrder": "https://schema.org/ItemListOrderAscending"
    }
    </script>`;
}

function buildServiceSchema(page) {
  // For about and sell pages - Service schema
  const serviceType = page.type === 'sell' ? 'Excess Inventory Sales' : 'China Sourcing Agent';
  return `    <script type="application/ld+json">
    {
        "@context": "https://schema.org",
        "@type": "Service",
        "serviceType": "${serviceType}",
        "provider": {
            "@type": "Organization",
            "name": "CheapALot",
            "url": "${BASE_URL}",
            "telephone": "+447435712880",
            "email": "info@cheapalot.com"
        },
        "areaServed": {
            "@type": "Place",
            "name": "Worldwide"
        },
        "description": "${page.desc}",
        "url": "${BASE_URL}${page.path}"
    }
    </script>`;
}

function buildContactPointSchema() {
  return `    <script type="application/ld+json">
    {
        "@context": "https://schema.org",
        "@type": "ContactPoint",
        "telephone": "+447435712880",
        "email": "info@cheapalot.com",
        "contactType": "customer service",
        "areaServed": ["GB", "EU", "Worldwide"],
        "availableLanguage": ["English", "Spanish", "Arabic", "Chinese"]
    }
    </script>`;
}

function buildEnhancedFAQSchema(page) {
  // GEO: Enhanced FAQ schema optimized for AI engine citation
  const faqs = {
    en: [
      {
        q: 'What is CheapALot and what services do you offer?',
        a: 'CheapALot is a Yiwu-based B2B trade platform with 20+ years of export experience. We offer four core services: (1) Wholesale clearance stock from 1p/unit, (2) China sourcing agent services including factory verification, quality control, and price negotiation, (3) Sell your excess inventory through our global buyer network, and (4) Export and logistics services including freight forwarding and customs clearance.'
      },
      {
        q: 'How does the Yiwu sourcing agent service work?',
        a: 'Our sourcing agent service follows a clear process: (1) You send us your product requirements, (2) We search the Yiwu market and factories across China for matching suppliers, (3) We verify factories and negotiate prices, (4) We arrange samples for your approval, (5) We conduct quality control inspections, (6) We handle export documentation, freight, and shipping to your destination. The entire process is transparent with no hidden fees.'
      },
      {
        q: 'What products can I buy from CheapALot?',
        a: 'We offer 500+ wholesale products sourced directly from Yiwu, China - the world\'s largest wholesale market. Categories include toys, artificial flowers, jewelry, hair accessories, festive crafts, decorative crafts, photo frames, porcelain and crystal. All products are factory-direct with B2B trade pricing. Minimum order value is £250.'
      },
      {
        q: 'What is the minimum order for wholesale products?',
        a: 'Our minimum order value is £250. There is no minimum quantity per product line - you can mix and match across all categories. This makes it easy for small and medium businesses to access factory-direct pricing from Yiwu.'
      },
      {
        q: 'How long does shipping take from China?',
        a: 'Shipping times depend on the method: Express delivery 3-7 days, Air freight 7-14 days, Sea freight 25-40 days, Rail freight (to Europe) 18-25 days. We ship to 30+ countries worldwide including all of Europe, the Middle East, and North America. We handle all export documentation and customs clearance.'
      },
      {
        q: 'Can I sell my excess inventory through CheapALot?',
        a: 'Yes. If you have excess inventory, customer returns, or liquidation stock to sell, we connect you with buyers in our global network across 30+ countries. Simply submit your stock details and receive a valuation within 24 hours. There are no upfront fees.'
      },
    ],
    es: [
      {
        q: 'Que es CheapALot y que servicios ofrecen?',
        a: 'CheapALot es una plataforma B2B basada en Yiwu con mas de 20 anos de experiencia en exportacion. Ofrecemos cuatro servicios principales: (1) Stock de liquidacion desde 1p/unidad, (2) Servicios de agente de compras en China, (3) Venta de inventario excedente a traves de nuestra red global, (4) Servicios de exportacion y logistica.'
      },
      {
        q: 'Como funciona el servicio de agente de compras en Yiwu?',
        a: 'Nuestro proceso: (1) Nos envia sus requisitos, (2) Buscamos en el mercado de Yiwu y fabricas en China, (3) Verificamos fabricas y negociamos precios, (4) Organizamos muestras, (5) Realizamos control de calidad, (6) Manejamos documentacion de exportacion y envio.'
      },
      {
        q: 'Cual es el pedido minimo para productos mayoristas?',
        a: 'Nuestro pedido minimo es de £250. No hay cantidad minima por linea de producto - puede mezclar y combinar en todas las categorias. Pedido minimo para empresas B2B.'
      },
      {
        q: 'Cuanto tarda el envio desde China?',
        a: 'Los tiempos de envio dependen del metodo: Express 3-7 dias, Aereo 7-14 dias, Maritimo 25-40 dias, Ferroviario (a Europa) 18-25 dias. Enviamos a mas de 30 paises en todo el mundo.'
      },
    ],
    ar: [
      {
        q: 'ما هو CheapALot وما الخدمات التي تقدمونها؟',
        a: 'CheapALot هو منصة تجارة B2B مقرها في ييوو بأكثر من 20 عاماً من الخبرة في التصدير. نقدم أربع خدمات رئيسية: (1) مخزون تصفية من 1 بنس للوحدة، (2) خدمات وكيل مشتريات في الصين، (3) بيع المخزون الفائض عبر شبكتنا العالمية، (4) خدمات التصدير واللوجستيات.'
      },
      {
        q: 'كيف تعمل خدمة وكيل المشتريات في ييوو؟',
        a: 'عمليتنا: (1) ترسل لنا متطلباتك، (2) نبحث في سوق ييوو والمصانع في الصين، (3) نتحقق من المصانع ونفاوض على الأسعار، (4) نرتب العينات، (5) نقوم بمراقبة الجودة، (6) نتولى وثائق التصدير والشحن.'
      },
      {
        q: 'ما هو الحد الأدنى للطلب للمنتجات بالجملة؟',
        a: 'الحد الأدنى للطلب هو £250. لا يوجد حد أدنى لكمية كل منتج - يمكنك المزج بين جميع الفئات. للشركات B2B فقط.'
      },
      {
        q: 'كم يستغرق الشحن من الصين؟',
        a: 'تعتمد أوقات الشحن على الطريقة: السريع 3-7 أيام، الجوي 7-14 يوم، البحري 25-40 يوم، القطاري (إلى أوروبا) 18-25 يوم. نشحن إلى أكثر من 30 دولة في جميع أنحاء العالم.'
      },
    ],
  };

  const langFaqs = faqs[page.lang] || faqs.en;
  const mainEntity = langFaqs.map(f => `            {
                "@type": "Question",
                "name": "${f.q}",
                "acceptedAnswer": { "@type": "Answer", "text": "${f.a}" }
            }`).join(',\n');

  return `    <script type="application/ld+json">
    {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
${mainEntity}
        ]
    }
    </script>`;
}

function buildHowToSchema(page) {
  // GEO: HowTo schema for sourcing process - great for AI citation
  const steps = {
    en: [
      { name: 'Send Product Requirements', text: 'Email or WhatsApp us your product specifications, quantities, and target prices.' },
      { name: 'Supplier Search', text: 'We search the Yiwu market and factories across China for matching suppliers.' },
      { name: 'Factory Verification', text: 'We verify the supplier\'s business license, production capacity, and quality standards.' },
      { name: 'Price Negotiation', text: 'We negotiate the best factory-direct prices on your behalf.' },
      { name: 'Sample Coordination', text: 'We arrange samples for your approval before bulk ordering.' },
      { name: 'Quality Control', text: 'We conduct pre-shipment quality inspections at the factory.' },
      { name: 'Export & Shipping', text: 'We handle export documentation, freight forwarding, and customs clearance to your destination.' },
    ],
    es: [
      { name: 'Enviar Requisitos', text: 'Envienos por email o WhatsApp sus especificaciones de producto, cantidades y precios objetivo.' },
      { name: 'Busqueda de Proveedores', text: 'Buscamos en el mercado de Yiwu y fabricas en China proveedores que coincidan.' },
      { name: 'Verificacion de Fabrica', text: 'Verificamos la licencia comercial del proveedor, capacidad de produccion y estandares de calidad.' },
      { name: 'Negociacion de Precios', text: 'Negociamos los mejores precios directos de fabrica en su nombre.' },
      { name: 'Coordinacion de Muestras', text: 'Organizamos muestras para su aprobacion antes del pedido al por mayor.' },
      { name: 'Control de Calidad', text: 'Realizamos inspecciones de calidad antes del envio en la fabrica.' },
      { name: 'Exportacion y Envio', text: 'Manejamos documentacion de exportacion, flete y despacho de aduanas.' },
    ],
    ar: [
      { name: 'إرسال المتطلبات', text: 'أرسل لنا عبر البريد الإلكتروني أو واتساب مواصفات المنتج والكميات والأسعار المستهدفة.' },
      { name: 'البحث عن الموردين', text: 'نبحث في سوق ييوو والمصانع في الصين عن موردين مطابقين.' },
      { name: 'التحقق من المصنع', text: 'نتحقق من رخصة العمل للمورد وقدرة الإنتاج ومعايير الجودة.' },
      { name: 'تفاوض الأسعار', text: 'نفاوض على أفضل الأسعار المباشرة من المصنع نيابة عنك.' },
      { name: 'تنسيق العينات', text: 'نرتب العينات للموافقة عليها قبل الطلب بالجملة.' },
      { name: 'مراقبة الجودة', text: 'نجري فحوصات الجودة قبل الشحن في المصنع.' },
      { name: 'التصدير والشحن', text: 'نتولى وثائق التصدير والشحن وتخليص الجمارك إلى وجهتك.' },
    ],
  };
  const langSteps = steps[page.lang] || steps.en;
  const stepsJson = langSteps.map((s, i) => `            {
                "@type": "HowToStep",
                "position": ${i + 1},
                "name": "${s.name}",
                "text": "${s.text}"
            }`).join(',\n');

  return `    <script type="application/ld+json">
    {
        "@context": "https://schema.org",
        "@type": "HowTo",
        "name": "How to Source Products from Yiwu, China",
        "description": "Step-by-step guide to sourcing products from Yiwu with CheapALot as your China sourcing agent.",
        "totalTime": "PT7D",
        "estimatedCost": {
            "@type": "MonetaryAmount",
            "currency": "GBP",
            "value": "0"
        },
        "step": [
${stepsJson}
        ]
    }
    </script>`;
}

// ─── Main processing function ─────────────────────────────────────────────────

function processFile(filePath, pageKey, page) {
  let html = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // 1. Fix/replace title
  const titleRegex = new RegExp(`<title>[^<]*</title>`);
  if (titleRegex.test(html)) {
    html = html.replace(titleRegex, `<title>${page.title}</title>`);
    modified = true;
  }

  // 2. Add or replace meta description
  const descRegex = /<meta name="description" content="[^"]*">/;
  if (descRegex.test(html)) {
    html = html.replace(descRegex, `<meta name="description" content="${page.desc}">`);
  } else {
    // Insert after viewport
    html = html.replace(
      /(<meta name="viewport"[^>]*>)/,
      `$1\n    <meta name="description" content="${page.desc}">`
    );
  }
  modified = true;

  // 3. Add robots meta if missing
  const robotsRegex = /<meta name="robots"[^>]*>/;
  if (!robotsRegex.test(html)) {
    const robotsContent = page.type === 'home'
      ? 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'
      : 'index, follow, max-image-preview:large';
    html = html.replace(
      /(<meta name="description"[^>]*>)/,
      `$1\n    <meta name="robots" content="${robotsContent}">`
    );
    modified = true;
  } else {
    // Upgrade existing robots meta on home pages
    if (page.type === 'home') {
      html = html.replace(robotsRegex, `<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">`);
    }
  }

  // 4. Add canonical if missing
  const canonicalRegex = /<link rel="canonical"[^>]*>/;
  if (!canonicalRegex.test(html)) {
    html = html.replace(
      /(<meta name="robots"[^>]*>)/,
      `$1\n    <link rel="canonical" href="${BASE_URL}${page.path}">`
    );
    modified = true;
  }

  // 5. Add hreflang if missing (for products pages)
  const hreflangRegex = /<link rel="alternate" hreflang=/;
  if (!hreflangRegex.test(html)) {
    const enUrl = page.lang === 'en' ? page.path : page.path.replace(`/${page.lang}`, '');
    const esUrl = `/es${enUrl}`;
    const arUrl = `/ar${enUrl}`;
    const hreflangTags = `    <link rel="alternate" hreflang="en" href="${BASE_URL}${enUrl}">
    <link rel="alternate" hreflang="es" href="${BASE_URL}${esUrl}">
    <link rel="alternate" hreflang="ar" href="${BASE_URL}${arUrl}">
    <link rel="alternate" hreflang="x-default" href="${BASE_URL}${enUrl}">`;
    html = html.replace(
      /(<link rel="canonical"[^>]*>)/,
      `$1\n${hreflangTags}`
    );
    modified = true;
  } else {
    // Fix missing x-default (es/products.html)
    if (!html.includes('hreflang="x-default"')) {
      const enUrl = page.lang === 'en' ? page.path : page.path.replace(`/${page.lang}`, '');
      html = html.replace(
        /(<link rel="alternate" hreflang="ar"[^>]*>)/,
        `$1\n    <link rel="alternate" hreflang="x-default" href="${BASE_URL}${enUrl}">`
      );
      modified = true;
    }
  }

  // 6. Remove existing OG tags (to replace with better ones)
  html = html.replace(/<!-- Open Graph -->[\s\S]*?(?=\n    \n|\n    <!--|\n    <link)/, '');
  // Also remove standalone OG tags
  const ogTagRegex = /<meta property="og:[^>]*>\n?/g;
  // Only remove if they are NOT inside a comment block
  // Actually, let's be more careful - only remove individual og: tags that are not in the structured block
  
  // 7. Remove existing Twitter Card tags
  const twitterBlockRegex = /<!-- Twitter Card -->\n(?:    <meta name="twitter:[^>]*>\n?)+/;
  if (twitterBlockRegex.test(html)) {
    html = html.replace(twitterBlockRegex, '');
  } else {
    // Remove individual twitter tags
    const twitterTagRegex = /    <meta name="twitter:[^>]*>\n?/g;
    html = html.replace(twitterTagRegex, '');
  }

  // 8. Remove existing JSON-LD blocks that we will replace
  // Keep homepage's existing Organization and WebSite schema, but we'll add more
  if (page.type !== 'home') {
    // Remove any existing JSON-LD blocks on non-home pages
    const jsonLdRegex = /\n?    <script type="application\/ld\+json">[\s\S]*?<\/script>\n?/g;
    html = html.replace(jsonLdRegex, '');
  }

  // 9. Build the SEO injection block
  let seoBlock = '\n    <!-- SEO + GEO Optimization -->\n';
  
  // Open Graph
  seoBlock += buildOG(page) + '\n';
  seoBlock += '\n';
  
  // Twitter Card
  seoBlock += buildTwitter(page) + '\n';
  seoBlock += '\n';
  
  // JSON-LD: Organization (on all pages except home which already has it)
  if (page.type !== 'home') {
    seoBlock += '    <!-- Structured Data: Organization -->\n';
    seoBlock += buildOrganizationSchema() + '\n';
    seoBlock += '\n';
  }
  
  // JSON-LD: BreadcrumbList (on all sub-pages)
  if (page.type !== 'home') {
    seoBlock += '    <!-- Structured Data: BreadcrumbList -->\n';
    seoBlock += buildBreadcrumbSchema(page) + '\n';
    seoBlock += '\n';
  }
  
  // JSON-LD: WebPage schema (GEO)
  const webPageSchema = buildWebPageSchema(page);
  if (webPageSchema) {
    seoBlock += '    <!-- Structured Data: WebPage (GEO) -->\n';
    seoBlock += webPageSchema + '\n';
    seoBlock += '\n';
  }
  
  // JSON-LD: ItemList (products pages)
  if (page.type === 'products') {
    seoBlock += '    <!-- Structured Data: ItemList -->\n';
    seoBlock += buildItemListSchema(page) + '\n';
    seoBlock += '\n';
  }
  
  // JSON-LD: Service (about/sell pages)
  if (page.type === 'about' || page.type === 'sell') {
    seoBlock += '    <!-- Structured Data: Service -->\n';
    seoBlock += buildServiceSchema(page) + '\n';
    seoBlock += '\n';
  }
  
  // JSON-LD: ContactPoint (contact page)
  if (page.type === 'contact') {
    seoBlock += '    <!-- Structured Data: ContactPoint -->\n';
    seoBlock += buildContactPointSchema() + '\n';
    seoBlock += '\n';
  }
  
  // JSON-LD: Enhanced FAQ (on home and about pages, or where not already present)
  if (page.type === 'about' || page.type === 'home') {
    seoBlock += '    <!-- Structured Data: FAQ (GEO - AI Citation Optimized) -->\n';
    seoBlock += buildEnhancedFAQSchema(page) + '\n';
    seoBlock += '\n';
  }
  
  // JSON-LD: HowTo (on about and sell pages - GEO)
  if (page.type === 'about' || page.type === 'sell') {
    seoBlock += '    <!-- Structured Data: HowTo (GEO) -->\n';
    seoBlock += buildHowToSchema(page) + '\n';
    seoBlock += '\n';
  }
  
  // JSON-LD: Speakable (GEO - voice search)
  seoBlock += '    <!-- Structured Data: Speakable (GEO - Voice Search) -->\n';
  seoBlock += buildSpeakableSchema(page) + '\n';

  // 10. Insert SEO block before </head>
  // Find a good insertion point - before the PWA manifest or before </head>
  if (html.includes('<!-- PWA Manifest -->')) {
    html = html.replace('<!-- PWA Manifest -->', seoBlock + '\n    <!-- PWA Manifest -->');
  } else if (html.includes('</head>')) {
    html = html.replace('</head>', seoBlock + '\n</head>');
  } else {
    // Fallback: insert before first <link rel="stylesheet">
    html = html.replace(
      /(<link rel="stylesheet"[^>]*>)/,
      seoBlock + '\n$1'
    );
  }

  modified = true;

  if (modified) {
    fs.writeFileSync(filePath, html, 'utf8');
    console.log(`[OK] ${pageKey} - SEO+GEO optimized`);
    return true;
  } else {
    console.log(`[SKIP] ${pageKey} - no changes needed`);
    return false;
  }
}

// ─── Run ──────────────────────────────────────────────────────────────────────

const projectRoot = path.resolve(__dirname, '..');
let totalProcessed = 0;
let totalModified = 0;

console.log('=== CheapALot SEO + GEO Optimization ===\n');

for (const [pageKey, page] of Object.entries(pages)) {
  const filePath = path.join(projectRoot, pageKey);
  
  if (!fs.existsSync(filePath)) {
    console.log(`[MISS] ${pageKey} - file not found`);
    continue;
  }
  
  totalProcessed++;
  if (processFile(filePath, pageKey, page)) {
    totalModified++;
  }
}

console.log(`\n=== Done: ${totalModified}/${totalProcessed} files optimized ===`);
