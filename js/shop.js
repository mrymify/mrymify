/**
 * Mrymify - Shop Page Logic
 * Powers live search, category filtering, sorting, and URL query handling.
 */

document.addEventListener('DOMContentLoaded', function () {
    // 1. Render Global Shell Components
    if (window.MrymifyNavbar && typeof window.MrymifyNavbar.render === 'function') {
        window.MrymifyNavbar.render('shop');
    }
    if (window.MrymifyFooter && typeof window.MrymifyFooter.render === 'function') {
        window.MrymifyFooter.render();
    }

    // 2. Initialize Shop Catalog
    initShopCatalog();
});

function initShopCatalog() {
    if (!window.MrymifyProducts || !window.MrymifyProducts.catalog) return;

    const grid = document.getElementById('shop-products-grid');
    const searchInput = document.getElementById('shop-search-input');
    const countDisplay = document.getElementById('shop-count-display');
    const sortSelect = document.getElementById('shop-sort-select');
    const filterButtons = document.querySelectorAll('.shop-filter-pill');

    if (!grid) return;

    // Parse URL params for initial filters
    const urlParams = new URLSearchParams(window.location.search);
    let currentCategory = urlParams.get('category') || 'all';
    let currentSearch = urlParams.get('search') || '';
    let currentSort = 'featured';

    if (searchInput && currentSearch) {
        searchInput.value = currentSearch;
    }

    // Set active button
    filterButtons.forEach(btn => {
        if (btn.getAttribute('data-filter') === currentCategory) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    function renderFilteredProducts() {
        let products = [...window.MrymifyProducts.catalog];

        // 1. Category Filter
        if (currentCategory !== 'all') {
            products = products.filter(p => p.category === currentCategory);
        }

        // 2. Search Filter
        if (currentSearch.trim()) {
            const query = currentSearch.toLowerCase().trim();
            products = products.filter(p => 
                p.title.toLowerCase().includes(query) ||
                p.categoryLabel.toLowerCase().includes(query) ||
                (p.description && p.description.toLowerCase().includes(query))
            );
        }

        // 3. Sorting
        if (currentSort === 'price-low') {
            products.sort((a, b) => a.price - b.price);
        } else if (currentSort === 'price-high') {
            products.sort((a, b) => b.price - a.price);
        } else if (currentSort === 'likes') {
            products.sort((a, b) => window.MrymifyProducts.getProductLikes(b.id) - window.MrymifyProducts.getProductLikes(a.id));
        } else {
            // Featured priority
            products.sort((a, b) => (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0));
        }

        // Update count
        if (countDisplay) {
            countDisplay.textContent = `Showing ${products.length} product${products.length === 1 ? '' : 's'}`;
        }

        // Render cards or empty state
        if (products.length === 0) {
            grid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 1rem;">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">🔍</div>
                    <h3 style="font-family: var(--font-heading); font-size: 1.5rem; margin-bottom: 0.5rem;">No handcrafted pieces found</h3>
                    <p style="color: var(--color-text-muted); margin-bottom: 1.5rem;">Try clearing your search or exploring a different category.</p>
                    <button class="btn btn-outline" onclick="document.getElementById('shop-search-input').value=''; window.location.href='shop.html';">
                        Reset Filters
                    </button>
                </div>
            `;
            return;
        }

        grid.innerHTML = products.map(p => window.MrymifyProducts.createProductCardHtml(p)).join('');
    }

    // Category button clicks
    filterButtons.forEach(btn => {
        btn.addEventListener('click', function () {
            filterButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentCategory = this.getAttribute('data-filter');
            renderFilteredProducts();
        });
    });

    // Search input with live debounce
    if (searchInput) {
        let debounceTimer;
        searchInput.addEventListener('input', function () {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                currentSearch = searchInput.value;
                renderFilteredProducts();
            }, 250);
        });
    }

    // Sort selector
    if (sortSelect) {
        sortSelect.addEventListener('change', function () {
            currentSort = this.value;
            renderFilteredProducts();
        });
    }

    // Initial render
    renderFilteredProducts();

    // Initialize Mobile Column Density Preference (Default 3, or user-selected 4)
    const savedCols = localStorage.getItem('mrymify_mobile_grid_cols');
    if (savedCols === '4') {
        setGridCols(4);
    } else {
        setGridCols(3);
    }
}

/**
 * Toggles mobile product grid density between 3-in-a-row and 4-in-a-row
 * (Styled after modern fashion platforms like Zara, ASOS, and Shein)
 * @param {number} cols - 3 or 4
 */
function setGridCols(cols) {
    const grid = document.getElementById('shop-products-grid');
    const btn3 = document.getElementById('btn-grid-3');
    const btn4 = document.getElementById('btn-grid-4');
    if (!grid) return;

    if (cols === 4) {
        grid.classList.remove('grid-cols-3');
        grid.classList.add('grid-cols-4');
        if (btn4) btn4.classList.add('active');
        if (btn3) btn3.classList.remove('active');
        try { localStorage.setItem('mrymify_mobile_grid_cols', '4'); } catch(e) {}
    } else {
        grid.classList.remove('grid-cols-4');
        grid.classList.add('grid-cols-3');
        if (btn3) btn3.classList.add('active');
        if (btn4) btn4.classList.remove('active');
        try { localStorage.setItem('mrymify_mobile_grid_cols', '3'); } catch(e) {}
    }
}

// Expose component API
window.MrymifyShop = {
    setGridCols: setGridCols
};
