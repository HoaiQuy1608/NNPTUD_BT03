const API_URL = 'https://api.escuelajs.co/api/v1/products';

let allProducts = [];
let filteredProducts = [];
let currentPage = 1;
let itemsPerPage = 10;
let sortConfig = {
    field: null,
    direction: 'asc'
};

const searchInput = document.getElementById('searchInput');
const itemsPerPageSelect = document.getElementById('itemsPerPage');
const tableBody = document.getElementById('tableBody');
const paginationContainer = document.getElementById('pagination');
const productTable = document.getElementById('productTable');
const loadingContainer = document.getElementById('loadingContainer');
const noDataContainer = document.getElementById('noDataContainer');
const errorContainer = document.getElementById('errorContainer');
const totalCountEl = document.getElementById('totalCount');
const displayCountEl = document.getElementById('displayCount');

const sortByPriceAscBtn = document.getElementById('sortByPriceAsc');
const sortByPriceDescBtn = document.getElementById('sortByPriceDesc');
const sortByNameAscBtn = document.getElementById('sortByNameAsc');
const sortByNameDescBtn = document.getElementById('sortByNameDesc');

if (searchInput) searchInput.addEventListener('input', handleSearch);
if (itemsPerPageSelect) itemsPerPageSelect.addEventListener('change', handleItemsPerPageChange);
if (sortByPriceAscBtn) sortByPriceAscBtn.addEventListener('click', () => handleSort('price', 'asc'));
if (sortByPriceDescBtn) sortByPriceDescBtn.addEventListener('click', () => handleSort('price', 'desc'));
if (sortByNameAscBtn) sortByNameAscBtn.addEventListener('click', () => handleSort('title', 'asc'));
if (sortByNameDescBtn) sortByNameDescBtn.addEventListener('click', () => handleSort('title', 'desc'));

async function getAll() {
    try {
        showLoading(true);
        clearError();
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        allProducts = await response.json();
        filteredProducts = [...allProducts];
        currentPage = 1;
        updateDisplay();
    } catch (error) {
        showError(`Lỗi khi lấy dữ liệu: ${error.message}`);
    } finally {
        showLoading(false);
    }
}

function handleSearch(e) {
    const searchTerm = e.target.value.toLowerCase().trim();
    currentPage = 1;
    if (searchTerm === '') {
        filteredProducts = [...allProducts];
    } else {
        filteredProducts = allProducts.filter(product =>
            product.title.toLowerCase().includes(searchTerm)
        );
    }
    if (sortConfig.field) applySorting();
    updateDisplay();
}

function handleItemsPerPageChange(e) {
    itemsPerPage = parseInt(e.target.value);
    currentPage = 1;
    updateDisplay();
}

function handleSort(field, direction) {
    sortConfig = { field, direction };
    applySorting();
    updateDisplay();
    updateSortButtonStates();
}

function applySorting() {
    if (!sortConfig.field) return;
    filteredProducts.sort((a, b) => {
        let aValue = a[sortConfig.field];
        let bValue = b[sortConfig.field];
        if (typeof aValue === 'string') {
            aValue = aValue.toLowerCase();
            bValue = bValue.toLowerCase();
        }
        let comparison = (aValue > bValue) ? 1 : (aValue < bValue ? -1 : 0);
        return sortConfig.direction === 'asc' ? comparison : -comparison;
    });
}

function updateSortButtonStates() {
    const buttons = [sortByPriceAscBtn, sortByPriceDescBtn, sortByNameAscBtn, sortByNameDescBtn];
    buttons.forEach(btn => btn && btn.classList.remove('active'));
    if (sortConfig.field === 'price') {
        sortConfig.direction === 'asc' 
            ? sortByPriceAscBtn?.classList.add('active')
            : sortByPriceDescBtn?.classList.add('active');
    } else if (sortConfig.field === 'title') {
        sortConfig.direction === 'asc'
            ? sortByNameAscBtn?.classList.add('active')
            : sortByNameDescBtn?.classList.add('active');
    }
}

function updateDisplay() {
    if (totalCountEl) totalCountEl.textContent = allProducts.length;
    if (displayCountEl) displayCountEl.textContent = filteredProducts.length;
    if (filteredProducts.length === 0) {
        productTable.style.display = 'none';
        noDataContainer.style.display = 'block';
        paginationContainer.innerHTML = '';
        return;
    }
    productTable.style.display = 'table';
    noDataContainer.style.display = 'none';
    renderTable();
    renderPagination();
}

function renderTable() {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageProducts = filteredProducts.slice(startIndex, endIndex);
    
    tableBody.innerHTML = pageProducts.map((product, index) => {
        const candidates = normalizeImageCandidates(product);
        const imgSrc = candidates.length > 0 ? candidates[0] : getFallbackImage(product);
        const encodedCandidates = encodeURIComponent(JSON.stringify(candidates));
        
        return `
        <tr>
            <td>
                <img 
                    src="${imgSrc}" 
                    alt="${escapeHtml(product.title)}" 
                    class="product-image"
                    data-images="${encodedCandidates}"
                    data-index="0"
                    style="width: 80px; height: 80px; object-fit: cover; border-radius: 8px; background: #f0f0f0;"
                >
            </td>
            <td>
                <div class="product-info">
                    <span class="product-title"><strong>${escapeHtml(product.title)}</strong></span>
                </div>
            </td>
            <td><span class="product-price">$${Number(product.price).toFixed(2)}</span></td>
            <td>${escapeHtml(product.category?.name || 'N/A')}</td>
            <td>
                <p style="max-height: 60px; overflow: hidden; font-size: 12px; color: #666; margin: 0;">
                    ${escapeHtml(product.description || 'No description')}
                </p>
            </td>
        </tr>`;
    }).join('');
    
    setTimeout(() => handleImageLoading(), 50);
}

function normalizeImageCandidates(product) {
    let rawImages = [];
    if (Array.isArray(product.images)) rawImages = product.images;
    else if (typeof product.images === 'string') rawImages = [product.images];

    return rawImages
        .map(img => {
            if (!img) return '';
            let clean = img.toString().replace(/[\[\]"\\]/g, '').trim();
            if (clean.startsWith(',')) clean = clean.substring(1);
            if (clean.startsWith('http://')) clean = clean.replace('http://', 'https://');
            return clean;
        })
        .filter(img => {
            const isBroken = img.includes('3a98.png') || img.includes('b7105.png') || img.includes('placeimg.com');
            return img && img.startsWith('http') && !isBroken;
        });
}

function handleImageLoading() {
    const images = document.querySelectorAll('.product-image');
    images.forEach((img) => {
        img.onerror = function() {
            let candidates = [];
            try {
                candidates = JSON.parse(decodeURIComponent(this.dataset.images || '[]'));
            } catch (e) { candidates = []; }

            let idx = parseInt(this.dataset.index || '0', 10);
            if (candidates.length > idx + 1) {
                idx++;
                this.dataset.index = idx;
                this.src = candidates[idx];
            } else {
                this.src = `https://loremflickr.com/80/80/product?lock=${img.alt.length}`;
                this.onerror = null; 
            }
        };
    });
}

function renderPagination() {
    const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
    paginationContainer.innerHTML = '';
    
    const createBtn = (text, page, disabled = false, active = false) => {
        const btn = document.createElement('button');
        btn.textContent = text;
        btn.disabled = disabled;
        if (active) btn.classList.add('active');
        btn.onclick = () => {
            currentPage = page;
            updateDisplay();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        };
        return btn;
    };

    paginationContainer.appendChild(createBtn('⬅', currentPage - 1, currentPage === 1));

    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
            paginationContainer.appendChild(createBtn(i, i, false, i === currentPage));
        } else if (i === currentPage - 3 || i === currentPage + 3) {
            const dots = document.createElement('span');
            dots.textContent = '...';
            paginationContainer.appendChild(dots);
        }
    }

    paginationContainer.appendChild(createBtn('➡', currentPage + 1, currentPage === totalPages));
}

function getFallbackImage(product) {
    const id = product.id || 1;
    return `https://picsum.photos/seed/${id}/80/80`;
}

function showLoading(show) {
    if (loadingContainer) loadingContainer.style.display = show ? 'block' : 'none';
    if (productTable) productTable.style.display = show ? 'none' : 'table';
}

function showError(msg) {
    if (errorContainer) errorContainer.innerHTML = `<div style="color:red; padding:20px;">${msg}</div>`;
}

function clearError() {
    if (errorContainer) errorContainer.innerHTML = '';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
}

document.addEventListener('DOMContentLoaded', getAll);