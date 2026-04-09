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
                'visual-appeal': intensityProfile.appearance,
                'color-richness': intensityProfile.appearance,
                'bubble-activity': tasteAttributes.some(t => ['sparkling', 'carbonated', 'fizzy'].includes(t)) ? 8 : 0,
                emotions: {
                    anticipation: Math.min(10, intensityProfile.appearance + 1),
                    desire: intensityProfile.appearance,
                    excitement: emotionalProfile.needState === 'reward' ? 7 : 5,
                    happiness: 6,
                    curiosity: tasteAttributes.length >= 3 ? 7 : 5
                }
            },
            aroma: {
                'smell-strength': intensityProfile.aroma,
                'caramel-toffee-notes': tasteAttributes.includes('sweet') ? 8 : 0,
                'fruity-notes': tasteAttributes.some(t => ['fruity', 'citrus', 'citrusy', 'tropical'].includes(t)) ? 8 : 0,
                'smell-complexity': tasteAttributes.length >= 3 ? 8 : 5,
                'smell-duration': intensityProfile.aroma,
                emotions: {
                    pleasure: intensityProfile.aroma,
                    comfort: emotionalProfile.triggers.melt,
                    nostalgia: emotions.includes('nostalgia') ? 8 : 0,
                    happiness: 6,
                    energized: emotionalProfile.needState === 'rejuvenation' ? 7 : 0,
                    relaxed: emotionalProfile.needState === 'escape' ? 7 : 0
                }
            },
            frontMouth: {
                sweetness: tasteAttributes.includes('sweet') ? 8 : 0,
                'sourness-tartness': tasteAttributes.some(t => ['sour', 'tart', 'citrus', 'citrusy', 'tangy'].includes(t)) ? 7 : 0,
                saltiness: tasteAttributes.includes('salty') || tasteAttributes.includes('savory') ? 7 : 0,
                'spicy-heat': tasteAttributes.some(t => ['spicy', 'hot', 'fiery'].includes(t)) ? 7 : 0,
                'overall-initial-impact': intensityProfile.front,
                emotions: {
                    excitement: emotionalProfile.needState === 'reward' ? 8 : 6,
                    satisfaction: 7
                }
            },
            midRearMouth: {
                'bitterness-development': tasteAttributes.some(t => ['bitter', 'bitter-sweet'].includes(t)) ? 7 : 0,
                'umami-savoury-depth': tasteAttributes.includes('umami') || tasteAttributes.includes('savory') ? 8 : 0,
                'richness-fullness': tasteAttributes.some(t => ['rich', 'creamy', 'robust'].includes(t)) ? 8 : 5,
                'overall-mid-palate-intensity': intensityProfile.mid,
                emotions: {
                    indulgence: emotionalProfile.triggers.melt,
                    comfort: emotionalProfile.triggers.melt
                }
            },
            texture: {
                creaminess: tasteAttributes.includes('creamy') ? 9 : 0,
                crunchiness: tasteAttributes.includes('crunchy') ? 8 : 0,
                smoothness: tasteAttributes.some(t => ['creamy', 'smooth'].includes(t)) ? 7 : 0,
                'overall-textural-complexity': 5,
                emotions: { satisfied: 7, pleased: 6 }
            },
            aftertaste: {
                'finish-length': intensityProfile.after >= 7 ? 8 : 6,
                'finish-quality': 8,
                'finish-cleanness': emotionalProfile.triggers.refreshment,
                emotions: { satisfaction: 8, completeness: 7, 'craving-want-more': emotionalProfile.triggers.moreishness }
            },
            overallAssessment: {
                'overall-quality': Math.round((intensityProfile.appearance + intensityProfile.aroma + intensityProfile.front + intensityProfile.mid + intensityProfile.after) / 5),
                'satisfaction-overall': 7,
                craveability: emotionalProfile.triggers.moreishness,
                emotions: { satisfaction: 8, happiness: 7, enjoyment: 7 }
            }
        },
        needState: emotionalProfile.needState,
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
 * Parse CSV file with automatic title row detection
 */
function parseCSV(csvText) {
    const lines = csvText.trim().split('\n');

    // Detect if first line is a title row (has very few columns compared to second line)
    let headerLineIndex = 0;
    const firstLineCols = lines[0].split(',').length;
    const secondLineCols = lines.length > 1 ? lines[1].split(',').length : 0;

    // If first line has significantly fewer columns, it's likely a title row
    if (secondLineCols > firstLineCols * 2 && firstLineCols <= 3) {
        console.log('Detected title row, skipping to line 2 for headers');
        headerLineIndex = 1;
    }

    const headers = lines[headerLineIndex].split(',').map(h => h.trim().replace(/^"|"$/g, ''));

    const data = [];
    for (let i = headerLineIndex + 1; i < lines.length; i++) {
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
 * Create default stages structure from the active lexicon.
 * All attributes default to 0. Falls back to a minimal structure if lexicon unavailable.
 */
function createDefaultStages() {
    if (typeof getActiveLexicon === 'function') {
        const lexicon = getActiveLexicon();
        const stages = {};
        lexicon.stages.forEach(stage => {
            stages[stage.id] = { emotions: {} };
            stage.attributes.forEach(attr => {
                stages[stage.id][attr.id] = attr.defaultValue ?? 0;
            });
            stage.emotions.forEach(emotion => {
                stages[stage.id].emotions[emotion] = 0;
            });
        });
        return stages;
    }

    // Minimal fallback using current lexicon attribute IDs
    return {
        appearance: {
            'visual-appeal': 0, 'color-richness': 0, 'bubble-activity': 0,
            emotions: { anticipation: 0, curiosity: 0, desire: 0, excitement: 0 }
        },
        aroma: {
            'smell-strength': 0, 'smell-complexity': 0, 'caramel-toffee-notes': 0,
            emotions: { pleasure: 0, comfort: 0, nostalgia: 0, intrigued: 0 }
        },
        frontMouth: {
            'sweetness': 0, 'sourness-tartness': 0, 'saltiness': 0,
            'spicy-heat': 0, 'overall-initial-impact': 0,
            emotions: { excitement: 0, satisfaction: 0, happiness: 0, pleasure: 0 }
        },
        midRearMouth: {
            'bitterness-development': 0, 'umami-savoury-depth': 0,
            'richness-fullness': 0, 'overall-mid-palate-intensity': 0,
            emotions: { indulgence: 0, comfort: 0, satisfaction: 0, pleasure: 0 }
        },
        texture: {
            'smoothness': 0, 'creaminess': 0, 'crunchiness': 0,
            'overall-textural-complexity': 0,
            emotions: { satisfied: 0, pleased: 0, comforted: 0, excited: 0 }
        },
        aftertaste: {
            'finish-length': 0, 'finish-quality': 0, 'finish-cleanness': 0,
            emotions: { satisfaction: 0, completeness: 0, happiness: 0, 'craving-want-more': 0 }
        },
        overallAssessment: {
            'overall-quality': 0, 'satisfaction-overall': 0, 'balance': 0, 'craveability': 0,
            emotions: { satisfaction: 0, happiness: 0, pleasure: 0, enjoyment: 0 }
        }
    };
}

/**
 * Create a basic experience from generic CSV data
 * Handles flexible column names
 */
function createBasicExperience(item) {
    // Find product name from common column names (case-sensitive)
    const name = item.Flavor_Name || item.Name || item.name || item.Product || item.product ||
                 item.ProductName || item.product_name || item.Product_Name ||
                 item['Product Name'] || item['product name'] ||
                 item.Item || item.item || item.Title || item.title;

    if (!name) return null;

    // Find brand
    const brand = item.Brand || item.brand || item['Brand Name'] || item.Manufacturer ||
                  item.manufacturer || 'Unknown';

    // Find category/type
    const type = item.Category || item.category || item.Type || item.type ||
                 item['Product Category'] || item['product category'] || 'food';

    // Find variant/flavor
    const variant = item.Variant || item.variant || item.Flavor || item.flavor ||
                    item.Description || item.description || '';

    // Create minimal experience with defaults
    return {
        id: Date.now() + Math.random(),
        timestamp: new Date().toISOString(),
        productInfo: {
            name: name,
            brand: brand,
            type: type.toLowerCase(),
            variant: variant
        },
        stages: createDefaultStages(),
        needState: 'reward',
        notes: 'Imported - requires evaluation'
    };
}

/**
 * Handle file import with flexible format detection
 */
function handleFileImport(file, callback) {
    const reader = new FileReader();

    reader.onload = async function(e) {
        const content = e.target.result;
        let data = [];

        try {
            if (file.name.endsWith('.csv')) {
                data = parseCSV(content);
            } else if (file.name.endsWith('.json')) {
                data = JSON.parse(content);
            }

            if (!data || data.length === 0) {
                console.warn('No data parsed from file');
                callback([]);
                return;
            }

            // Check if data is already in experience format
            if (data[0].productInfo && data[0].stages) {
                callback(data);
                return;
            }

            // Check if data matches TasteAI format (has required columns)
            if (data[0].Flavor_Name && data[0].Emotional_Resonance && data[0].Taste_Profile) {
                const experiences = data.map(item => mapFlavorConceptToExperience(item));
                callback(experiences);
                return;
            }

            // Otherwise, use AutoProcessor for flexible format handling
            if (typeof AutoProcessor !== 'undefined') {
                try {
                    console.log('Using AutoProcessor for flexible import');
                    const result = await AutoProcessor.processUploadedData(data, { runEmotionInference: true });
                    if (result.experiences && result.experiences.length > 0) {
                        callback(result.experiences);
                        return;
                    }
                } catch (error) {
                    console.warn('AutoProcessor error, falling back to basic import:', error);
                }
            }

            // Fallback: try to extract basic info from any format
            console.log('Using basic import fallback');
            const experiences = data.map(item => createBasicExperience(item)).filter(e => e !== null);
            callback(experiences);

        } catch (error) {
            console.error('File import error:', error);
            callback([]);
        }
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
