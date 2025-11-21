// ===== PHOTO MANAGER UI MODULE =====

/**
 * Render Photo Gallery Dashboard
 */
function renderPhotoGalleryDashboard() {
    const container = document.getElementById('photo-gallery-container');
    if (!container) return;

    let html = '<div class="photo-gallery-dashboard">';

    // Overview Section
    html += renderPhotoGalleryOverview();

    // Filter Section
    html += renderPhotoFilters();

    // Photo Grid
    html += renderPhotoGrid();

    html += '</div>';

    container.innerHTML = html;
}

/**
 * Render photo gallery overview
 */
function renderPhotoGalleryOverview() {
    const storage = getPhotoStorageSize();
    const allTags = getAllPhotoTags();

    return `
        <div class="analytics-section">
            <h4>📸 Photo Gallery</h4>
            <p class="section-description">Visual documentation for all your products</p>

            <div class="stat-cards">
                <div class="stat-card">
                    <div class="stat-icon">📷</div>
                    <div class="stat-content">
                        <div class="stat-label">Total Photos</div>
                        <div class="stat-value">${storage.count}</div>
                        <div class="stat-detail">Across all products</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">💾</div>
                    <div class="stat-content">
                        <div class="stat-label">Storage Used</div>
                        <div class="stat-value">${storage.mb} MB</div>
                        <div class="stat-detail">Compressed images</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">🏷️</div>
                    <div class="stat-content">
                        <div class="stat-label">Tags Used</div>
                        <div class="stat-value">${allTags.length}</div>
                        <div class="stat-detail">Categories</div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Render photo filters
 */
function renderPhotoFilters() {
    const allTags = getAllPhotoTags();

    return `
        <div class="analytics-section">
            <h5>Filter Photos</h5>
            <div class="photo-filters">
                <div class="filter-group">
                    <label>By Product:</label>
                    <select id="photo-filter-product" class="form-control" onchange="filterPhotos()">
                        <option value="">All Products</option>
                        ${experiences.map(exp => `
                            <option value="${exp.id}">${exp.productInfo.name}</option>
                        `).join('')}
                    </select>
                </div>
                <div class="filter-group">
                    <label>By Tag:</label>
                    <select id="photo-filter-tag" class="form-control" onchange="filterPhotos()">
                        <option value="">All Tags</option>
                        ${allTags.map(tag => `
                            <option value="${tag}">${tag}</option>
                        `).join('')}
                    </select>
                </div>
                <button class="btn-secondary" onclick="resetPhotoFilters()">Clear Filters</button>
            </div>
        </div>
    `;
}

/**
 * Render photo grid
 */
function renderPhotoGrid() {
    const photos = getAllPhotos();

    if (photos.length === 0) {
        return `
            <div class="analytics-section">
                <p class="empty-state">No photos uploaded yet. Add photos to your products to see them here.</p>
            </div>
        `;
    }

    return `
        <div class="analytics-section">
            <div id="photo-grid" class="photo-grid">
                ${photos.map(photo => renderPhotoCard(photo)).join('')}
            </div>
        </div>
    `;
}

/**
 * Render single photo card
 */
function renderPhotoCard(photo) {
    return `
        <div class="photo-card" data-product-id="${photo.productId}" data-tags='${JSON.stringify(photo.tags)}'>
            <div class="photo-image" onclick="viewPhotoFullSize(${photo.id})">
                <img src="${photo.imageData}" alt="${photo.fileName}" loading="lazy">
            </div>
            <div class="photo-info">
                <div class="photo-product-name">${photo.productName}</div>
                ${photo.caption ? `<div class="photo-caption">${photo.caption}</div>` : ''}
                <div class="photo-tags">
                    ${photo.tags.map(tag => `<span class="photo-tag">${tag}</span>`).join('')}
                </div>
                <div class="photo-meta">
                    <span>${new Date(photo.uploadDate).toLocaleDateString()}</span>
                    <span>${(photo.fileSize / 1024).toFixed(0)} KB</span>
                </div>
            </div>
            <div class="photo-actions">
                <button class="btn-icon" onclick="editPhotoDialog(${photo.id})" title="Edit">✏️</button>
                <button class="btn-icon" onclick="downloadPhoto(${photo.id})" title="Download">📥</button>
                <button class="btn-icon btn-danger" onclick="deletePhotoDialog(${photo.id})" title="Delete">🗑️</button>
            </div>
        </div>
    `;
}

/**
 * Filter photos
 */
function filterPhotos() {
    const productFilter = document.getElementById('photo-filter-product').value;
    const tagFilter = document.getElementById('photo-filter-tag').value;

    const cards = document.querySelectorAll('.photo-card');

    cards.forEach(card => {
        let show = true;

        if (productFilter && card.dataset.productId !== productFilter) {
            show = false;
        }

        if (tagFilter) {
            const tags = JSON.parse(card.dataset.tags || '[]');
            if (!tags.includes(tagFilter)) {
                show = false;
            }
        }

        card.style.display = show ? 'block' : 'none';
    });
}

/**
 * Reset photo filters
 */
function resetPhotoFilters() {
    document.getElementById('photo-filter-product').value = '';
    document.getElementById('photo-filter-tag').value = '';
    filterPhotos();
}

// ===== PRODUCT PHOTO SECTION =====

/**
 * Render product photos section (for product detail view)
 */
function renderProductPhotosSection(productId) {
    const photos = getPhotosForProduct(productId);

    return `
        <div class="product-photos-section">
            <div class="section-header">
                <h4>📸 Product Photos</h4>
                <button class="btn-primary" onclick="showUploadPhotoDialog(${productId})">
                    ➕ Add Photo
                </button>
            </div>

            ${photos.length > 0 ? `
                <div class="product-photo-gallery">
                    ${photos.map(photo => `
                        <div class="product-photo-item">
                            <img src="${photo.imageData}" alt="${photo.fileName}" onclick="viewPhotoFullSize(${photo.id})">
                            <div class="photo-overlay">
                                ${photo.tags.map(tag => `<span class="photo-tag">${tag}</span>`).join('')}
                            </div>
                        </div>
                    `).join('')}
                </div>
            ` : `
                <p class="empty-state">No photos yet. Click "Add Photo" to upload.</p>
            `}
        </div>
    `;
}

// ===== UPLOAD DIALOG =====

/**
 * Show upload photo dialog
 */
function showUploadPhotoDialog(productId) {
    const product = experiences.find(e => e.id === productId);
    if (!product) return;

    const modalHtml = `
        <div class="modal-overlay" onclick="closePhotoModal()">
            <div class="modal-content photo-upload-modal" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <h3>Upload Photo - ${product.productInfo.name}</h3>
                    <button class="modal-close" onclick="closePhotoModal()">✕</button>
                </div>

                <div class="modal-body">
                    <div class="photo-upload-zone" id="photo-upload-zone">
                        <div class="upload-icon">📷</div>
                        <h5>Drag & Drop Photo Here</h5>
                        <p>or</p>
                        <input type="file" id="photo-file-input" accept="image/*" multiple style="display: none;">
                        <div class="button-group" style="display: flex; gap: 10px; justify-content: center; margin-top: 15px;">
                            <button class="btn-primary" onclick="launchCameraForProduct('${productId}')">
                                📸 Take Photo
                            </button>
                            <button class="btn-secondary" onclick="document.getElementById('photo-file-input').click()">
                                📁 Browse Files
                            </button>
                        </div>
                        <div class="upload-info">
                            Maximum 5MB per photo • JPG, PNG, WebP supported
                        </div>
                    </div>

                    <div id="photo-preview-area" class="photo-preview-area"></div>

                    <div class="form-group">
                        <label>Caption (optional):</label>
                        <input type="text" id="photo-caption" class="form-control" placeholder="Enter photo description">
                    </div>

                    <div class="form-group">
                        <label>Tags:</label>
                        <div class="photo-tag-selector">
                            ${photoTagOptions.map(tag => `
                                <label class="tag-checkbox">
                                    <input type="checkbox" value="${tag}" class="photo-tag-checkbox">
                                    ${tag}
                                </label>
                            `).join('')}
                        </div>
                    </div>
                </div>

                <div class="modal-footer">
                    <button class="btn-primary" onclick="executePhotoUpload(${productId})">
                        Upload Photo(s)
                    </button>
                    <button class="btn-secondary" onclick="closePhotoModal()">
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Setup file input handler
    setupPhotoUploadHandlers(productId);
}

/**
 * Setup photo upload handlers
 */
function setupPhotoUploadHandlers(productId) {
    const fileInput = document.getElementById('photo-file-input');
    const uploadZone = document.getElementById('photo-upload-zone');
    const previewArea = document.getElementById('photo-preview-area');

    fileInput.addEventListener('change', function(e) {
        handlePhotoSelection(e.target.files);
    });

    uploadZone.addEventListener('dragover', function(e) {
        e.preventDefault();
        e.stopPropagation();
        uploadZone.classList.add('drag-over');
    });

    uploadZone.addEventListener('dragleave', function(e) {
        e.preventDefault();
        e.stopPropagation();
        uploadZone.classList.remove('drag-over');
    });

    uploadZone.addEventListener('drop', function(e) {
        e.preventDefault();
        e.stopPropagation();
        uploadZone.classList.remove('drag-over');
        handlePhotoSelection(e.dataTransfer.files);
    });

    function handlePhotoSelection(files) {
        previewArea.innerHTML = '';
        Array.from(files).forEach(file => {
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    previewArea.innerHTML += `
                        <div class="preview-image">
                            <img src="${e.target.result}" alt="${file.name}">
                            <div class="preview-filename">${file.name}</div>
                        </div>
                    `;
                };
                reader.readAsDataURL(file);
            }
        });
    }
}

/**
 * Execute photo upload
 */
async function executePhotoUpload(productId) {
    const fileInput = document.getElementById('photo-file-input');
    const caption = document.getElementById('photo-caption').value;
    const selectedTags = Array.from(document.querySelectorAll('.photo-tag-checkbox:checked'))
        .map(cb => cb.value);

    if (!fileInput.files || fileInput.files.length === 0) {
        alert('Please select at least one photo');
        return;
    }

    const uploadBtn = event.target;
    uploadBtn.disabled = true;
    uploadBtn.textContent = 'Uploading...';

    try {
        const results = await uploadMultiplePhotos(fileInput.files, productId, selectedTags);

        let message = '';
        if (results.success.length > 0) {
            message += `✅ Successfully uploaded ${results.success.length} photo(s)\n`;

            // Update caption for uploaded photos
            if (caption) {
                results.success.forEach(photo => {
                    updatePhoto(photo.id, { caption: caption });
                });
            }
        }

        if (results.failed.length > 0) {
            message += `\n❌ Failed to upload ${results.failed.length} photo(s):\n`;
            results.failed.forEach(fail => {
                message += `- ${fail.file}: ${fail.error}\n`;
            });
        }

        alert(message);

        if (results.success.length > 0) {
            closePhotoModal();
            // Refresh current view
            if (window.location.hash.includes('photo-gallery')) {
                renderPhotoGalleryDashboard();
            } else {
                // Refresh product detail view if open
                const detailView = document.getElementById('view-detail');
                if (detailView && detailView.classList.contains('active')) {
                    renderExperienceDetail(currentExperience);
                }
            }
        }
    } catch (error) {
        alert('Error uploading photos: ' + error.message);
    } finally {
        uploadBtn.disabled = false;
        uploadBtn.textContent = 'Upload Photo(s)';
    }
}

// ===== PHOTO VIEWING =====

/**
 * View photo full size
 */
function viewPhotoFullSize(photoId) {
    const photo = getPhotoById(photoId);
    if (!photo) return;

    const modalHtml = `
        <div class="modal-overlay" onclick="closePhotoModal()">
            <div class="modal-content photo-view-modal" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <h3>${photo.productName}</h3>
                    <button class="modal-close" onclick="closePhotoModal()">✕</button>
                </div>

                <div class="modal-body">
                    <div class="photo-full-view">
                        <img src="${photo.imageData}" alt="${photo.fileName}">
                    </div>

                    <div class="photo-details">
                        ${photo.caption ? `<div class="photo-caption-large">${photo.caption}</div>` : ''}
                        <div class="photo-tags-large">
                            ${photo.tags.map(tag => `<span class="photo-tag">${tag}</span>`).join('')}
                        </div>
                        <div class="photo-metadata">
                            <div><strong>Filename:</strong> ${photo.fileName}</div>
                            <div><strong>Uploaded:</strong> ${new Date(photo.uploadDate).toLocaleString()}</div>
                            <div><strong>Size:</strong> ${(photo.fileSize / 1024).toFixed(0)} KB</div>
                        </div>
                    </div>
                </div>

                <div class="modal-footer">
                    <button class="btn-secondary" onclick="editPhotoDialog(${photoId}); closePhotoModal();">
                        ✏️ Edit
                    </button>
                    <button class="btn-secondary" onclick="downloadPhoto(${photoId})">
                        📥 Download
                    </button>
                    <button class="btn-danger" onclick="deletePhotoDialog(${photoId}); closePhotoModal();">
                        🗑️ Delete
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

// ===== PHOTO EDITING =====

/**
 * Edit photo dialog
 */
function editPhotoDialog(photoId) {
    const photo = getPhotoById(photoId);
    if (!photo) return;

    const modalHtml = `
        <div class="modal-overlay" onclick="closePhotoModal()">
            <div class="modal-content photo-edit-modal" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <h3>Edit Photo</h3>
                    <button class="modal-close" onclick="closePhotoModal()">✕</button>
                </div>

                <div class="modal-body">
                    <div class="photo-edit-preview">
                        <img src="${photo.imageData}" alt="${photo.fileName}">
                    </div>

                    <div class="form-group">
                        <label>Caption:</label>
                        <input type="text" id="edit-photo-caption" class="form-control" value="${photo.caption || ''}" placeholder="Enter photo description">
                    </div>

                    <div class="form-group">
                        <label>Tags:</label>
                        <div class="photo-tag-selector">
                            ${photoTagOptions.map(tag => `
                                <label class="tag-checkbox">
                                    <input type="checkbox" value="${tag}" class="photo-tag-checkbox" ${photo.tags.includes(tag) ? 'checked' : ''}>
                                    ${tag}
                                </label>
                            `).join('')}
                        </div>
                    </div>
                </div>

                <div class="modal-footer">
                    <button class="btn-primary" onclick="savePhotoEdits(${photoId})">
                        Save Changes
                    </button>
                    <button class="btn-secondary" onclick="closePhotoModal()">
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

/**
 * Save photo edits
 */
function savePhotoEdits(photoId) {
    const caption = document.getElementById('edit-photo-caption').value;
    const selectedTags = Array.from(document.querySelectorAll('.photo-tag-checkbox:checked'))
        .map(cb => cb.value);

    updatePhoto(photoId, { caption, tags: selectedTags });
    alert('Photo updated successfully!');
    closePhotoModal();

    // Refresh current view
    if (window.location.hash.includes('photo-gallery')) {
        renderPhotoGalleryDashboard();
    }
}

// ===== PHOTO DELETION =====

/**
 * Delete photo dialog
 */
function deletePhotoDialog(photoId) {
    const photo = getPhotoById(photoId);
    if (!photo) return;

    if (!confirm(`Delete photo "${photo.fileName}"? This cannot be undone.`)) {
        return;
    }

    deletePhoto(photoId);
    alert('Photo deleted successfully!');

    // Refresh current view
    if (window.location.hash.includes('photo-gallery')) {
        renderPhotoGalleryDashboard();
    } else {
        const detailView = document.getElementById('view-detail');
        if (detailView && detailView.classList.contains('active')) {
            renderExperienceDetail(currentExperience);
        }
    }
}

/**
 * Download photo
 */
function downloadPhoto(photoId) {
    const photo = getPhotoById(photoId);
    if (!photo) return;

    // Create a temporary link element
    const link = document.createElement('a');
    link.href = photo.imageData;
    link.download = photo.fileName || `photo-${photo.productName}-${Date.now()}.jpg`;

    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/**
 * Close photo modal
 */
function closePhotoModal() {
    const modal = document.querySelector('.modal-overlay');
    if (modal) {
        modal.remove();
    }
}

/**
 * Launch camera for product photo capture
 */
async function launchCameraForProduct(productId) {
    if (!window.launchCamera) {
        alert('Camera functionality not available');
        return;
    }

    // Launch camera and handle captured photo
    await window.launchCamera(async (photoData) => {
        // Add photo data to preview area
        const previewArea = document.getElementById('photo-preview-area');
        if (previewArea) {
            const preview = document.createElement('div');
            preview.className = 'photo-preview-item';
            preview.innerHTML = `
                <img src="${photoData}" alt="Captured photo">
                <button class="btn-remove-preview" onclick="this.parentElement.remove()">✕</button>
            `;
            previewArea.appendChild(preview);
        }

        // Trigger file input change event to use existing upload flow
        const fileInput = document.getElementById('photo-file-input');
        if (fileInput) {
            // Convert data URL to File object
            const blob = await fetch(photoData).then(r => r.blob());
            const file = new File([blob], `camera-photo-${Date.now()}.jpg`, { type: 'image/jpeg' });

            // Create a DataTransfer to set files
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            fileInput.files = dataTransfer.files;

            // Trigger change event
            fileInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
    });
}
