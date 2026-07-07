#!/bin/bash
# replace_form_ids.sh - Replace all "your-form-id" placeholders with actual Formspree IDs
set -e

cd "$(dirname "$0")/.."

INQUIRY="mgojqdyy"
SOURCING="xqevjnlz"
SELL="xeebdnza"
CONTACT="xdarjbdr"
EXIT_POPUP="mqevjndz"

echo "════════════════════════════════════════════════════"
echo "  Form ID Replacement Script"
echo "════════════════════════════════════════════════════"
echo ""

replace_simple_file() {
    local file="$1"
    local form_id="$2"
    if [ ! -f "$file" ]; then return; fi
    local count=$(grep -c "your-form-id" "$file" 2>/dev/null || echo 0)
    if [ "$count" -gt 0 ]; then
        perl -i -pe "s|https://formspree\.io/f/your-form-id|https://formspree.io/f/${form_id}|g" "$file"
        echo "  ✅ $file → $form_id ($count forms)"
    fi
}

for lang_dir in "" "es/" "ar/"; do
    echo "📁 ${lang_dir:-EN}/"
    replace_simple_file "${lang_dir}sell.html" "$SELL"
    replace_simple_file "${lang_dir}contact.html" "$CONTACT"

    # Special handling for index.html - 4 different forms in order
    index_path="${lang_dir}index.html"
    if [ -f "$index_path" ]; then
        perl -i -pe "
            BEGIN { \$count = 0; }
            if (/your-form-id/) {
                \$count++;
                if (\$count == 1) { s|https://formspree\.io/f/your-form-id|https://formspree.io/f/${INQUIRY}|g; }
                elsif (\$count == 2) { s|https://formspree\.io/f/your-form-id|https://formspree.io/f/${SOURCING}|g; }
                elsif (\$count == 3) { s|https://formspree\.io/f/your-form-id|https://formspree.io/f/${INQUIRY}|g; }
                elsif (\$count == 4) { s|https://formspree\.io/f/your-form-id|https://formspree.io/f/${EXIT_POPUP}|g; }
            }
        " "$index_path"
        echo "  ✅ $index_path → 4 forms (INQUIRY+SOURCING+INQUIRY+EXIT_POPUP)"
    fi
    echo ""
done

echo "════════════════════════════════════════════════════"
echo "  ✅ All form IDs replaced!"
echo "════════════════════════════════════════════════════"
echo ""

# Verify
remaining=$(grep -rl "your-form-id" --include="*.html" . 2>/dev/null | wc -l | tr -d ' ')
echo "📊 Files with remaining 'your-form-id': $remaining"
echo ""
echo "📋 Form ID distribution:"
for f in index.html sell.html contact.html es/index.html es/sell.html es/contact.html ar/index.html ar/sell.html ar/contact.html; do
    if [ -f "$f" ]; then
        echo ""
        echo "  $f:"
        grep -oE 'https://formspree\.io/f/[a-z]{8}' "$f" | sort | uniq -c | sed 's/^/    /'
    fi
done
