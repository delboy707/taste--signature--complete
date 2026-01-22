// ===== SEARCH & FILTER =====
// Quick search and filtering for product history

const SearchFilter = {
    currentFilters: {
        search: '',
        category: '',
        dateRange: 'all',
        minRating: 0
    },

    /**
     * Render search/filter bar
     */
    render(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = `
            <div class="search-filter-bar">
                <div class="search-input-wrapper">
                    <span class="search-icon">🔍</span>
                    <input type="text" id="search-input" placeholder="Search products..."
                        value="${this.currentFilters.search}"
                        oninput="SearchFilter.onSearchChange(this.value)">
                    ${this.currentFilters.search ? '<button class="clear-search" onclick="SearchFilter.clearSearch()">×</button>' : ''}
                </div>
                <div class="filter-buttons">
                    <select id="filter-category" onchange="SearchFilter.onCategoryChange(this.value)">
                        <option value="">All Categories</option>
                        <option value="chocolate" ${this.currentFilters.category === 'chocolate' ? 'selected' : ''}>Chocolate</option>
                        <option value="coffee" ${this.currentFilters.category === 'coffee' ? 'selected' : ''}>Coffee</option>
                        <option value="wine" ${this.currentFilters.category === 'wine' ? 'selected' : ''}>Wine</option>
                        <option value="beer" ${this.currentFilters.category === 'beer' ? 'selected' : ''}>Beer</option>
                        <option value="cheese" ${this.currentFilters.category === 'cheese' ? 'selected' : ''}>Cheese</option>
                        <option value="snack" ${this.currentFilters.category === 'snack' ? 'selected' : ''}>Snack</option>
                        <option value="beverage" ${this.currentFilters.category === 'beverage' ? 'selected' : ''}>Beverage</option>
                    </select>
                    <select id="filter-date" onchange="SearchFilter.onDateChange(this.value)">
                        <option value="all" ${this.currentFilters.dateRange === 'all' ? 'selected' : ''}>All Time</option>
                        <option value="today" ${this.currentFilters.dateRange === 'today' ? 'selected' : ''}>Today</option>
                        <option value="week" ${this.currentFilters.dateRange === 'week' ? 'selected' : ''}>This Week</option>
                        <option value="month" ${this.currentFilters.dateRange === 'month' ? 'selected' : ''}>This Month</option>
                    </select>
                </div>
            </div>
            <div id="search-results-count" class="search-results-count"></div>
        `;
    },

    onSearchChange(value) {
        this.currentFilters.search = value.toLowerCase();
        this.applyFilters();
    },

    onCategoryChange(value) {
        this.currentFilters.category = value;
        this.applyFilters();
    },

    onDateChange(value) {
        this.currentFilters.dateRange = value;
        this.applyFilters();
    },

    clearSearch() {
        this.currentFilters.search = '';
        document.getElementById('search-input').value = '';
        this.applyFilters();
    },

    /**
     * Filter experiences
     */
    filterExperiences(experiences) {
        return experiences.filter(exp => {
            // Search filter
            if (this.currentFilters.search) {
                const searchTerm = this.currentFilters.search;
                const name = (exp.productName || exp.itemName || '').toLowerCase();
                const brand = (exp.brand || '').toLowerCase();
                const notes = (exp.notes || '').toLowerCase();
                if (!name.includes(searchTerm) && !brand.includes(searchTerm) && !notes.includes(searchTerm)) {
                    return false;
                }
            }

            // Category filter
            if (this.currentFilters.category) {
                const category = (exp.category || '').toLowerCase();
                if (!category.includes(this.currentFilters.category)) {
                    return false;
                }
            }

            // Date filter
            if (this.currentFilters.dateRange !== 'all') {
                const expDate = new Date(exp.timestamp);
                const now = new Date();
                const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

                switch (this.currentFilters.dateRange) {
                    case 'today':
                        if (expDate < startOfDay) return false;
                        break;
                    case 'week':
                        const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
                        if (expDate < weekAgo) return false;
                        break;
                    case 'month':
                        const monthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
                        if (expDate < monthAgo) return false;
                        break;
                }
            }

            return true;
        });
    },

    applyFilters() {
        // Get all experiences
        const stored = localStorage.getItem('tasteExperiences');
        const experiences = stored ? JSON.parse(stored) : [];

        // Apply filters
        const filtered = this.filterExperiences(experiences);

        // Update count
        const countEl = document.getElementById('search-results-count');
        if (countEl) {
            const hasFilters = this.currentFilters.search || this.currentFilters.category || this.currentFilters.dateRange !== 'all';
            countEl.textContent = hasFilters ? `Showing ${filtered.length} of ${experiences.length} products` : '';
        }

        // Trigger update event
        window.dispatchEvent(new CustomEvent('experiencesFiltered', { detail: filtered }));

        return filtered;
    },

    /**
     * Reset all filters
     */
    reset() {
        this.currentFilters = { search: '', category: '', dateRange: 'all', minRating: 0 };
        this.render('search-filter-container');
        this.applyFilters();
    }
};

// Add search/filter styles
const searchStyles = document.createElement('style');
searchStyles.textContent = `
.search-filter-bar {
    display: flex;
    gap: 12px;
    margin-bottom: 16px;
    flex-wrap: wrap;
}

.search-input-wrapper {
    flex: 1;
    min-width: 200px;
    position: relative;
    display: flex;
    align-items: center;
}

.search-icon {
    position: absolute;
    left: 12px;
    font-size: 16px;
}

.search-input-wrapper input {
    width: 100%;
    padding: 10px 36px;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    font-size: 14px;
}

.search-input-wrapper input:focus {
    border-color: #667eea;
    outline: none;
}

.clear-search {
    position: absolute;
    right: 8px;
    background: none;
    border: none;
    font-size: 18px;
    color: #9ca3af;
    cursor: pointer;
    padding: 4px 8px;
}

.clear-search:hover { color: #374151; }

.filter-buttons {
    display: flex;
    gap: 8px;
}

.filter-buttons select {
    padding: 10px 12px;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    font-size: 14px;
    background: white;
    cursor: pointer;
}

.search-results-count {
    font-size: 13px;
    color: #6b7280;
    margin-bottom: 12px;
}

@media (max-width: 640px) {
    .search-filter-bar { flex-direction: column; }
    .filter-buttons { width: 100%; }
    .filter-buttons select { flex: 1; }
}
`;
document.head.appendChild(searchStyles);

window.SearchFilter = SearchFilter;
