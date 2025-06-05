async function fetchProducts(sortBy = '', minPrice = '', maxPrice = '', keywords = '') {
    const params = new URLSearchParams();
    if (sortBy) {
        params.append('sortBy', sortBy);
    }
    if (minPrice) {
        params.append('minPrice', minPrice);
    }
    if (maxPrice) {
        params.append('maxPrice', maxPrice);
    }
    if (keywords) {
        params.append('keywords', keywords);
    }

    let url = '/api/products';
    const queryString = params.toString();
    if (queryString) {
        url += `?${queryString}`;
    }

    const res = await fetch(url);
    const data = await res.json();
    return data.items || [];
}

function renderProducts(products) {
    const container = document.getElementById('products');
    const template = document.getElementById('product-template');
    container.innerHTML = '';
    products.forEach(p => {
        const clone = template.content.cloneNode(true);
        clone.querySelector('.thumbnail').src = p.galleryURL || '';
        clone.querySelector('.thumbnail').alt = p.title || 'Product';
        clone.querySelector('.title').textContent = p.title || '';
        clone.querySelector('.price').textContent = p.price ? `${p.currency} ${p.price}` : '';
        clone.querySelector('.link').href = p.viewItemURL || '#';
        container.appendChild(clone);
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    // Helper function to get all filter and sort values
    function getFilterAndSortValues() {
        const sortBy = document.getElementById('sort-by')?.value || '';
        const minPrice = document.getElementById('min-price')?.value || '';
        const maxPrice = document.getElementById('max-price')?.value || '';
        const keywords = document.getElementById('keywords')?.value || '';
        return { sortBy, minPrice, maxPrice, keywords };
    }

    // Initial load - no sort or filter preference
    const initialProducts = await fetchProducts();
    renderProducts(initialProducts);

    const sortBySelect = document.getElementById('sort-by');
    if (sortBySelect) {
        sortBySelect.addEventListener('change', async () => {
            const { sortBy, minPrice, maxPrice, keywords } = getFilterAndSortValues();
            const products = await fetchProducts(sortBy, minPrice, maxPrice, keywords);
            renderProducts(products);
        });
    }

    const applyFiltersButton = document.getElementById('apply-filters');
    if (applyFiltersButton) {
        applyFiltersButton.addEventListener('click', async () => {
            const { sortBy, minPrice, maxPrice, keywords } = getFilterAndSortValues();
            const products = await fetchProducts(sortBy, minPrice, maxPrice, keywords);
            renderProducts(products);
        });
    }
});
