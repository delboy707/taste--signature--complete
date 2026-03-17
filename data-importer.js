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
    'calm': { needState: 'escape', triggers: { moreishness: 5, refreshment: 6, melt: 8, crunch: 2 } },

    // --- Expanded emotional lexicon ---

    // Positive anticipatory emotions
    'anticipation': { needState: 'reward', triggers: { moreishness: 7, refreshment: 5, melt: 4, crunch: 6 } },
    'desire': { needState: 'reward', triggers: { moreishness: 8, refreshment: 5, melt: 6, crunch: 5 } },
    'eager': { needState: 'reward', triggers: { moreishness: 7, refreshment: 6, melt: 4, crunch: 6 } },
    'interested': { needState: 'reward', triggers: { moreishness: 6, refreshment: 5, melt: 4, crunch: 5 } },
    'intrigued': { needState: 'reward', triggers: { moreishness: 7, refreshment: 5, melt: 5, crunch: 6 } },
    'attracted': { needState: 'reward', triggers: { moreishness: 7, refreshment: 5, melt: 5, crunch: 5 } },

    // Positive experiential emotions
    'happiness': { needState: 'sociability', triggers: { moreishness: 7, refreshment: 6, melt: 6, crunch: 5 } },
    'pleasure': { needState: 'reward', triggers: { moreishness: 8, refreshment: 5, melt: 7, crunch: 5 } },
    'satisfaction': { needState: 'reward', triggers: { moreishness: 8, refreshment: 5, melt: 7, crunch: 6 } },
    'pleased': { needState: 'reward', triggers: { moreishness: 7, refreshment: 5, melt: 6, crunch: 5 } },
    'delighted': { needState: 'reward', triggers: { moreishness: 8, refreshment: 6, melt: 7, crunch: 6 } },
    'enjoyment': { needState: 'reward', triggers: { moreishness: 8, refreshment: 6, melt: 6, crunch: 6 } },
    'completeness': { needState: 'reward', triggers: { moreishness: 7, refreshment: 5, melt: 6, crunch: 5 } },

    // Rejuvenation emotions
    'energized': { needState: 'rejuvenation', triggers: { moreishness: 6, refreshment: 8, melt: 3, crunch: 6 } },
    'refreshed': { needState: 'rejuvenation', triggers: { moreishness: 5, refreshment: 10, melt: 3, crunch: 4 } },

    // Escape / soothing emotions
    'relaxed': { needState: 'escape', triggers: { moreishness: 6, refreshment: 5, melt: 9, crunch: 2 } },
    'soothed': { needState: 'escape', triggers: { moreishness: 5, refreshment: 6, melt: 8, crunch: 2 } },
    'secure': { needState: 'escape', triggers: { moreishness: 6, refreshment: 4, melt: 7, crunch: 3 } },
    'nostalgic': { needState: 'escape', triggers: { moreishness: 9, refreshment: 3, melt: 7, crunch: 5 } },

    // Social emotions
    'amused': { needState: 'sociability', triggers: { moreishness: 6, refreshment: 5, melt: 5, crunch: 5 } },
    'loving': { needState: 'sociability', triggers: { moreishness: 8, refreshment: 4, melt: 8, crunch: 4 } },
    'gratitude': { needState: 'sociability', triggers: { moreishness: 7, refreshment: 5, melt: 6, crunch: 4 } },

    // Achievement / exploration emotions
    'adventurous': { needState: 'reward', triggers: { moreishness: 8, refreshment: 7, melt: 3, crunch: 7 } },
    'proud': { needState: 'reward', triggers: { moreishness: 7, refreshment: 5, melt: 5, crunch: 5 } },
    'surprised': { needState: 'reward', triggers: { moreishness: 7, refreshment: 6, melt: 5, crunch: 6 } },

    // Indulgence / craving emotions
    'indulgent': { needState: 'reward', triggers: { moreishness: 9, refreshment: 3, melt: 9, crunch: 4 } },
    'craving': { needState: 'reward', triggers: { moreishness: 10, refreshment: 5, melt: 6, crunch: 6 } },

    // Negative emotions
    'disappointed': { needState: 'escape', triggers: { moreishness: 2, refreshment: 3, melt: 3, crunch: 3 } },
    'disgusted': { needState: 'escape', triggers: { moreishness: 1, refreshment: 2, melt: 2, crunch: 2 } },
    'bored': { needState: 'escape', triggers: { moreishness: 2, refreshment: 2, melt: 3, crunch: 2 } },
    'guilty': { needState: 'escape', triggers: { moreishness: 6, refreshment: 3, melt: 5, crunch: 3 } },
    'worried': { needState: 'escape', triggers: { moreishness: 3, refreshment: 3, melt: 3, crunch: 2 } },
    'anxious': { needState: 'escape', triggers: { moreishness: 3, refreshment: 4, melt: 3, crunch: 3 } },
    'confused': { needState: 'escape', triggers: { moreishness: 3, refreshment: 3, melt: 3, crunch: 3 } },
    'sad': { needState: 'escape', triggers: { moreishness: 4, refreshment: 3, melt: 5, crunch: 2 } },
    'regret': { needState: 'escape', triggers: { moreishness: 3, refreshment: 2, melt: 3, crunch: 2 } },
    'angry': { needState: 'escape', triggers: { moreishness: 2, refreshment: 3, melt: 2, crunch: 4 } },
    'dissatisfied': { needState: 'escape', triggers: { moreishness: 2, refreshment: 3, melt: 3, crunch: 3 } }
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
                    curiosity: tasteAttributes.length >= 3 ? 7 : 5,
                    interested: tasteAttributes.length >= 3 ? 6 : 4,
                    intrigued: tasteAttributes.length >= 3 ? 7 : 4,
                    attracted: intensityProfile.appearance >= 7 ? 7 : 5,
                    eager: emotionalProfile.needState === 'reward' ? 6 : 4,
                    surprised: 4,
                    bored: 2
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
                    nostalgic: emotions.includes('nostalgia') || emotions.includes('nostalgic') ? 8 : 4,
                    happiness: 6,
                    energy: emotionalProfile.needState === 'rejuvenation' ? 7 : 5,
                    relaxation: emotionalProfile.needState === 'escape' ? 7 : 4,
                    relaxed: emotionalProfile.needState === 'escape' ? 7 : 4,
                    soothed: emotionalProfile.needState === 'escape' ? 6 : 3,
                    intrigued: tasteAttributes.length >= 3 ? 6 : 4,
                    anticipation: intensityProfile.aroma >= 7 ? 7 : 5,
                    desire: intensityProfile.aroma >= 7 ? 7 : 5,
                    refreshed: emotionalProfile.needState === 'rejuvenation' ? 7 : 4,
                    energized: emotionalProfile.needState === 'rejuvenation' ? 6 : 4
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
                    satisfaction: 7,
                    pleasure: intensityProfile.front >= 7 ? 7 : 5,
                    happiness: 6,
                    surprised: tasteAttributes.length >= 4 ? 6 : 3,
                    delighted: emotionalProfile.needState === 'reward' ? 7 : 5,
                    enjoyment: 6,
                    disappointed: 2,
                    disgusted: 1
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
                    indulgent: emotionalProfile.triggers.melt,
                    comfort: emotionalProfile.triggers.melt,
                    satisfaction: 7,
                    pleasure: emotionalProfile.triggers.melt >= 7 ? 8 : 6,
                    relaxed: emotionalProfile.needState === 'escape' ? 7 : 4,
                    soothed: emotionalProfile.triggers.melt >= 7 ? 6 : 3,
                    loving: emotionalProfile.triggers.melt >= 7 ? 6 : 3,
                    secure: emotionalProfile.needState === 'escape' ? 5 : 3
                }
            },
            aftertaste: {
                duration: intensityProfile.after >= 7 ? 8 : 6,
                pleasantness: 8,
                cleanness: emotionalProfile.triggers.refreshment,
                overallIntensity: intensityProfile.after,
                emotions: {
                    satisfaction: 8,
                    completeness: 7,
                    pleased: 7,
                    craving: emotionalProfile.triggers.moreishness >= 7 ? 8 : 5,
                    happiness: 6,
                    nostalgic: emotions.includes('nostalgia') || emotions.includes('nostalgic') ? 7 : 4,
                    gratitude: 5,
                    regret: 2,
                    disappointed: 2,
                    guilty: emotions.includes('guilty') ? 5 : 2
                }
            },
            overall: {
                emotions: {
                    happiness: emotionalProfile.needState === 'sociability' ? 8 : 6,
                    pleasure: emotionalProfile.triggers.melt >= 7 ? 8 : 6,
                    satisfaction: emotionalProfile.triggers.moreishness >= 7 ? 8 : 6,
                    enjoyment: 7,
                    excitement: emotionalProfile.needState === 'reward' ? 7 : 5,
                    comfort: emotionalProfile.triggers.melt >= 7 ? 8 : 5,
                    relaxed: emotionalProfile.needState === 'escape' ? 7 : 4,
                    energized: emotionalProfile.needState === 'rejuvenation' ? 7 : 4,
                    refreshed: emotionalProfile.needState === 'rejuvenation' ? 7 : 4,
                    indulgent: emotionalProfile.triggers.melt >= 7 ? 8 : 5,
                    adventurous: emotionalProfile.needState === 'reward' && tasteAttributes.length >= 3 ? 7 : 4,
                    nostalgic: emotions.includes('nostalgia') || emotions.includes('nostalgic') ? 8 : 4,
                    loving: emotionalProfile.needState === 'sociability' ? 7 : 4,
                    proud: emotionalProfile.needState === 'reward' ? 6 : 4,
                    amused: emotionalProfile.needState === 'sociability' ? 6 : 3,
                    grateful: 5,
                    craving: emotionalProfile.triggers.moreishness >= 7 ? 8 : 5,
                    surprised: tasteAttributes.length >= 4 ? 6 : 3,
                    delighted: emotionalProfile.needState === 'reward' ? 7 : 5,
                    soothed: emotionalProfile.needState === 'escape' ? 6 : 3,
                    secure: emotionalProfile.needState === 'escape' ? 5 : 3,
                    disappointed: 2,
                    disgusted: 1,
                    bored: 2,
                    guilty: emotions.includes('guilty') ? 5 : 2,
                    worried: 2,
                    anxious: 2,
                    confused: 2,
                    sad: 2,
                    regret: 2,
                    angry: 1,
                    dissatisfied: 2
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
 * Create default stages structure for imported products
 * Includes new sensory attributes: carbonation, persistence, acidity, spiciness, astringency, mouthfeel
 * Includes new emotions: surprise, intrigue, disappointment, sophistication, craving
 */
function createDefaultStages() {
    return {
        appearance: {
            visualAppeal: 5,
            colorIntensity: 5,
            carbonation: 5,
            overallIntensity: 5,
            emotions: {
                anticipation: 5, curiosity: 5, desire: 5, eager: 5, excitement: 5, happiness: 5,
                interest: 5, pleased: 5, surprise: 5, attracted: 5,
                disappointed: 0, disgusted: 0, indifferent: 0, suspicious: 0, worried: 0, anxious: 0, confused: 0, bored: 0
            }
        },
        aroma: {
            intensity: 5,
            sweetness: 5,
            complexity: 5,
            persistence: 5,
            overallIntensity: 5,
            emotions: {
                pleasure: 5, comfort: 5, nostalgia: 5, happiness: 5, energized: 5, relaxed: 5,
                intrigued: 5, refreshed: 5, desire: 5, warm: 5, soothed: 5, surprised: 5, interested: 5, calm: 5,
                disgusted: 0, irritated: 0, worried: 0, disappointed: 0, indifferent: 0, anxious: 0, repulsed: 0
            }
        },
        frontMouth: {
            sweetness: 5,
            sourness: 5,
            saltiness: 5,
            texture: 5,
            acidity: 5,
            spiciness: 3,
            overallIntensity: 5,
            emotions: {
                excitement: 5, surprise: 5, happiness: 5, pleasure: 5, interest: 5, satisfaction: 5,
                energized: 5, delighted: 5, amused: 5,
                disappointed: 0, disgusted: 0, bored: 0, confused: 0, overwhelmed: 0, upset: 0, worried: 0
            }
        },
        midRearMouth: {
            bitterness: 5,
            umami: 5,
            richness: 5,
            creaminess: 5,
            astringency: 3,
            mouthfeel: 5,
            overallIntensity: 5,
            emotions: {
                satisfaction: 5, pleasure: 5, indulgence: 5, comfort: 5, calm: 5, warmth: 5,
                joy: 5, loving: 5, adventurous: 5, energized: 5, secure: 5, nostalgic: 5,
                guilty: 0, bored: 0, disgusted: 0, disappointed: 0, aggressive: 0, overwhelmed: 0, dissatisfied: 0, sad: 0
            }
        },
        aftertaste: {
            duration: 5,
            pleasantness: 5,
            cleanness: 5,
            overallIntensity: 5,
            emotions: {
                satisfaction: 5, completeness: 5, happiness: 5, craving: 5, calm: 5, comforted: 5,
                pleased: 5, refreshed: 5, nostalgic: 5, surprised: 5,
                disappointed: 0, disgusted: 0, guilty: 0, worried: 0, dissatisfied: 0, bored: 0, regret: 0
            }
        },
        overall: {
            emotions: {
                satisfaction: 5, happiness: 5, pleasure: 5, enjoyment: 5, comfort: 5, calm: 5,
                warmth: 5, joy: 5, nostalgia: 5, energized: 5, loving: 5, gratitude: 5,
                proud: 5, adventurous: 5, indulgent: 5, interested: 5, relaxed: 5, secure: 5, desire: 5, surprised: 5,
                disappointed: 0, disgusted: 0, bored: 0, guilty: 0, worried: 0, dissatisfied: 0, sad: 0, regret: 0, angry: 0, anxious: 0, confused: 0
            }
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
        emotionalTriggers: { moreishness: 5, refreshment: 5, melt: 5, crunch: 5 },
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
