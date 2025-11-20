// ===== INDUSTRY BENCHMARKS MODULE =====

/**
 * Benchmark Data Structure:
 * {
 *   id: string,
 *   category: string (e.g., 'Premium Chocolate', 'Craft Beer', 'Artisan Ice Cream'),
 *   subcategory: string (optional),
 *   region: string (optional, e.g., 'North America', 'Europe'),
 *   sampleSize: number,
 *   dataSource: string (e.g., 'Industry Survey 2024', 'Internal Database'),
 *   attributeBenchmarks: {
 *     appearance: { visualAppeal: { mean, median, p25, p50, p75, stdDev }, ... },
 *     aroma: { intensity: { mean, median, p25, p50, p75, stdDev }, ... },
 *     ...
 *   },
 *   overallSatisfaction: { mean, median, p25, p50, p75, stdDev },
 *   topPerformers: [{ productName, score, percentile }],
 *   updatedAt: ISO date string
 * }
 */

// Storage for benchmarks
let industryBenchmarks = [];

/**
 * Pre-loaded benchmark data for common categories
 */
const defaultBenchmarks = [
    {
        id: 'premium_chocolate',
        category: 'Premium Chocolate',
        subcategory: 'Dark Chocolate (70%+)',
        region: 'Global',
        sampleSize: 150,
        dataSource: 'Taste Signature Industry Database 2024',
        attributeBenchmarks: {
            appearance: {
                visualAppeal: { mean: 7.8, median: 8.0, p25: 7.0, p50: 8.0, p75: 8.5, stdDev: 0.9 },
                colorIntensity: { mean: 8.2, median: 8.0, p25: 7.5, p50: 8.0, p75: 9.0, stdDev: 0.8 }
            },
            aroma: {
                intensity: { mean: 7.5, median: 7.5, p25: 7.0, p50: 7.5, p75: 8.0, stdDev: 0.7 },
                sweetness: { mean: 4.2, median: 4.0, p25: 3.5, p50: 4.0, p75: 5.0, stdDev: 1.0 },
                complexity: { mean: 7.8, median: 8.0, p25: 7.0, p50: 8.0, p75: 8.5, stdDev: 0.9 }
            },
            frontMouth: {
                sweetness: { mean: 4.5, median: 4.5, p25: 4.0, p50: 4.5, p75: 5.0, stdDev: 0.8 },
                bitterness: { mean: 6.8, median: 7.0, p25: 6.0, p50: 7.0, p75: 7.5, stdDev: 1.0 }
            },
            midRearMouth: {
                richness: { mean: 8.0, median: 8.0, p25: 7.5, p50: 8.0, p75: 8.5, stdDev: 0.7 },
                creaminess: { mean: 6.5, median: 6.5, p25: 6.0, p50: 6.5, p75: 7.0, stdDev: 0.8 }
            },
            aftertaste: {
                duration: { mean: 7.2, median: 7.0, p25: 6.5, p50: 7.0, p75: 8.0, stdDev: 0.9 },
                pleasantness: { mean: 7.5, median: 7.5, p25: 7.0, p50: 7.5, p75: 8.0, stdDev: 0.8 }
            }
        },
        overallSatisfaction: { mean: 7.6, median: 7.5, p25: 7.0, p50: 7.5, p75: 8.2, stdDev: 0.9 },
        emotionalTriggers: {
            moreishness: { mean: 6.8, median: 7.0, p25: 6.0, p50: 7.0, p75: 7.5, stdDev: 1.0 }
        },
        updatedAt: '2024-01-15'
    },
    {
        id: 'craft_beer_ipa',
        category: 'Craft Beer',
        subcategory: 'India Pale Ale (IPA)',
        region: 'North America',
        sampleSize: 200,
        dataSource: 'Craft Beer Sensory Panel 2024',
        attributeBenchmarks: {
            appearance: {
                visualAppeal: { mean: 7.2, median: 7.0, p25: 6.5, p50: 7.0, p75: 8.0, stdDev: 1.0 },
                colorIntensity: { mean: 7.5, median: 7.5, p25: 7.0, p50: 7.5, p75: 8.0, stdDev: 0.8 }
            },
            aroma: {
                intensity: { mean: 8.0, median: 8.0, p25: 7.5, p50: 8.0, p75: 8.5, stdDev: 0.7 },
                complexity: { mean: 7.8, median: 8.0, p25: 7.0, p50: 8.0, p75: 8.5, stdDev: 0.9 }
            },
            frontMouth: {
                bitterness: { mean: 7.5, median: 7.5, p25: 7.0, p50: 7.5, p75: 8.0, stdDev: 0.8 },
                texture: { mean: 6.0, median: 6.0, p25: 5.5, p50: 6.0, p75: 6.5, stdDev: 0.7 }
            }
        },
        overallSatisfaction: { mean: 7.3, median: 7.0, p25: 6.5, p50: 7.0, p75: 8.0, stdDev: 1.0 },
        updatedAt: '2024-02-01'
    },
    {
        id: 'premium_ice_cream',
        category: 'Premium Ice Cream',
        subcategory: 'Vanilla Bean',
        region: 'Global',
        sampleSize: 180,
        dataSource: 'Dairy Sensory Database 2024',
        attributeBenchmarks: {
            appearance: {
                visualAppeal: { mean: 7.5, median: 7.5, p25: 7.0, p50: 7.5, p75: 8.0, stdDev: 0.8 }
            },
            aroma: {
                intensity: { mean: 6.8, median: 7.0, p25: 6.0, p50: 7.0, p75: 7.5, stdDev: 0.9 },
                sweetness: { mean: 7.2, median: 7.0, p25: 6.5, p50: 7.0, p75: 8.0, stdDev: 0.9 }
            },
            frontMouth: {
                sweetness: { mean: 7.8, median: 8.0, p25: 7.0, p50: 8.0, p75: 8.5, stdDev: 0.8 }
            },
            midRearMouth: {
                richness: { mean: 8.2, median: 8.0, p25: 7.5, p50: 8.0, p75: 9.0, stdDev: 0.9 },
                creaminess: { mean: 8.5, median: 8.5, p25: 8.0, p50: 8.5, p75: 9.0, stdDev: 0.7 }
            },
            aftertaste: {
                pleasantness: { mean: 7.8, median: 8.0, p25: 7.0, p50: 8.0, p75: 8.5, stdDev: 0.8 }
            }
        },
        overallSatisfaction: { mean: 8.0, median: 8.0, p25: 7.5, p50: 8.0, p75: 8.5, stdDev: 0.8 },
        emotionalTriggers: {
            moreishness: { mean: 7.5, median: 7.5, p25: 7.0, p50: 7.5, p75: 8.0, stdDev: 0.8 }
        },
        updatedAt: '2024-01-20'
    },
    {
        id: 'specialty_coffee',
        category: 'Specialty Coffee',
        subcategory: 'Single Origin Espresso',
        region: 'Global',
        sampleSize: 120,
        dataSource: 'Coffee Sensory Consortium 2024',
        attributeBenchmarks: {
            appearance: {
                visualAppeal: { mean: 7.0, median: 7.0, p25: 6.5, p50: 7.0, p75: 7.5, stdDev: 0.8 }
            },
            aroma: {
                intensity: { mean: 8.5, median: 8.5, p25: 8.0, p50: 8.5, p75: 9.0, stdDev: 0.6 },
                complexity: { mean: 8.2, median: 8.0, p25: 7.5, p50: 8.0, p75: 9.0, stdDev: 0.8 }
            },
            frontMouth: {
                bitterness: { mean: 6.5, median: 6.5, p25: 6.0, p50: 6.5, p75: 7.0, stdDev: 0.7 },
                sourness: { mean: 5.5, median: 5.5, p25: 5.0, p50: 5.5, p75: 6.0, stdDev: 0.8 }
            },
            midRearMouth: {
                richness: { mean: 7.8, median: 8.0, p25: 7.0, p50: 8.0, p75: 8.5, stdDev: 0.9 }
            },
            aftertaste: {
                duration: { mean: 7.5, median: 7.5, p25: 7.0, p50: 7.5, p75: 8.0, stdDev: 0.7 },
                pleasantness: { mean: 7.6, median: 7.5, p25: 7.0, p50: 7.5, p75: 8.0, stdDev: 0.8 }
            }
        },
        overallSatisfaction: { mean: 7.8, median: 8.0, p25: 7.0, p50: 8.0, p75: 8.5, stdDev: 0.9 },
        updatedAt: '2024-02-10'
    },
    {
        id: 'premium_desserts',
        category: 'Desserts',
        subcategory: 'Chocolate Cake',
        region: 'Global',
        sampleSize: 165,
        dataSource: 'Dessert Sensory Database 2024',
        attributeBenchmarks: {
            appearance: {
                visualAppeal: { mean: 8.0, median: 8.0, p25: 7.5, p50: 8.0, p75: 8.5, stdDev: 0.7 },
                colorIntensity: { mean: 7.5, median: 7.5, p25: 7.0, p50: 7.5, p75: 8.0, stdDev: 0.8 }
            },
            aroma: {
                intensity: { mean: 7.8, median: 8.0, p25: 7.0, p50: 8.0, p75: 8.5, stdDev: 0.8 },
                sweetness: { mean: 7.5, median: 7.5, p25: 7.0, p50: 7.5, p75: 8.0, stdDev: 0.7 }
            },
            frontMouth: {
                sweetness: { mean: 7.8, median: 8.0, p25: 7.5, p50: 8.0, p75: 8.5, stdDev: 0.7 },
                texture: { mean: 7.5, median: 7.5, p25: 7.0, p50: 7.5, p75: 8.0, stdDev: 0.8 }
            },
            midRearMouth: {
                richness: { mean: 8.2, median: 8.0, p25: 7.5, p50: 8.0, p75: 8.5, stdDev: 0.8 },
                creaminess: { mean: 7.8, median: 8.0, p25: 7.0, p50: 8.0, p75: 8.5, stdDev: 0.9 }
            },
            aftertaste: {
                pleasantness: { mean: 7.6, median: 7.5, p25: 7.0, p50: 7.5, p75: 8.0, stdDev: 0.8 }
            }
        },
        overallSatisfaction: { mean: 7.9, median: 8.0, p25: 7.5, p50: 8.0, p75: 8.5, stdDev: 0.8 },
        emotionalTriggers: {
            moreishness: { mean: 7.8, median: 8.0, p25: 7.0, p50: 8.0, p75: 8.5, stdDev: 0.9 }
        },
        updatedAt: '2024-03-01'
    },
    {
        id: 'savory_snacks',
        category: 'Snacks',
        subcategory: 'Potato Chips',
        region: 'North America',
        sampleSize: 220,
        dataSource: 'Snack Foods Sensory Panel 2024',
        attributeBenchmarks: {
            appearance: {
                visualAppeal: { mean: 7.2, median: 7.0, p25: 6.5, p50: 7.0, p75: 7.5, stdDev: 0.9 }
            },
            aroma: {
                intensity: { mean: 6.8, median: 7.0, p25: 6.0, p50: 7.0, p75: 7.5, stdDev: 1.0 },
                savory: { mean: 7.5, median: 7.5, p25: 7.0, p50: 7.5, p75: 8.0, stdDev: 0.8 }
            },
            frontMouth: {
                saltiness: { mean: 6.5, median: 6.5, p25: 6.0, p50: 6.5, p75: 7.0, stdDev: 0.8 },
                crunchiness: { mean: 8.0, median: 8.0, p25: 7.5, p50: 8.0, p75: 8.5, stdDev: 0.7 }
            },
            midRearMouth: {
                fattyFeel: { mean: 6.8, median: 7.0, p25: 6.0, p50: 7.0, p75: 7.5, stdDev: 0.9 }
            },
            aftertaste: {
                duration: { mean: 6.0, median: 6.0, p25: 5.5, p50: 6.0, p75: 6.5, stdDev: 0.8 }
            }
        },
        overallSatisfaction: { mean: 7.4, median: 7.5, p25: 7.0, p50: 7.5, p75: 8.0, stdDev: 0.9 },
        emotionalTriggers: {
            moreishness: { mean: 7.8, median: 8.0, p25: 7.0, p50: 8.0, p75: 8.5, stdDev: 0.9 }
        },
        updatedAt: '2024-03-05'
    },
    {
        id: 'sugar_confectionery',
        category: 'Confectionery',
        subcategory: 'Fruit Gummies',
        region: 'Global',
        sampleSize: 190,
        dataSource: 'Confectionery Sensory Institute 2024',
        attributeBenchmarks: {
            appearance: {
                visualAppeal: { mean: 7.8, median: 8.0, p25: 7.0, p50: 8.0, p75: 8.5, stdDev: 0.8 },
                colorIntensity: { mean: 8.2, median: 8.0, p25: 7.5, p50: 8.0, p75: 9.0, stdDev: 0.7 }
            },
            aroma: {
                intensity: { mean: 7.0, median: 7.0, p25: 6.5, p50: 7.0, p75: 7.5, stdDev: 0.8 },
                fruitiness: { mean: 7.8, median: 8.0, p25: 7.0, p50: 8.0, p75: 8.5, stdDev: 0.8 }
            },
            frontMouth: {
                sweetness: { mean: 8.0, median: 8.0, p25: 7.5, p50: 8.0, p75: 8.5, stdDev: 0.7 },
                sourness: { mean: 5.5, median: 5.5, p25: 5.0, p50: 5.5, p75: 6.0, stdDev: 0.9 }
            },
            midRearMouth: {
                chewiness: { mean: 7.5, median: 7.5, p25: 7.0, p50: 7.5, p75: 8.0, stdDev: 0.8 }
            },
            aftertaste: {
                pleasantness: { mean: 7.2, median: 7.0, p25: 6.5, p50: 7.0, p75: 7.5, stdDev: 0.9 }
            }
        },
        overallSatisfaction: { mean: 7.6, median: 7.5, p25: 7.0, p50: 7.5, p75: 8.0, stdDev: 0.8 },
        emotionalTriggers: {
            moreishness: { mean: 7.5, median: 7.5, p25: 7.0, p50: 7.5, p75: 8.0, stdDev: 0.9 }
        },
        updatedAt: '2024-03-10'
    },
    {
        id: 'carbonated_soft_drinks',
        category: 'Soft Drinks',
        subcategory: 'Cola',
        region: 'Global',
        sampleSize: 250,
        dataSource: 'Beverage Sensory Database 2024',
        attributeBenchmarks: {
            appearance: {
                visualAppeal: { mean: 6.8, median: 7.0, p25: 6.0, p50: 7.0, p75: 7.5, stdDev: 1.0 },
                colorIntensity: { mean: 7.0, median: 7.0, p25: 6.5, p50: 7.0, p75: 7.5, stdDev: 0.8 }
            },
            aroma: {
                intensity: { mean: 6.5, median: 6.5, p25: 6.0, p50: 6.5, p75: 7.0, stdDev: 0.9 },
                sweetness: { mean: 7.0, median: 7.0, p25: 6.5, p50: 7.0, p75: 7.5, stdDev: 0.8 }
            },
            frontMouth: {
                sweetness: { mean: 7.5, median: 7.5, p25: 7.0, p50: 7.5, p75: 8.0, stdDev: 0.8 },
                carbonation: { mean: 7.8, median: 8.0, p25: 7.0, p50: 8.0, p75: 8.5, stdDev: 0.9 }
            },
            midRearMouth: {
                refreshing: { mean: 7.5, median: 7.5, p25: 7.0, p50: 7.5, p75: 8.0, stdDev: 0.8 }
            },
            aftertaste: {
                sweetness: { mean: 6.8, median: 7.0, p25: 6.0, p50: 7.0, p75: 7.5, stdDev: 0.9 }
            }
        },
        overallSatisfaction: { mean: 7.2, median: 7.0, p25: 6.5, p50: 7.0, p75: 7.5, stdDev: 0.9 },
        emotionalTriggers: {
            refreshing: { mean: 7.8, median: 8.0, p25: 7.0, p50: 8.0, p75: 8.5, stdDev: 0.8 }
        },
        updatedAt: '2024-03-15'
    },
    {
        id: 'breakfast_cereals',
        category: 'Breakfast Cereals',
        subcategory: 'Granola',
        region: 'North America',
        sampleSize: 175,
        dataSource: 'Cereal Sensory Panel 2024',
        attributeBenchmarks: {
            appearance: {
                visualAppeal: { mean: 7.5, median: 7.5, p25: 7.0, p50: 7.5, p75: 8.0, stdDev: 0.8 }
            },
            aroma: {
                intensity: { mean: 7.2, median: 7.0, p25: 6.5, p50: 7.0, p75: 7.5, stdDev: 0.9 },
                sweetness: { mean: 6.8, median: 7.0, p25: 6.0, p50: 7.0, p75: 7.5, stdDev: 0.9 },
                toasted: { mean: 7.5, median: 7.5, p25: 7.0, p50: 7.5, p75: 8.0, stdDev: 0.8 }
            },
            frontMouth: {
                sweetness: { mean: 6.5, median: 6.5, p25: 6.0, p50: 6.5, p75: 7.0, stdDev: 0.8 },
                crunchiness: { mean: 7.8, median: 8.0, p25: 7.0, p50: 8.0, p75: 8.5, stdDev: 0.8 }
            },
            midRearMouth: {
                chewiness: { mean: 7.0, median: 7.0, p25: 6.5, p50: 7.0, p75: 7.5, stdDev: 0.8 },
                nuttiness: { mean: 7.2, median: 7.0, p25: 6.5, p50: 7.0, p75: 7.5, stdDev: 0.9 }
            },
            aftertaste: {
                pleasantness: { mean: 7.0, median: 7.0, p25: 6.5, p50: 7.0, p75: 7.5, stdDev: 0.8 }
            }
        },
        overallSatisfaction: { mean: 7.4, median: 7.5, p25: 7.0, p50: 7.5, p75: 8.0, stdDev: 0.8 },
        emotionalTriggers: {
            healthiness: { mean: 7.8, median: 8.0, p25: 7.0, p50: 8.0, p75: 8.5, stdDev: 0.8 }
        },
        updatedAt: '2024-03-20'
    },
    {
        id: 'yogurt_greek',
        category: 'Yogurt',
        subcategory: 'Greek Yogurt (Plain)',
        region: 'Global',
        sampleSize: 185,
        dataSource: 'Dairy Sensory Database 2024',
        attributeBenchmarks: {
            appearance: {
                visualAppeal: { mean: 7.0, median: 7.0, p25: 6.5, p50: 7.0, p75: 7.5, stdDev: 0.8 },
                colorIntensity: { mean: 8.5, median: 8.5, p25: 8.0, p50: 8.5, p75: 9.0, stdDev: 0.6 }
            },
            aroma: {
                intensity: { mean: 6.0, median: 6.0, p25: 5.5, p50: 6.0, p75: 6.5, stdDev: 0.7 },
                sourness: { mean: 6.5, median: 6.5, p25: 6.0, p50: 6.5, p75: 7.0, stdDev: 0.8 }
            },
            frontMouth: {
                sourness: { mean: 6.8, median: 7.0, p25: 6.0, p50: 7.0, p75: 7.5, stdDev: 0.9 },
                thickness: { mean: 8.0, median: 8.0, p25: 7.5, p50: 8.0, p75: 8.5, stdDev: 0.7 }
            },
            midRearMouth: {
                creaminess: { mean: 7.8, median: 8.0, p25: 7.0, p50: 8.0, p75: 8.5, stdDev: 0.8 },
                richness: { mean: 7.5, median: 7.5, p25: 7.0, p50: 7.5, p75: 8.0, stdDev: 0.8 }
            },
            aftertaste: {
                pleasantness: { mean: 7.0, median: 7.0, p25: 6.5, p50: 7.0, p75: 7.5, stdDev: 0.8 }
            }
        },
        overallSatisfaction: { mean: 7.3, median: 7.5, p25: 7.0, p50: 7.5, p75: 8.0, stdDev: 0.8 },
        emotionalTriggers: {
            healthiness: { mean: 8.2, median: 8.0, p25: 7.5, p50: 8.0, p75: 9.0, stdDev: 0.7 }
        },
        updatedAt: '2024-03-25'
    },
    {
        id: 'energy_drinks',
        category: 'Energy Drinks',
        subcategory: 'Sugar-Free Energy',
        region: 'Global',
        sampleSize: 200,
        dataSource: 'Beverage Sensory Panel 2024',
        attributeBenchmarks: {
            appearance: {
                visualAppeal: { mean: 7.0, median: 7.0, p25: 6.5, p50: 7.0, p75: 7.5, stdDev: 0.9 },
                colorIntensity: { mean: 7.5, median: 7.5, p25: 7.0, p50: 7.5, p75: 8.0, stdDev: 0.8 }
            },
            aroma: {
                intensity: { mean: 7.2, median: 7.0, p25: 6.5, p50: 7.0, p75: 7.5, stdDev: 0.9 },
                fruitiness: { mean: 6.8, median: 7.0, p25: 6.0, p50: 7.0, p75: 7.5, stdDev: 1.0 }
            },
            frontMouth: {
                sweetness: { mean: 6.0, median: 6.0, p25: 5.5, p50: 6.0, p75: 6.5, stdDev: 0.9 },
                carbonation: { mean: 8.2, median: 8.0, p25: 7.5, p50: 8.0, p75: 9.0, stdDev: 0.7 },
                bitterness: { mean: 5.5, median: 5.5, p25: 5.0, p50: 5.5, p75: 6.0, stdDev: 0.9 }
            },
            midRearMouth: {
                energizing: { mean: 7.8, median: 8.0, p25: 7.0, p50: 8.0, p75: 8.5, stdDev: 0.8 }
            },
            aftertaste: {
                duration: { mean: 6.5, median: 6.5, p25: 6.0, p50: 6.5, p75: 7.0, stdDev: 0.8 }
            }
        },
        overallSatisfaction: { mean: 7.0, median: 7.0, p25: 6.5, p50: 7.0, p75: 7.5, stdDev: 0.9 },
        emotionalTriggers: {
            energizing: { mean: 8.0, median: 8.0, p25: 7.5, p50: 8.0, p75: 8.5, stdDev: 0.7 }
        },
        updatedAt: '2024-04-01'
    },
    {
        id: 'protein_bars',
        category: 'Protein Bars',
        subcategory: 'Chocolate Peanut Butter',
        region: 'North America',
        sampleSize: 160,
        dataSource: 'Sports Nutrition Sensory Database 2024',
        attributeBenchmarks: {
            appearance: {
                visualAppeal: { mean: 6.8, median: 7.0, p25: 6.0, p50: 7.0, p75: 7.5, stdDev: 1.0 }
            },
            aroma: {
                intensity: { mean: 7.0, median: 7.0, p25: 6.5, p50: 7.0, p75: 7.5, stdDev: 0.8 },
                nuttiness: { mean: 7.5, median: 7.5, p25: 7.0, p50: 7.5, p75: 8.0, stdDev: 0.8 }
            },
            frontMouth: {
                sweetness: { mean: 6.5, median: 6.5, p25: 6.0, p50: 6.5, p75: 7.0, stdDev: 0.8 },
                chewiness: { mean: 7.0, median: 7.0, p25: 6.5, p50: 7.0, p75: 7.5, stdDev: 0.9 }
            },
            midRearMouth: {
                richness: { mean: 7.5, median: 7.5, p25: 7.0, p50: 7.5, p75: 8.0, stdDev: 0.8 },
                graininess: { mean: 5.5, median: 5.5, p25: 5.0, p50: 5.5, p75: 6.0, stdDev: 1.0 }
            },
            aftertaste: {
                pleasantness: { mean: 6.8, median: 7.0, p25: 6.0, p50: 7.0, p75: 7.5, stdDev: 0.9 }
            }
        },
        overallSatisfaction: { mean: 7.0, median: 7.0, p25: 6.5, p50: 7.0, p75: 7.5, stdDev: 0.9 },
        emotionalTriggers: {
            healthiness: { mean: 7.5, median: 7.5, p25: 7.0, p50: 7.5, p75: 8.0, stdDev: 0.8 },
            satiety: { mean: 7.8, median: 8.0, p25: 7.0, p50: 8.0, p75: 8.5, stdDev: 0.8 }
        },
        updatedAt: '2024-04-05'
    },
    {
        id: 'cookies_chocolate_chip',
        category: 'Cookies/Biscuits',
        subcategory: 'Chocolate Chip Cookies',
        region: 'Global',
        sampleSize: 210,
        dataSource: 'Bakery Sensory Panel 2024',
        attributeBenchmarks: {
            appearance: {
                visualAppeal: { mean: 7.8, median: 8.0, p25: 7.0, p50: 8.0, p75: 8.5, stdDev: 0.8 },
                colorIntensity: { mean: 7.2, median: 7.0, p25: 6.5, p50: 7.0, p75: 7.5, stdDev: 0.9 }
            },
            aroma: {
                intensity: { mean: 8.0, median: 8.0, p25: 7.5, p50: 8.0, p75: 8.5, stdDev: 0.7 },
                sweetness: { mean: 7.5, median: 7.5, p25: 7.0, p50: 7.5, p75: 8.0, stdDev: 0.8 },
                butteriness: { mean: 7.2, median: 7.0, p25: 6.5, p50: 7.0, p75: 7.5, stdDev: 0.9 }
            },
            frontMouth: {
                sweetness: { mean: 7.8, median: 8.0, p25: 7.0, p50: 8.0, p75: 8.5, stdDev: 0.8 },
                crunchiness: { mean: 6.5, median: 6.5, p25: 6.0, p50: 6.5, p75: 7.0, stdDev: 1.0 }
            },
            midRearMouth: {
                richness: { mean: 7.8, median: 8.0, p25: 7.0, p50: 8.0, p75: 8.5, stdDev: 0.8 },
                butteriness: { mean: 7.5, median: 7.5, p25: 7.0, p50: 7.5, p75: 8.0, stdDev: 0.8 }
            },
            aftertaste: {
                pleasantness: { mean: 7.5, median: 7.5, p25: 7.0, p50: 7.5, p75: 8.0, stdDev: 0.8 }
            }
        },
        overallSatisfaction: { mean: 7.8, median: 8.0, p25: 7.5, p50: 8.0, p75: 8.5, stdDev: 0.8 },
        emotionalTriggers: {
            moreishness: { mean: 8.0, median: 8.0, p25: 7.5, p50: 8.0, p75: 8.5, stdDev: 0.7 },
            comfort: { mean: 8.2, median: 8.0, p25: 7.5, p50: 8.0, p75: 9.0, stdDev: 0.7 }
        },
        updatedAt: '2024-04-10'
    },
    {
        id: 'frozen_pizza',
        category: 'Frozen Foods',
        subcategory: 'Frozen Pizza (Pepperoni)',
        region: 'North America',
        sampleSize: 195,
        dataSource: 'Frozen Foods Sensory Database 2024',
        attributeBenchmarks: {
            appearance: {
                visualAppeal: { mean: 7.0, median: 7.0, p25: 6.5, p50: 7.0, p75: 7.5, stdDev: 0.9 }
            },
            aroma: {
                intensity: { mean: 7.5, median: 7.5, p25: 7.0, p50: 7.5, p75: 8.0, stdDev: 0.8 },
                savory: { mean: 7.8, median: 8.0, p25: 7.0, p50: 8.0, p75: 8.5, stdDev: 0.8 },
                cheesiness: { mean: 7.5, median: 7.5, p25: 7.0, p50: 7.5, p75: 8.0, stdDev: 0.8 }
            },
            frontMouth: {
                saltiness: { mean: 7.0, median: 7.0, p25: 6.5, p50: 7.0, p75: 7.5, stdDev: 0.9 },
                crispiness: { mean: 6.8, median: 7.0, p25: 6.0, p50: 7.0, p75: 7.5, stdDev: 1.0 }
            },
            midRearMouth: {
                cheesiness: { mean: 7.8, median: 8.0, p25: 7.0, p50: 8.0, p75: 8.5, stdDev: 0.8 },
                fattyFeel: { mean: 7.2, median: 7.0, p25: 6.5, p50: 7.0, p75: 7.5, stdDev: 0.9 }
            },
            aftertaste: {
                pleasantness: { mean: 7.0, median: 7.0, p25: 6.5, p50: 7.0, p75: 7.5, stdDev: 0.9 }
            }
        },
        overallSatisfaction: { mean: 7.2, median: 7.0, p25: 6.5, p50: 7.0, p75: 7.5, stdDev: 0.9 },
        emotionalTriggers: {
            convenience: { mean: 8.5, median: 8.5, p25: 8.0, p50: 8.5, p75: 9.0, stdDev: 0.6 }
        },
        updatedAt: '2024-04-15'
    },
    {
        id: 'hot_sauce',
        category: 'Sauces & Condiments',
        subcategory: 'Hot Sauce (Medium Heat)',
        region: 'Global',
        sampleSize: 170,
        dataSource: 'Condiments Sensory Database 2024',
        attributeBenchmarks: {
            appearance: {
                visualAppeal: { mean: 7.2, median: 7.0, p25: 6.5, p50: 7.0, p75: 7.5, stdDev: 0.9 },
                colorIntensity: { mean: 8.0, median: 8.0, p25: 7.5, p50: 8.0, p75: 8.5, stdDev: 0.7 }
            },
            aroma: {
                intensity: { mean: 7.8, median: 8.0, p25: 7.0, p50: 8.0, p75: 8.5, stdDev: 0.8 },
                spiciness: { mean: 7.5, median: 7.5, p25: 7.0, p50: 7.5, p75: 8.0, stdDev: 0.8 }
            },
            frontMouth: {
                spiciness: { mean: 7.8, median: 8.0, p25: 7.0, p50: 8.0, p75: 8.5, stdDev: 0.9 },
                sourness: { mean: 6.5, median: 6.5, p25: 6.0, p50: 6.5, p75: 7.0, stdDev: 0.8 },
                saltiness: { mean: 6.0, median: 6.0, p25: 5.5, p50: 6.0, p75: 6.5, stdDev: 0.8 }
            },
            midRearMouth: {
                heatBuild: { mean: 7.5, median: 7.5, p25: 7.0, p50: 7.5, p75: 8.0, stdDev: 0.9 }
            },
            aftertaste: {
                duration: { mean: 7.0, median: 7.0, p25: 6.5, p50: 7.0, p75: 7.5, stdDev: 0.9 }
            }
        },
        overallSatisfaction: { mean: 7.5, median: 7.5, p25: 7.0, p50: 7.5, p75: 8.0, stdDev: 0.8 },
        emotionalTriggers: {
            excitement: { mean: 7.8, median: 8.0, p25: 7.0, p50: 8.0, p75: 8.5, stdDev: 0.8 }
        },
        updatedAt: '2024-04-20'
    },
    {
        id: 'plant_based_burger',
        category: 'Plant-Based Alternatives',
        subcategory: 'Plant-Based Burger Patty',
        region: 'Global',
        sampleSize: 155,
        dataSource: 'Alternative Protein Sensory Panel 2024',
        attributeBenchmarks: {
            appearance: {
                visualAppeal: { mean: 7.0, median: 7.0, p25: 6.5, p50: 7.0, p75: 7.5, stdDev: 0.9 },
                colorIntensity: { mean: 7.2, median: 7.0, p25: 6.5, p50: 7.0, p75: 7.5, stdDev: 0.8 }
            },
            aroma: {
                intensity: { mean: 7.0, median: 7.0, p25: 6.5, p50: 7.0, p75: 7.5, stdDev: 0.8 },
                savory: { mean: 7.2, median: 7.0, p25: 6.5, p50: 7.0, p75: 7.5, stdDev: 0.9 },
                meatiness: { mean: 6.5, median: 6.5, p25: 6.0, p50: 6.5, p75: 7.0, stdDev: 1.0 }
            },
            frontMouth: {
                juiciness: { mean: 6.8, median: 7.0, p25: 6.0, p50: 7.0, p75: 7.5, stdDev: 1.0 },
                saltiness: { mean: 6.5, median: 6.5, p25: 6.0, p50: 6.5, p75: 7.0, stdDev: 0.8 }
            },
            midRearMouth: {
                meatTexture: { mean: 6.5, median: 6.5, p25: 6.0, p50: 6.5, p75: 7.0, stdDev: 1.0 },
                umami: { mean: 7.0, median: 7.0, p25: 6.5, p50: 7.0, p75: 7.5, stdDev: 0.8 }
            },
            aftertaste: {
                pleasantness: { mean: 6.8, median: 7.0, p25: 6.0, p50: 7.0, p75: 7.5, stdDev: 0.9 }
            }
        },
        overallSatisfaction: { mean: 6.9, median: 7.0, p25: 6.5, p50: 7.0, p75: 7.5, stdDev: 0.9 },
        emotionalTriggers: {
            healthiness: { mean: 7.8, median: 8.0, p25: 7.0, p50: 8.0, p75: 8.5, stdDev: 0.8 },
            sustainability: { mean: 8.2, median: 8.0, p25: 7.5, p50: 8.0, p75: 9.0, stdDev: 0.7 }
        },
        updatedAt: '2024-04-25'
    }
];

/**
 * Load benchmarks from localStorage
 */
function loadIndustryBenchmarks() {
    const stored = localStorage.getItem('industryBenchmarks');
    if (stored) {
        try {
            const customBenchmarks = JSON.parse(stored);
            industryBenchmarks = [...defaultBenchmarks, ...customBenchmarks];
        } catch (e) {
            console.error('Error loading benchmarks:', e);
            industryBenchmarks = [...defaultBenchmarks];
        }
    } else {
        industryBenchmarks = [...defaultBenchmarks];
    }
}

/**
 * Save custom benchmarks to localStorage
 */
function saveIndustryBenchmarks() {
    // Only save custom benchmarks (not defaults)
    const customBenchmarks = industryBenchmarks.filter(b =>
        !defaultBenchmarks.some(db => db.id === b.id)
    );
    localStorage.setItem('industryBenchmarks', JSON.stringify(customBenchmarks));
}

/**
 * Get all available benchmark categories
 */
function getBenchmarkCategories() {
    const categories = new Set();
    industryBenchmarks.forEach(b => {
        categories.add(b.category);
    });
    return Array.from(categories).sort();
}

/**
 * Get benchmarks for a specific category
 */
function getBenchmarksForCategory(category) {
    return industryBenchmarks.filter(b => b.category === category);
}

/**
 * Compare product against benchmark
 */
function compareAgainstBenchmark(productId, benchmarkId) {
    const product = experiences.find(e => e.id === productId);
    const benchmark = industryBenchmarks.find(b => b.id === benchmarkId);

    if (!product || !benchmark) return null;

    const comparison = {
        productName: product.productInfo.name,
        benchmarkName: `${benchmark.category} ${benchmark.subcategory ? `- ${benchmark.subcategory}` : ''}`,
        attributes: {}
    };

    // Compare each stage and attribute
    Object.keys(benchmark.attributeBenchmarks).forEach(stageKey => {
        const stage = product.stages[stageKey];
        if (!stage) return;

        Object.keys(benchmark.attributeBenchmarks[stageKey]).forEach(attrKey => {
            const productValue = stage[attrKey];
            const benchmarkData = benchmark.attributeBenchmarks[stageKey][attrKey];

            if (productValue !== undefined && benchmarkData) {
                const percentile = calculatePercentile(productValue, benchmarkData);
                const vsAverage = productValue - benchmarkData.mean;
                const zScore = benchmarkData.stdDev > 0 ? vsAverage / benchmarkData.stdDev : 0;

                comparison.attributes[`${stageKey}.${attrKey}`] = {
                    label: `${stageKey} - ${attrKey}`,
                    productValue: productValue,
                    benchmarkMean: benchmarkData.mean,
                    benchmarkMedian: benchmarkData.median,
                    difference: vsAverage,
                    percentile: percentile,
                    zScore: zScore,
                    performance: interpretPerformance(percentile)
                };
            }
        });
    });

    // Overall satisfaction comparison
    const productSatisfaction = product.stages.aftertaste.emotions.satisfaction || 0;
    if (benchmark.overallSatisfaction) {
        const satisfactionPercentile = calculatePercentile(productSatisfaction, benchmark.overallSatisfaction);

        comparison.overallSatisfaction = {
            productValue: productSatisfaction,
            benchmarkMean: benchmark.overallSatisfaction.mean,
            difference: productSatisfaction - benchmark.overallSatisfaction.mean,
            percentile: satisfactionPercentile,
            performance: interpretPerformance(satisfactionPercentile)
        };
    }

    return comparison;
}

/**
 * Calculate percentile ranking
 */
function calculatePercentile(value, benchmarkData) {
    const { mean, stdDev } = benchmarkData;

    if (stdDev === 0) return 50;

    // Use normal distribution approximation
    const zScore = (value - mean) / stdDev;

    // Convert z-score to percentile (approximation)
    return normalCDF(zScore) * 100;
}

/**
 * Interpret percentile performance
 */
function interpretPerformance(percentile) {
    if (percentile >= 90) return 'Exceptional (Top 10%)';
    if (percentile >= 75) return 'Above Average (Top 25%)';
    if (percentile >= 50) return 'Average (Top 50%)';
    if (percentile >= 25) return 'Below Average (Bottom 50%)';
    return 'Needs Improvement (Bottom 25%)';
}

/**
 * Get competitive positioning for a product
 */
function getCompetitivePositioning(productId) {
    const product = experiences.find(e => e.id === productId);
    if (!product) return null;

    // Find best matching benchmark
    const matchingBenchmarks = industryBenchmarks;

    // Compare against all benchmarks and rank
    const rankings = matchingBenchmarks.map(benchmark => {
        const comparison = compareAgainstBenchmark(productId, benchmark.id);
        if (!comparison) return null;

        const avgPercentile = comparison.overallSatisfaction ?
            comparison.overallSatisfaction.percentile :
            mean(Object.values(comparison.attributes).map(a => a.percentile));

        return {
            benchmark: benchmark,
            avgPercentile: avgPercentile,
            performance: interpretPerformance(avgPercentile)
        };
    }).filter(r => r !== null).sort((a, b) => b.avgPercentile - a.avgPercentile);

    return {
        productName: product.productInfo.name,
        rankings: rankings
    };
}

/**
 * Create custom benchmark from experiences
 */
function createBenchmarkFromProducts(name, category, productIds) {
    const products = experiences.filter(e => productIds.includes(e.id));
    if (products.length === 0) return null;

    const newBenchmark = {
        id: `custom_${Date.now()}`,
        category: category,
        subcategory: name,
        region: 'Custom',
        sampleSize: products.length,
        dataSource: 'Custom Benchmark',
        attributeBenchmarks: {},
        overallSatisfaction: null,
        isCustom: true,
        createdAt: new Date().toISOString()
    };

    // Calculate benchmarks from product data
    // For each stage and attribute, calculate statistics
    const stageKeys = ['appearance', 'aroma', 'frontMouth', 'midRearMouth', 'aftertaste'];

    stageKeys.forEach(stageKey => {
        if (!newBenchmark.attributeBenchmarks[stageKey]) {
            newBenchmark.attributeBenchmarks[stageKey] = {};
        }

        const firstProduct = products[0];
        if (!firstProduct.stages[stageKey]) return;

        Object.keys(firstProduct.stages[stageKey]).forEach(attrKey => {
            if (attrKey === 'emotions') return;

            const values = products
                .map(p => p.stages[stageKey][attrKey])
                .filter(v => v !== undefined);

            if (values.length > 0) {
                newBenchmark.attributeBenchmarks[stageKey][attrKey] = {
                    mean: mean(values),
                    median: percentile(values, 50),
                    p25: percentile(values, 25),
                    p50: percentile(values, 50),
                    p75: percentile(values, 75),
                    stdDev: standardDeviation(values)
                };
            }
        });
    });

    // Overall satisfaction
    const satisfactionValues = products
        .map(p => p.stages.aftertaste.emotions.satisfaction || 0)
        .filter(v => v > 0);

    if (satisfactionValues.length > 0) {
        newBenchmark.overallSatisfaction = {
            mean: mean(satisfactionValues),
            median: percentile(satisfactionValues, 50),
            p25: percentile(satisfactionValues, 25),
            p50: percentile(satisfactionValues, 50),
            p75: percentile(satisfactionValues, 75),
            stdDev: standardDeviation(satisfactionValues)
        };
    }

    industryBenchmarks.push(newBenchmark);
    saveIndustryBenchmarks();
    return newBenchmark;
}

/**
 * Delete custom benchmark
 */
function deleteBenchmark(benchmarkId) {
    const index = industryBenchmarks.findIndex(b => b.id === benchmarkId);
    if (index === -1) return false;

    // Don't allow deleting default benchmarks
    if (defaultBenchmarks.some(db => db.id === benchmarkId)) {
        return false;
    }

    industryBenchmarks.splice(index, 1);
    saveIndustryBenchmarks();
    return true;
}

/**
 * Export benchmark as JSON
 */
function exportBenchmark(benchmarkId) {
    const benchmark = industryBenchmarks.find(b => b.id === benchmarkId);
    if (!benchmark) return null;

    return JSON.stringify(benchmark, null, 2);
}

/**
 * Import benchmark from JSON
 */
function importBenchmark(jsonString) {
    try {
        const importedBenchmark = JSON.parse(jsonString);

        // Validate structure
        if (!importedBenchmark.category || !importedBenchmark.attributeBenchmarks) {
            throw new Error('Invalid benchmark format');
        }

        // Generate new ID
        importedBenchmark.id = `imported_${Date.now()}`;
        importedBenchmark.isCustom = true;
        importedBenchmark.importedAt = new Date().toISOString();

        industryBenchmarks.push(importedBenchmark);
        saveIndustryBenchmarks();

        return importedBenchmark;
    } catch (e) {
        console.error('Error importing benchmark:', e);
        return null;
    }
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    loadIndustryBenchmarks();
});
