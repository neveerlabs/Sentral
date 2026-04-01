document.addEventListener('DOMContentLoaded', () => {
  const productsContainer = document.getElementById('productsContainer');
  const categoryFiltersDiv = document.getElementById('categoryFilters');
  const emptyState = document.getElementById('emptyState');
  let categories = [];
  let slideshowIntervals = [];

  const fetchAPI = (url) => fetch(url, { credentials: 'include' });

  function setTitle(categoryName) {
    document.title = `Sentral Plastik | ${categoryName}`;
  }

  async function loadCategories() {
    try {
      const res = await fetchAPI('/api/categories');
      categories = await res.json();
      categoryFiltersDiv.innerHTML = categories.map(cat => `
        <button data-category="${cat.id}" class="cat-filter px-4 py-2 rounded-full text-sm">${escapeHtml(cat.name)}</button>
      `).join('');
      attachCategoryEvents();
      attachAllButtonEvent();
      handleUrlParam();
    } catch (err) {
      console.error('Failed to load categories', err);
    }
  }

  function attachCategoryEvents() {
    document.querySelectorAll('.cat-filter').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.cat-filter').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const categoryId = btn.dataset.category;
        loadProducts(categoryId);
        setTitle(btn.innerText);
      });
    });
  }

  function attachAllButtonEvent() {
    const allBtn = document.querySelector('button[data-category=""]');
    if (allBtn) {
      allBtn.addEventListener('click', () => {
        document.querySelectorAll('.cat-filter').forEach(b => b.classList.remove('active'));
        allBtn.classList.add('active');
        loadProducts();
        setTitle('Semua');
      });
    }
  }

  function handleUrlParam() {
    const urlParams = new URLSearchParams(window.location.search);
    const categoryParam = urlParams.get('category');
    if (categoryParam) {
      const matchingCat = categories.find(cat => cat.id == categoryParam);
      if (matchingCat) {
        setTitle(matchingCat.name);
        setTimeout(() => {
          const btn = document.querySelector(`.cat-filter[data-category="${categoryParam}"]`);
          if (btn) btn.click();
        }, 100);
      } else {
        setTitle('Semua');
      }
    } else {
      setTitle('Semua');
    }
  }

  async function loadProducts(categoryId = '') {
    try {
      let url = '/api/products';
      if (categoryId) url += `?category=${categoryId}`;
      const res = await fetchAPI(url);
      const products = await res.json();
      renderProducts(products);
    } catch (err) {
      console.error('Failed to load products', err);
    }
  }

  function updateCartCount() {
    const cartCountSpan = document.getElementById('cartCount');
    if (!cartCountSpan) return;
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    if (totalItems > 0) {
      cartCountSpan.textContent = totalItems;
      cartCountSpan.classList.remove('hidden');
    } else {
      cartCountSpan.classList.add('hidden');
    }
  }

  async function addToCart(product) {
    const userRes = await fetch('/api/user', { credentials: 'include' });
    const userData = await userRes.json();
    if (userData.loggedIn && userData.user.role === 'admin') {
      alert('Admin tidak dapat menambahkan produk ke keranjang.');
      return;
    }
    let cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const existing = cart.find(item => item.id === product.id);
    if (existing) {
      existing.quantity += 1;
    } else {
      cart.push({
        id: product.id,
        name: product.name,
        price: product.price,
        discount: product.discount,
        image_url: product.images[0],
        quantity: 1
      });
    }
    localStorage.setItem('cart', JSON.stringify(cart));
    alert(`"${product.name}" ditambahkan ke keranjang!`);
    updateCartCount();
  }

  function startSlideshow(card, images) {
    if (!images || images.length <= 1) return;
    let idx = 0;
    const imgElement = card.querySelector('.modern-product-img');
    if (!imgElement) return;
    const interval = setInterval(() => {
      idx = (idx + 1) % images.length;
      imgElement.src = images[idx];
    }, 3000);
    slideshowIntervals.push(interval);
    card.setAttribute('data-interval-id', slideshowIntervals.length - 1);
  }

  function stopAllSlideshows() {
    slideshowIntervals.forEach(interval => clearInterval(interval));
    slideshowIntervals = [];
  }

  function renderProducts(products) {
    if (!productsContainer) return;
    if (!products.length) {
      productsContainer.innerHTML = '';
      emptyState.classList.remove('hidden');
      return;
    }
    emptyState.classList.add('hidden');
    stopAllSlideshows();
    productsContainer.innerHTML = products.map(product => {
      const finalPrice = product.discount ? (product.price * (100 - product.discount) / 100).toFixed(0) : product.price;
      return `
        <div class="modern-product-card" data-id="${product.id}" data-images='${JSON.stringify(product.images)}' data-video="${product.video_url || ''}">
          <div class="relative">
            ${product.video_url ? `
              <video autoplay muted loop playsinline class="modern-product-img" poster="${product.images[0]}" style="object-fit: cover;">
                <source src="${product.video_url}" type="video/mp4">
              </video>
            ` : `
              <img src="${product.images[0]}" alt="${product.name}" class="modern-product-img" onerror="this.src='https://via.placeholder.com/400?text=No+Image'">
            `}
            ${product.discount ? `<span class="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">-${product.discount}%</span>` : ''}
          </div>
          <div class="modern-product-info">
            <h3 class="modern-product-title">${escapeHtml(product.name)}</h3>
            <p class="modern-product-sub">${escapeHtml(product.description || '')}</p>
            <div>
              ${product.discount ? `
                <span class="text-gray-400 line-through text-xs">Rp ${parseFloat(product.price).toLocaleString()}</span>
                <span class="modern-product-price ml-2">Rp ${parseFloat(finalPrice).toLocaleString()}</span>
              ` : `
                <span class="modern-product-price">Rp ${parseFloat(product.price).toLocaleString()}</span>
              `}
            </div>
            <button class="modern-product-btn" data-id="${product.id}">+ Keranjang</button>
          </div>
        </div>
      `;
    }).join('');

    document.querySelectorAll('.modern-product-card').forEach(card => {
      const images = JSON.parse(card.dataset.images);
      if (!card.dataset.video && images && images.length > 1) {
        startSlideshow(card, images);
      }
    });

    document.querySelectorAll('.modern-product-card').forEach(card => {
      const productId = card.dataset.id;
      if (!productId) return;
      card.addEventListener('click', (e) => {
        if (e.target.classList && e.target.classList.contains('modern-product-btn')) {
          return;
        }
        window.location.href = `/id/show.html?id=${productId}`;
      });
    });

    document.querySelectorAll('.modern-product-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const productId = parseInt(btn.dataset.id);
        const product = products.find(p => p.id === productId);
        if (product) {
          await addToCart(product);
        }
      });
    });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, m => {
      if (m === '&') return '&amp;';
      if (m === '<') return '&lt;';
      if (m === '>') return '&gt;';
      return m;
    });
  }

  loadCategories().then(() => loadProducts());
  updateCartCount();
});