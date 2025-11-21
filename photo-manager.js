// ===== PHOTO MANAGER MODULE =====

/**
 * Photo Management System
 * Upload, store, and manage product photos
 */

// Photo storage
let productPhotos = [];

// Maximum file size (5MB)
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// Maximum image dimension for compression
const MAX_IMAGE_DIMENSION = 1200;

// ===== PHOTO DATA STRUCTURE =====

/**
 * Photo object structure:
 * {
 *   id: number,
 *   productId: number (links to experience),
 *   productName: string,
 *   fileName: string,
 *   fileType: string (image/jpeg, image/png, etc.),
 *   fileSize: number (bytes),
 *   imageData: string (base64),
 *   uploadDate: ISO string,
 *   caption: string,
 *   tags: array of strings (e.g., ["front", "packaging", "before", "after"])
 * }
 */

// ===== IMAGE UPLOAD & COMPRESSION =====

/**
 * Upload and compress image
 */
async function uploadProductPhoto(file, productId, caption = '', tags = []) {
    // Validate file
    if (!file || !file.type.startsWith('image/')) {
        return { success: false, error: 'Please select a valid image file' };
    }

    if (file.size > MAX_FILE_SIZE) {
        return { success: false, error: `File size exceeds ${MAX_FILE_SIZE / (1024 * 1024)}MB limit` };
    }

    // Get product info
    const product = experiences.find(e => e.id === productId);
    if (!product) {
        return { success: false, error: 'Product not found' };
    }

    try {
        // Compress image
        const compressedData = await compressImage(file);

        // Create photo object
        const photo = {
            id: Date.now() + Math.random(),
            productId: productId,
            productName: product.productInfo.name,
            fileName: file.name,
            fileType: file.type,
            fileSize: compressedData.length,
            imageData: compressedData,
            uploadDate: new Date().toISOString(),
            caption: caption,
            tags: tags
        };

        productPhotos.push(photo);
        savePhotos();

        return { success: true, photo: photo };
    } catch (error) {
        console.error('Error uploading photo:', error);
        return { success: false, error: 'Failed to process image' };
    }
}

/**
 * Compress image to reduce file size
 */
function compressImage(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = function(e) {
            const img = new Image();

            img.onload = function() {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // Calculate new dimensions
                if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
                    if (width > height) {
                        height = Math.round((height * MAX_IMAGE_DIMENSION) / width);
                        width = MAX_IMAGE_DIMENSION;
                    } else {
                        width = Math.round((width * MAX_IMAGE_DIMENSION) / height);
                        height = MAX_IMAGE_DIMENSION;
                    }
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // Convert to base64 with compression
                const compressedData = canvas.toDataURL(file.type || 'image/jpeg', 0.8);
                resolve(compressedData);
            };

            img.onerror = function() {
                reject(new Error('Failed to load image'));
            };

            img.src = e.target.result;
        };

        reader.onerror = function() {
            reject(new Error('Failed to read file'));
        };

        reader.readAsDataURL(file);
    });
}

// ===== PHOTO MANAGEMENT =====

/**
 * Get photos for a product
 */
function getPhotosForProduct(productId) {
    return productPhotos.filter(p => p.productId === productId)
        .sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate));
}

/**
 * Get photo by ID
 */
function getPhotoById(photoId) {
    return productPhotos.find(p => p.id === photoId);
}

/**
 * Update photo caption or tags
 */
function updatePhoto(photoId, updates) {
    const photo = productPhotos.find(p => p.id === photoId);
    if (!photo) return false;

    if (updates.caption !== undefined) {
        photo.caption = updates.caption;
    }
    if (updates.tags !== undefined) {
        photo.tags = updates.tags;
    }

    savePhotos();
    return true;
}

/**
 * Delete photo
 */
function deletePhoto(photoId) {
    const index = productPhotos.findIndex(p => p.id === photoId);
    if (index === -1) return false;

    productPhotos.splice(index, 1);
    savePhotos();
    return true;
}

/**
 * Get all photos
 */
function getAllPhotos() {
    return productPhotos.sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate));
}

/**
 * Get photos by tag
 */
function getPhotosByTag(tag) {
    return productPhotos.filter(p => p.tags.includes(tag))
        .sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate));
}

/**
 * Get storage size
 */
function getPhotoStorageSize() {
    const totalBytes = productPhotos.reduce((sum, p) => sum + p.fileSize, 0);
    return {
        bytes: totalBytes,
        mb: (totalBytes / (1024 * 1024)).toFixed(2),
        count: productPhotos.length
    };
}

// ===== PHOTO TAGS =====

const photoTagOptions = [
    'Front View',
    'Back View',
    'Side View',
    'Packaging',
    'Opened',
    'Close-up',
    'Texture',
    'Color',
    'Before',
    'After',
    'Fresh',
    'Aged',
    'Batch 1',
    'Batch 2',
    'Batch 3',
    'Reformulation',
    'Prototype',
    'Final Product',
    'Comparison',
    'Defect'
];

/**
 * Get all unique tags
 */
function getAllPhotoTags() {
    const tags = new Set();
    productPhotos.forEach(p => {
        p.tags.forEach(tag => tags.add(tag));
    });
    return Array.from(tags).sort();
}

// ===== BEFORE/AFTER COMPARISON =====

/**
 * Get before/after photos for comparison
 */
function getBeforeAfterPhotos(productName) {
    const beforePhotos = productPhotos.filter(p =>
        p.productName.toLowerCase() === productName.toLowerCase() &&
        p.tags.includes('Before')
    );

    const afterPhotos = productPhotos.filter(p =>
        p.productName.toLowerCase() === productName.toLowerCase() &&
        p.tags.includes('After')
    );

    return {
        before: beforePhotos,
        after: afterPhotos,
        hasBoth: beforePhotos.length > 0 && afterPhotos.length > 0
    };
}

// ===== BATCH UPLOAD =====

/**
 * Upload multiple photos at once
 */
async function uploadMultiplePhotos(files, productId, tags = []) {
    const results = {
        success: [],
        failed: []
    };

    for (const file of files) {
        const result = await uploadProductPhoto(file, productId, '', tags);
        if (result.success) {
            results.success.push(result.photo);
        } else {
            results.failed.push({ file: file.name, error: result.error });
        }
    }

    return results;
}

// ===== EXPORT HELPERS =====

/**
 * Get photo for export (returns data URL)
 */
function getPhotoDataURL(photoId) {
    const photo = getPhotoById(photoId);
    return photo ? photo.imageData : null;
}

/**
 * Download photo
 */
function downloadPhoto(photoId) {
    const photo = getPhotoById(photoId);
    if (!photo) return false;

    const link = document.createElement('a');
    link.href = photo.imageData;
    link.download = photo.fileName;
    link.click();

    return true;
}

// ===== DATA PERSISTENCE =====

/**
 * Save photos to localStorage
 */
function savePhotos() {
    try {
        localStorage.setItem('productPhotos', JSON.stringify(productPhotos));
    } catch (error) {
        console.error('Error saving photos:', error);

        // If localStorage is full, alert user
        if (error.name === 'QuotaExceededError') {
            alert('Storage quota exceeded! Please delete some photos to free up space.');
        }
    }
}

/**
 * Load photos from localStorage
 */
function loadPhotos() {
    try {
        const saved = localStorage.getItem('productPhotos');
        if (saved) {
            productPhotos = JSON.parse(saved);
        }
    } catch (error) {
        console.error('Error loading photos:', error);
        productPhotos = [];
    }
}

/**
 * Clear all photos
 */
function clearAllPhotos() {
    if (!confirm('Delete all photos? This cannot be undone.')) {
        return false;
    }

    productPhotos = [];
    savePhotos();
    return true;
}

/**
 * Export photos metadata (without image data for smaller file size)
 */
function exportPhotosMetadata() {
    const metadata = productPhotos.map(p => ({
        id: p.id,
        productId: p.productId,
        productName: p.productName,
        fileName: p.fileName,
        fileType: p.fileType,
        fileSize: p.fileSize,
        uploadDate: p.uploadDate,
        caption: p.caption,
        tags: p.tags
    }));

    return JSON.stringify(metadata, null, 2);
}

// Load photos on init
loadPhotos();
