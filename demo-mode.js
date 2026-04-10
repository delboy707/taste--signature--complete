// ===== DEMO MODE =====
// Provides sample data for users to explore the platform instantly
// without having to log their own products

class DemoMode {
    constructor() {
        this.demoDataKey = 'taste_demo_mode_active';
        this.demoExperiencesKey = 'taste_demo_experiences';
    }

    // Check if demo mode is active
    isDemoActive() {
        return localStorage.getItem(this.demoDataKey) === 'true';
    }

    // Activate demo mode with sample data
    activateDemoMode() {
        localStorage.setItem(this.demoDataKey, 'true');

        // Generate and store sample experiences
        const sampleExperiences = this.generateSampleExperiences();
        localStorage.setItem(this.demoExperiencesKey, JSON.stringify(sampleExperiences));

        console.log('✅ Demo mode activated with', sampleExperiences.length, 'sample products');
        return sampleExperiences;
    }

    // Deactivate demo mode and clear sample data
    deactivateDemoMode() {
        localStorage.removeItem(this.demoDataKey);
        localStorage.removeItem(this.demoExperiencesKey);
        console.log('✅ Demo mode deactivated');
    }

    // Get demo experiences
    getDemoExperiences() {
        const stored = localStorage.getItem(this.demoExperiencesKey);
        return stored ? JSON.parse(stored) : [];
    }

    // Generate sample experiences across different product categories
    generateSampleExperiences() {
        const timestamp = Date.now();

        return [
            // Premium Dark Chocolate
            {
                id: 'demo-001',
                timestamp: new Date(timestamp - 7 * 24 * 60 * 60 * 1000).toISOString(),
                productInfo: {
                    name: 'Premium Dark Chocolate 70%',
                    brand: 'Artisan Chocolatier',
                    type: 'Chocolate',
                    variant: 'Dark 70%',
                    occasion: 'Afternoon indulgence',
                    temperature: 'Room temperature'
                },
                testNumber: 1,
                stages: {
                    appearance: {
                        'visual-appeal': 9,
                        'color-richness': 8,
                        'bubble-activity': 0,
                        emotions: {
                            anticipation: 9,
                            desire: 8,
                            excitement: 7,
                            happiness: 7,
                            curiosity: 6,
                            surprise: 4
                        }
                    },
                    aroma: {
                        'smell-strength': 8,
                        'smell-complexity': 9,
                        'caramel-toffee-notes': 3,
                        'smell-duration': 7,
                        emotions: {
                            pleasure: 8,
                            comfort: 6,
                            nostalgia: 4,
                            happiness: 7,
                            energized: 4,
                            relaxed: 6,
                            intrigued: 9
                        }
                    },
                    frontMouth: {
                        sweetness: 3,
                        'sourness-tartness': 2,
                        saltiness: 1,
                        'first-bite-texture': 8,
                        'spicy-heat': 1,
                        emotions: {
                            excitement: 7,
                            satisfaction: 8,
                            happiness: 7,
                            pleasure: 8,
                            disappointment: 1
                        }
                    },
                    midRearMouth: {
                        'bitterness-development': 6,
                        'umami-savoury-depth': 4,
                        'richness-fullness': 8,
                        'overall-mid-palate-intensity': 8,
                        emotions: {
                            indulgence: 9,
                            comfort: 7,
                            satisfaction: 8,
                            pleasure: 8,
                            sophistication: 9
                        }
                    },
                    texture: {
                        creaminess: 7,
                        astringency: 4,
                        smoothness: 7,
                        emotions: {
                            satisfied: 8,
                            pleased: 8,
                            comforted: 7
                        }
                    },
                    aftertaste: {
                        'finish-length': 8,
                        'finish-quality': 8,
                        'finish-cleanness': 7,
                        emotions: {
                            satisfaction: 8,
                            completeness: 8,
                            happiness: 7,
                            'craving-want-more': 6
                        }
                    },
                    overallAssessment: {
                        'overall-quality': 9,
                        'satisfaction-overall': 8,
                        'want-more-quality': 7,
                        emotions: {
                            satisfaction: 9,
                            happiness: 8,
                            pleasure: 8
                        }
                    }
                },
                needState: 'reward',
                notes: 'Deep mahogany brown with glossy surface. Rich cocoa aroma with hints of red fruit and subtle earthiness. Flavor complexity develops with dark fruit and coffee notes. Long, pleasant finish with clean cocoa lingering. Sophisticated and indulgent experience.'
            },

            // Milk Chocolate Bar
            {
                id: 'demo-002',
                timestamp: new Date(timestamp - 6 * 24 * 60 * 60 * 1000).toISOString(),
                productInfo: {
                    name: 'Classic Milk Chocolate Bar',
                    brand: 'Heritage Confections',
                    type: 'Chocolate',
                    variant: 'Milk Classic',
                    occasion: 'Casual snacking',
                    temperature: 'Room temperature'
                },
                testNumber: 1,
                stages: {
                    appearance: {
                        'visual-appeal': 7,
                        'color-richness': 5,
                        'bubble-activity': 0,
                        emotions: {
                            anticipation: 7,
                            desire: 7,
                            excitement: 5,
                            happiness: 7,
                            curiosity: 3,
                            surprise: 2
                        }
                    },
                    aroma: {
                        'smell-strength': 6,
                        'smell-complexity': 4,
                        'caramel-toffee-notes': 7,
                        'smell-duration': 5,
                        emotions: {
                            pleasure: 7,
                            comfort: 9,
                            nostalgia: 8,
                            happiness: 8,
                            energized: 3,
                            relaxed: 7,
                            intrigued: 3
                        }
                    },
                    frontMouth: {
                        sweetness: 7,
                        'sourness-tartness': 1,
                        saltiness: 1,
                        'first-bite-texture': 7,
                        'spicy-heat': 0,
                        emotions: {
                            excitement: 5,
                            satisfaction: 7,
                            happiness: 8,
                            pleasure: 7,
                            disappointment: 1
                        }
                    },
                    midRearMouth: {
                        'bitterness-development': 2,
                        'umami-savoury-depth': 2,
                        'richness-fullness': 6,
                        'overall-mid-palate-intensity': 6,
                        emotions: {
                            indulgence: 7,
                            comfort: 9,
                            satisfaction: 7,
                            pleasure: 7,
                            sophistication: 3
                        }
                    },
                    texture: {
                        creaminess: 8,
                        astringency: 1,
                        smoothness: 8,
                        emotions: {
                            satisfied: 7,
                            pleased: 7,
                            comforted: 9
                        }
                    },
                    aftertaste: {
                        'finish-length': 5,
                        'finish-quality': 7,
                        'finish-cleanness': 7,
                        emotions: {
                            satisfaction: 7,
                            completeness: 6,
                            happiness: 7,
                            'craving-want-more': 8
                        }
                    },
                    overallAssessment: {
                        'overall-quality': 7,
                        'satisfaction-overall': 7,
                        'want-more-quality': 9,
                        emotions: {
                            satisfaction: 7,
                            happiness: 8,
                            comfort: 9
                        }
                    }
                },
                needState: 'escape',
                notes: 'Light brown with smooth surface and slight sheen. Sweet milk and vanilla aroma, comforting and familiar. Immediate sweetness with creamy melt. Milk and sugar dominate the mid-palate. Sweet finish with milky notes lingering. Nostalgic and comforting, reminds of childhood treats.'
            },

            // Artisan Coffee
            {
                id: 'demo-003',
                timestamp: new Date(timestamp - 5 * 24 * 60 * 60 * 1000).toISOString(),
                productInfo: {
                    name: 'Ethiopian Single Origin Coffee',
                    brand: 'Highlands Roastery',
                    type: 'Coffee',
                    variant: 'Single Origin Ethiopian',
                    occasion: 'Morning ritual',
                    temperature: 'Hot'
                },
                testNumber: 1,
                stages: {
                    appearance: {
                        'visual-appeal': 8,
                        'color-richness': 6,
                        'bubble-activity': 0,
                        emotions: {
                            anticipation: 8,
                            desire: 7,
                            excitement: 7,
                            happiness: 6,
                            curiosity: 8,
                            surprise: 5
                        }
                    },
                    aroma: {
                        'smell-strength': 9,
                        'smell-complexity': 9,
                        'caramel-toffee-notes': 4,
                        'smell-duration': 8,
                        emotions: {
                            pleasure: 8,
                            comfort: 6,
                            nostalgia: 3,
                            happiness: 7,
                            energized: 8,
                            relaxed: 4,
                            intrigued: 9
                        }
                    },
                    frontMouth: {
                        sweetness: 3,
                        'sourness-tartness': 6,
                        saltiness: 0,
                        'first-bite-texture': 6,
                        'spicy-heat': 1,
                        emotions: {
                            excitement: 8,
                            satisfaction: 7,
                            happiness: 7,
                            pleasure: 7,
                            disappointment: 1
                        }
                    },
                    midRearMouth: {
                        'bitterness-development': 4,
                        'umami-savoury-depth': 2,
                        'richness-fullness': 6,
                        'overall-mid-palate-intensity': 7,
                        emotions: {
                            indulgence: 6,
                            comfort: 5,
                            satisfaction: 7,
                            pleasure: 8,
                            sophistication: 9
                        }
                    },
                    texture: {
                        creaminess: 3,
                        astringency: 3,
                        smoothness: 6,
                        emotions: {
                            satisfied: 7,
                            pleased: 8,
                            energized: 7
                        }
                    },
                    aftertaste: {
                        'finish-length': 9,
                        'finish-quality': 8,
                        'finish-cleanness': 8,
                        emotions: {
                            satisfaction: 8,
                            completeness: 7,
                            happiness: 7,
                            'craving-want-more': 5
                        }
                    },
                    overallAssessment: {
                        'overall-quality': 8,
                        'satisfaction-overall': 8,
                        'want-more-quality': 6,
                        emotions: {
                            satisfaction: 8,
                            happiness: 7,
                            energized: 8
                        }
                    }
                },
                needState: 'rejuvenation',
                notes: 'Medium roast with oil sheen and clear amber-brown brew with good crema. Floral notes with bright citrus and blueberry hints on the nose. Bright acidity and tea-like body on entry. Complexity unfolds with jasmine, bergamot, and berry sweetness. Long evolving finish with floral persistence. Energizing and sophisticated morning experience.'
            },

            // Craft Beer
            {
                id: 'demo-004',
                timestamp: new Date(timestamp - 4 * 24 * 60 * 60 * 1000).toISOString(),
                productInfo: {
                    name: 'West Coast IPA',
                    brand: 'Pacific Hops Brewery',
                    type: 'Beer',
                    variant: 'India Pale Ale',
                    occasion: 'Evening relaxation',
                    temperature: 'Chilled'
                },
                testNumber: 1,
                stages: {
                    appearance: {
                        'visual-appeal': 8,
                        'color-richness': 7,
                        'bubble-activity': 8,
                        emotions: {
                            anticipation: 8,
                            desire: 7,
                            excitement: 8,
                            happiness: 7,
                            curiosity: 7,
                            surprise: 5
                        }
                    },
                    aroma: {
                        'smell-strength': 9,
                        'smell-complexity': 8,
                        'caramel-toffee-notes': 2,
                        'smell-duration': 8,
                        emotions: {
                            pleasure: 7,
                            comfort: 4,
                            nostalgia: 3,
                            happiness: 7,
                            energized: 6,
                            relaxed: 5,
                            intrigued: 8
                        }
                    },
                    frontMouth: {
                        sweetness: 2,
                        'sourness-tartness': 4,
                        saltiness: 1,
                        'first-bite-texture': 7,
                        'spicy-heat': 2,
                        emotions: {
                            excitement: 8,
                            satisfaction: 7,
                            happiness: 7,
                            pleasure: 7,
                            disappointment: 2
                        }
                    },
                    midRearMouth: {
                        'bitterness-development': 8,
                        'umami-savoury-depth': 3,
                        'richness-fullness': 6,
                        'overall-mid-palate-intensity': 8,
                        emotions: {
                            indulgence: 6,
                            comfort: 5,
                            satisfaction: 7,
                            pleasure: 7,
                            sophistication: 7
                        }
                    },
                    texture: {
                        creaminess: 3,
                        astringency: 5,
                        smoothness: 5,
                        emotions: {
                            satisfied: 7,
                            pleased: 7,
                            energized: 7
                        }
                    },
                    aftertaste: {
                        'finish-length': 8,
                        'finish-quality': 7,
                        'finish-cleanness': 5,
                        emotions: {
                            satisfaction: 7,
                            completeness: 6,
                            happiness: 7,
                            'craving-want-more': 8
                        }
                    },
                    overallAssessment: {
                        'overall-quality': 7,
                        'satisfaction-overall': 7,
                        'want-more-quality': 7,
                        emotions: {
                            satisfaction: 7,
                            happiness: 7,
                            adventurous: 8
                        }
                    }
                },
                needState: 'sociability',
                notes: 'Golden amber with slight haze and white foamy head with good retention. Pine, grapefruit, and tropical fruit on the nose with dank hops dominant. Immediate hop bitterness with carbonation bite and citrus burst. Malt sweetness balances the bitterness mid-palate. Long bitter finish with hop oils coating the palate. Adventurous and bold, a great social sharing experience.'
            },

            // Premium Ice Cream
            {
                id: 'demo-005',
                timestamp: new Date(timestamp - 3 * 24 * 60 * 60 * 1000).toISOString(),
                productInfo: {
                    name: 'Vanilla Bean Ice Cream',
                    brand: 'Creamery Reserve',
                    type: 'Ice Cream',
                    variant: 'Vanilla Bean',
                    occasion: 'Dessert treat',
                    temperature: 'Frozen'
                },
                testNumber: 1,
                stages: {
                    appearance: {
                        'visual-appeal': 8,
                        'color-richness': 4,
                        'bubble-activity': 0,
                        emotions: {
                            anticipation: 8,
                            desire: 9,
                            excitement: 7,
                            happiness: 8,
                            curiosity: 5,
                            surprise: 4
                        }
                    },
                    aroma: {
                        'smell-strength': 7,
                        'smell-complexity': 6,
                        'caramel-toffee-notes': 7,
                        'smell-duration': 6,
                        emotions: {
                            pleasure: 8,
                            comfort: 8,
                            nostalgia: 6,
                            happiness: 8,
                            energized: 3,
                            relaxed: 8,
                            intrigued: 5
                        }
                    },
                    frontMouth: {
                        sweetness: 7,
                        'sourness-tartness': 1,
                        saltiness: 1,
                        'first-bite-texture': 9,
                        'spicy-heat': 0,
                        emotions: {
                            excitement: 7,
                            satisfaction: 8,
                            happiness: 9,
                            pleasure: 9,
                            disappointment: 0
                        }
                    },
                    midRearMouth: {
                        'bitterness-development': 1,
                        'umami-savoury-depth': 2,
                        'richness-fullness': 9,
                        'overall-mid-palate-intensity': 8,
                        emotions: {
                            indulgence: 10,
                            comfort: 9,
                            satisfaction: 9,
                            pleasure: 9,
                            sophistication: 6
                        }
                    },
                    texture: {
                        creaminess: 10,
                        astringency: 0,
                        smoothness: 9,
                        emotions: {
                            satisfied: 9,
                            pleased: 9,
                            comforted: 9
                        }
                    },
                    aftertaste: {
                        'finish-length': 6,
                        'finish-quality': 8,
                        'finish-cleanness': 8,
                        emotions: {
                            satisfaction: 9,
                            completeness: 8,
                            happiness: 8,
                            'craving-want-more': 7
                        }
                    },
                    overallAssessment: {
                        'overall-quality': 9,
                        'satisfaction-overall': 9,
                        'want-more-quality': 8,
                        emotions: {
                            satisfaction: 9,
                            happiness: 9,
                            indulgence: 10
                        }
                    }
                },
                needState: 'reward',
                notes: 'Pale ivory with visible vanilla bean specks. Rich vanilla and cream aroma that is warm and inviting. Cold, immediate sweetness with creamy dense texture. Creaminess intensifies as it melts revealing vanilla complexity. Sweet clean finish with vanilla lingering pleasantly. Pure luxurious indulgence, savored slowly spoonful by spoonful.'
            },

            // Artisan Bread
            {
                id: 'demo-006',
                timestamp: new Date(timestamp - 2 * 24 * 60 * 60 * 1000).toISOString(),
                productInfo: {
                    name: 'Sourdough Artisan Loaf',
                    brand: 'Old Stone Bakery',
                    type: 'Bread',
                    variant: 'Traditional Sourdough',
                    occasion: 'Breakfast',
                    temperature: 'Room temperature'
                },
                testNumber: 1,
                stages: {
                    appearance: {
                        'visual-appeal': 8,
                        'color-richness': 6,
                        'bubble-activity': 0,
                        emotions: {
                            anticipation: 7,
                            desire: 6,
                            excitement: 5,
                            happiness: 6,
                            curiosity: 5,
                            surprise: 4
                        }
                    },
                    aroma: {
                        'smell-strength': 6,
                        'smell-complexity': 7,
                        'caramel-toffee-notes': 3,
                        'smell-duration': 5,
                        emotions: {
                            pleasure: 7,
                            comfort: 8,
                            nostalgia: 6,
                            happiness: 6,
                            energized: 4,
                            relaxed: 6,
                            intrigued: 5
                        }
                    },
                    frontMouth: {
                        sweetness: 2,
                        'sourness-tartness': 4,
                        saltiness: 3,
                        'first-bite-texture': 8,
                        'spicy-heat': 0,
                        emotions: {
                            excitement: 5,
                            satisfaction: 7,
                            happiness: 6,
                            pleasure: 7,
                            disappointment: 1
                        }
                    },
                    midRearMouth: {
                        'bitterness-development': 2,
                        'umami-savoury-depth': 5,
                        'richness-fullness': 5,
                        'overall-mid-palate-intensity': 6,
                        emotions: {
                            indulgence: 5,
                            comfort: 8,
                            satisfaction: 7,
                            pleasure: 7,
                            sophistication: 6
                        }
                    },
                    texture: {
                        creaminess: 3,
                        astringency: 2,
                        chewiness: 7,
                        crunchiness: 6,
                        emotions: {
                            satisfied: 7,
                            pleased: 7,
                            comforted: 8
                        }
                    },
                    aftertaste: {
                        'finish-length': 5,
                        'finish-quality': 7,
                        'finish-cleanness': 7,
                        emotions: {
                            satisfaction: 7,
                            completeness: 6,
                            happiness: 6,
                            'craving-want-more': 7
                        }
                    },
                    overallAssessment: {
                        'overall-quality': 7,
                        'satisfaction-overall': 7,
                        'want-more-quality': 7,
                        emotions: {
                            satisfaction: 7,
                            happiness: 6,
                            comfort: 8
                        }
                    }
                },
                needState: 'rejuvenation',
                notes: 'Golden-brown crust with flour dusting and open irregular crumb structure. Tangy sourdough aroma with toasted wheat and slight yeastiness. Crunchy crust contrasts with soft interior, mild tang and chewy texture. Sourdough complexity develops with slight wheat sweetness. Clean wheaty finish. Wholesome and authentic, connects to traditional craft.'
            },

            // Energy Bar
            {
                id: 'demo-007',
                timestamp: new Date(timestamp - 1 * 24 * 60 * 60 * 1000).toISOString(),
                productInfo: {
                    name: 'Protein Energy Bar - Peanut Butter',
                    brand: 'FuelUp Sports',
                    type: 'Nutrition Bar',
                    variant: 'Peanut Butter',
                    occasion: 'Pre-workout fuel',
                    temperature: 'Room temperature'
                },
                testNumber: 1,
                stages: {
                    appearance: {
                        'visual-appeal': 5,
                        'color-richness': 5,
                        'bubble-activity': 0,
                        emotions: {
                            anticipation: 5,
                            desire: 5,
                            excitement: 4,
                            happiness: 4,
                            curiosity: 3,
                            surprise: 2
                        }
                    },
                    aroma: {
                        'smell-strength': 6,
                        'smell-complexity': 4,
                        'caramel-toffee-notes': 4,
                        'smell-duration': 5,
                        emotions: {
                            pleasure: 5,
                            comfort: 5,
                            nostalgia: 3,
                            happiness: 5,
                            energized: 7,
                            relaxed: 2,
                            intrigued: 3
                        }
                    },
                    frontMouth: {
                        sweetness: 5,
                        'sourness-tartness': 1,
                        saltiness: 3,
                        'first-bite-texture': 6,
                        'spicy-heat': 0,
                        emotions: {
                            excitement: 4,
                            satisfaction: 6,
                            happiness: 5,
                            pleasure: 5,
                            disappointment: 3
                        }
                    },
                    midRearMouth: {
                        'bitterness-development': 2,
                        'umami-savoury-depth': 4,
                        'richness-fullness': 6,
                        'overall-mid-palate-intensity': 6,
                        emotions: {
                            indulgence: 4,
                            comfort: 5,
                            satisfaction: 6,
                            pleasure: 5,
                            sophistication: 2
                        }
                    },
                    texture: {
                        creaminess: 5,
                        astringency: 2,
                        chewiness: 7,
                        crunchiness: 5,
                        emotions: {
                            satisfied: 6,
                            pleased: 5,
                            energized: 6
                        }
                    },
                    aftertaste: {
                        'finish-length': 6,
                        'finish-quality': 5,
                        'finish-cleanness': 4,
                        emotions: {
                            satisfaction: 6,
                            completeness: 6,
                            happiness: 5,
                            'craving-want-more': 3
                        }
                    },
                    overallAssessment: {
                        'overall-quality': 6,
                        'satisfaction-overall': 6,
                        'want-more-quality': 4,
                        emotions: {
                            satisfaction: 6,
                            happiness: 5,
                            energized: 7
                        }
                    }
                },
                needState: 'rejuvenation',
                notes: 'Dense compact bar with visible nuts and grains. Roasted peanut aroma with slight sweetness and grain notes. Chewy dense texture with immediate peanut flavor, slightly dry. Peanut butter dominant mid-palate with grain texture throughout. Peanut flavor lingers with slight dryness. Functional and energizing, practical pre-workout fuel.'
            },

            // Sparkling Water
            {
                id: 'demo-008',
                timestamp: new Date(timestamp - 12 * 60 * 60 * 1000).toISOString(),
                productInfo: {
                    name: 'Lime Sparkling Water',
                    brand: 'Crystal Springs',
                    type: 'Beverage',
                    variant: 'Lime',
                    occasion: 'Afternoon refreshment',
                    temperature: 'Chilled'
                },
                testNumber: 1,
                stages: {
                    appearance: {
                        'visual-appeal': 7,
                        'color-richness': 2,
                        'bubble-activity': 9,
                        emotions: {
                            anticipation: 6,
                            desire: 6,
                            excitement: 5,
                            happiness: 6,
                            curiosity: 4,
                            surprise: 3
                        }
                    },
                    aroma: {
                        'smell-strength': 4,
                        'smell-complexity': 3,
                        'caramel-toffee-notes': 1,
                        'smell-duration': 3,
                        emotions: {
                            pleasure: 6,
                            comfort: 4,
                            nostalgia: 2,
                            happiness: 6,
                            energized: 6,
                            relaxed: 5,
                            intrigued: 3
                        }
                    },
                    frontMouth: {
                        sweetness: 0,
                        'sourness-tartness': 5,
                        saltiness: 1,
                        'first-bite-texture': 7,
                        'spicy-heat': 0,
                        emotions: {
                            excitement: 6,
                            satisfaction: 7,
                            happiness: 6,
                            pleasure: 6,
                            disappointment: 1
                        }
                    },
                    midRearMouth: {
                        'bitterness-development': 1,
                        'umami-savoury-depth': 0,
                        'richness-fullness': 1,
                        'overall-mid-palate-intensity': 5,
                        emotions: {
                            indulgence: 2,
                            comfort: 5,
                            satisfaction: 7,
                            pleasure: 6,
                            sophistication: 3
                        }
                    },
                    texture: {
                        creaminess: 0,
                        astringency: 1,
                        smoothness: 6,
                        effervescence: 9,
                        emotions: {
                            satisfied: 7,
                            pleased: 6,
                            refreshed: 9
                        }
                    },
                    aftertaste: {
                        'finish-length': 3,
                        'finish-quality': 7,
                        'finish-cleanness': 10,
                        emotions: {
                            satisfaction: 7,
                            completeness: 6,
                            happiness: 6,
                            'craving-want-more': 5
                        }
                    },
                    overallAssessment: {
                        'overall-quality': 7,
                        'satisfaction-overall': 7,
                        'refreshing-quality': 10,
                        emotions: {
                            satisfaction: 7,
                            happiness: 6,
                            refreshed: 9
                        }
                    }
                },
                needState: 'rejuvenation',
                notes: 'Crystal clear with vigorous carbonation and small persistent bubbles. Fresh lime aroma with subtle citrus zest. Sharp carbonation with immediate lime freshness, crisp and clean with no sweetness. Bubbles tickle the palate with consistent lime flavor. Very clean finish with no residue, leaves mouth feeling refreshed. Revitalizing and cleansing.'
            }
        ];
    }

    // Get a themed subset of demos by product type
    getDemosByTheme(theme) {
        const allDemos = this.getDemoExperiences();
        return allDemos.filter(exp => exp.productInfo && exp.productInfo.type === theme);
    }

    // Get demos by category (product type)
    getDemosByCategory(category) {
        const allDemos = this.getDemoExperiences();
        return allDemos.filter(exp => exp.productInfo && exp.productInfo.type === category);
    }

    // Show demo mode banner/indicator
    createDemoBanner() {
        const banner = document.createElement('div');
        banner.id = 'demo-mode-banner';
        banner.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 10px;
            text-align: center;
            z-index: 10000;
            font-size: 14px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        `;

        banner.innerHTML = `
            <strong>🎭 Demo Mode Active</strong> -
            You're viewing sample data.
            <button onclick="window.demoMode.deactivateDemoMode(); location.reload();"
                    style="margin-left: 15px; padding: 5px 15px; background: white; color: #667eea; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;">
                Exit Demo Mode
            </button>
        `;

        document.body.insertBefore(banner, document.body.firstChild);

        // Adjust body padding to account for banner
        document.body.style.paddingTop = '50px';
    }
}

// Initialize and make available globally
if (typeof window !== 'undefined') {
    window.DemoMode = DemoMode;
    window.demoMode = new DemoMode();

    // Auto-show banner if demo mode is active
    if (window.demoMode.isDemoActive()) {
        document.addEventListener('DOMContentLoaded', () => {
            window.demoMode.createDemoBanner();
        });
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DemoMode;
}
