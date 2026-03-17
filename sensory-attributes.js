// ===== SENSORY ATTRIBUTES LEXICON =====
// Complete expanded sensory attribute definitions for all 7 evaluation stages
// Each attribute has a consumer-facing label and an optional technicalTerm (tooltip-only)

const SENSORY_STAGES = [
    { id: 'appearance', label: 'Appearance', position: 1, description: 'Visual assessment before consumption' },
    { id: 'aroma', label: 'Aroma', position: 2, description: 'Olfactory experience' },
    { id: 'frontMouth', label: 'Front of Mouth', position: 3, description: 'Initial taste and texture' },
    { id: 'midRearMouth', label: 'Mid/Rear Mouth', position: 4, description: 'Developed flavors and mouthfeel' },
    { id: 'texture', label: 'Texture', position: 5, description: 'Complete textural evaluation' },
    { id: 'aftertaste', label: 'Aftertaste', position: 6, description: 'Post-consumption experience' },
    { id: 'overall', label: 'Overall Assessment', position: 7, description: 'Holistic evaluation' }
];

const SENSORY_STAGE_IDS = SENSORY_STAGES.map(s => s.id);

// ===== APPEARANCE (28 attributes) =====
const APPEARANCE_ATTRIBUTES = [
    // Color Properties
    { id: 'color-shade', label: 'Color Shade', technicalTerm: 'Hue', stage: 'appearance', subCategory: 'color_properties' },
    { id: 'color-richness', label: 'Color Richness', technicalTerm: 'Saturation/Chroma', stage: 'appearance', subCategory: 'color_properties' },
    { id: 'color-lightness', label: 'Color Lightness', technicalTerm: 'Value/Luminosity', stage: 'appearance', subCategory: 'color_properties' },
    { id: 'color-strength', label: 'Color Strength', technicalTerm: 'Color Intensity', stage: 'appearance', subCategory: 'color_properties' },
    { id: 'color-evenness', label: 'Color Evenness', technicalTerm: 'Color Uniformity', stage: 'appearance', subCategory: 'color_properties' },
    { id: 'color-depth', label: 'Color Depth', technicalTerm: 'Color Gradient', stage: 'appearance', subCategory: 'color_properties' },
    // Surface Properties
    { id: 'surface-shine', label: 'Surface Shine', technicalTerm: 'Gloss/Sheen', stage: 'appearance', subCategory: 'surface_properties' },
    { id: 'surface-texture', label: 'Surface Texture', technicalTerm: 'Visual Roughness', stage: 'appearance', subCategory: 'surface_properties' },
    { id: 'surface-oiliness', label: 'Surface Oiliness', technicalTerm: 'Visual Fat/Oil Presence', stage: 'appearance', subCategory: 'surface_properties' },
    { id: 'surface-moisture', label: 'Surface Moisture', technicalTerm: 'Wet/Dry Appearance', stage: 'appearance', subCategory: 'surface_properties' },
    // Clarity & Transparency
    { id: 'see-through-quality', label: 'See-Through Quality', technicalTerm: 'Clarity/Transparency', stage: 'appearance', subCategory: 'clarity_transparency' },
    { id: 'cloudiness', label: 'Cloudiness', technicalTerm: 'Turbidity/Haze', stage: 'appearance', subCategory: 'clarity_transparency' },
    { id: 'light-blocking', label: 'Light-Blocking', technicalTerm: 'Opacity', stage: 'appearance', subCategory: 'clarity_transparency' },
    // Structure & Form
    { id: 'piece-size', label: 'Piece Size', technicalTerm: 'Dimensional Scale', stage: 'appearance', subCategory: 'structure_form' },
    { id: 'shape-regularity', label: 'Shape Regularity', technicalTerm: 'Morphological Uniformity', stage: 'appearance', subCategory: 'structure_form' },
    { id: 'size-consistency', label: 'Size Consistency', technicalTerm: 'Structural Uniformity', stage: 'appearance', subCategory: 'structure_form' },
    { id: 'surface-holes', label: 'Surface Holes', technicalTerm: 'Visible Porosity', stage: 'appearance', subCategory: 'structure_form' },
    // Visual Viscosity & Flow
    { id: 'perceived-thickness', label: 'Perceived Thickness', technicalTerm: 'Visual Viscosity/Body', stage: 'appearance', subCategory: 'visual_viscosity_flow' },
    { id: 'flow-and-legs', label: 'Flow and Legs', technicalTerm: 'Visual Flow Behaviour', stage: 'appearance', subCategory: 'visual_viscosity_flow' },
    // Carbonation & Effervescence
    { id: 'bubble-size', label: 'Bubble Size', technicalTerm: 'Visual Bubble Diameter', stage: 'appearance', subCategory: 'carbonation_effervescence' },
    { id: 'bubble-activity', label: 'Bubble Activity', technicalTerm: 'Effervescence Rate', stage: 'appearance', subCategory: 'carbonation_effervescence' },
    { id: 'foam-height', label: 'Foam Height', technicalTerm: 'Head Formation', stage: 'appearance', subCategory: 'carbonation_effervescence' },
    { id: 'foam-persistence', label: 'Foam Persistence', technicalTerm: 'Visual Foam Stability', stage: 'appearance', subCategory: 'carbonation_effervescence' },
    // Particulates & Inclusions
    { id: 'visible-particles', label: 'Visible Particles', technicalTerm: 'Particulate Presence', stage: 'appearance', subCategory: 'particulates_inclusions' },
    { id: 'pattern-and-marbling', label: 'Pattern and Marbling', technicalTerm: 'Visual Heterogeneity', stage: 'appearance', subCategory: 'particulates_inclusions' },
    // Overall Visual
    { id: 'visual-complexity', label: 'Visual Complexity', technicalTerm: 'Visual Intricacy', stage: 'appearance', subCategory: 'overall_visual' },
    { id: 'visual-appeal', label: 'Visual Appeal', technicalTerm: 'Overall Visual Attractiveness', stage: 'appearance', subCategory: 'overall_visual' },
    { id: 'temperature-cue', label: 'Temperature Cue', technicalTerm: 'Visual Thermal Indicator', stage: 'appearance', subCategory: 'overall_visual' }
];

// ===== AROMA (25 attributes) =====
const AROMA_ATTRIBUTES = [
    // Intensity & Impact
    { id: 'smell-strength', label: 'Smell Strength', technicalTerm: 'Aroma Intensity', stage: 'aroma', subCategory: 'intensity_impact' },
    { id: 'first-impression', label: 'First Impression', technicalTerm: 'Aroma Impact/Top Note', stage: 'aroma', subCategory: 'intensity_impact' },
    { id: 'pungent-sting', label: 'Pungent Sting', technicalTerm: 'Nasal Pungency', stage: 'aroma', subCategory: 'intensity_impact' },
    // Aroma Families
    { id: 'fruity-notes', label: 'Fruity Notes', technicalTerm: 'Fruity Aroma', stage: 'aroma', subCategory: 'aroma_families' },
    { id: 'flower-like-notes', label: 'Flower-Like Notes', technicalTerm: 'Floral Aroma', stage: 'aroma', subCategory: 'aroma_families' },
    { id: 'plant-like-green-notes', label: 'Plant-Like/Green Notes', technicalTerm: 'Herbaceous/Green Aroma', stage: 'aroma', subCategory: 'aroma_families' },
    { id: 'warm-spice-notes', label: 'Warm Spice Notes', technicalTerm: 'Spicy Aroma', stage: 'aroma', subCategory: 'aroma_families' },
    { id: 'toasted-roasted-notes', label: 'Toasted/Roasted Notes', technicalTerm: 'Roasted/Toasted Aroma', stage: 'aroma', subCategory: 'aroma_families' },
    { id: 'caramel-toffee-notes', label: 'Caramel/Toffee Notes', technicalTerm: 'Caramelized/Sweet Aroma', stage: 'aroma', subCategory: 'aroma_families' },
    { id: 'fermented-notes', label: 'Fermented Notes', technicalTerm: 'Fermented/Lactic Aroma', stage: 'aroma', subCategory: 'aroma_families' },
    { id: 'dairy-creamy-notes', label: 'Dairy/Creamy Notes', technicalTerm: 'Lactic/Dairy Aroma', stage: 'aroma', subCategory: 'aroma_families' },
    { id: 'earth-like-notes', label: 'Earth-Like Notes', technicalTerm: 'Earthy/Musty Aroma', stage: 'aroma', subCategory: 'aroma_families' },
    { id: 'ocean-sea-notes', label: 'Ocean/Sea Notes', technicalTerm: 'Marine/Oceanic Aroma', stage: 'aroma', subCategory: 'aroma_families' },
    { id: 'nut-like-notes', label: 'Nut-Like Notes', technicalTerm: 'Nutty Aroma', stage: 'aroma', subCategory: 'aroma_families' },
    { id: 'wood-like-notes', label: 'Wood-Like Notes', technicalTerm: 'Woody/Resinous Aroma', stage: 'aroma', subCategory: 'aroma_families' },
    { id: 'savoury-meaty-notes', label: 'Savoury/Meaty Notes', technicalTerm: 'Animal/Umami Aroma', stage: 'aroma', subCategory: 'aroma_families' },
    { id: 'smoky-notes', label: 'Smoky Notes', technicalTerm: 'Smoke/Pyrogenic Aroma', stage: 'aroma', subCategory: 'aroma_families' },
    { id: 'chemical-solvent-notes', label: 'Chemical/Solvent Notes', technicalTerm: 'Chemical Off-Note Aroma', stage: 'aroma', subCategory: 'aroma_families' },
    { id: 'sulphur-like-notes', label: 'Sulphur-Like Notes', technicalTerm: 'Sulphurous Aroma', stage: 'aroma', subCategory: 'aroma_families' },
    // Temporal Properties
    { id: 'smell-duration', label: 'Smell Duration', technicalTerm: 'Aroma Persistence/Linger', stage: 'aroma', subCategory: 'temporal_properties' },
    { id: 'smell-development', label: 'Smell Development', technicalTerm: 'Aroma Evolution', stage: 'aroma', subCategory: 'temporal_properties' },
    { id: 'smell-lift', label: 'Smell Lift', technicalTerm: 'Aroma Volatility/Lift', stage: 'aroma', subCategory: 'temporal_properties' },
    // Quality Dimensions
    { id: 'smell-complexity', label: 'Smell Complexity', technicalTerm: 'Olfactory Complexity', stage: 'aroma', subCategory: 'quality_dimensions' },
    { id: 'smell-balance', label: 'Smell Balance', technicalTerm: 'Aroma Harmony', stage: 'aroma', subCategory: 'quality_dimensions' },
    { id: 'freshness-vs-staleness', label: 'Freshness vs. Staleness', technicalTerm: 'Aroma Freshness', stage: 'aroma', subCategory: 'quality_dimensions' }
];

// ===== FRONT OF MOUTH (17 attributes) =====
const FRONT_MOUTH_ATTRIBUTES = [
    // Basic Tastes
    { id: 'sweetness', label: 'Sweetness', technicalTerm: 'Gustatory Sweetness', stage: 'frontMouth', subCategory: 'basic_tastes' },
    { id: 'sourness-tartness', label: 'Sourness/Tartness', technicalTerm: 'Gustatory Acidity', stage: 'frontMouth', subCategory: 'basic_tastes' },
    { id: 'saltiness', label: 'Saltiness', technicalTerm: 'Gustatory Salinity', stage: 'frontMouth', subCategory: 'basic_tastes' },
    { id: 'bitterness', label: 'Bitterness', technicalTerm: 'Gustatory Bitterness', stage: 'frontMouth', subCategory: 'basic_tastes' },
    { id: 'savouriness', label: 'Savouriness', technicalTerm: 'Umami', stage: 'frontMouth', subCategory: 'basic_tastes' },
    // Chemesthetic
    { id: 'spicy-heat', label: 'Spicy Heat', technicalTerm: 'Chemesthetic Pungency', stage: 'frontMouth', subCategory: 'chemesthetic' },
    { id: 'cooling-sensation', label: 'Cooling Sensation', technicalTerm: 'Chemesthetic Cooling', stage: 'frontMouth', subCategory: 'chemesthetic' },
    { id: 'carbonation-bite', label: 'Carbonation Bite', technicalTerm: 'CO₂ Chemesthetic Stimulation', stage: 'frontMouth', subCategory: 'chemesthetic' },
    { id: 'tingling-numbing', label: 'Tingling/Numbing', technicalTerm: 'Trigeminal Paresthesia', stage: 'frontMouth', subCategory: 'chemesthetic' },
    // Initial Impact
    { id: 'first-hit-speed', label: 'First Hit Speed', technicalTerm: 'Taste Onset Velocity/T_onset', stage: 'frontMouth', subCategory: 'initial_impact' },
    { id: 'initial-impact-strength', label: 'Initial Impact Strength', technicalTerm: 'First-Bite Intensity', stage: 'frontMouth', subCategory: 'initial_impact' },
    { id: 'flavour-burst', label: 'Flavour Burst', technicalTerm: 'Rate of Flavour Development/R_inc', stage: 'frontMouth', subCategory: 'initial_impact' },
    { id: 'first-bite-texture', label: 'First-Bite Texture', technicalTerm: 'Initial Fracture/Resistance', stage: 'frontMouth', subCategory: 'initial_impact' },
    { id: 'temperature-sensation', label: 'Temperature Sensation', technicalTerm: 'Thermal Perception Onset', stage: 'frontMouth', subCategory: 'initial_impact' },
    { id: 'initial-mouth-watering', label: 'Initial Mouth-Watering', technicalTerm: 'Salivation Response', stage: 'frontMouth', subCategory: 'initial_impact' },
    // Overall
    { id: 'overall-initial-impact', label: 'Overall Initial Impact', technicalTerm: 'Front-of-Mouth Intensity', stage: 'frontMouth', subCategory: 'overall_front' },
    { id: 'taste-dominance-at-entry', label: 'Taste Dominance at Entry', technicalTerm: 'Initial Taste Sequence', stage: 'frontMouth', subCategory: 'overall_front' }
];

// ===== MID/REAR MOUTH (25 attributes) =====
const MID_REAR_MOUTH_ATTRIBUTES = [
    // Taste Development
    { id: 'sweetness-development', label: 'Sweetness Development', technicalTerm: 'Peak Sweetness Intensity', stage: 'midRearMouth', subCategory: 'taste_development' },
    { id: 'sourness-acidity-development', label: 'Sourness/Acidity Development', technicalTerm: 'Peak Sourness Intensity', stage: 'midRearMouth', subCategory: 'taste_development' },
    { id: 'saltiness-development', label: 'Saltiness Development', technicalTerm: 'Peak Saltiness Intensity', stage: 'midRearMouth', subCategory: 'taste_development' },
    { id: 'bitterness-development', label: 'Bitterness Development', technicalTerm: 'Peak Bitterness Intensity', stage: 'midRearMouth', subCategory: 'taste_development' },
    { id: 'umami-savoury-depth', label: 'Umami/Savoury Depth', technicalTerm: 'Peak Umami Intensity', stage: 'midRearMouth', subCategory: 'taste_development' },
    { id: 'richness-fullness', label: 'Richness/Fullness', technicalTerm: 'Kokumi', stage: 'midRearMouth', subCategory: 'taste_development' },
    { id: 'fat-taste', label: 'Fat Taste', technicalTerm: 'Oleogustus', stage: 'midRearMouth', subCategory: 'taste_development' },
    { id: 'metallic-sensation', label: 'Metallic Sensation', technicalTerm: 'Metallic Taste', stage: 'midRearMouth', subCategory: 'taste_development' },
    { id: 'starchy-cereal-quality', label: 'Starchy/Cereal Quality', technicalTerm: 'Starchy Taste', stage: 'midRearMouth', subCategory: 'taste_development' },
    { id: 'mineral-quality', label: 'Mineral Quality', technicalTerm: 'Mineral Taste', stage: 'midRearMouth', subCategory: 'taste_development' },
    // Retronasal
    { id: 'in-mouth-aroma-strength', label: 'In-Mouth Aroma Strength', technicalTerm: 'Retronasal Aroma Intensity', stage: 'midRearMouth', subCategory: 'retronasal' },
    { id: 'in-mouth-aroma-complexity', label: 'In-Mouth Aroma Complexity', technicalTerm: 'Retronasal Complexity', stage: 'midRearMouth', subCategory: 'retronasal' },
    { id: 'in-mouth-aroma-character', label: 'In-Mouth Aroma Character', technicalTerm: 'Retronasal Aroma Quality', stage: 'midRearMouth', subCategory: 'retronasal' },
    // Flavour Dynamics
    { id: 'flavour-peak', label: 'Flavour Peak', technicalTerm: 'Peak Intensity/I_max', stage: 'midRearMouth', subCategory: 'flavour_dynamics' },
    { id: 'time-to-peak', label: 'Time to Peak', technicalTerm: 'T_max', stage: 'midRearMouth', subCategory: 'flavour_dynamics' },
    { id: 'peak-duration', label: 'Peak Duration', technicalTerm: 'Plateau Duration/T_plateau', stage: 'midRearMouth', subCategory: 'flavour_dynamics' },
    { id: 'flavour-dominance-sequence', label: 'Flavour Dominance Sequence', technicalTerm: 'TDS Dominance Pattern', stage: 'midRearMouth', subCategory: 'flavour_dynamics' },
    // Balance & Complexity
    { id: 'taste-balance', label: 'Taste Balance', technicalTerm: 'Inter-Taste Equilibrium', stage: 'midRearMouth', subCategory: 'balance_complexity' },
    { id: 'taste-suppression', label: 'Taste Suppression', technicalTerm: 'Mutual Masking', stage: 'midRearMouth', subCategory: 'balance_complexity' },
    { id: 'taste-enhancement', label: 'Taste Enhancement', technicalTerm: 'Synergy/Amplification', stage: 'midRearMouth', subCategory: 'balance_complexity' },
    { id: 'flavour-complexity', label: 'Flavour Complexity', technicalTerm: 'Multi-Dimensional Richness', stage: 'midRearMouth', subCategory: 'balance_complexity' },
    { id: 'flavour-harmony', label: 'Flavour Harmony', technicalTerm: 'Gustatory Coherence', stage: 'midRearMouth', subCategory: 'balance_complexity' },
    { id: 'flavour-cleanness', label: 'Flavour Cleanness', technicalTerm: 'Gustatory Purity', stage: 'midRearMouth', subCategory: 'balance_complexity' },
    { id: 'flavour-depth', label: 'Flavour Depth', technicalTerm: 'Sensory Layering', stage: 'midRearMouth', subCategory: 'balance_complexity' },
    { id: 'overall-mid-palate-intensity', label: 'Overall Mid-Palate Intensity', technicalTerm: 'Full-Palate Intensity', stage: 'midRearMouth', subCategory: 'balance_complexity' }
];

// ===== TEXTURE — NEW STAGE (101 attributes) =====
const TEXTURE_ATTRIBUTES = [
    // Mechanical – Primary (7)
    { id: 'hardness-firmness', label: 'Hardness/Firmness', technicalTerm: 'Compressive Resistance', stage: 'texture', subCategory: 'mechanical_primary' },
    { id: 'softness', label: 'Softness', technicalTerm: 'Low Compressive Resistance', stage: 'texture', subCategory: 'mechanical_primary' },
    { id: 'thickness-mechanical', label: 'Thickness', technicalTerm: 'Viscosity – Oral', stage: 'texture', subCategory: 'mechanical_primary' },
    { id: 'cohesiveness', label: 'Cohesiveness', technicalTerm: 'Structural Integrity', stage: 'texture', subCategory: 'mechanical_primary' },
    { id: 'springiness-bounce', label: 'Springiness/Bounce', technicalTerm: 'Elasticity', stage: 'texture', subCategory: 'mechanical_primary' },
    { id: 'stickiness', label: 'Stickiness', technicalTerm: 'Adhesiveness', stage: 'texture', subCategory: 'mechanical_primary' },
    { id: 'bounce-back', label: 'Bounce-Back', technicalTerm: 'Resilience', stage: 'texture', subCategory: 'mechanical_primary' },
    // Mechanical – Secondary (10)
    { id: 'snap-shatter', label: 'Snap/Shatter', technicalTerm: 'Fracturability/Brittleness', stage: 'texture', subCategory: 'mechanical_secondary' },
    { id: 'crunchiness', label: 'Crunchiness', technicalTerm: 'Audible Low-Pitch Fracture', stage: 'texture', subCategory: 'mechanical_secondary' },
    { id: 'crispness', label: 'Crispness', technicalTerm: 'Audible High-Pitch Fracture', stage: 'texture', subCategory: 'mechanical_secondary' },
    { id: 'crackiness', label: 'Crackiness', technicalTerm: 'Clean Snap/Fracture', stage: 'texture', subCategory: 'mechanical_secondary' },
    { id: 'chewiness', label: 'Chewiness', technicalTerm: 'Masticatory Effort', stage: 'texture', subCategory: 'mechanical_secondary' },
    { id: 'gumminess', label: 'Gumminess', technicalTerm: 'Semi-Solid Disintegration Effort', stage: 'texture', subCategory: 'mechanical_secondary' },
    { id: 'toughness', label: 'Toughness', technicalTerm: 'High Fracture Resistance', stage: 'texture', subCategory: 'mechanical_secondary' },
    { id: 'tenderness', label: 'Tenderness', technicalTerm: 'Ease of Shearing', stage: 'texture', subCategory: 'mechanical_secondary' },
    { id: 'crumbliness', label: 'Crumbliness', technicalTerm: 'Friability', stage: 'texture', subCategory: 'mechanical_secondary' },
    { id: 'mushiness', label: 'Mushiness', technicalTerm: 'Structural Collapse', stage: 'texture', subCategory: 'mechanical_secondary' },
    // Elasticity and Recovery (2)
    { id: 'rubberiness', label: 'Rubberiness', technicalTerm: 'High Elastic Resistance', stage: 'texture', subCategory: 'elasticity_recovery' },
    { id: 'mouldability', label: 'Mouldability', technicalTerm: 'Plasticity/Malleability', stage: 'texture', subCategory: 'elasticity_recovery' },
    // Viscosity and Flow (9)
    { id: 'thinness', label: 'Thinness', technicalTerm: 'Low Viscosity', stage: 'texture', subCategory: 'viscosity_flow' },
    { id: 'thickness-viscosity', label: 'Thickness', technicalTerm: 'High Viscosity', stage: 'texture', subCategory: 'viscosity_flow' },
    { id: 'runniness', label: 'Runniness', technicalTerm: 'Free-Flow Tendency', stage: 'texture', subCategory: 'viscosity_flow' },
    { id: 'syrupiness', label: 'Syrupiness', technicalTerm: 'Continuous High-Viscosity Flow', stage: 'texture', subCategory: 'viscosity_flow' },
    { id: 'body-fullness', label: 'Body/Fullness', technicalTerm: 'Perceived Density and Viscosity', stage: 'texture', subCategory: 'viscosity_flow' },
    { id: 'heaviness', label: 'Heaviness', technicalTerm: 'Perceived Oral Weight', stage: 'texture', subCategory: 'viscosity_flow' },
    { id: 'sliminess', label: 'Sliminess', technicalTerm: 'Mucilaginous Viscosity', stage: 'texture', subCategory: 'viscosity_flow' },
    { id: 'fluidity', label: 'Fluidity', technicalTerm: 'Ease of Flow', stage: 'texture', subCategory: 'viscosity_flow' },
    { id: 'consistency', label: 'Consistency', technicalTerm: 'Overall Flow Resistance', stage: 'texture', subCategory: 'viscosity_flow' },
    // Particle-Related (10)
    { id: 'graininess', label: 'Graininess', technicalTerm: 'Fine Uniform Particulate', stage: 'texture', subCategory: 'particle_related' },
    { id: 'grittiness', label: 'Grittiness', technicalTerm: 'Hard Angular Particulate', stage: 'texture', subCategory: 'particle_related' },
    { id: 'sandiness', label: 'Sandiness', technicalTerm: 'Fine Rounded Particulate', stage: 'texture', subCategory: 'particle_related' },
    { id: 'chalkiness', label: 'Chalkiness', technicalTerm: 'Powdery Drying Particulate', stage: 'texture', subCategory: 'particle_related' },
    { id: 'powderiness', label: 'Powderiness', technicalTerm: 'Dust-Like Particulate', stage: 'texture', subCategory: 'particle_related' },
    { id: 'pulpiness', label: 'Pulpiness', technicalTerm: 'Soft Fibrous Particulate', stage: 'texture', subCategory: 'particle_related' },
    { id: 'seediness', label: 'Seediness', technicalTerm: 'Discrete Hard Inclusions', stage: 'texture', subCategory: 'particle_related' },
    { id: 'mealiness-flouriness', label: 'Mealiness/Flouriness', technicalTerm: 'Dry Crumbly Particulate', stage: 'texture', subCategory: 'particle_related' },
    { id: 'coarseness', label: 'Coarseness', technicalTerm: 'Large Irregular Particulate', stage: 'texture', subCategory: 'particle_related' },
    { id: 'particle-uniformity', label: 'Particle Uniformity', technicalTerm: 'Particulate Size Consistency', stage: 'texture', subCategory: 'particle_related' },
    // Shape and Conformation (7)
    { id: 'fibrousness', label: 'Fibrousness', technicalTerm: 'Elongated String-Like Structure', stage: 'texture', subCategory: 'shape_conformation' },
    { id: 'cellularity', label: 'Cellularity', technicalTerm: 'Sponge-Like/Honeycomb Structure', stage: 'texture', subCategory: 'shape_conformation' },
    { id: 'crystallinity', label: 'Crystallinity', technicalTerm: 'Angular Crystal-Like Structure', stage: 'texture', subCategory: 'shape_conformation' },
    { id: 'flakiness', label: 'Flakiness', technicalTerm: 'Thin Layered Separation', stage: 'texture', subCategory: 'shape_conformation' },
    { id: 'layered-structure', label: 'Layered Structure', technicalTerm: 'Distinct Parallel Planes', stage: 'texture', subCategory: 'shape_conformation' },
    { id: 'porosity-aeration', label: 'Porosity/Aeration', technicalTerm: 'Internal Air Cell Structure', stage: 'texture', subCategory: 'shape_conformation' },
    { id: 'sponginess', label: 'Sponginess', technicalTerm: 'Compressible Aerated Recovery', stage: 'texture', subCategory: 'shape_conformation' },
    // Density and Homogeneity (4)
    { id: 'denseness-compactness', label: 'Denseness/Compactness', technicalTerm: 'Structural Density', stage: 'texture', subCategory: 'density_homogeneity' },
    { id: 'lightness-airiness', label: 'Lightness/Airiness', technicalTerm: 'Low Structural Density', stage: 'texture', subCategory: 'density_homogeneity' },
    { id: 'evenness', label: 'Evenness', technicalTerm: 'Textural Homogeneity/Uniformity', stage: 'texture', subCategory: 'density_homogeneity' },
    { id: 'lumpiness', label: 'Lumpiness', technicalTerm: 'Discrete Soft Mass Inclusions', stage: 'texture', subCategory: 'density_homogeneity' },
    // Surface and Oral Texture (7)
    { id: 'smoothness', label: 'Smoothness', technicalTerm: 'Low Surface Friction', stage: 'texture', subCategory: 'surface_oral_texture' },
    { id: 'roughness', label: 'Roughness', technicalTerm: 'High Surface Friction', stage: 'texture', subCategory: 'surface_oral_texture' },
    { id: 'slipperiness-slickness', label: 'Slipperiness/Slickness', technicalTerm: 'Low-Friction Lubricated Feel', stage: 'texture', subCategory: 'surface_oral_texture' },
    { id: 'mouth-coating', label: 'Mouth-Coating', technicalTerm: 'Oral Film Persistence', stage: 'texture', subCategory: 'surface_oral_texture' },
    { id: 'film-forming', label: 'Film-Forming', technicalTerm: 'Thin Oral Film Deposition', stage: 'texture', subCategory: 'surface_oral_texture' },
    { id: 'waxiness', label: 'Waxiness', technicalTerm: 'Slow-Yield Smooth Resistance', stage: 'texture', subCategory: 'surface_oral_texture' },
    { id: 'astringency', label: 'Astringency', technicalTerm: 'Drying/Puckering Mouthfeel', stage: 'texture', subCategory: 'surface_oral_texture' },
    // Moisture-Related (6)
    { id: 'dryness', label: 'Dryness', technicalTerm: 'Low Oral Moisture', stage: 'texture', subCategory: 'moisture_related' },
    { id: 'moistness', label: 'Moistness', technicalTerm: 'Moderate Moisture Release', stage: 'texture', subCategory: 'moisture_related' },
    { id: 'wetness', label: 'Wetness', technicalTerm: 'High Free-Water Perception', stage: 'texture', subCategory: 'moisture_related' },
    { id: 'wateriness', label: 'Wateriness', technicalTerm: 'Excess Thin Liquid', stage: 'texture', subCategory: 'moisture_related' },
    { id: 'juiciness', label: 'Juiciness', technicalTerm: 'Juice Release Volume and Rate', stage: 'texture', subCategory: 'moisture_related' },
    { id: 'succulence', label: 'Succulence', technicalTerm: 'Rich Quality Moisture Release', stage: 'texture', subCategory: 'moisture_related' },
    // Fat-Related (7)
    { id: 'oiliness', label: 'Oiliness', technicalTerm: 'Thin Fluid Fat Perception', stage: 'texture', subCategory: 'fat_related' },
    { id: 'greasiness', label: 'Greasiness', technicalTerm: 'Heavy Persistent Fat Coating', stage: 'texture', subCategory: 'fat_related' },
    { id: 'fattiness', label: 'Fattiness', technicalTerm: 'Overall Fat Perception', stage: 'texture', subCategory: 'fat_related' },
    { id: 'creaminess', label: 'Creaminess', technicalTerm: 'Integrated Smooth-Rich Mouthfeel', stage: 'texture', subCategory: 'fat_related' },
    { id: 'butteriness', label: 'Butteriness', technicalTerm: 'Smooth Rich Melt-Fat Sensation', stage: 'texture', subCategory: 'fat_related' },
    { id: 'richness-unctuousness', label: 'Richness/Unctuousness', technicalTerm: 'Luxurious Enveloping Fat', stage: 'texture', subCategory: 'fat_related' },
    { id: 'fat-slickness', label: 'Fat Slickness', technicalTerm: 'Thin-Layer Fat Lubrication', stage: 'texture', subCategory: 'fat_related' },
    // Thermal (4)
    { id: 'cooling-effect', label: 'Cooling Effect', technicalTerm: 'Menthol-Type Cooling/TRPM8', stage: 'texture', subCategory: 'thermal' },
    { id: 'warming-effect', label: 'Warming Effect', technicalTerm: 'Capsaicin-Type Warming/TRPV1', stage: 'texture', subCategory: 'thermal' },
    { id: 'temperature-contrast', label: 'Temperature Contrast', technicalTerm: 'Thermal Phase Difference', stage: 'texture', subCategory: 'thermal' },
    { id: 'melt-rate', label: 'Melt Rate', technicalTerm: 'Thermal Dissolution Speed', stage: 'texture', subCategory: 'thermal' },
    // Carbonation and Foam (8)
    { id: 'effervescence', label: 'Effervescence', technicalTerm: 'Sparkling Intensity', stage: 'texture', subCategory: 'carbonation_foam' },
    { id: 'carbonation-bite-texture', label: 'Carbonation Bite', technicalTerm: 'Carbonic Acid Trigeminal Sting', stage: 'texture', subCategory: 'carbonation_foam' },
    { id: 'bubble-size-texture', label: 'Bubble Size', technicalTerm: 'Perceived Bubble Diameter', stage: 'texture', subCategory: 'carbonation_foam' },
    { id: 'prickling-tingling-carbonation', label: 'Prickling/Tingling from Carbonation', technicalTerm: 'CO₂ Tactile Stimulation', stage: 'texture', subCategory: 'carbonation_foam' },
    { id: 'foam-density', label: 'Foam Density', technicalTerm: 'Perceived Foam Substantialness', stage: 'texture', subCategory: 'carbonation_foam' },
    { id: 'foam-stability', label: 'Foam Stability', technicalTerm: 'Oral Foam Persistence', stage: 'texture', subCategory: 'carbonation_foam' },
    { id: 'mousse-like-quality', label: 'Mousse-Like Quality', technicalTerm: 'Fine Stable Creamy Foam', stage: 'texture', subCategory: 'carbonation_foam' },
    { id: 'fizziness', label: 'Fizziness', technicalTerm: 'Light Playful Carbonation', stage: 'texture', subCategory: 'carbonation_foam' },
    // Trigeminal and Chemesthetic (6)
    { id: 'tingling', label: 'Tingling', technicalTerm: 'Mild Chemesthetic Vibration', stage: 'texture', subCategory: 'trigeminal_chemesthetic' },
    { id: 'numbing', label: 'Numbing', technicalTerm: 'Oral Anaesthetic Sensation', stage: 'texture', subCategory: 'trigeminal_chemesthetic' },
    { id: 'burning-heat', label: 'Burning/Heat', technicalTerm: 'Pungent Oral Irritation', stage: 'texture', subCategory: 'trigeminal_chemesthetic' },
    { id: 'nasal-pungency', label: 'Nasal Pungency', technicalTerm: 'Sharp Nasal Irritation', stage: 'texture', subCategory: 'trigeminal_chemesthetic' },
    { id: 'metallic-mouthfeel', label: 'Metallic Mouthfeel', technicalTerm: 'Metal-Like Tactile Sensation', stage: 'texture', subCategory: 'trigeminal_chemesthetic' },
    { id: 'electric-buzzing-sensation', label: 'Electric/Buzzing Sensation', technicalTerm: 'Spilanthol Paresthesia', stage: 'texture', subCategory: 'trigeminal_chemesthetic' },
    // Dynamic Texture (8)
    { id: 'breakdown-rate', label: 'Breakdown Rate', technicalTerm: 'Structural Disintegration Speed', stage: 'texture', subCategory: 'dynamic_texture' },
    { id: 'melt-dissolution-rate', label: 'Melt/Dissolution Rate', technicalTerm: 'Oral Liquefaction Speed', stage: 'texture', subCategory: 'dynamic_texture' },
    { id: 'bolus-formation-ease', label: 'Bolus Formation Ease', technicalTerm: 'Swallow-Readiness Speed', stage: 'texture', subCategory: 'dynamic_texture' },
    { id: 'chew-down-change', label: 'Chew-Down Change', technicalTerm: 'Texture Trajectory/Evolution', stage: 'texture', subCategory: 'dynamic_texture' },
    { id: 'moisture-release-rate', label: 'Moisture Release Rate', technicalTerm: 'Temporal Juice/Serum Release', stage: 'texture', subCategory: 'dynamic_texture' },
    { id: 'creaminess-development', label: 'Creaminess Development', technicalTerm: 'Dynamic Creaminess Build', stage: 'texture', subCategory: 'dynamic_texture' },
    { id: 'ease-of-swallow', label: 'Ease of Swallow', technicalTerm: 'Bolus Clearance Effort', stage: 'texture', subCategory: 'dynamic_texture' },
    { id: 'residual-mouthfeel', label: 'Residual Mouthfeel', technicalTerm: 'Post-Swallow Oral Texture', stage: 'texture', subCategory: 'dynamic_texture' },
    // Integrated/Multidimensional (6)
    { id: 'pastiness-doughiness', label: 'Pastiness/Doughiness', technicalTerm: 'Thick Cohesive Starchy Coating', stage: 'texture', subCategory: 'integrated_multidimensional' },
    { id: 'starchiness', label: 'Starchiness', technicalTerm: 'Starch-Paste Coating Quality', stage: 'texture', subCategory: 'integrated_multidimensional' },
    { id: 'gel-like-quality', label: 'Gel-Like Quality', technicalTerm: 'Gelatinous Texture', stage: 'texture', subCategory: 'integrated_multidimensional' },
    { id: 'doughy-quality', label: 'Doughy Quality', technicalTerm: 'Soft Pliable Dense Texture', stage: 'texture', subCategory: 'integrated_multidimensional' },
    { id: 'compactness', label: 'Compactness', technicalTerm: 'Closely Packed Dense Structure', stage: 'texture', subCategory: 'integrated_multidimensional' },
    { id: 'overall-textural-complexity', label: 'Overall Textural Complexity', technicalTerm: 'Textural Multi-Dimensionality', stage: 'texture', subCategory: 'integrated_multidimensional' }
];

// ===== AFTERTASTE (25 attributes) =====
const AFTERTASTE_ATTRIBUTES = [
    // Persistence
    { id: 'finish-length', label: 'Finish Length', technicalTerm: 'Aftertaste Duration/Persistence', stage: 'aftertaste', subCategory: 'persistence' },
    { id: 'flavour-linger', label: 'Flavour Linger', technicalTerm: 'Aftertaste Tenacity', stage: 'aftertaste', subCategory: 'persistence' },
    { id: 'fade-pattern', label: 'Fade Pattern', technicalTerm: 'Aftertaste Decay Profile/R_dec', stage: 'aftertaste', subCategory: 'persistence' },
    // Residual Tastes
    { id: 'sweet-linger', label: 'Sweet Linger', technicalTerm: 'Residual Sweetness', stage: 'aftertaste', subCategory: 'residual_tastes' },
    { id: 'bitter-linger', label: 'Bitter Linger', technicalTerm: 'Residual Bitterness', stage: 'aftertaste', subCategory: 'residual_tastes' },
    { id: 'sour-linger', label: 'Sour Linger', technicalTerm: 'Residual Acidity', stage: 'aftertaste', subCategory: 'residual_tastes' },
    { id: 'salt-linger', label: 'Salt Linger', technicalTerm: 'Residual Saltiness', stage: 'aftertaste', subCategory: 'residual_tastes' },
    { id: 'umami-linger', label: 'Umami Linger', technicalTerm: 'Residual Savouriness', stage: 'aftertaste', subCategory: 'residual_tastes' },
    { id: 'astringent-linger', label: 'Astringent Linger', technicalTerm: 'Residual Dryness/Puckering', stage: 'aftertaste', subCategory: 'residual_tastes' },
    { id: 'metallic-linger', label: 'Metallic Linger', technicalTerm: 'Residual Metallic Sensation', stage: 'aftertaste', subCategory: 'residual_tastes' },
    { id: 'heat-linger', label: 'Heat Linger', technicalTerm: 'Residual Spicy/Capsaicin Persistence', stage: 'aftertaste', subCategory: 'residual_tastes' },
    // After-Smell
    { id: 'after-smell-strength', label: 'After-Smell Strength', technicalTerm: 'Retronasal Aroma Intensity', stage: 'aftertaste', subCategory: 'after_smell' },
    { id: 'after-smell-variety', label: 'After-Smell Variety', technicalTerm: 'Retronasal Aroma Complexity', stage: 'aftertaste', subCategory: 'after_smell' },
    { id: 'after-smell-character', label: 'After-Smell Character', technicalTerm: 'Retronasal Aroma Quality', stage: 'aftertaste', subCategory: 'after_smell' },
    { id: 'after-smell-development', label: 'After-Smell Development', technicalTerm: 'Retronasal Aroma Evolution', stage: 'aftertaste', subCategory: 'after_smell' },
    // Oral Sensations
    { id: 'mouth-coating-after', label: 'Mouth Coating', technicalTerm: 'Palate Coating Persistence', stage: 'aftertaste', subCategory: 'oral_sensations' },
    { id: 'palate-cleansing', label: 'Palate Cleansing', technicalTerm: 'Palate Cleanness/Reset Speed', stage: 'aftertaste', subCategory: 'oral_sensations' },
    { id: 'after-dryness', label: 'After-Dryness', technicalTerm: 'Post-Consumption Oral Dryness', stage: 'aftertaste', subCategory: 'oral_sensations' },
    { id: 'after-salivation', label: 'After-Salivation', technicalTerm: 'Post-Consumption Mouth-Watering', stage: 'aftertaste', subCategory: 'oral_sensations' },
    // Finish Quality
    { id: 'finish-evolution', label: 'Finish Evolution', technicalTerm: 'Aftertaste Transformation', stage: 'aftertaste', subCategory: 'finish_quality' },
    { id: 'finish-quality', label: 'Finish Quality', technicalTerm: 'Aftertaste Pleasantness', stage: 'aftertaste', subCategory: 'finish_quality' },
    { id: 'finish-cleanness', label: 'Finish Cleanness', technicalTerm: 'Aftertaste Purity', stage: 'aftertaste', subCategory: 'finish_quality' },
    { id: 'finish-complexity', label: 'Finish Complexity', technicalTerm: 'Aftertaste Multi-Dimensionality', stage: 'aftertaste', subCategory: 'finish_quality' },
    { id: 'warming-persistence', label: 'Warming Persistence', technicalTerm: 'Residual Thermal Warming', stage: 'aftertaste', subCategory: 'finish_quality' },
    { id: 'cooling-persistence', label: 'Cooling Persistence', technicalTerm: 'Residual Thermal Cooling', stage: 'aftertaste', subCategory: 'finish_quality' }
];

// ===== OVERALL ASSESSMENT (21 attributes) =====
const OVERALL_ATTRIBUTES = [
    // Quality & Balance
    { id: 'overall-quality', label: 'Overall Quality', technicalTerm: 'Perceived Quality', stage: 'overall', subCategory: 'quality_balance' },
    { id: 'balance', label: 'Balance', technicalTerm: 'Sensory Equilibrium', stage: 'overall', subCategory: 'quality_balance' },
    { id: 'harmony', label: 'Harmony', technicalTerm: 'Sensory Coherence/Integration', stage: 'overall', subCategory: 'quality_balance' },
    { id: 'true-to-type-character', label: 'True-to-Type Character', technicalTerm: 'Typicality/Authenticity', stage: 'overall', subCategory: 'quality_balance' },
    { id: 'craftsmanship', label: 'Craftsmanship', technicalTerm: 'Finesse/Elegance', stage: 'overall', subCategory: 'quality_balance' },
    // Complexity & Depth
    { id: 'overall-flavour-complexity', label: 'Flavour Complexity', technicalTerm: 'Overall Multi-Dimensionality', stage: 'overall', subCategory: 'complexity_depth' },
    { id: 'overall-flavour-depth', label: 'Flavour Depth', technicalTerm: 'Sensory Layering', stage: 'overall', subCategory: 'complexity_depth' },
    { id: 'flavour-coherence', label: 'Flavour Coherence', technicalTerm: 'Sensory Integration', stage: 'overall', subCategory: 'complexity_depth' },
    { id: 'flavour-richness', label: 'Flavour Richness', technicalTerm: 'Sensory Amplitude', stage: 'overall', subCategory: 'complexity_depth' },
    { id: 'overall-strength', label: 'Overall Strength', technicalTerm: 'Total Sensory Intensity', stage: 'overall', subCategory: 'complexity_depth' },
    { id: 'flavour-impact', label: 'Flavour Impact', technicalTerm: 'Sensory Distinctiveness', stage: 'overall', subCategory: 'complexity_depth' },
    // Hedonic
    { id: 'memorability', label: 'Memorability', technicalTerm: 'Sensory Recall Potential', stage: 'overall', subCategory: 'hedonic' },
    { id: 'want-more-quality', label: 'Want-More Quality', technicalTerm: 'Moreishness/Compulsive Palatability', stage: 'overall', subCategory: 'hedonic' },
    { id: 'overall-satisfaction', label: 'Satisfaction', technicalTerm: 'Hedonic Fulfilment', stage: 'overall', subCategory: 'hedonic' },
    { id: 'refreshing-quality', label: 'Refreshing Quality', technicalTerm: 'Refreshment/Invigoration', stage: 'overall', subCategory: 'hedonic' },
    { id: 'palatability', label: 'Palatability', technicalTerm: 'Overall Hedonic Appeal', stage: 'overall', subCategory: 'hedonic' },
    { id: 'craveability', label: 'Craveability', technicalTerm: 'Anticipated Wanting', stage: 'overall', subCategory: 'hedonic' },
    { id: 'filling-quality', label: 'Filling Quality', technicalTerm: 'Expected Satiety Impact', stage: 'overall', subCategory: 'hedonic' },
    { id: 'thirst-quenching-quality', label: 'Thirst-Quenching Quality', technicalTerm: 'Thirst Quenching', stage: 'overall', subCategory: 'hedonic' },
    // Temporal
    { id: 'sensory-journey', label: 'Sensory Journey', technicalTerm: 'Temporal Sensory Arc', stage: 'overall', subCategory: 'temporal_overall' },
    { id: 'flavour-fatigue-resistance', label: 'Flavour Fatigue Resistance', technicalTerm: 'Sensory-Specific Satiation Resistance', stage: 'overall', subCategory: 'temporal_overall' }
];

// ===== SUB-CATEGORY LABELS =====
const SUB_CATEGORY_LABELS = {
    // Appearance
    color_properties: 'Color Properties',
    surface_properties: 'Surface Properties',
    clarity_transparency: 'Clarity & Transparency',
    structure_form: 'Structure & Form',
    visual_viscosity_flow: 'Visual Viscosity & Flow',
    carbonation_effervescence: 'Carbonation & Effervescence',
    particulates_inclusions: 'Particulates & Inclusions',
    overall_visual: 'Overall Visual',
    // Aroma
    intensity_impact: 'Intensity & Impact',
    aroma_families: 'Aroma Families',
    temporal_properties: 'Temporal Properties',
    quality_dimensions: 'Quality Dimensions',
    // Front of Mouth
    basic_tastes: 'Basic Tastes',
    chemesthetic: 'Chemesthetic',
    initial_impact: 'Initial Impact',
    overall_front: 'Overall',
    // Mid/Rear Mouth
    taste_development: 'Taste Development',
    retronasal: 'Retronasal',
    flavour_dynamics: 'Flavour Dynamics',
    balance_complexity: 'Balance & Complexity',
    // Texture
    mechanical_primary: 'Mechanical \u2013 Primary',
    mechanical_secondary: 'Mechanical \u2013 Secondary',
    elasticity_recovery: 'Elasticity & Recovery',
    viscosity_flow: 'Viscosity & Flow',
    particle_related: 'Particle-Related',
    shape_conformation: 'Shape & Conformation',
    density_homogeneity: 'Density & Homogeneity',
    surface_oral_texture: 'Surface & Oral Texture',
    moisture_related: 'Moisture-Related',
    fat_related: 'Fat-Related',
    thermal: 'Thermal',
    carbonation_foam: 'Carbonation & Foam',
    trigeminal_chemesthetic: 'Trigeminal & Chemesthetic',
    dynamic_texture: 'Dynamic Texture',
    integrated_multidimensional: 'Integrated/Multidimensional',
    // Aftertaste
    persistence: 'Persistence',
    residual_tastes: 'Residual Tastes',
    after_smell: 'After-Smell',
    oral_sensations: 'Oral Sensations',
    finish_quality: 'Finish Quality',
    // Overall
    quality_balance: 'Quality & Balance',
    complexity_depth: 'Complexity & Depth',
    hedonic: 'Hedonic',
    temporal_overall: 'Temporal'
};

// ===== COMBINED LOOKUPS =====
const ALL_SENSORY_ATTRIBUTES = [
    ...APPEARANCE_ATTRIBUTES,
    ...AROMA_ATTRIBUTES,
    ...FRONT_MOUTH_ATTRIBUTES,
    ...MID_REAR_MOUTH_ATTRIBUTES,
    ...TEXTURE_ATTRIBUTES,
    ...AFTERTASTE_ATTRIBUTES,
    ...OVERALL_ATTRIBUTES
];

const SENSORY_ATTRIBUTES_BY_STAGE = {
    appearance: APPEARANCE_ATTRIBUTES,
    aroma: AROMA_ATTRIBUTES,
    frontMouth: FRONT_MOUTH_ATTRIBUTES,
    midRearMouth: MID_REAR_MOUTH_ATTRIBUTES,
    texture: TEXTURE_ATTRIBUTES,
    aftertaste: AFTERTASTE_ATTRIBUTES,
    overall: OVERALL_ATTRIBUTES
};

// Get attributes grouped by sub-category for a given stage
function getAttributesBySubCategory(stageId) {
    const attrs = SENSORY_ATTRIBUTES_BY_STAGE[stageId] || [];
    const groups = {};
    attrs.forEach(attr => {
        const cat = attr.subCategory || 'general';
        if (!groups[cat]) groups[cat] = [];
        groups[cat].push(attr);
    });
    return groups;
}

// Get attribute by ID
function getAttributeById(attrId) {
    return ALL_SENSORY_ATTRIBUTES.find(a => a.id === attrId);
}

// Convert attribute ID to camelCase key for data storage
function attrIdToKey(id) {
    return id.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

// Convert camelCase key back to attribute ID
function keyToAttrId(key) {
    return key.replace(/([A-Z])/g, '-$1').toLowerCase();
}

// Texture sub-category order (for display)
const TEXTURE_SUB_CATEGORY_ORDER = [
    'mechanical_primary',
    'mechanical_secondary',
    'elasticity_recovery',
    'viscosity_flow',
    'particle_related',
    'shape_conformation',
    'density_homogeneity',
    'surface_oral_texture',
    'moisture_related',
    'fat_related',
    'thermal',
    'carbonation_foam',
    'trigeminal_chemesthetic',
    'dynamic_texture',
    'integrated_multidimensional'
];

// Stage color palette (7 stages)
const STAGE_COLORS = {
    appearance: '#667eea',
    aroma: '#764ba2',
    frontMouth: '#f093fb',
    midRearMouth: '#f5576c',
    texture: '#4facfe',
    aftertaste: '#00f2fe',
    overall: '#43e97b'
};

// Make available globally
if (typeof window !== 'undefined') {
    window.SENSORY_STAGES = SENSORY_STAGES;
    window.SENSORY_STAGE_IDS = SENSORY_STAGE_IDS;
    window.APPEARANCE_ATTRIBUTES = APPEARANCE_ATTRIBUTES;
    window.AROMA_ATTRIBUTES = AROMA_ATTRIBUTES;
    window.FRONT_MOUTH_ATTRIBUTES = FRONT_MOUTH_ATTRIBUTES;
    window.MID_REAR_MOUTH_ATTRIBUTES = MID_REAR_MOUTH_ATTRIBUTES;
    window.TEXTURE_ATTRIBUTES = TEXTURE_ATTRIBUTES;
    window.AFTERTASTE_ATTRIBUTES = AFTERTASTE_ATTRIBUTES;
    window.OVERALL_ATTRIBUTES = OVERALL_ATTRIBUTES;
    window.ALL_SENSORY_ATTRIBUTES = ALL_SENSORY_ATTRIBUTES;
    window.SENSORY_ATTRIBUTES_BY_STAGE = SENSORY_ATTRIBUTES_BY_STAGE;
    window.SUB_CATEGORY_LABELS = SUB_CATEGORY_LABELS;
    window.STAGE_COLORS = STAGE_COLORS;
    window.TEXTURE_SUB_CATEGORY_ORDER = TEXTURE_SUB_CATEGORY_ORDER;
    window.getAttributesBySubCategory = getAttributesBySubCategory;
    window.getAttributeById = getAttributeById;
    window.attrIdToKey = attrIdToKey;
    window.keyToAttrId = keyToAttrId;
}
