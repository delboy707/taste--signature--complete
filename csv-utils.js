// ===== SHARED CSV UTILITIES =====
//
// Canonical CSV parsing + sanitization, shared by batch-import.js and
// consumer-panel.js. Previously each file declared its own local
// `parseCSVLine`, and the two had diverged: consumer-panel.js's version
// dropped doubled quotes (RFC4180 `""` escaping) instead of collapsing
// them to a single literal `"`, and never ran values through
// sanitizeCsvValue()'s formula-injection guard. Consolidated here to a
// single, correct implementation (previously batch-import.js's) so both
// callers share one behavior and there is no shadow copy to drift again -
// see commit 9027bbf for the last outage caused by this kind of
// global-scope collision between two same-named top-level declarations.

/**
 * Sanitize CSV cell value to prevent formula injection.
 * Strips leading =, +, -, @, \t, \r characters from cell values.
 */
function sanitizeCsvValue(value) {
    if (typeof value !== 'string') return value;
    // Strip formula injection characters from the start of cell values
    return value.replace(/^[=+\-@\t\r]+/, '');
}

/**
 * Parse a single CSV line (handles quoted values, RFC4180 doubled-quote
 * escaping, and sanitizes every field via sanitizeCsvValue()).
 */
function parseCSVLine(line) {
    const values = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const nextChar = line[i + 1];

        if (char === '"') {
            if (inQuotes && nextChar === '"') {
                current += '"';
                i++; // Skip next quote
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            values.push(sanitizeCsvValue(current.trim()));
            current = '';
        } else {
            current += char;
        }
    }

    values.push(sanitizeCsvValue(current.trim()));
    return values;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { parseCSVLine, sanitizeCsvValue };
}
if (typeof window !== 'undefined') {
    window.CsvUtils = { parseCSVLine, sanitizeCsvValue };
}
