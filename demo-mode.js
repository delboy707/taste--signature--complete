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
                productName: 'Premium Dark Chocolate 70%',
                category: 'Chocolate',
                consumptionOccasion: 'Afternoon indulgence',
                appearance: 'Deep mahogany brown with glossy surface. Clean snap with fine texture. Uniform color throughout.',
                aroma: 'Rich cocoa, hints of red fruit, subtle earthiness. Medium-high intensity.',
                frontMouth: 'Initial bitterness balanced by creamy melt. Smooth texture, no grittiness. Bold cocoa impact.',
                midRearMouth: 'Flavor complexity develops - dark fruit, coffee notes emerge. Velvety coating. Slight astringency.',
                aftertaste: 'Long, pleasant finish. Clean cocoa lingers without bitterness. Subtle fruit notes persist for 30+ seconds.',
                emotionalResponse: 'Sophisticated, indulgent, refined. Evokes a sense of treating myself well. Slow consumption, savoring each piece.',
                needState: 'Self-reward',
                emotionalTriggers: ['Sophistication', 'Indulgence', 'Quality'],
                timestamp: timestamp - 7 * 24 * 60 * 60 * 1000, // 7 days ago
                themes: ['Premium Chocolate Line', 'Competitor Analysis']
            },

            // Milk Chocolate Bar
            {
                id: 'demo-002',
                productName: 'Classic Milk Chocolate Bar',
                category: 'Chocolate',
                consumptionOccasion: 'Casual snacking',
                appearance: 'Light brown, smooth surface with slight sheen. Segmented pieces, clean edges.',
                aroma: 'Sweet milk, vanilla, mild cocoa. Comforting and familiar. Medium intensity.',
                frontMouth: 'Immediate sweetness, creamy melt. Smooth, soft texture. Gentle cocoa flavor.',
                midRearMouth: 'Milk and sugar dominate. Very smooth coating. Light cocoa notes throughout.',
                aftertaste: 'Sweet finish, moderate length. Milky notes linger. Clean, no off-notes.',
                emotionalResponse: 'Nostalgic, comforting, easy. Reminds me of childhood treats. Quick consumption, moreish.',
                needState: 'Comfort',
                emotionalTriggers: ['Nostalgia', 'Comfort', 'Familiarity'],
                timestamp: timestamp - 6 * 24 * 60 * 60 * 1000,
                themes: ['Own Portfolio', 'Mass Market']
            },

            // Artisan Coffee
            {
                id: 'demo-003',
                productName: 'Ethiopian Single Origin Coffee',
                category: 'Coffee',
                consumptionOccasion: 'Morning ritual',
                appearance: 'Medium roast beans with oil sheen. Brewed liquid is clear amber-brown. Good crema.',
                aroma: 'Floral notes, bright citrus, blueberry hints. Complex and aromatic. High intensity.',
                frontMouth: 'Bright acidity, tea-like body. Smooth, no bitterness. Floral and fruity.',
                midRearMouth: 'Complexity unfolds - jasmine, bergamot, berry sweetness. Light-medium body. Clean.',
                aftertaste: 'Long, evolving finish. Floral notes persist. Sweet, tea-like quality lingers for minutes.',
                emotionalResponse: 'Energizing, sophisticated, mindful. Starts my day with intention. Slow sipping, appreciative.',
                needState: 'Daily ritual',
                emotionalTriggers: ['Energy', 'Sophistication', 'Mindfulness'],
                timestamp: timestamp - 5 * 24 * 60 * 60 * 1000,
                themes: ['Coffee Portfolio', 'Premium Line']
            },

            // Craft Beer
            {
                id: 'demo-004',
                productName: 'West Coast IPA',
                category: 'Beer',
                consumptionOccasion: 'Evening relaxation',
                appearance: 'Golden amber with slight haze. White, foamy head with good retention. Effervescent.',
                aroma: 'Pine, grapefruit, tropical fruit. Dank hops dominant. High intensity, very aromatic.',
                frontMouth: 'Immediate hop bitterness, carbonation bite. Citrus burst. Medium-full body.',
                midRearMouth: 'Malt sweetness balances hop bitterness. Resinous quality. Grapefruit and pine throughout.',
                aftertaste: 'Long, bitter finish. Hop oils coat palate. Slight dryness encourages another sip.',
                emotionalResponse: 'Adventurous, bold, rebellious. Challenges the palate. Social, sharable experience.',
                needState: 'Social enjoyment',
                emotionalTriggers: ['Adventure', 'Boldness', 'Craft'],
                timestamp: timestamp - 4 * 24 * 60 * 60 * 1000,
                themes: ['Craft Beer Category', 'Competitor Benchmark']
            },

            // Premium Ice Cream
            {
                id: 'demo-005',
                productName: 'Vanilla Bean Ice Cream',
                category: 'Ice Cream',
                consumptionOccasion: 'Dessert treat',
                appearance: 'Pale ivory with visible vanilla bean specks. Smooth, dense texture. Slow melt.',
                aroma: 'Rich vanilla, cream, subtle sweetness. Warm, inviting. Medium-high intensity.',
                frontMouth: 'Cold, immediate sweetness. Creamy, dense texture. Pure vanilla flavor.',
                midRearMouth: 'Creaminess intensifies as it melts. Vanilla complexity emerges - floral, slightly woody. Rich mouthfeel.',
                aftertaste: 'Creamy coating remains. Sweet, clean finish. Vanilla lingers pleasantly.',
                emotionalResponse: 'Indulgent, pure, luxurious. Simple pleasure elevated. Slow enjoyment, savoring each spoonful.',
                needState: 'Indulgent treat',
                emotionalTriggers: ['Luxury', 'Purity', 'Indulgence'],
                timestamp: timestamp - 3 * 24 * 60 * 60 * 1000,
                themes: ['Ice Cream Line', 'Premium Positioning']
            },

            // Artisan Bread
            {
                id: 'demo-006',
                productName: 'Sourdough Artisan Loaf',
                category: 'Bread',
                consumptionOccasion: 'Breakfast',
                appearance: 'Golden-brown crust with flour dusting. Open, irregular crumb structure. Rustic, artisan appearance.',
                aroma: 'Tangy sourdough, toasted wheat, slight yeastiness. Complex and appetizing. Medium intensity.',
                frontMouth: 'Crunchy crust contrast with soft interior. Mild tang, wheaty flavor. Chewy texture.',
                midRearMouth: 'Sourdough complexity develops. Slight sweetness from wheat. Satisfying chew, not dense.',
                aftertaste: 'Clean, wheaty finish. Mild tang lingers. Leaves you wanting another bite.',
                emotionalResponse: 'Wholesome, authentic, grounding. Connects to traditional craft. Mindful consumption.',
                needState: 'Nourishment',
                emotionalTriggers: ['Authenticity', 'Wholesome', 'Craft'],
                timestamp: timestamp - 2 * 24 * 60 * 60 * 1000,
                themes: ['Bakery Portfolio', 'Artisan Category']
            },

            // Energy Bar
            {
                id: 'demo-007',
                productName: 'Protein Energy Bar - Peanut Butter',
                category: 'Nutrition Bar',
                consumptionOccasion: 'Pre-workout fuel',
                appearance: 'Dense, compact bar with visible nuts and grains. Matte finish, some texture visible.',
                aroma: 'Roasted peanuts, slight sweetness, grain notes. Nutty and wholesome. Medium intensity.',
                frontMouth: 'Chewy, dense texture. Immediate peanut flavor. Slightly dry. Sweet but not overly so.',
                midRearMouth: 'Peanut butter dominant, grain texture throughout. Requires chewing. Filling sensation.',
                aftertaste: 'Peanut flavor lingers. Slight dryness. Satisfying, substantial finish.',
                emotionalResponse: 'Functional, energizing, practical. Gets the job done. Quick consumption, on-the-go.',
                needState: 'Functional energy',
                emotionalTriggers: ['Energy', 'Health', 'Performance'],
                timestamp: timestamp - 1 * 24 * 60 * 60 * 1000,
                themes: ['Sports Nutrition', 'Functional Foods']
            },

            // Sparkling Water
            {
                id: 'demo-008',
                productName: 'Lime Sparkling Water',
                category: 'Beverage',
                consumptionOccasion: 'Afternoon refreshment',
                appearance: 'Crystal clear with vigorous carbonation. Small, persistent bubbles. Clean and bright.',
                aroma: 'Fresh lime, subtle citrus zest. Clean, bright. Light intensity.',
                frontMouth: 'Sharp carbonation, immediate lime freshness. Crisp, clean. No sweetness.',
                midRearMouth: 'Bubbles tickle palate. Lime flavor remains consistent. Very refreshing. Light body.',
                aftertaste: 'Clean finish, no residue. Slight lime note lingers. Leaves mouth feeling refreshed.',
                emotionalResponse: 'Refreshing, clean, revitalizing. Resets and cleanses. Encourages hydration.',
                needState: 'Refreshment',
                emotionalTriggers: ['Refreshment', 'Cleanliness', 'Health'],
                timestamp: timestamp - 12 * 60 * 60 * 1000, // 12 hours ago
                themes: ['Beverage Category', 'Health & Wellness']
            }
        ];
    }

    // Get a themed subset of demos
    getDemosByTheme(theme) {
        const allDemos = this.getDemoExperiences();
        return allDemos.filter(exp => exp.themes.includes(theme));
    }

    // Get demos by category
    getDemosByCategory(category) {
        const allDemos = this.getDemoExperiences();
        return allDemos.filter(exp => exp.category === category);
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
