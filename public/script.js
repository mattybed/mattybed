async function fetchProducts() {
    const res = await fetch('/api/products');
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
    const products = await fetchProducts();
    renderProducts(products);
});
