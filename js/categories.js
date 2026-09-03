/**
 * Mrymify - Categories Page Logic
 * Renders all products grouped by distinct category sections.
 */

document.addEventListener('DOMContentLoaded', function () {
    // 1. Initialize Shared Navigation Component
    if (window.MrymifyNavbar && typeof window.MrymifyNavbar.render === 'function') {
        // Pass 'categories' so the navbar knows which link is active
        window.MrymifyNavbar.render('categories');
    }

    // 2. Initialize Shared Footer Component
    if (window.MrymifyFooter && typeof window.MrymifyFooter.render === 'function') {
        window.MrymifyFooter.render();
    }

    // 3. Render Categories Grid
    renderCategories();
});

function renderCategories() {
    const container = document.getElementById('categories-container');
    if (!container || !window.MrymifyProducts) return;

    const products = window.MrymifyProducts.catalog;
    
    // Define our core categories and descriptions
    const categoriesList = [
        { id: 'amigurumi', title: 'Amigurumi & Plushies', desc: 'Cuddly companions and intricate plushies handcrafted stitch by stitch.' },
        { id: 'floral', title: 'Floral Stems & Bouquets', desc: 'Everlasting crochet flowers, roses, and tulips that never wilt.' },
        { id: 'wearables', title: 'Bags & Wearables', desc: 'Stylish artisan accessories, tote bags, and warm wearables.' },
        { id: 'keychains', title: 'Keychains & Accessories', desc: 'Charming mini crafts and bag charms perfect for gifting.' }
    ];

    let html = '';

    categoriesList.forEach(cat => {
        // Filter products for this specific category
        const catProducts = products.filter(p => p.category === cat.id);
        
        if (catProducts.length === 0) return;

        // Build the HTML for this category section
        html += `
        <div class="category-section" style="margin-bottom: 4.5rem; padding-top: 1rem;" id="cat-${cat.id}">
            <div style="margin-bottom: 2.5rem; border-bottom: 2px solid var(--color-surface-soft); padding-bottom: 1rem;">
                <h2 style="font-family: var(--font-heading); color: var(--color-text-main); font-size: 2.2rem; margin-bottom: 0.5rem;">${cat.title}</h2>
                <p style="color: var(--color-text-muted); font-size: 1.05rem;">${cat.desc}</p>
            </div>
            <div class="products-grid">
        `;

        // Generate product cards
        catProducts.forEach(product => {
            html += window.MrymifyProducts.createProductCardHtml(product);
        });

        html += `
            </div>
        </div>
        `;
    });

    container.innerHTML = html;
}
