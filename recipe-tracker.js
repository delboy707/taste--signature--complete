// ===== RECIPE/FORMULATION TRACKER MODULE =====

/**
 * Recipe & Formulation Tracker
 * Link sensory profiles to actual product formulations and track ingredient changes
 */

// Formulation storage
let formulations = [];

// ===== DATA STRUCTURE =====

/**
 * Formulation object structure:
 * {
 *   id: number,
 *   productId: number (links to experience),
 *   productName: string,
 *   name: string (e.g., "Original Formula", "Version 2.0"),
 *   version: string (e.g., "1.0", "2.1"),
 *   createdDate: ISO string,
 *   ingredients: [
 *     {
 *       id: string,
 *       name: string,
 *       category: string (base, flavor, sweetener, etc.),
 *       percentage: number (0-100),
 *       amount: string (e.g., "500g", "2 cups"),
 *       supplier: string,
 *       cost: number,
 *       notes: string
 *     }
 *   ],
 *   processingSteps: [
 *     {
 *       id: string,
 *       order: number,
 *       description: string,
 *       duration: string,
 *       temperature: string,
 *       equipment: string
 *     }
 *   ],
 *   nutritionalInfo: {
 *     calories: number,
 *     protein: number,
 *     carbs: number,
 *     fat: number,
 *     fiber: number,
 *     sodium: number
 *   },
 *   costAnalysis: {
 *     totalCost: number,
 *     costPerUnit: number,
 *     currency: string
 *   },
 *   notes: string,
 *   status: string (development, testing, production, discontinued)
 * }
 */

// ===== FORMULATION MANAGEMENT =====

/**
 * Create new formulation
 */
function createFormulation(productId, name, version = "1.0") {
    const product = experiences.find(e => e.id === productId);
    if (!product) {
        console.error('Product not found');
        return null;
    }

    const formulation = {
        id: Date.now() + Math.random(),
        productId: productId,
        productName: product.productInfo.name,
        name: name,
        version: version,
        createdDate: new Date().toISOString(),
        ingredients: [],
        processingSteps: [],
        nutritionalInfo: {
            calories: 0,
            protein: 0,
            carbs: 0,
            fat: 0,
            fiber: 0,
            sodium: 0
        },
        costAnalysis: {
            totalCost: 0,
            costPerUnit: 0,
            currency: 'USD'
        },
        notes: '',
        status: 'development'
    };

    formulations.push(formulation);
    saveFormulations();
    return formulation;
}

/**
 * Add ingredient to formulation
 */
function addIngredient(formulationId, ingredient) {
    const formulation = formulations.find(f => f.id === formulationId);
    if (!formulation) return false;

    const newIngredient = {
        id: Date.now() + Math.random(),
        name: ingredient.name || '',
        category: ingredient.category || 'other',
        percentage: parseFloat(ingredient.percentage) || 0,
        amount: ingredient.amount || '',
        supplier: ingredient.supplier || '',
        cost: parseFloat(ingredient.cost) || 0,
        notes: ingredient.notes || ''
    };

    formulation.ingredients.push(newIngredient);
    updateFormulationCost(formulationId);
    saveFormulations();
    return true;
}

/**
 * Update ingredient
 */
function updateIngredient(formulationId, ingredientId, updates) {
    const formulation = formulations.find(f => f.id === formulationId);
    if (!formulation) return false;

    const ingredient = formulation.ingredients.find(i => i.id === ingredientId);
    if (!ingredient) return false;

    Object.assign(ingredient, updates);
    updateFormulationCost(formulationId);
    saveFormulations();
    return true;
}

/**
 * Delete ingredient
 */
function deleteIngredient(formulationId, ingredientId) {
    const formulation = formulations.find(f => f.id === formulationId);
    if (!formulation) return false;

    formulation.ingredients = formulation.ingredients.filter(i => i.id !== ingredientId);
    updateFormulationCost(formulationId);
    saveFormulations();
    return true;
}

/**
 * Add processing step
 */
function addProcessingStep(formulationId, step) {
    const formulation = formulations.find(f => f.id === formulationId);
    if (!formulation) return false;

    const newStep = {
        id: Date.now() + Math.random(),
        order: formulation.processingSteps.length + 1,
        description: step.description || '',
        duration: step.duration || '',
        temperature: step.temperature || '',
        equipment: step.equipment || ''
    };

    formulation.processingSteps.push(newStep);
    saveFormulations();
    return true;
}

/**
 * Update processing step
 */
function updateProcessingStep(formulationId, stepId, updates) {
    const formulation = formulations.find(f => f.id === formulationId);
    if (!formulation) return false;

    const step = formulation.processingSteps.find(s => s.id === stepId);
    if (!step) return false;

    Object.assign(step, updates);
    saveFormulations();
    return true;
}

/**
 * Delete processing step
 */
function deleteProcessingStep(formulationId, stepId) {
    const formulation = formulations.find(f => f.id === formulationId);
    if (!formulation) return false;

    formulation.processingSteps = formulation.processingSteps.filter(s => s.id !== stepId);

    // Reorder remaining steps
    formulation.processingSteps.forEach((step, index) => {
        step.order = index + 1;
    });

    saveFormulations();
    return true;
}

/**
 * Update formulation cost
 */
function updateFormulationCost(formulationId) {
    const formulation = formulations.find(f => f.id === formulationId);
    if (!formulation) return;

    const totalCost = formulation.ingredients.reduce((sum, ing) => sum + (ing.cost || 0), 0);
    formulation.costAnalysis.totalCost = totalCost;
}

/**
 * Update formulation
 */
function updateFormulation(formulationId, updates) {
    const formulation = formulations.find(f => f.id === formulationId);
    if (!formulation) return false;

    Object.assign(formulation, updates);
    saveFormulations();
    return true;
}

/**
 * Delete formulation
 */
function deleteFormulation(formulationId) {
    formulations = formulations.filter(f => f.id !== formulationId);
    saveFormulations();
    return true;
}

/**
 * Get formulations for product
 */
function getFormulationsForProduct(productId) {
    return formulations.filter(f => f.productId === productId);
}

/**
 * Clone formulation (for versioning)
 */
function cloneFormulation(formulationId, newName, newVersion) {
    const original = formulations.find(f => f.id === formulationId);
    if (!original) return null;

    const clone = JSON.parse(JSON.stringify(original));
    clone.id = Date.now() + Math.random();
    clone.name = newName;
    clone.version = newVersion;
    clone.createdDate = new Date().toISOString();

    // Generate new IDs for ingredients and steps
    clone.ingredients.forEach(ing => {
        ing.id = Date.now() + Math.random();
    });

    clone.processingSteps.forEach(step => {
        step.id = Date.now() + Math.random();
    });

    formulations.push(clone);
    saveFormulations();
    return clone;
}

// ===== FORMULATION COMPARISON =====

/**
 * Compare two formulations
 */
function compareFormulations(formulation1Id, formulation2Id) {
    const f1 = formulations.find(f => f.id === formulation1Id);
    const f2 = formulations.find(f => f.id === formulation2Id);

    if (!f1 || !f2) return null;

    const comparison = {
        formulation1: f1,
        formulation2: f2,
        ingredientChanges: {
            added: [],
            removed: [],
            modified: []
        },
        costChange: f2.costAnalysis.totalCost - f1.costAnalysis.totalCost,
        costChangePercent: f1.costAnalysis.totalCost > 0
            ? ((f2.costAnalysis.totalCost - f1.costAnalysis.totalCost) / f1.costAnalysis.totalCost) * 100
            : 0
    };

    // Compare ingredients
    const f1IngredientMap = new Map(f1.ingredients.map(i => [i.name, i]));
    const f2IngredientMap = new Map(f2.ingredients.map(i => [i.name, i]));

    // Find added ingredients
    f2.ingredients.forEach(ing2 => {
        if (!f1IngredientMap.has(ing2.name)) {
            comparison.ingredientChanges.added.push(ing2);
        }
    });

    // Find removed ingredients
    f1.ingredients.forEach(ing1 => {
        if (!f2IngredientMap.has(ing1.name)) {
            comparison.ingredientChanges.removed.push(ing1);
        }
    });

    // Find modified ingredients
    f1.ingredients.forEach(ing1 => {
        const ing2 = f2IngredientMap.get(ing1.name);
        if (ing2) {
            const changes = {};
            if (ing1.percentage !== ing2.percentage) {
                changes.percentage = {
                    old: ing1.percentage,
                    new: ing2.percentage,
                    change: ing2.percentage - ing1.percentage
                };
            }
            if (ing1.cost !== ing2.cost) {
                changes.cost = {
                    old: ing1.cost,
                    new: ing2.cost,
                    change: ing2.cost - ing1.cost
                };
            }
            if (ing1.supplier !== ing2.supplier) {
                changes.supplier = {
                    old: ing1.supplier,
                    new: ing2.supplier
                };
            }

            if (Object.keys(changes).length > 0) {
                comparison.ingredientChanges.modified.push({
                    name: ing1.name,
                    changes: changes
                });
            }
        }
    });

    return comparison;
}

/**
 * Get sensory impact of reformulation
 */
function getSensoryImpact(formulation1Id, formulation2Id) {
    const f1 = formulations.find(f => f.id === formulation1Id);
    const f2 = formulations.find(f => f.id === formulation2Id);

    if (!f1 || !f2) return null;

    const product1 = experiences.find(e => e.id === f1.productId);
    const product2 = experiences.find(e => e.id === f2.productId);

    if (!product1 || !product2) return null;

    const impact = {
        formulation1: f1,
        formulation2: f2,
        sensoryChanges: []
    };

    // Compare all attributes
    product1.stages.forEach(stage1 => {
        const stage2 = product2.stages.find(s => s.name === stage1.name);
        if (stage2) {
            stage1.attributes.forEach(attr1 => {
                const attr2 = stage2.attributes.find(a => a.label === attr1.label);
                if (attr2 && attr1.value !== attr2.value) {
                    impact.sensoryChanges.push({
                        stage: stage1.name,
                        attribute: attr1.label,
                        before: attr1.value,
                        after: attr2.value,
                        change: attr2.value - attr1.value,
                        changePercent: ((attr2.value - attr1.value) / attr1.value) * 100
                    });
                }
            });
        }
    });

    return impact;
}

// ===== INGREDIENT CATEGORIES =====

const ingredientCategories = [
    'Base Ingredient',
    'Flavoring',
    'Sweetener',
    'Acid',
    'Salt',
    'Fat/Oil',
    'Protein',
    'Thickener/Stabilizer',
    'Emulsifier',
    'Preservative',
    'Coloring',
    'Vitamin/Mineral',
    'Spice/Herb',
    'Other'
];

/**
 * Get ingredient suggestions by category
 */
function getIngredientsByCategory(category) {
    return formulations
        .flatMap(f => f.ingredients)
        .filter(i => i.category === category)
        .map(i => i.name)
        .filter((name, index, self) => self.indexOf(name) === index) // Unique
        .sort();
}

// ===== DATA PERSISTENCE =====

/**
 * Save formulations to localStorage
 */
function saveFormulations() {
    try {
        localStorage.setItem('formulations', JSON.stringify(formulations));
    } catch (error) {
        console.error('Error saving formulations:', error);
    }
}

/**
 * Load formulations from localStorage
 */
function loadFormulations() {
    try {
        const saved = localStorage.getItem('formulations');
        if (saved) {
            formulations = JSON.parse(saved);
        }
    } catch (error) {
        console.error('Error loading formulations:', error);
        formulations = [];
    }
}

// Load formulations on init
loadFormulations();
