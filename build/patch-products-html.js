/**
 * patch-products-html.js — Replace static product cards with dynamic loader
 * Patches: products.html, es/products.html, ar/products.html
 */
const fs = require('fs');
const path = require('path');

const files = [
    'products.html',
    'es/products.html',
    'ar/products.html'
];

const basePath = path.resolve(__dirname, '..');

files.forEach(function(file) {
    const filePath = path.join(basePath, file);
    if (!fs.existsSync(filePath)) { console.log('SKIP (not found): ' + file); return; }
    
    let html = fs.readFileSync(filePath, 'utf8');
    console.log('Processing ' + file + ' (' + html.length + ' chars)...');
    
    // 1. Add id="categoryFilters" to the category filter group and clear static checkboxes
    // Find: <div class="filter-group">\n                <h4>Category</h4>
    // Replace the category filter group content
    html = html.replace(
        /(<div class="filter-group">)\s*\n\s*<h4>Category<\/h4>[\s\S]*?<\/div>/,
        '$1\n                <h4>Category</h4>\n                <div id="categoryFilters"></div>\n            </div>'
    );
    
    // 2. Replace the entire product-grid content (from <div class="product-grid"> to its closing </div> before pagination)
    // The grid starts at '            <div class="product-grid">' and ends before '            <div class="pagination">'
    const gridStart = html.indexOf('<div class="product-grid">');
    const paginationStart = html.indexOf('<div class="pagination">');
    
    if (gridStart !== -1 && paginationStart !== -1) {
        // Extract the part before grid, and after pagination
        const beforeGrid = html.substring(0, gridStart);
        const afterPagination = html.substring(paginationStart);
        
        // Build new middle section
        const newMiddle = '<div id="productGrid" class="product-grid"></div>\n\n            \n            ';
        
        // Replace pagination with dynamic one
        const afterGrid = afterPagination.replace(
            /<div class="pagination">[\s\S]*?<\/div>/,
            '<div id="pagination" class="pagination"></div>'
        );
        
        html = beforeGrid + newMiddle + afterGrid;
        console.log('  ✓ Replaced product grid and pagination');
    } else {
        console.log('  ✗ Could not find product-grid or pagination markers');
    }
    
    // 3. Update toolbar-info to be empty (will be filled by loader)
    html = html.replace(
        /<div class="toolbar-info">[\s\S]*?<\/div>/,
        '<div class="toolbar-info">Loading...</div>'
    );
    
    // 4. Add products-loader.js script before </body>
    if (html.indexOf('products-loader.js') === -1) {
        // Add before the main.js script or before </body>
        if (file.startsWith('es/') || file.startsWith('ar/')) {
            html = html.replace(
                /<script src="..\/js\/main\.js"><\/script>/,
                '<script src="../js/products-loader.js"></script>\n    <script src="../js/main.js"></script>'
            );
        } else {
            html = html.replace(
                /<script src="js\/main\.js"><\/script>/,
                '<script src="js/products-loader.js"></script>\n    <script src="js/main.js"></script>'
            );
        }
        console.log('  ✓ Added products-loader.js script');
    }
    
    fs.writeFileSync(filePath, html, 'utf8');
    console.log('  ✓ Saved (' + html.length + ' chars, was ~10K lines → now much smaller)\n');
});

console.log('Done! All products.html files patched.');
