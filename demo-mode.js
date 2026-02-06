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
                        visualAppeal: 9,
                        colorIntensity: 8,
                        overallIntensity: 8,
                        carbonation: 0,
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
                        intensity: 8,
                        sweetness: 3,
                        complexity: 9,
                        overallIntensity: 8,
                        persistence: 7,
                        emotions: {
                            pleasure: 8,
                            comfort: 6,
                            nostalgia: 4,
                            happiness: 7,
                            energy: 4,
                            relaxation: 6,
                            intrigue: 9
                        }
                    },
                    frontMouth: {
                        sweetness: 3,
                        sourness: 2,
                        saltiness: 1,
                        texture: 8,
                        overallIntensity: 8,
                        acidity: 2,
                        spiciness: 1,
                        emotions: {
                            excitement: 7,
                            satisfaction: 8,
                            happiness: 7,
                            pleasure: 8,
                            disappointment: 1
                        }
                    },
                    midRearMouth: {
                        bitterness: 6,
                        umami: 4,
                        richness: 8,
                        creaminess: 7,
                        overallIntensity: 8,
                        astringency: 4,
                        mouthfeel: 8,
                        emotions: {
                            indulgence: 9,
                            comfort: 7,
                            satisfaction: 8,
                            pleasure: 8,
                            sophistication: 9
                        }
                    },
                    aftertaste: {
                        duration: 8,
                        pleasantness: 8,
                        cleanness: 7,
                        overallIntensity: 7,
                        emotions: {
                            satisfaction: 8,
                            completeness: 8,
                            happiness: 7,
                            craving: 6
                        }
                    }
                },
                needState: 'reward',
                emotionalTriggers: {
                    moreishness: 7,
                    refreshment: 2,
                    melt: 9,
                    crunch: 3
                },
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
                        visualAppeal: 7,
                        colorIntensity: 5,
                        overallIntensity: 6,
                        carbonation: 0,
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
                        intensity: 6,
                        sweetness: 7,
                        complexity: 4,
                        overallIntensity: 6,
                        persistence: 5,
                        emotions: {
                            pleasure: 7,
                            comfort: 9,
                            nostalgia: 8,
                            happiness: 8,
                            energy: 3,
                            relaxation: 7,
                            intrigue: 3
                        }
                    },
                    frontMouth: {
                        sweetness: 7,
                        sourness: 1,
                        saltiness: 1,
                        texture: 7,
                        overallIntensity: 6,
                        acidity: 1,
                        spiciness: 0,
                        emotions: {
                            excitement: 5,
                            satisfaction: 7,
                            happiness: 8,
                            pleasure: 7,
                            disappointment: 1
                        }
                    },
                    midRearMouth: {
                        bitterness: 2,
                        umami: 2,
                        richness: 6,
                        creaminess: 8,
                        overallIntensity: 6,
                        astringency: 1,
                        mouthfeel: 7,
                        emotions: {
                            indulgence: 7,
                            comfort: 9,
                            satisfaction: 7,
                            pleasure: 7,
                            sophistication: 3
                        }
                    },
                    aftertaste: {
                        duration: 5,
                        pleasantness: 7,
                        cleanness: 7,
                        overallIntensity: 5,
                        emotions: {
                            satisfaction: 7,
                            completeness: 6,
                            happiness: 7,
                            craving: 8
                        }
                    }
                },
                needState: 'escape',
                emotionalTriggers: {
                    moreishness: 9,
                    refreshment: 2,
                    melt: 8,
                    crunch: 2
                },
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
                        visualAppeal: 8,
                        colorIntensity: 6,
                        overallIntensity: 7,
                        carbonation: 0,
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
                        intensity: 9,
                        sweetness: 4,
                        complexity: 9,
                        overallIntensity: 9,
                        persistence: 8,
                        emotions: {
                            pleasure: 8,
                            comfort: 6,
                            nostalgia: 3,
                            happiness: 7,
                            energy: 8,
                            relaxation: 4,
                            intrigue: 9
                        }
                    },
                    frontMouth: {
                        sweetness: 3,
                        sourness: 5,
                        saltiness: 0,
                        texture: 6,
                        overallIntensity: 7,
                        acidity: 7,
                        spiciness: 1,
                        emotions: {
                            excitement: 8,
                            satisfaction: 7,
                            happiness: 7,
                            pleasure: 7,
                            disappointment: 1
                        }
                    },
                    midRearMouth: {
                        bitterness: 4,
                        umami: 2,
                        richness: 6,
                        creaminess: 3,
                        overallIntensity: 7,
                        astringency: 3,
                        mouthfeel: 6,
                        emotions: {
                            indulgence: 6,
                            comfort: 5,
                            satisfaction: 7,
                            pleasure: 8,
                            sophistication: 9
                        }
                    },
                    aftertaste: {
                        duration: 9,
                        pleasantness: 8,
                        cleanness: 8,
                        overallIntensity: 7,
                        emotions: {
                            satisfaction: 8,
                            completeness: 7,
                            happiness: 7,
                            craving: 5
                        }
                    }
                },
                needState: 'rejuvenation',
                emotionalTriggers: {
                    moreishness: 5,
                    refreshment: 4,
                    melt: 1,
                    crunch: 0
                },
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
                        visualAppeal: 8,
                        colorIntensity: 7,
                        overallIntensity: 8,
                        carbonation: 8,
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
                        intensity: 9,
                        sweetness: 2,
                        complexity: 8,
                        overallIntensity: 9,
                        persistence: 8,
                        emotions: {
                            pleasure: 7,
                            comfort: 4,
                            nostalgia: 3,
                            happiness: 7,
                            energy: 6,
                            relaxation: 5,
                            intrigue: 8
                        }
                    },
                    frontMouth: {
                        sweetness: 2,
                        sourness: 3,
                        saltiness: 1,
                        texture: 7,
                        overallIntensity: 8,
                        acidity: 4,
                        spiciness: 2,
                        emotions: {
                            excitement: 8,
                            satisfaction: 7,
                            happiness: 7,
                            pleasure: 7,
                            disappointment: 2
                        }
                    },
                    midRearMouth: {
                        bitterness: 8,
                        umami: 3,
                        richness: 6,
                        creaminess: 3,
                        overallIntensity: 8,
                        astringency: 5,
                        mouthfeel: 7,
                        emotions: {
                            indulgence: 6,
                            comfort: 5,
                            satisfaction: 7,
                            pleasure: 7,
                            sophistication: 7
                        }
                    },
                    aftertaste: {
                        duration: 8,
                        pleasantness: 7,
                        cleanness: 5,
                        overallIntensity: 8,
                        emotions: {
                            satisfaction: 7,
                            completeness: 6,
                            happiness: 7,
                            craving: 8
                        }
                    }
                },
                needState: 'sociability',
                emotionalTriggers: {
                    moreishness: 7,
                    refreshment: 7,
                    melt: 0,
                    crunch: 0
                },
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
                        visualAppeal: 8,
                        colorIntensity: 4,
                        overallIntensity: 7,
                        carbonation: 0,
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
                        intensity: 7,
                        sweetness: 7,
                        complexity: 6,
                        overallIntensity: 7,
                        persistence: 6,
                        emotions: {
                            pleasure: 8,
                            comfort: 8,
                            nostalgia: 6,
                            happiness: 8,
                            energy: 3,
                            relaxation: 8,
                            intrigue: 5
                        }
                    },
                    frontMouth: {
                        sweetness: 7,
                        sourness: 1,
                        saltiness: 1,
                        texture: 9,
                        overallIntensity: 7,
                        acidity: 1,
                        spiciness: 0,
                        emotions: {
                            excitement: 7,
                            satisfaction: 8,
                            happiness: 9,
                            pleasure: 9,
                            disappointment: 0
                        }
                    },
                    midRearMouth: {
                        bitterness: 1,
                        umami: 2,
                        richness: 9,
                        creaminess: 10,
                        overallIntensity: 8,
                        astringency: 0,
                        mouthfeel: 9,
                        emotions: {
                            indulgence: 10,
                            comfort: 9,
                            satisfaction: 9,
                            pleasure: 9,
                            sophistication: 6
                        }
                    },
                    aftertaste: {
                        duration: 6,
                        pleasantness: 8,
                        cleanness: 8,
                        overallIntensity: 6,
                        emotions: {
                            satisfaction: 9,
                            completeness: 8,
                            happiness: 8,
                            craving: 7
                        }
                    }
                },
                needState: 'reward',
                emotionalTriggers: {
                    moreishness: 8,
                    refreshment: 5,
                    melt: 10,
                    crunch: 0
                },
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
                        visualAppeal: 8,
                        colorIntensity: 6,
                        overallIntensity: 7,
                        carbonation: 0,
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
                        intensity: 6,
                        sweetness: 3,
                        complexity: 7,
                        overallIntensity: 6,
                        persistence: 5,
                        emotions: {
                            pleasure: 7,
                            comfort: 8,
                            nostalgia: 6,
                            happiness: 6,
                            energy: 4,
                            relaxation: 6,
                            intrigue: 5
                        }
                    },
                    frontMouth: {
                        sweetness: 2,
                        sourness: 4,
                        saltiness: 3,
                        texture: 8,
                        overallIntensity: 6,
                        acidity: 4,
                        spiciness: 0,
                        emotions: {
                            excitement: 5,
                            satisfaction: 7,
                            happiness: 6,
                            pleasure: 7,
                            disappointment: 1
                        }
                    },
                    midRearMouth: {
                        bitterness: 2,
                        umami: 5,
                        richness: 5,
                        creaminess: 3,
                        overallIntensity: 6,
                        astringency: 2,
                        mouthfeel: 7,
                        emotions: {
                            indulgence: 5,
                            comfort: 8,
                            satisfaction: 7,
                            pleasure: 7,
                            sophistication: 6
                        }
                    },
                    aftertaste: {
                        duration: 5,
                        pleasantness: 7,
                        cleanness: 7,
                        overallIntensity: 5,
                        emotions: {
                            satisfaction: 7,
                            completeness: 6,
                            happiness: 6,
                            craving: 7
                        }
                    }
                },
                needState: 'rejuvenation',
                emotionalTriggers: {
                    moreishness: 7,
                    refreshment: 2,
                    melt: 1,
                    crunch: 8
                },
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
                        visualAppeal: 5,
                        colorIntensity: 5,
                        overallIntensity: 5,
                        carbonation: 0,
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
                        intensity: 6,
                        sweetness: 4,
                        complexity: 4,
                        overallIntensity: 6,
                        persistence: 5,
                        emotions: {
                            pleasure: 5,
                            comfort: 5,
                            nostalgia: 3,
                            happiness: 5,
                            energy: 7,
                            relaxation: 2,
                            intrigue: 3
                        }
                    },
                    frontMouth: {
                        sweetness: 5,
                        sourness: 1,
                        saltiness: 3,
                        texture: 6,
                        overallIntensity: 6,
                        acidity: 1,
                        spiciness: 0,
                        emotions: {
                            excitement: 4,
                            satisfaction: 6,
                            happiness: 5,
                            pleasure: 5,
                            disappointment: 3
                        }
                    },
                    midRearMouth: {
                        bitterness: 2,
                        umami: 4,
                        richness: 6,
                        creaminess: 5,
                        overallIntensity: 6,
                        astringency: 2,
                        mouthfeel: 5,
                        emotions: {
                            indulgence: 4,
                            comfort: 5,
                            satisfaction: 6,
                            pleasure: 5,
                            sophistication: 2
                        }
                    },
                    aftertaste: {
                        duration: 6,
                        pleasantness: 5,
                        cleanness: 4,
                        overallIntensity: 6,
                        emotions: {
                            satisfaction: 6,
                            completeness: 6,
                            happiness: 5,
                            craving: 3
                        }
                    }
                },
                needState: 'rejuvenation',
                emotionalTriggers: {
                    moreishness: 4,
                    refreshment: 2,
                    melt: 2,
                    crunch: 6
                },
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
                        visualAppeal: 7,
                        colorIntensity: 2,
                        overallIntensity: 6,
                        carbonation: 9,
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
                        intensity: 4,
                        sweetness: 1,
                        complexity: 3,
                        overallIntensity: 4,
                        persistence: 3,
                        emotions: {
                            pleasure: 6,
                            comfort: 4,
                            nostalgia: 2,
                            happiness: 6,
                            energy: 6,
                            relaxation: 5,
                            intrigue: 3
                        }
                    },
                    frontMouth: {
                        sweetness: 0,
                        sourness: 4,
                        saltiness: 1,
                        texture: 7,
                        overallIntensity: 6,
                        acidity: 5,
                        spiciness: 0,
                        emotions: {
                            excitement: 6,
                            satisfaction: 7,
                            happiness: 6,
                            pleasure: 6,
                            disappointment: 1
                        }
                    },
                    midRearMouth: {
                        bitterness: 1,
                        umami: 0,
                        richness: 1,
                        creaminess: 0,
                        overallIntensity: 5,
                        astringency: 1,
                        mouthfeel: 6,
                        emotions: {
                            indulgence: 2,
                            comfort: 5,
                            satisfaction: 7,
                            pleasure: 6,
                            sophistication: 3
                        }
                    },
                    aftertaste: {
                        duration: 3,
                        pleasantness: 7,
                        cleanness: 10,
                        overallIntensity: 3,
                        emotions: {
                            satisfaction: 7,
                            completeness: 6,
                            happiness: 6,
                            craving: 5
                        }
                    }
                },
                needState: 'rejuvenation',
                emotionalTriggers: {
                    moreishness: 5,
                    refreshment: 10,
                    melt: 0,
                    crunch: 0
                },
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
