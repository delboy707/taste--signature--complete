// ===== DISPLAY FORMAT (pure helpers) =====
// Shared by the AI prompt builders (claude-api.js, sensory-inference.js),
// the dashboard/insight strings (app.js) and every reader of a product's
// category. No DOM access, so it runs in Node tests too.
//
// Ratings: a 0-10 rating is a finite number. null/undefined (an untouched
// slider, a CATA stage, a field this experience does not have) is
// "Not rated" - never "null/10" or "undefined/10". A rated 0 is "0/10".
// Same rules as pdf-export.js's PDFExporter helpers (PR #52).
//
// Category: the app stores it as productInfo.type (manual entry, Quick
// Entry, Excel import, demo data). CSV imports before 2026-09-26 stored only
// productInfo.category, and those records stay as they are in Firestore, so
// readers take type first, then category.
//
// Exposed as window.DisplayFormat in the browser and via module.exports in Node.

(function () {
  function isRated(value) {
    return typeof value === 'number' && Number.isFinite(value);
  }

  function formatRating(value) {
    return isRated(value) ? `${value}/10` : 'Not rated';
  }

  /** The first rated value among keys on an object (a stage), else null. */
  function firstRating(obj, keys) {
    if (!obj || typeof obj !== 'object') return null;
    for (const key of keys) {
      if (isRated(obj[key])) return obj[key];
    }
    return null;
  }

  /** A number, or a numeric string from a raw data row ("7", "6.5"); else null. */
  function toRating(value) {
    if (isRated(value)) return value;
    if (typeof value === 'string' && value.trim() !== '') {
      const n = Number(value.trim());
      return Number.isFinite(n) ? n : null;
    }
    return null;
  }

  /** Mean of the rated values, or null when none is rated. */
  function averageRating(values) {
    let sum = 0;
    let count = 0;
    (values || []).forEach(v => {
      if (isRated(v)) { sum += v; count++; }
    });
    return count > 0 ? sum / count : null;
  }

  // Per-stage intensity field, the one the Shape of Taste chart plots
  // (same map as PDFExporter.STAGE_INTENSITY_KEYS); legacy data (demo) has
  // overallIntensity instead.
  const STAGE_INTENSITY_KEYS = {
    appearance: 'visualAppeal',
    aroma: 'smellStrength',
    frontMouth: 'overallInitialImpact',
    midRearMouth: 'overallMidPalateIntensity',
    texture: 'overallTexturalComplexity',
    aftertaste: 'finishLength'
  };

  function stageIntensity(stageKey, stage) {
    const headline = STAGE_INTENSITY_KEYS[stageKey];
    return firstRating(stage, headline ? [headline, 'overallIntensity'] : ['overallIntensity']);
  }

  /** productInfo.type, else productInfo.category, else null (blank counts as missing). */
  function productCategory(productInfo) {
    if (!productInfo) return null;
    for (const key of ['type', 'category']) {
      const v = productInfo[key];
      if (typeof v === 'string' && v.trim() !== '') return v;
    }
    return null;
  }

  /** Category for display: never "undefined"/"null". */
  function categoryText(productInfo) {
    return productCategory(productInfo) || 'Not specified';
  }

  const api = {
    isRated, formatRating, firstRating, toRating, averageRating,
    STAGE_INTENSITY_KEYS, stageIntensity, productCategory, categoryText
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.DisplayFormat = api;
})();
