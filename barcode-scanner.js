// ===== BARCODE SCANNER MODULE =====
// Scan product barcodes to auto-populate product information via Open Food Facts API

// Scanner state
let scannerState = {
    isScanning: false,
    stream: null,
    animationFrame: null,
    lastScannedCode: null,
    scanCooldown: false
};

// Open Food Facts API base URL
const OPEN_FOOD_FACTS_API = 'https://world.openfoodfacts.org/api/v2/product';

/**
 * Initialize barcode scanner
 */
function initBarcodeScanner() {
    // Check for browser support
    checkBarcodeSupport();
}

/**
 * Check browser support for barcode scanning
 */
function checkBarcodeSupport() {
    const support = {
        barcodeDetector: 'BarcodeDetector' in window,
        getUserMedia: 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices,
        camera: false
    };

    // Check camera availability
    if (support.getUserMedia) {
        navigator.mediaDevices.enumerateDevices()
            .then(devices => {
                support.camera = devices.some(device => device.kind === 'videoinput');
            })
            .catch(() => {
                support.camera = false;
            });
    }

    window.barcodeScannerSupport = support;
    return support;
}

/**
 * Render barcode scanner UI component
 */
function renderBarcodeScannerUI(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
        <div class="barcode-scanner-widget">
            <div class="scanner-header">
                <h4>Product Lookup</h4>
                <p class="scanner-hint">Scan barcode or enter manually</p>
            </div>

            <div class="scanner-tabs">
                <button class="scanner-tab active" data-tab="scan">
                    <span class="tab-icon">📷</span>
                    <span>Scan Barcode</span>
                </button>
                <button class="scanner-tab" data-tab="manual">
                    <span class="tab-icon">⌨️</span>
                    <span>Enter Manually</span>
                </button>
                <button class="scanner-tab" data-tab="search">
                    <span class="tab-icon">🔍</span>
                    <span>Search Product</span>
                </button>
            </div>

            <!-- Scan Tab -->
            <div class="scanner-content" id="scanner-tab-scan">
                <div class="camera-container" id="camera-container">
                    <video id="barcode-video" autoplay playsinline></video>
                    <div class="scan-overlay">
                        <div class="scan-frame"></div>
                        <p class="scan-instruction">Position barcode within frame</p>
                    </div>
                </div>
                <div class="scanner-actions">
                    <button id="btn-start-scan" class="btn-primary" onclick="startBarcodeScanning()">
                        📷 Start Camera
                    </button>
                    <button id="btn-stop-scan" class="btn-secondary" onclick="stopBarcodeScanning()" style="display: none;">
                        ⏹️ Stop Scanning
                    </button>
                </div>
                <div id="scan-status" class="scan-status"></div>
            </div>

            <!-- Manual Entry Tab -->
            <div class="scanner-content" id="scanner-tab-manual" style="display: none;">
                <div class="manual-entry-form">
                    <div class="form-group">
                        <label for="manual-barcode">Barcode Number (UPC/EAN)</label>
                        <input type="text" id="manual-barcode" placeholder="e.g., 5449000000996"
                               pattern="[0-9]{8,14}" maxlength="14">
                        <small>Enter 8-14 digit barcode number</small>
                    </div>
                    <button class="btn-primary" onclick="lookupManualBarcode()">
                        🔍 Lookup Product
                    </button>
                </div>
            </div>

            <!-- Search Tab -->
            <div class="scanner-content" id="scanner-tab-search" style="display: none;">
                <div class="product-search-form">
                    <div class="form-group">
                        <label for="product-search">Search by Product Name</label>
                        <input type="text" id="product-search" placeholder="e.g., Coca Cola, Lindt chocolate">
                    </div>
                    <button class="btn-primary" onclick="searchProducts()">
                        🔍 Search
                    </button>
                </div>
                <div id="search-results" class="search-results"></div>
            </div>

            <!-- Product Result -->
            <div id="product-result" class="product-result" style="display: none;">
                <div class="result-header">
                    <span class="result-icon">✓</span>
                    <span class="result-title">Product Found</span>
                    <button class="btn-small" onclick="clearProductResult()">✕</button>
                </div>
                <div class="result-content">
                    <div class="product-image" id="product-image"></div>
                    <div class="product-details" id="product-details"></div>
                </div>
                <div class="result-actions">
                    <button class="btn-primary" onclick="applyProductData()">
                        ✓ Use This Product
                    </button>
                    <button class="btn-secondary" onclick="clearProductResult()">
                        Try Another
                    </button>
                </div>
            </div>
        </div>
    `;

    attachScannerListeners();
}

/**
 * Attach event listeners for scanner UI
 */
function attachScannerListeners() {
    // Tab switching
    document.querySelectorAll('.scanner-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.tab;

            // Update active tab
            document.querySelectorAll('.scanner-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            // Show corresponding content
            document.querySelectorAll('.scanner-content').forEach(content => {
                content.style.display = 'none';
            });
            document.getElementById(`scanner-tab-${tabName}`).style.display = 'block';

            // Stop scanning if switching away from scan tab
            if (tabName !== 'scan' && scannerState.isScanning) {
                stopBarcodeScanning();
            }
        });
    });

    // Enter key for manual entry
    const manualInput = document.getElementById('manual-barcode');
    if (manualInput) {
        manualInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                lookupManualBarcode();
            }
        });
    }

    // Enter key for search
    const searchInput = document.getElementById('product-search');
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                searchProducts();
            }
        });
    }
}

/**
 * Start barcode scanning using camera
 */
async function startBarcodeScanning() {
    const statusEl = document.getElementById('scan-status');
    const videoEl = document.getElementById('barcode-video');
    const startBtn = document.getElementById('btn-start-scan');
    const stopBtn = document.getElementById('btn-stop-scan');

    try {
        // Request camera access
        statusEl.innerHTML = '<span class="status-loading">📷 Accessing camera...</span>';

        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: 'environment',
                width: { ideal: 1280 },
                height: { ideal: 720 }
            }
        });

        scannerState.stream = stream;
        videoEl.srcObject = stream;

        await videoEl.play();

        scannerState.isScanning = true;
        startBtn.style.display = 'none';
        stopBtn.style.display = 'inline-flex';

        statusEl.innerHTML = '<span class="status-scanning">🔍 Scanning for barcodes...</span>';

        // Start barcode detection
        if ('BarcodeDetector' in window) {
            // Use native BarcodeDetector API
            detectWithNativeAPI(videoEl);
        } else {
            // Fallback: Use canvas-based detection (manual entry encouraged)
            statusEl.innerHTML = '<span class="status-info">📷 Camera ready. If barcode not detected automatically, please enter manually.</span>';
            detectWithCanvasFallback(videoEl);
        }

    } catch (error) {
        console.error('Camera error:', error);
        statusEl.innerHTML = `<span class="status-error">❌ Camera access denied. Please use manual entry.</span>`;

        // Switch to manual tab
        document.querySelector('.scanner-tab[data-tab="manual"]').click();
    }
}

/**
 * Stop barcode scanning
 */
function stopBarcodeScanning() {
    scannerState.isScanning = false;

    if (scannerState.stream) {
        scannerState.stream.getTracks().forEach(track => track.stop());
        scannerState.stream = null;
    }

    if (scannerState.animationFrame) {
        cancelAnimationFrame(scannerState.animationFrame);
        scannerState.animationFrame = null;
    }

    const videoEl = document.getElementById('barcode-video');
    if (videoEl) {
        videoEl.srcObject = null;
    }

    const startBtn = document.getElementById('btn-start-scan');
    const stopBtn = document.getElementById('btn-stop-scan');
    const statusEl = document.getElementById('scan-status');

    if (startBtn) startBtn.style.display = 'inline-flex';
    if (stopBtn) stopBtn.style.display = 'none';
    if (statusEl) statusEl.innerHTML = '';
}

/**
 * Detect barcodes using native BarcodeDetector API
 */
async function detectWithNativeAPI(videoEl) {
    const barcodeDetector = new BarcodeDetector({
        formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39']
    });

    const detect = async () => {
        if (!scannerState.isScanning) return;

        try {
            const barcodes = await barcodeDetector.detect(videoEl);

            if (barcodes.length > 0 && !scannerState.scanCooldown) {
                const barcode = barcodes[0];
                handleBarcodeDetected(barcode.rawValue);
            }
        } catch (error) {
            console.error('Detection error:', error);
        }

        scannerState.animationFrame = requestAnimationFrame(detect);
    };

    detect();
}

/**
 * Fallback detection using canvas (basic implementation)
 */
function detectWithCanvasFallback(videoEl) {
    // This is a simplified fallback that prompts manual entry
    // In production, you could integrate QuaggaJS or ZXing-js library here

    const statusEl = document.getElementById('scan-status');
    statusEl.innerHTML = `
        <span class="status-info">
            📷 Camera active. For best results with this browser,
            <a href="#" onclick="document.querySelector('.scanner-tab[data-tab=\\'manual\\']').click(); return false;">
                enter the barcode manually
            </a>.
        </span>
    `;
}

/**
 * Handle detected barcode
 */
async function handleBarcodeDetected(barcode) {
    if (scannerState.scanCooldown || barcode === scannerState.lastScannedCode) {
        return;
    }

    scannerState.scanCooldown = true;
    scannerState.lastScannedCode = barcode;

    const statusEl = document.getElementById('scan-status');
    statusEl.innerHTML = `<span class="status-success">✓ Barcode detected: ${barcode}</span>`;

    // Play success sound/vibration
    if ('vibrate' in navigator) {
        navigator.vibrate(100);
    }

    // Stop scanning
    stopBarcodeScanning();

    // Lookup product
    await lookupBarcode(barcode);

    // Reset cooldown after 2 seconds
    setTimeout(() => {
        scannerState.scanCooldown = false;
    }, 2000);
}

/**
 * Lookup barcode manually entered
 */
async function lookupManualBarcode() {
    const input = document.getElementById('manual-barcode');
    const barcode = input.value.trim();

    if (!barcode || barcode.length < 8) {
        alert('Please enter a valid barcode (8-14 digits)');
        return;
    }

    await lookupBarcode(barcode);
}

/**
 * Lookup product by barcode using Open Food Facts API
 */
async function lookupBarcode(barcode) {
    const resultEl = document.getElementById('product-result');
    const statusEl = document.getElementById('scan-status');

    try {
        statusEl.innerHTML = `<span class="status-loading">🔍 Looking up product...</span>`;

        const response = await fetch(`${OPEN_FOOD_FACTS_API}/${barcode}.json`);
        const data = await response.json();

        if (data.status === 1 && data.product) {
            displayProductResult(data.product, barcode);
            statusEl.innerHTML = '';
        } else {
            statusEl.innerHTML = `
                <span class="status-warning">
                    ⚠️ Product not found in database.
                    <a href="#" onclick="document.querySelector('.scanner-tab[data-tab=\\'search\\']').click(); return false;">
                        Try searching by name
                    </a> or enter details manually.
                </span>
            `;
        }
    } catch (error) {
        console.error('API error:', error);
        statusEl.innerHTML = `<span class="status-error">❌ Network error. Please try again or enter manually.</span>`;
    }
}

/**
 * Search products by name using Open Food Facts API
 */
async function searchProducts() {
    const input = document.getElementById('product-search');
    const query = input.value.trim();
    const resultsEl = document.getElementById('search-results');

    if (!query || query.length < 2) {
        alert('Please enter at least 2 characters to search');
        return;
    }

    try {
        resultsEl.innerHTML = '<div class="search-loading">🔍 Searching...</div>';

        const response = await fetch(
            `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=10`
        );
        const data = await response.json();

        if (data.products && data.products.length > 0) {
            resultsEl.innerHTML = data.products.map(product => `
                <div class="search-result-item" onclick="selectSearchResult('${product.code}')">
                    <div class="result-thumb">
                        ${product.image_small_url ?
                            `<img src="${product.image_small_url}" alt="${product.product_name || 'Product'}">` :
                            '<span class="no-image">📦</span>'
                        }
                    </div>
                    <div class="result-info">
                        <div class="result-name">${product.product_name || 'Unknown Product'}</div>
                        <div class="result-brand">${product.brands || ''}</div>
                        <div class="result-code">${product.code}</div>
                    </div>
                </div>
            `).join('');
        } else {
            resultsEl.innerHTML = '<div class="search-empty">No products found. Try different search terms.</div>';
        }
    } catch (error) {
        console.error('Search error:', error);
        resultsEl.innerHTML = '<div class="search-error">❌ Search failed. Please try again.</div>';
    }
}

/**
 * Select a search result
 */
async function selectSearchResult(barcode) {
    await lookupBarcode(barcode);
}

/**
 * Display product result
 */
function displayProductResult(product, barcode) {
    const resultEl = document.getElementById('product-result');
    const imageEl = document.getElementById('product-image');
    const detailsEl = document.getElementById('product-details');

    // Store product data for later use
    window.scannedProductData = {
        barcode: barcode,
        name: product.product_name || '',
        brand: product.brands || '',
        category: mapProductCategory(product.categories_tags || []),
        variant: product.generic_name || '',
        imageUrl: product.image_url || product.image_front_url || '',
        nutriments: product.nutriments || {},
        ingredients: product.ingredients_text || '',
        allergens: product.allergens_tags || [],
        origin: product.countries_tags ? product.countries_tags[0] : ''
    };

    // Display image
    if (window.scannedProductData.imageUrl) {
        imageEl.innerHTML = `<img src="${window.scannedProductData.imageUrl}" alt="${window.scannedProductData.name}">`;
    } else {
        imageEl.innerHTML = '<div class="no-image-placeholder">📦<br>No image</div>';
    }

    // Display details
    detailsEl.innerHTML = `
        <div class="detail-row">
            <span class="detail-label">Product</span>
            <span class="detail-value">${window.scannedProductData.name || 'Unknown'}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Brand</span>
            <span class="detail-value">${window.scannedProductData.brand || 'Unknown'}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Category</span>
            <span class="detail-value">${window.scannedProductData.category || 'Unknown'}</span>
        </div>
        ${window.scannedProductData.variant ? `
        <div class="detail-row">
            <span class="detail-label">Description</span>
            <span class="detail-value">${window.scannedProductData.variant}</span>
        </div>
        ` : ''}
        <div class="detail-row">
            <span class="detail-label">Barcode</span>
            <span class="detail-value">${barcode}</span>
        </div>
    `;

    resultEl.style.display = 'block';
}

/**
 * Map Open Food Facts categories to app categories
 */
function mapProductCategory(categoryTags) {
    const categoryMap = {
        'beverages': 'beverage',
        'drinks': 'beverage',
        'sodas': 'beverage',
        'juices': 'beverage',
        'waters': 'beverage',
        'coffees': 'beverage',
        'teas': 'beverage',
        'beers': 'beverage',
        'wines': 'beverage',
        'spirits': 'beverage',
        'chocolates': 'confectionery',
        'candies': 'confectionery',
        'confectioneries': 'confectionery',
        'sweets': 'confectionery',
        'snacks': 'snack',
        'chips': 'snack',
        'crackers': 'snack',
        'nuts': 'snack',
        'desserts': 'dessert',
        'ice-creams': 'dessert',
        'cakes': 'dessert',
        'pastries': 'dessert',
        'dairy': 'food',
        'yogurts': 'food',
        'cheeses': 'food',
        'breads': 'food',
        'cereals': 'food'
    };

    for (const tag of categoryTags) {
        const cleanTag = tag.replace('en:', '').toLowerCase();
        for (const [key, value] of Object.entries(categoryMap)) {
            if (cleanTag.includes(key)) {
                return value;
            }
        }
    }

    return 'food';
}

/**
 * Apply scanned product data to the form
 */
function applyProductData() {
    if (!window.scannedProductData) return;

    const data = window.scannedProductData;

    // Check which form is active (quick entry or full form)
    const quickProductName = document.getElementById('quick-product-name');
    const fullProductName = document.getElementById('item-name');

    if (quickProductName && document.getElementById('view-quick-entry').classList.contains('active')) {
        // Apply to Quick Entry form
        quickProductName.value = data.name;
        const quickBrand = document.getElementById('quick-brand');
        const quickVariant = document.getElementById('quick-variant');

        if (quickBrand) quickBrand.value = data.brand;
        if (quickVariant) quickVariant.value = data.variant;

        // Try to auto-select category template based on product
        autoSelectCategoryTemplate(data);
    } else if (fullProductName) {
        // Apply to Full Evaluation form
        fullProductName.value = data.name;
        const fullBrand = document.getElementById('item-brand');
        const fullType = document.getElementById('item-type');
        const fullVariant = document.getElementById('item-variant');

        if (fullBrand) fullBrand.value = data.brand;
        if (fullType) fullType.value = data.category;
        if (fullVariant) fullVariant.value = data.variant;
    }

    // Clear the result display
    clearProductResult();

    // Show success notification
    showScannerNotification(`Product "${data.name}" loaded successfully!`);
}

/**
 * Auto-select category template based on scanned product
 */
function autoSelectCategoryTemplate(data) {
    if (typeof CATEGORY_TEMPLATES === 'undefined') return;

    const name = (data.name + ' ' + data.brand + ' ' + data.category).toLowerCase();

    let bestMatch = 'generic';

    if (name.includes('chocolate') || name.includes('cocoa')) {
        bestMatch = name.includes('dark') || name.includes('70%') || name.includes('85%') ?
            'premium-chocolate' : 'milk-chocolate';
    } else if (name.includes('beer') || name.includes('ale') || name.includes('lager')) {
        bestMatch = name.includes('ipa') || name.includes('pale ale') ? 'craft-beer-ipa' : 'craft-beer-stout';
    } else if (name.includes('cola') || name.includes('soda') || name.includes('fanta') || name.includes('sprite')) {
        bestMatch = 'soft-drink';
    } else if (name.includes('energy') || name.includes('red bull') || name.includes('monster')) {
        bestMatch = 'energy-drink';
    } else if (name.includes('coffee') || name.includes('espresso')) {
        bestMatch = 'artisan-coffee';
    } else if (name.includes('ice cream') || name.includes('gelato')) {
        bestMatch = 'premium-ice-cream';
    } else if (name.includes('yogurt') || name.includes('yoghurt')) {
        bestMatch = 'yogurt';
    } else if (name.includes('juice') || name.includes('smoothie')) {
        bestMatch = 'juice-smoothie';
    } else if (name.includes('wine')) {
        bestMatch = 'wine';
    } else if (name.includes('whisky') || name.includes('whiskey') || name.includes('vodka') || name.includes('rum')) {
        bestMatch = 'spirits';
    } else if (name.includes('chips') || name.includes('crisp') || name.includes('pretzel')) {
        bestMatch = 'savory-snack';
    } else if (name.includes('cookie') || name.includes('biscuit')) {
        bestMatch = 'sweet-snack';
    } else if (name.includes('cheese')) {
        bestMatch = 'cheese';
    } else if (name.includes('bread') || name.includes('bakery')) {
        bestMatch = 'bread-bakery';
    }

    // Select the category if the function exists
    if (typeof selectCategory === 'function') {
        selectCategory(bestMatch);
    }
}

/**
 * Clear product result display
 */
function clearProductResult() {
    const resultEl = document.getElementById('product-result');
    if (resultEl) {
        resultEl.style.display = 'none';
    }
    window.scannedProductData = null;
}

/**
 * Show scanner notification
 */
function showScannerNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'scanner-notification';
    notification.innerHTML = `
        <span class="notification-icon">✓</span>
        <span class="notification-message">${message}</span>
    `;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => notification.remove(), 300);
    }, 2500);
}

// Export functions globally
window.initBarcodeScanner = initBarcodeScanner;
window.renderBarcodeScannerUI = renderBarcodeScannerUI;
window.startBarcodeScanning = startBarcodeScanning;
window.stopBarcodeScanning = stopBarcodeScanning;
window.lookupManualBarcode = lookupManualBarcode;
window.searchProducts = searchProducts;
window.selectSearchResult = selectSearchResult;
window.applyProductData = applyProductData;
window.clearProductResult = clearProductResult;
