// ===== CUSTOM SENSORY LEXICON MODULE =====

/**
 * Default Lexicon Structure
 * This is the baseline lexicon that ships with the app
 */
const defaultLexicon = {
    id: 'default',
    name: 'Default Sensory Lexicon',
    version: '1.1',
    category: 'General',
    description: 'Standard sensory evaluation framework for general food products',
    stages: [
        {
            id: 'appearance',
            name: 'Appearance',
            order: 1,
            attributes: [
                { id: 'color-shade', label: 'Color Shade', technicalTerm: 'Hue', subCategory: null, type: 'slider', min: 0, max: 10, defaultValue: 0, unit: '', description: 'The dominant wavelength of color perceived' },
                { id: 'color-richness', label: 'Color Richness', technicalTerm: 'Saturation/Chroma', subCategory: null, type: 'slider', min: 0, max: 10, defaultValue: 0, unit: '', description: 'Depth and vibrancy of color' },
                { id: 'color-lightness', label: 'Color Lightness', technicalTerm: 'Value/Luminosity', subCategory: null, type: 'slider', min: 0, max: 10, defaultValue: 0, unit: '', description: 'Brightness or darkness of color' },
                { id: 'color-strength', label: 'Color Strength', technicalTerm: 'Color Intensity', subCategory: null, type: 'slider', min: 0, max: 10, defaultValue: 0, unit: '', description: 'Overall strength of color presence' },
                { id: 'color-evenness', label: 'Color Evenness', technicalTerm: 'Color Uniformity', subCategory: null, type: 'slider', min: 0, max: 10, defaultValue: 0, unit: '', description: 'Consistency of color distribution' },
                { id: 'color-depth', label: 'Color Depth', technicalTerm: 'Color Gradient', subCategory: null, type: 'slider', min: 0, max: 10, defaultValue: 0, unit: '', description: 'Layering and gradient of color' },
                { id: 'surface-shine', label: 'Surface Shine', technicalTerm: 'Gloss/Sheen', subCategory: null, type: 'slider', min: 0, max: 10, defaultValue: 0, unit: '', description: 'Reflectiveness of the surface' },
                { id: 'surface-texture', label: 'Surface Texture', technicalTerm: 'Visual Roughness', subCategory: null, type: 'slider', min: 0, max: 10, defaultValue: 0, unit: '', description: 'Perceived roughness of the surface' },
                { id: 'surface-oiliness', label: 'Surface Oiliness', technicalTerm: 'Visual Fat/Oil Presence', subCategory: null, type: 'slider', min: 0, max: 10, defaultValue: 0, unit: '', description: 'Visible oil or fat on the surface' },
                { id: 'surface-moisture', label: 'Surface Moisture', technicalTerm: 'Wet/Dry Appearance', subCategory: null, type: 'slider', min: 0, max: 10, defaultValue: 0, unit: '', description: 'Apparent moisture level on surface' },
                { id: 'see-through-quality', label: 'See-Through Quality', technicalTerm: 'Clarity/Transparency', subCategory: null, type: 'slider', min: 0, max: 10, defaultValue: 0, unit: '', description: 'Degree of visual transparency' },
                { id: 'cloudiness', label: 'Cloudiness', technicalTerm: 'Turbidity/Haze', subCategory: null, type: 'slider', min: 0, max: 10, defaultValue: 0, unit: '', description: 'Degree of haziness or turbidity' },
                { id: 'light-blocking', label: 'Light-Blocking', technicalTerm: 'Opacity', subCategory: null, type: 'slider', min: 0, max: 10, defaultValue: 0, unit: '', description: 'Degree to which light is blocked' },
                { id: 'piece-size', label: 'Piece Size', technicalTerm: 'Dimensional Scale', subCategory: null, type: 'slider', min: 0, max: 10, defaultValue: 0, unit: '', description: 'Perceived size of pieces or portions' },
                { id: 'shape-regularity', label: 'Shape Regularity', technicalTerm: 'Morphological Uniformity', subCategory: null, type: 'slider', min: 0, max: 10, defaultValue: 0, unit: '', description: 'Consistency and regularity of shape' },
                { id: 'size-consistency', label: 'Size Consistency', technicalTerm: 'Structural Uniformity', subCategory: null, type: 'slider', min: 0, max: 10, defaultValue: 0, unit: '', description: 'Uniformity of size across pieces' },
                { id: 'surface-holes', label: 'Surface Holes', technicalTerm: 'Visible Porosity', subCategory: null, type: 'slider', min: 0, max: 10, defaultValue: 0, unit: '', description: 'Visible pores or holes on surface' },
                { id: 'perceived-thickness', label: 'Perceived Thickness', technicalTerm: 'Visual Viscosity/Body', subCategory: null, type: 'slider', min: 0, max: 10, defaultValue: 0, unit: '', description: 'Apparent viscosity or body of liquid' },
                { id: 'flow-and-legs', label: 'Flow and Legs', technicalTerm: 'Visual Flow Behaviour', subCategory: null, type: 'slider', min: 0, max: 10, defaultValue: 0, unit: '', description: 'How liquid flows or creates legs on glass' },
                { id: 'bubble-size', label: 'Bubble Size', technicalTerm: 'Visual Bubble Diameter', subCategory: null, type: 'slider', min: 0, max: 10, defaultValue: 0, unit: '', description: 'Size of visible bubbles' },
                { id: 'bubble-activity', label: 'Bubble Activity', technicalTerm: 'Effervescence Rate', subCategory: null, type: 'slider', min: 0, max: 10, defaultValue: 0, unit: '', description: 'Rate and activity of bubble formation' },
                { id: 'foam-height', label: 'Foam Height', technicalTerm: 'Head Formation', subCategory: null, type: 'slider', min: 0, max: 10, defaultValue: 0, unit: '', description: 'Height of foam or head formed' },
                { id: 'foam-persistence', label: 'Foam Persistence', technicalTerm: 'Visual Foam Stability', subCategory: null, type: 'slider', min: 0, max: 10, defaultValue: 0, unit: '', description: 'How long foam remains stable' },
                { id: 'visible-particles', label: 'Visible Particles', technicalTerm: 'Particulate Presence', subCategory: null, type: 'slider', min: 0, max: 10, defaultValue: 0, unit: '', description: 'Presence of visible particles or inclusions' },
                { id: 'pattern-and-marbling', label: 'Pattern and Marbling', technicalTerm: 'Visual Heterogeneity', subCategory: null, type: 'slider', min: 0, max: 10, defaultValue: 0, unit: '', description: 'Visible patterns, swirls or marbling' },
                { id: 'visual-complexity', label: 'Visual Complexity', technicalTerm: 'Visual Intricacy', subCategory: null, type: 'slider', min: 0, max: 10, defaultValue: 0, unit: '', description: 'Overall visual intricacy and detail' },
                { id: 'visual-appeal', label: 'Visual Appeal', technicalTerm: 'Overall Visual Attractiveness', subCategory: null, type: 'slider', min: 0, max: 10, defaultValue: 0, unit: '', description: 'Overall visual attractiveness' },
                { id: 'temperature-cue', label: 'Temperature Cue', technicalTerm: 'Visual Thermal Indicator', subCategory: null, type: 'slider', min: 0, max: 10, defaultValue: 0, unit: '', description: 'Visual cues indicating temperature' }
            ],
            emotions: ['anticipation', 'curiosity', 'desire', 'eager', 'excitement', 'happiness', 'interest', 'pleased', 'surprise', 'attracted', 'disappointed', 'disgusted', 'indifferent', 'suspicious', 'worried', 'anxious', 'confused', 'bored']
        },
        {
            id: 'aroma',
            name: 'Aroma',
            order: 2,
            attributes: [
                { id: 'smell-strength', label: 'Smell Strength', technicalTerm: 'Aroma Intensity', subCategory: null, type: 'slider', min: 0, max: 10, defaultValue: 0, unit: '', description: 'Overall strength of the aroma' },
                { id: 'first-impression', label: 'First Impression', technicalTerm: 'Aroma Impact/Top Note', subCategory: null, type: 'slider', min: 0, max: 10, defaultValue: 0, unit: '', description: 'Initial aromatic impact on first encounter' },
                { id: 'pungent-sting', label: 'Pungent Sting', technicalTerm: 'Nasal Pungency', subCategory: null, type: 'slider', min: 0, max: 10, defaultValue: 0, unit: '', description: 'Sharp stinging sensation in the nasal passage' },
                { id: 'fruity-notes', label: 'Fruity Notes', technicalTerm: 'Fruity Aroma', subCategory: null, type: 'slider', min: 0, max: 10, defaultValue: 0, unit: '', description: 'Fruit-like aromatic character' },
                { id: 'flower-like-notes', label: 'Flower-Like Notes', technicalTerm: 'Floral Aroma', subCategory: null, type: 'slider', min: 0, max: 10, defaultValue: 0, unit: '', description: 'Floral aromatic character' },
                { id: 'plant-like-green-notes', label: 'Plant-Like/Green Notes', technicalTerm: 'Herbaceous/Green Aroma', subCategory: null, type: 'slider', min: 0, max: 10, defaultValue: 0, unit: '', description: 'Herbaceous or green aromatic character' },
                { id: 'warm-spice-notes', label: 'Warm Spice Notes', technicalTerm: 'Spicy Aroma', subCategory: null, type: 'slider', min: 0, max: 10, defaultValue: 0, unit: '', description: 'Warm spice aromatic character' },
                { id: 'toasted-roasted-notes', label: 'Toasted/Roasted Notes', technicalTerm: 'Roasted/Toasted Aroma', subCategory: null, type: 'slider', min: 0, max: 10, defaultValue: 0, unit: '', description: 'Toasted or roasted aromatic character' },
                { id: 'caramel-toffee-notes', label: 'Caramel/Toffee Notes', technicalTerm: 'Caramelized/Sweet Aroma', subCategory: null, type: 'slider', min: 0, max: 10, defaultValue: 0, unit: '', description: 'Caramelized sweet aromatic character' },
                { id: 'fermented-notes', label: 'Fermented Notes', technicalTerm: 'Fermented/Lactic Aroma', subCategory: null, type: 'slider', min: 0, max: 10, defaultValue: 0, unit: '', description: 'Fermented or lactic aromatic character' },
                { id: 'dairy-creamy-notes', label: 'Dairy/Creamy Notes', technicalTerm: 'Lactic/Dairy Aroma', subCategory: null, type: 'slider', min: 0, max: 10, defaultValue: 0, unit: '', description: 'Dairy or creamy aromatic character' },
                { id: 'earth-like-notes', label: 'Earth-Like Notes', technicalTerm: 'Earthy/Musty Aroma', subCategory: null, type: 'slider', min: 0, max: 10, defaultValue: 0, unit: '', description: 'Earthy or musty aromatic character' },
                { id: 'ocean-sea-notes', label: 'Ocean/Sea Notes', technicalTerm: 'Marine/Oceanic Aroma', subCategory: null, type: 'slider', min: 0, max: 10, defaultValue: 0, unit: '', description: 'Marine or oceanic aromatic character' },
                { id: 'nut-like-notes', label: 'Nut-Like Notes', technicalTerm: 'Nutty Aroma', subCategory: null, type: 'slider', min: 0, max: 10, defaultValue: 0, unit: '', description: 'Nutty aromatic character' },
                { id: 'wood-like-notes', label: 'Wood-Like Notes', technicalTerm: 'Woody/Resinous Aroma', subCategory: null, type: 'slider', min: 0, max: 10, defaultValue: 0, unit: '', description: 'Woody or resinous aromatic character' },
                { id: 'savoury-meaty-notes', label: 'Savoury/Meaty Notes', technicalTerm: 'Animal/Umami Aroma', subCategory: null, type: 'slider', min: 0, max: 10, defaultValue: 0, unit: '', description: 'Savoury or meaty aromatic character' },
                { id: 'smoky-notes', label: 'Smoky Notes', technicalTerm: 'Smoke/Pyrogenic Aroma', subCategory: null, type: 'slider', min: 0, max: 10, defaultValue: 0, unit: '', description: 'Smoky aromatic character' },
                { id: 'chemical-solvent-notes', label: 'Chemical/Solvent Notes', technicalTerm: 'Chemical Off-Note Aroma', subCategory: null, type: 'slider', min: 0, max: 10, defaultValue: 0, unit: '', description: 'Chemical or solvent off-note aroma' },
                { id: 'sulphur-like-notes', label: 'Sulphur-Like Notes', technicalTerm: 'Sulphurous Aroma', subCategory: null, type: 'slider', min: 0, max: 10, defaultValue: 0, unit: '', description: 'Sulphurous aromatic character' },
                { id: 'smell-duration', label: 'Smell Duration', technicalTerm: 'Aroma Persistence/Linger', subCategory: null, type: 'slider', min: 0, max: 10, defaultValue: 0, unit: '', description: 'How long the aroma lingers' },
                { id: 'smell-development', label: 'Smell Development', technicalTerm: 'Aroma Evolution', subCategory: null, type: 'slider', min: 0, max: 10, defaultValue: 0, unit: '', description: 'How the aroma evolves over time' },
                { id: 'smell-lift', label: 'Smell Lift', technicalTerm: 'Aroma Volatility/Lift', subCategory: null, type: 'slider', min: 0, max: 10, defaultValue: 0, unit: '', description: 'Perceived volatility and lift of the aroma' },
                { id: 'smell-complexity', label: 'Smell Complexity', technicalTerm: 'Olfactory Complexity', subCategory: null, type: 'slider', min: 0, max: 10, defaultValue: 0, unit: '', description: 'Number and layering of aromatic notes' },
                { id: 'smell-balance', label: 'Smell Balance', technicalTerm: 'Aroma Harmony', subCategory: null, type: 'slider', min: 0, max: 10, defaultValue: 0, unit: '', description: 'Harmony and balance of aromatic notes' },
                { id: 'freshness-vs-staleness', label: 'Freshness vs. Staleness', technicalTerm: 'Aroma Freshness', subCategory: null, type: 'slider', min: 0, max: 10, defaultValue: 0, unit: '', description: 'Perceived freshness of the aroma' }
            ],
            emotions: ['pleasure', 'comfort', 'nostalgia', 'happiness', 'energized', 'relaxed', 'intrigued', 'refreshed', 'desire', 'warm', 'soothed', 'surprised', 'interested', 'calm', 'disgusted', 'irritated', 'worried', 'disappointed', 'indifferent', 'anxious', 'repulsed']
        },
        {
            id: 'frontMouth',
            name: 'Front of Mouth',
            order: 3,
            attributes: [
                { id: 'sweetness', label: 'Sweetness', technicalTerm: 'Gustatory Sweetness', subCategory: null, type: 'slider', min: 0, max: 10, defaultValue: 0, unit: '', description: 'Sweet taste intensity' },
                { id: 'sourness-tartness', label: 'Sourness/Tartness', technicalTerm: 'Gustatory Acidity', subCategory: null, type: 'slider', min: 0, max: 10, defaultValue: 0, unit: '', description: 'Sour or acidic taste intensity' },
                { id: 'saltiness', label: 'Saltiness', technicalTerm: 'Gustatory Salinity', subCategory: null, type: 'slider', min: 0, max: 10, defaultValue: 0, unit: '', description: 'Salty taste intensity' },
                { id: 'bitterness', label: 'Bitterness', technicalTerm: 'Gustatory Bitterness', subCategory: null, type: 'slider', min: 0, max: 10, defaultValue: 0, unit: '', description: 'Bitter taste intensity' },
                { id: 'savouriness', label: 'Savouriness', technicalTerm: 'Umami', subCategory: null, type: 'slider', min: 0, max: 10, defaultValue: 0, unit: '', description: 'Savoury or umami taste intensity' },
                { id: 'spicy-heat', label: 'Spicy Heat', technicalTerm: 'Chemesthetic Pungency', subCategory: null, type: 'slider', min: 0, max: 10, defaultValue: 0, unit: '', description: 'Heat and spice intensity' },
                { id: 'cooling-sensation', label: 'Cooling Sensation', technicalTerm: 'Chemesthetic Cooling', subCategory: null, type: 'slider', min: 0, max: 10, defaultValue: 0, unit: '', description: 'Cooling sensation in the mouth' },
                { id: 'carbonation-bite', label: 'Carbonation Bite', technicalTerm: 'CO₂ Chemesthetic Stimulation', subCategory: null, type: 'slider', min: 0, max: 10, defaultValue: 0, unit: '', description: 'Biting sensation from carbonation' },
                { id: 'tingling-numbing', label: 'Tingling/Numbing', technicalTerm: 'Trigeminal Paresthesia', subCategory: null, type: 'slider', min: 0, max: 10, defaultValue: 0, unit: '', description: 'Tingling or numbing sensation' },
                { id: 'first-hit-speed', label: 'First Hit Speed', technicalTerm: 'Taste Onset Velocity/T_onset', subCategory: null, type: 'slider', min: 0, max: 10, defaultValue: 0, unit: '', description: 'Speed at which taste sensation arrives' },
                { id: 'initial-impact-strength', label: 'Initial Impact Strength', technicalTerm: 'First-Bite Intensity', subCategory: null, type: 'slider', min: 0, max: 10, defaultValue: 0, unit: '', description: 'Strength of the initial taste impact' },
                { id: 'flavour-burst', label: 'Flavour Burst', technicalTerm: 'Rate of Flavour Development/R_inc', subCategory: null, type: 'slider', min: 0, max: 10, defaultValue: 0, unit: '', description: 'Rate of flavour development on entry' },
                { id: 'first-bite-texture', label: 'First-Bite Texture', technicalTerm: 'Initial Fracture/Resistance', subCategory: null, type: 'slider', min: 0, max: 10, defaultValue: 0, unit: '', description: 'Textural resistance on first bite' },
                { id: 'temperature-sensation', label: 'Temperature Sensation', technicalTerm: 'Thermal Perception Onset', subCategory: null, type: 'slider', min: 0, max: 10, defaultValue: 0, unit: '', description: 'Initial temperature sensation in mouth' },
                { id: 'initial-mouth-watering', label: 'Initial Mouth-Watering', technicalTerm: 'Salivation Response', subCategory: null, type: 'slider', min: 0, max: 10, defaultValue: 0, unit: '', description: 'Degree of salivation triggered' },
                { id: 'overall-initial-impact', label: 'Overall Initial Impact', technicalTerm: 'Front-of-Mouth Intensity', subCategory: null, type: 'slider', min: 0, max: 10, defaultValue: 0, unit: '', description: 'Total front palate impact' },
                { id: 'taste-dominance-at-entry', label: 'Taste Dominance at Entry', technicalTerm: 'Initial Taste Sequence', subCategory: null, type: 'slider', min: 0, max: 10, defaultValue: 0, unit: '', description: 'Which taste dominates on entry' }
            ],
            emotions: ['excitement', 'surprise', 'happiness', 'pleasure', 'interest', 'satisfaction', 'energized', 'delighted', 'amused', 'disappointed', 'disgusted', 'bored', 'confused', 'overwhelmed', 'upset', 'worried']
        },
        {
            id: 'midRearMouth',
            name: 'Mid/Rear Mouth',
            order: 4,
            attributes: [
                { id: 'sweetness-development', label: 'Sweetness Development', technicalTerm: 'Peak Sweetness Intensity', subCategory: null, type: 'slider', min: 0, max: 10, defaultValue: 0, unit: '', description: 'Development of sweetness in mid palate' },
                { id: 'sourness-acidity-development', label: 'Sourness/Acidity Development', technicalTerm: 'Peak Sourness Intensity', subCategory: null, type: 'slider', min: 0, max: 10, defaultValue: 0, unit: '', description: 'Development of sourness in mid palate' },
                { id: 'saltiness-development', label: 'Saltiness Development', technicalTerm: 'Peak Saltiness Intensity', subCategory: null, type: 'slider', min: 0, max: 10, defaultValue: 0, unit: '', description: 'Development of saltiness in mid palate' },
                { id: 'bitterness-development', label: 'Bitterness Development', technicalTerm: 'Peak Bitterness Intensity', subCategory: null, type: 'slider', min: 0, max: 10, defaultValue: 0, unit: '', description: 'Development of bitterness in mid palate' },
                { id: 'umami-savoury-depth', label: 'Umami/Savoury Depth', technicalTerm: 'Peak Umami Intensity', subCategory: null, type: 'slider', min: 0, max: 10, defaultValue: 0, unit: '', description: 'Depth of umami or savoury character' },
                { id: 'richness-fullness', label: 'Richness/Fullness', technicalTerm: 'Kokumi', subCategory: null, type: 'slider', min: 0, max: 10, defaultValue: 0, unit: '', description: 'Overall fullness and richness' },
                { id: 'fat-taste', label: 'Fat Taste', technicalTerm: 'Oleogustus', subCategory: null, type: 'slider', min: 0, max: 10, defaultValue: 0, unit: '', description: 'Perceived fat or oily taste' },
                { id: 'metallic-sensation', label: 'Metallic Sensation', technicalTerm: 'Metallic Taste', subCategory: null, type: 'slider', min: 0, max: 10, defaultValue: 0, unit: '', description: 'Metallic taste sensation' },
                { id: 'starchy-cereal-quality', label: 'Starchy/Cereal Quality', technicalTerm: 'Starchy Taste', subCategory: null, type: 'slider', min: 0, max: 10, defaultValue: 0, unit: '', description: 'Starchy or cereal-like taste quality' },
                { id: 'mineral-quality', label: 'Mineral Quality', technicalTerm: 'Mineral Taste', subCategory: null, type: 'slider', min: 0, max: 10, defaultValue: 0, unit: '', description: 'Mineral taste character' },
                { id: 'in-mouth-aroma-strength', label: 'In-Mouth Aroma Strength', technicalTerm: 'Retronasal Aroma Intensity', subCategory: null, type: 'slider', min: 0, max: 10, defaultValue: 0, unit: '', description: 'Intensity of retronasal aroma' },
                { id: 'in-mouth-aroma-complexity', label: 'In-Mouth Aroma Complexity', technicalTerm: 'Retronasal Complexity', subCategory: null, type: 'slider', min: 0, max: 10, defaultValue: 0, unit: '', description: 'Complexity of retronasal aroma' },
                { id: 'in-mouth-aroma-character', label: 'In-Mouth Aroma Character', technicalTerm: 'Retronasal Aroma Quality', subCategory: null, type: 'slider', min: 0, max: 10, defaultValue: 0, unit: '', description: 'Quality and character of retronasal aroma' },
                { id: 'flavour-peak', label: 'Flavour Peak', technicalTerm: 'Peak Intensity/I_max', subCategory: null, type: 'slider', min: 0, max: 10, defaultValue: 0, unit: '', description: 'Maximum flavour intensity reached' },
                { id: 'time-to-peak', label: 'Time to Peak', technicalTerm: 'T_max', subCategory: null, type: 'slider', min: 0, max: 10, defaultValue: 0, unit: '', description: 'Time taken to reach peak flavour' },
                { id: 'peak-duration', label: 'Peak Duration', technicalTerm: 'Plateau Duration/T_plateau', subCategory: null, type: 'slider', min: 0, max: 10, defaultValue: 0, unit: '', description: 'Length of time at peak flavour intensity' },
                { id: 'flavour-dominance-sequence', label: 'Flavour Dominance Sequence', technicalTerm: 'TDS Dominance Pattern', subCategory: null, type: 'slider', min: 0, max: 10, defaultValue: 0, unit: '', description: 'Sequence of dominant flavour notes' },
                { id: 'taste-balance', label: 'Taste Balance', technicalTerm: 'Inter-Taste Equilibrium', subCategory: null, type: 'slider', min: 0, max: 10, defaultValue: 0, unit: '', description: 'Balance between different taste qualities' },
                { id: 'taste-suppression', label: 'Taste Suppression', technicalTerm: 'Mutual Masking', subCategory: null, type: 'slider', min: 0, max: 10, defaultValue: 0, unit: '', description: 'Degree to which one taste masks another' },
                { id: 'taste-enhancement', label: 'Taste Enhancement', technicalTerm: 'Synergy/Amplification', subCategory: null, type: 'slider', min: 0, max: 10, defaultValue: 0, unit: '', description: 'Degree to which tastes enhance each other' },
                { id: 'flavour-complexity', label: 'Flavour Complexity', technicalTerm: 'Multi-Dimensional Richness', subCategory: null, type: 'slider', min: 0, max: 10, defaultValue: 0, unit: '', description: 'Overall multi-dimensional flavour complexity' },
                { id: 'flavour-harmony', label: 'Flavour Harmony', technicalTerm: 'Gustatory Coherence', subCategory: null, type: 'slider', min: 0, max: 10, defaultValue: 0, unit: '', description: 'Harmony and coherence of flavours' },
                { id: 'flavour-cleanness', label: 'Flavour Cleanness', technicalTerm: 'Gustatory Purity', subCategory: null, type: 'slider', min: 0, max: 10, defaultValue: 0, unit: '', description: 'Purity and cleanness of flavour' },
                { id: 'flavour-depth', label: 'Flavour Depth', technicalTerm: 'Sensory Layering', subCategory: null, type: 'slider', min: 0, max: 10, defaultValue: 0, unit: '', description: 'Depth and layering of flavour' },
                { id: 'overall-mid-palate-intensity', label: 'Overall Mid-Palate Intensity', technicalTerm: 'Full-Palate Intensity', subCategory: null, type: 'slider', min: 0, max: 10, defaultValue: 0, unit: '', description: 'Total mid/rear palate impact' }
            ],
            emotions: ['satisfaction', 'pleasure', 'indulgence', 'comfort', 'calm', 'warmth', 'joy', 'loving', 'adventurous', 'energized', 'secure', 'nostalgic', 'guilty', 'bored', 'disgusted', 'disappointed', 'aggressive', 'overwhelmed', 'dissatisfied', 'sad']
        },
        {
            id: 'aftertaste',
            name: 'Aftertaste',
            order: 5,
            attributes: [
                { id: 'duration', label: 'Duration', type: 'slider', min: 1, max: 10, unit: 'seconds', description: 'How long flavors linger' },
                { id: 'pleasantness', label: 'Pleasantness', type: 'slider', min: 1, max: 10, unit: '', description: 'Quality of lingering taste' },
                { id: 'cleanness', label: 'Palate Cleanness', type: 'slider', min: 1, max: 10, unit: '', description: 'How clean palate feels' },
                { id: 'overallIntensity', label: 'Overall Intensity', type: 'slider', min: 1, max: 10, unit: '', description: 'Total aftertaste impact' }
            ],
            emotions: ['satisfaction', 'completeness', 'happiness', 'craving']
        }
    ],
    emotionalTriggers: [
        { id: 'moreishness', label: 'Moreishness', description: 'Desire to consume more' },
        { id: 'refreshment', label: 'Refreshment', description: 'Refreshing quality' },
        { id: 'melt', label: 'Melt-in-Mouth', description: 'Pleasant melting sensation' },
        { id: 'crunch', label: 'Crunch Factor', description: 'Satisfying crunch' }
    ]
};

// Storage for custom lexicons
let customLexicons = [];
let activeLexicon = null;

/**
 * Load custom lexicons from localStorage
 */
function loadCustomLexicons() {
    const stored = localStorage.getItem('customLexicons');
    if (stored) {
        try {
            customLexicons = JSON.parse(stored);
        } catch (e) {
            console.error('Error loading custom lexicons:', e);
            customLexicons = [];
        }
    }

    // Load active lexicon ID
    const activeId = localStorage.getItem('activeLexiconId');
    if (activeId === 'default') {
        activeLexicon = defaultLexicon;
    } else if (activeId) {
        activeLexicon = customLexicons.find(l => l.id === activeId) || defaultLexicon;
    } else {
        activeLexicon = defaultLexicon;
    }
}

/**
 * Save custom lexicons to localStorage
 */
function saveCustomLexicons() {
    localStorage.setItem('customLexicons', JSON.stringify(customLexicons));
}

/**
 * Set active lexicon
 */
function setActiveLexicon(lexiconId) {
    if (lexiconId === 'default') {
        activeLexicon = defaultLexicon;
    } else {
        activeLexicon = customLexicons.find(l => l.id === lexiconId) || defaultLexicon;
    }
    localStorage.setItem('activeLexiconId', lexiconId);

    // Trigger form regeneration if needed
    if (typeof regenerateTasteForm === 'function') {
        regenerateTasteForm();
    }
}

/**
 * Get active lexicon
 */
function getActiveLexicon() {
    return activeLexicon || defaultLexicon;
}

/**
 * Create new custom lexicon
 */
function createCustomLexicon(name, category, description) {
    const newLexicon = {
        id: `custom_${Date.now()}`,
        name: name,
        version: '1.0',
        category: category,
        description: description,
        stages: JSON.parse(JSON.stringify(defaultLexicon.stages)), // Deep copy
        emotionalTriggers: JSON.parse(JSON.stringify(defaultLexicon.emotionalTriggers)),
        isCustom: true,
        createdAt: new Date().toISOString()
    };

    customLexicons.push(newLexicon);
    saveCustomLexicons();
    return newLexicon;
}

/**
 * Update custom lexicon
 */
function updateCustomLexicon(lexiconId, updates) {
    const lexicon = customLexicons.find(l => l.id === lexiconId);
    if (!lexicon) return false;

    Object.assign(lexicon, updates);
    lexicon.modifiedAt = new Date().toISOString();
    saveCustomLexicons();

    // If this is the active lexicon, update it
    if (activeLexicon && activeLexicon.id === lexiconId) {
        activeLexicon = lexicon;
    }

    return true;
}

/**
 * Delete custom lexicon
 */
function deleteCustomLexicon(lexiconId) {
    const index = customLexicons.findIndex(l => l.id === lexiconId);
    if (index === -1) return false;

    customLexicons.splice(index, 1);
    saveCustomLexicons();

    // If this was the active lexicon, switch to default
    if (activeLexicon && activeLexicon.id === lexiconId) {
        setActiveLexicon('default');
    }

    return true;
}

/**
 * Add stage to lexicon
 */
function addStageToLexicon(lexiconId, stageName) {
    const lexicon = customLexicons.find(l => l.id === lexiconId);
    if (!lexicon) return false;

    const newStage = {
        id: `stage_${Date.now()}`,
        name: stageName,
        order: lexicon.stages.length + 1,
        attributes: [],
        emotions: []
    };

    lexicon.stages.push(newStage);
    saveCustomLexicons();
    return newStage;
}

/**
 * Add attribute to stage
 */
function addAttributeToStage(lexiconId, stageId, attribute) {
    const lexicon = customLexicons.find(l => l.id === lexiconId);
    if (!lexicon) return false;

    const stage = lexicon.stages.find(s => s.id === stageId);
    if (!stage) return false;

    const newAttribute = {
        id: `attr_${Date.now()}`,
        label: attribute.label,
        type: attribute.type || 'slider',
        min: attribute.min || 1,
        max: attribute.max || 10,
        unit: attribute.unit || '',
        description: attribute.description || ''
    };

    stage.attributes.push(newAttribute);
    saveCustomLexicons();
    return newAttribute;
}

/**
 * Remove attribute from stage
 */
function removeAttributeFromStage(lexiconId, stageId, attributeId) {
    const lexicon = customLexicons.find(l => l.id === lexiconId);
    if (!lexicon) return false;

    const stage = lexicon.stages.find(s => s.id === stageId);
    if (!stage) return false;

    const index = stage.attributes.findIndex(a => a.id === attributeId);
    if (index === -1) return false;

    stage.attributes.splice(index, 1);
    saveCustomLexicons();
    return true;
}

/**
 * Add emotion to stage
 */
function addEmotionToStage(lexiconId, stageId, emotionName) {
    const lexicon = customLexicons.find(l => l.id === lexiconId);
    if (!lexicon) return false;

    const stage = lexicon.stages.find(s => s.id === stageId);
    if (!stage) return false;

    if (!stage.emotions.includes(emotionName)) {
        stage.emotions.push(emotionName);
        saveCustomLexicons();
    }
    return true;
}

/**
 * Export lexicon to JSON
 */
function exportLexicon(lexiconId) {
    let lexicon;
    if (lexiconId === 'default') {
        lexicon = defaultLexicon;
    } else {
        lexicon = customLexicons.find(l => l.id === lexiconId);
    }

    if (!lexicon) return null;

    const exportData = {
        ...lexicon,
        exportedAt: new Date().toISOString(),
        exportedBy: 'Taste Signature App'
    };

    return JSON.stringify(exportData, null, 2);
}

/**
 * Import lexicon from JSON
 */
function importLexicon(jsonString) {
    try {
        const importedLexicon = JSON.parse(jsonString);

        // Validate structure
        if (!importedLexicon.name || !importedLexicon.stages) {
            throw new Error('Invalid lexicon format');
        }

        // Generate new ID to avoid conflicts
        importedLexicon.id = `imported_${Date.now()}`;
        importedLexicon.isCustom = true;
        importedLexicon.importedAt = new Date().toISOString();
        delete importedLexicon.exportedAt;
        delete importedLexicon.exportedBy;

        customLexicons.push(importedLexicon);
        saveCustomLexicons();

        return importedLexicon;
    } catch (e) {
        console.error('Error importing lexicon:', e);
        return null;
    }
}

/**
 * Get all lexicons (default + custom)
 */
function getAllLexicons() {
    return [defaultLexicon, ...customLexicons];
}

/**
 * Pre-built lexicon templates
 */
const lexiconTemplates = {
    beverage: {
        name: 'Beverage Lexicon',
        category: 'Beverage',
        description: 'Specialized lexicon for beverages including carbonation, temperature impact, and liquid mouthfeel',
        customStages: [
            {
                name: 'Appearance',
                attributes: [
                    { label: 'Color Intensity', description: 'Depth of color' },
                    { label: 'Clarity', description: 'Transparency vs cloudiness' },
                    { label: 'Carbonation Visual', description: 'Bubble activity (if applicable)' }
                ]
            },
            {
                name: 'Aroma',
                attributes: [
                    { label: 'Fruity Notes', description: 'Fruit aroma intensity' },
                    { label: 'Floral Notes', description: 'Floral aroma intensity' },
                    { label: 'Herbal/Green Notes', description: 'Herbal characteristics' }
                ]
            },
            {
                name: 'First Sip',
                attributes: [
                    { label: 'Sweetness', description: 'Sweet taste' },
                    { label: 'Acidity', description: 'Acidic/tart taste' },
                    { label: 'Carbonation Feel', description: 'Fizz sensation' },
                    { label: 'Temperature Impact', description: 'How temperature affects taste' }
                ]
            }
        ]
    },
    bakery: {
        name: 'Bakery Lexicon',
        category: 'Bakery',
        description: 'Optimized for baked goods with focus on texture, crumb, and crust characteristics',
        customStages: [
            {
                name: 'Appearance',
                attributes: [
                    { label: 'Crust Color', description: 'Browning level' },
                    { label: 'Shape & Form', description: 'Structural integrity' },
                    { label: 'Crumb Visibility', description: 'Interior texture appearance' }
                ]
            },
            {
                name: 'Texture',
                attributes: [
                    { label: 'Crust Crunch', description: 'External crispness' },
                    { label: 'Crumb Softness', description: 'Interior tenderness' },
                    { label: 'Chewiness', description: 'Resistance to chewing' },
                    { label: 'Moisture Level', description: 'Dry to moist spectrum' }
                ]
            }
        ]
    },
    dairy: {
        name: 'Dairy Lexicon',
        category: 'Dairy',
        description: 'Tailored for dairy products with emphasis on creaminess, fat content, and cultured notes',
        customStages: [
            {
                name: 'Appearance',
                attributes: [
                    { label: 'Color', description: 'White to cream spectrum' },
                    { label: 'Thickness Visual', description: 'Perceived viscosity' },
                    { label: 'Surface Characteristics', description: 'Smooth vs textured' }
                ]
            },
            {
                name: 'Texture',
                attributes: [
                    { label: 'Creaminess', description: 'Smooth, rich mouthfeel' },
                    { label: 'Viscosity', description: 'Thin to thick' },
                    { label: 'Fat Perception', description: 'Richness level' },
                    { label: 'Cultured Tang', description: 'Fermented taste (yogurt, sour cream)' }
                ]
            }
        ]
    }
};

/**
 * Create lexicon from template
 */
function createLexiconFromTemplate(templateKey) {
    const template = lexiconTemplates[templateKey];
    if (!template) return null;

    const newLexicon = createCustomLexicon(template.name, template.category, template.description);

    // Clear default stages and add template stages
    newLexicon.stages = template.customStages.map((stageTemplate, index) => ({
        id: `stage_${Date.now()}_${index}`,
        name: stageTemplate.name,
        order: index + 1,
        attributes: stageTemplate.attributes.map((attr, attrIndex) => ({
            id: `attr_${Date.now()}_${attrIndex}`,
            label: attr.label,
            type: 'slider',
            min: 1,
            max: 10,
            unit: '',
            description: attr.description
        })),
        emotions: []
    }));

    updateCustomLexicon(newLexicon.id, { stages: newLexicon.stages });
    return newLexicon;
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    loadCustomLexicons();
});
