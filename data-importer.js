// ===== DATA IMPORTER MODULE =====
// Handles Excel/CSV import and mapping to Taste Signature framework

// Emotional mapping based on Taste Signature methodology
const EMOTIONAL_MAPPING = {
    // Excitement-based emotions
    'excitement': { needState: 'reward', triggers: { moreishness: 7, refreshment: 6, melt: 4, crunch: 7 } },
    'adventure': { needState: 'reward', triggers: { moreishness: 8, refreshment: 7, melt: 3, crunch: 6 } },
    'freshness': { needState: 'rejuvenation', triggers: { moreishness: 5, refreshment: 9, melt: 2, crunch: 5 } },
    'energizing': { needState: 'rejuvenation', triggers: { moreishness: 6, refreshment: 8, melt: 3, crunch: 6 } },

    // Comfort-based emotions
    'comfort': { needState: 'escape', triggers: { moreishness: 8, refreshment: 3, melt: 8, crunch: 4 } },
    'warmth': { needState: 'escape', triggers: { moreishness: 7, refreshment: 2, melt: 8, crunch: 3 } },
    'nostalgia': { needState: 'escape', triggers: { moreishness: 9, refreshment: 3, melt: 7, crunch: 5 } },
    'relaxation': { needState: 'escape', triggers: { moreishness: 6, refreshment: 5, melt: 9, crunch: 2 } },

    // Indulgence-based emotions
    'indulgence': { needState: 'reward', triggers: { moreishness: 9, refreshment: 3, melt: 9, crunch: 4 } },
    'luxury': { needState: 'reward', triggers: { moreishness: 8, refreshment: 4, melt: 9, crunch: 5 } },

    // Social emotions
    'joy': { needState: 'sociability', triggers: { moreishness: 7, refreshment: 6, melt: 6, crunch: 5 } },

    // Refreshing emotions
    'refreshing': { needState: 'rejuvenation', triggers: { moreishness: 5, refreshment: 10, melt: 3, crunch: 4 } },
    'cooling': { needState: 'rejuvenation', triggers: { moreishness: 4, refreshment: 9, melt: 5, crunch: 3 } },

    // Curiosity
    'curiosity': { needState: 'reward', triggers: { moreishness: 7, refreshment: 5, melt: 5, crunch: 6 } },

    // Energy
    'energy': { needState: 'rejuvenation', triggers: { moreishness: 6, refreshment: 7, melt: 4, crunch: 7 } },

    // Calm
    'calm': { needState: 'escape', triggers: { moreishness: 5, refreshment: 6, melt: 8, crunch: 2 } }
};

// Taste profile to sensory attributes mapping
const TASTE_PROFILE_MAPPING = {
    'sweet': { appearance: 7, aroma: 8, front: 9, mid: 7, after: 6 },
    'spicy': { appearance: 5, aroma: 7, front: 8, mid: 9, after: 7 },
    'citrus': { appearance: 8, aroma: 9, front: 9, mid: 7, after: 8 },
    'citrusy': { appearance: 8, aroma: 9, front: 9, mid: 7, after: 8 },
    'sour': { appearance: 6, aroma: 7, front: 9, mid: 7, after: 6 },
    'bitter': { appearance: 5, aroma: 6, front: 6, mid: 8, after: 9 },
    'bitter-sweet': { appearance: 6, aroma: 7, front: 7, mid: 8, after: 8 },
    'salty': { appearance: 5, aroma: 5, front: 8, mid: 7, after: 6 },
    'umami': { appearance: 5, aroma: 6, front: 7, mid: 9, after: 8 },
    'savory': { appearance: 5, aroma: 7, front: 7, mid: 8, after: 7 },
    'creamy': { appearance: 6, aroma: 6, front: 7, mid: 8, after: 7 },
    'nutty': { appearance: 6, aroma: 8, front: 7, mid: 8, after: 7 },
    'floral': { appearance: 8, aroma: 9, front: 7, mid: 6, after: 7 },
    'fruity': { appearance: 8, aroma: 9, front: 8, mid: 7, after: 6 },
    'herbal': { appearance: 7, aroma: 8, front: 7, mid: 7, after: 8 },
    'smoky': { appearance: 6, aroma: 8, front: 7, mid: 8, after: 9 },
    'earthy': { appearance: 5, aroma: 7, front: 6, mid: 8, after: 8 },
    'rich': { appearance: 6, aroma: 7, front: 7, mid: 9, after: 8 },
    'tart': { appearance: 7, aroma: 7, front: 9, mid: 7, after: 6 },
    'tangy': { appearance: 7, aroma: 8, front: 9, mid: 7, after: 6 },
    'cooling': { appearance: 7, aroma: 6, front: 8, mid: 7, after: 8 },
    'refreshing': { appearance: 8, aroma: 8, front: 9, mid: 7, after: 8 },
    'crunchy': { appearance: 7, aroma: 6, front: 8, mid: 7, after: 5 },
    'tropical': { appearance: 9, aroma: 9, front: 8, mid: 7, after: 6 },
    'robust': { appearance: 6, aroma: 8, front: 7, mid: 9, after: 8 },
    'sparkling': { appearance: 8, aroma: 7, front: 9, mid: 7, after: 7 }
};

// Product category mapping
const CATEGORY_MAPPING = {
    'snack': 'snack',
    'beverage': 'beverage',
    'dessert': 'dessert',
    'confectionery': 'confectionery',
    'cereal snack': 'snack'
};

/**
 * Map imported flavor concept to Taste Signature experience
 */
function mapFlavorConceptToExperience(concept) {
    // Parse emotional resonance
    const emotions = concept.Emotional_Resonance.toLowerCase().split(',').map(e => e.trim());
    const primaryEmotion = emotions[0];
    const emotionalProfile = EMOTIONAL_MAPPING[primaryEmotion] || EMOTIONAL_MAPPING['comfort'];

    // Parse taste profile
    const tasteAttributes = concept.Taste_Profile.toLowerCase().split(',').map(t => t.trim());
    const intensityProfile = calculateIntensityProfile(tasteAttributes);

    // Create experience object
    const experience = {
        id: Date.now() + Math.random(),
        timestamp: new Date().toISOString(),
        productInfo: {
            name: concept.Flavor_Name,
            brand: 'Imported Concept',
            type: CATEGORY_MAPPING[concept.Target_Product_Category.toLowerCase()] || 'food',
            variant: concept.Primary_Ingredients
        },
        stages: {
            appearance: {
                visualAppeal: intensityProfile.appearance,
                colorIntensity: intensityProfile.appearance,
                overallIntensity: intensityProfile.appearance,
                emotions: {
                    anticipation: Math.min(10, intensityProfile.appearance + 1),
                    desire: intensityProfile.appearance,
                    excitement: emotionalProfile.needState === 'reward' ? 7 : 5,
                    happiness: 6,
                    curiosity: tasteAttributes.length >= 3 ? 7 : 5
                }
            },
            aroma: {
                intensity: intensityProfile.aroma,
                sweetness: tasteAttributes.includes('sweet') ? 8 : 5,
                complexity: tasteAttributes.length >= 3 ? 8 : 6,
                overallIntensity: intensityProfile.aroma,
                emotions: {
                    pleasure: intensityProfile.aroma,
                    comfort: emotionalProfile.triggers.melt,
                    nostalgia: emotions.includes('nostalgia') ? 8 : 4,
                    happiness: 6,
                    energy: emotionalProfile.needState === 'rejuvenation' ? 7 : 5,
                    relaxation: emotionalProfile.needState === 'escape' ? 7 : 4
                }
            },
            frontMouth: {
                sweetness: tasteAttributes.includes('sweet') ? 8 : 5,
                sourness: tasteAttributes.some(t => ['sour', 'tart', 'citrus', 'citrusy', 'tangy'].includes(t)) ? 7 : 3,
                saltiness: tasteAttributes.includes('salty') || tasteAttributes.includes('savory') ? 7 : 3,
                texture: emotionalProfile.triggers.crunch,
                overallIntensity: intensityProfile.front,
                emotions: {
                    excitement: emotionalProfile.needState === 'reward' ? 8 : 6,
                    satisfaction: 7
                }
            },
            midRearMouth: {
                bitterness: tasteAttributes.some(t => ['bitter', 'bitter-sweet'].includes(t)) ? 7 : 3,
                umami: tasteAttributes.includes('umami') || tasteAttributes.includes('savory') ? 8 : 4,
                richness: tasteAttributes.some(t => ['rich', 'creamy', 'robust'].includes(t)) ? 8 : 5,
                creaminess: tasteAttributes.includes('creamy') ? 9 : 4,
                overallIntensity: intensityProfile.mid,
                emotions: {
                    indulgence: emotionalProfile.triggers.melt,
                    comfort: emotionalProfile.triggers.melt
                }
            },
            aftertaste: {
                duration: intensityProfile.after >= 7 ? 8 : 6,
                pleasantness: 8,
                cleanness: emotionalProfile.triggers.refreshment,
                overallIntensity: intensityProfile.after,
                emotions: {
                    satisfaction: 8,
                    completeness: 7
                }
            }
        },
        needState: emotionalProfile.needState,
        emotionalTriggers: emotionalProfile.triggers,
        notes: `Imported from TasteAI. Market trend: ${concept.Market_Trend_Alignment}`
    };

    return experience;
}

/**
 * Calculate intensity profile across consumption stages based on taste attributes
 */
function calculateIntensityProfile(tasteAttributes) {
    let profile = {
        appearance: 6,
        aroma: 6,
        front: 6,
        mid: 6,
        after: 6
    };

    // Aggregate intensity from all taste attributes
    tasteAttributes.forEach(attribute => {
        const mapping = TASTE_PROFILE_MAPPING[attribute];
        if (mapping) {
            profile.appearance = Math.max(profile.appearance, mapping.appearance);
            profile.aroma = Math.max(profile.aroma, mapping.aroma);
            profile.front = Math.max(profile.front, mapping.front);
            profile.mid = Math.max(profile.mid, mapping.mid);
            profile.after = Math.max(profile.after, mapping.after);
        }
    });

    return profile;
}

/**
 * Parse CSV file
 */
function parseCSV(csvText) {
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));

    const data = [];
    for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        if (values.length === headers.length) {
            const row = {};
            headers.forEach((header, idx) => {
                row[header] = values[idx];
            });
            data.push(row);
        }
    }

    return data;
}

/**
 * Parse a CSV line handling quoted values
 */
function parseCSVLine(line) {
    const values = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            values.push(current.trim().replace(/^"|"$/g, ''));
            current = '';
        } else {
            current += char;
        }
    }

    values.push(current.trim().replace(/^"|"$/g, ''));
    return values;
}

/**
 * Handle file import
 */
function handleFileImport(file, callback) {
    const reader = new FileReader();

    reader.onload = function(e) {
        const content = e.target.result;
        let data = [];

        if (file.name.endsWith('.csv')) {
            data = parseCSV(content);
        } else if (file.name.endsWith('.json')) {
            data = JSON.parse(content);
        }

        // Map to experiences
        const experiences = data.map(item => {
            // Check if it's already in our format
            if (item.productInfo && item.stages) {
                return item;
            }
            // Otherwise, map from flavor concept format
            return mapFlavorConceptToExperience(item);
        });

        callback(experiences);
    };

    reader.readAsText(file);
}

// Export functions
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        mapFlavorConceptToExperience,
        parseCSV,
        handleFileImport,
        EMOTIONAL_MAPPING,
        TASTE_PROFILE_MAPPING
    };
}
