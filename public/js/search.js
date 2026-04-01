document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const query = urlParams.get('q') || '';
  const searchInput = document.getElementById('searchInput');
  const productsContainer = document.getElementById('productsContainer');
  const recommendationsContainer = document.getElementById('recommendationsContainer');
  const emptyState = document.getElementById('emptyState');
  const searchQueryDisplay = document.getElementById('searchQueryDisplay');
  const resultCountSpan = document.getElementById('resultCount');
  let allProducts = [];
  let categoriesMap = new Map();
  let whatsappNumber = '';

  const ADMIN_PROFILE = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect width="100" height="100" fill="%23F97316"/%3E%3Ctext x="50" y="67" font-size="48" text-anchor="middle" fill="%23FFFFFF" font-family="Arial" font-weight="bold"%3ESP%3C/text%3E%3C/svg%3E';

  let currentUser = null;
  let slideshowIntervals = [];

  async function fetchWhatsappNumber() {
    try {
      const res = await fetch('/api/whatsapp');
      const data = await res.json();
      whatsappNumber = data.number;
    } catch (err) {
      console.error('Failed to fetch WhatsApp number', err);
      whatsappNumber = '628561765372';
    }
  }

  async function fetchUser() {
    const res = await fetch('/api/user', { credentials: 'include' });
    const data = await res.json();
    if (data.loggedIn) {
      currentUser = data.user;
      const profileImg = document.getElementById('profileImage');
      if (data.user.profile_picture) profileImg.src = data.user.profile_picture;
      else if (data.user.role === 'admin') profileImg.src = ADMIN_PROFILE;
      else profileImg.src = '/profile.jpg';

      const footerProfileImg = document.getElementById('footerProfileImg');
      if (footerProfileImg) {
        if (currentUser.profile_picture) footerProfileImg.src = currentUser.profile_picture;
        else if (currentUser.role === 'admin') footerProfileImg.src = ADMIN_PROFILE;
        else footerProfileImg.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='%239ca3af'%3E%3Cpath d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/%3E%3C/svg%3E";
      }
    } else {
      currentUser = null;
    }
  }

  async function fetchCategories() {
    try {
      const res = await fetch('/api/categories', { credentials: 'include' });
      const cats = await res.json();
      cats.forEach(cat => categoriesMap.set(cat.id, cat.name));
    } catch (err) {
      console.error('Failed to fetch categories', err);
    }
  }

  async function fetchProducts() {
    try {
      const res = await fetch('/api/products', { credentials: 'include' });
      allProducts = await res.json();
      return allProducts;
    } catch (err) {
      console.error('Failed to fetch products', err);
      return [];
    }
  }

  function calculateRelevance(product, queryLower) {
    let score = 0;
    const name = (product.name || '').toLowerCase();
    const desc = (product.description || '').toLowerCase();
    const categoryName = (categoriesMap.get(product.category_id) || '').toLowerCase();

    if (name.includes(queryLower)) score += 100;
    if (desc.includes(queryLower)) score += 20;
    if (categoryName.includes(queryLower)) score += 30;

    if (score > 0 && name === queryLower) score += 50;

    return score;
  }

  function getSearchResults(products, queryLower) {
    return products
      .map(p => ({ ...p, relevance: calculateRelevance(p, queryLower) }))
      .filter(p => p.relevance > 0)
      .sort((a, b) => b.relevance - a.relevance);
  }

  function getRecommendations(products, queryLower, excludeIds) {
    const excludeSet = new Set(excludeIds);
    const relevantOthers = products
      .filter(p => !excludeSet.has(p.id) && (calculateRelevance(p, queryLower) > 0))
      .sort((a, b) => calculateRelevance(b, queryLower) - calculateRelevance(a, queryLower));
    if (relevantOthers.length >= 6) return relevantOthers.slice(0, 6);
    const popular = products.filter(p => !excludeSet.has(p.id) && !relevantOthers.some(r => r.id === p.id));
    return [...relevantOthers, ...popular].slice(0, 6);
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

  function renderProductsGrid(products, container) {
    if (!products.length) {
      container.innerHTML = '';
      return;
    }
    stopAllSlideshows();
    container.innerHTML = products.map(product => {
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
        if (e.target.classList && e.target.classList.contains('modern-product-btn')) return;
        window.location.href = `/id/show.html?id=${productId}`;
      });
    });

    document.querySelectorAll('.modern-product-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const productId = parseInt(btn.dataset.id);
        const product = allProducts.find(p => p.id === productId);
        if (product) await addToCart(product);
      });
    });
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

  let slideshowIntervalsGlobal = [];
  function startSlideshow(card, images) {
    if (!images || images.length <= 1) return;
    let idx = 0;
    const imgElement = card.querySelector('.modern-product-img');
    if (!imgElement) return;
    const interval = setInterval(() => {
      idx = (idx + 1) % images.length;
      imgElement.src = images[idx];
    }, 3000);
    slideshowIntervalsGlobal.push(interval);
    card.setAttribute('data-interval-id', slideshowIntervalsGlobal.length - 1);
  }

  function stopAllSlideshows() {
    slideshowIntervalsGlobal.forEach(interval => clearInterval(interval));
    slideshowIntervalsGlobal = [];
  }

  async function performSearch() {
    if (!query.trim()) {
      searchQueryDisplay.textContent = 'Pencarian';
      resultCountSpan.textContent = 'Masukkan kata kunci untuk mencari produk';
      emptyState.classList.add('hidden');
      productsContainer.innerHTML = '';
      recommendationsContainer.innerHTML = '';
      return;
    }

    searchQueryDisplay.textContent = `Hasil pencarian: "${escapeHtml(query)}"`;
    const queryLower = query.toLowerCase();

    const results = getSearchResults(allProducts, queryLower);
    const resultIds = results.map(p => p.id);

    if (results.length === 0) {
      resultCountSpan.textContent = 'Tidak ada produk ditemukan';
      emptyState.classList.remove('hidden');
      productsContainer.innerHTML = '';
    } else {
      resultCountSpan.textContent = `Menampilkan ${results.length} produk`;
      emptyState.classList.add('hidden');
      renderProductsGrid(results, productsContainer);
    }

    const recommendations = getRecommendations(allProducts, queryLower, resultIds);
    if (recommendations.length) {
      renderProductsGrid(recommendations, recommendationsContainer);
    } else {
      recommendationsContainer.innerHTML = '<p class="text-gray-500 text-center py-8">Tidak ada rekomendasi saat ini.</p>';
    }

    const whatsappBtn = document.getElementById('whatsappButton');
    if (whatsappBtn) {
      whatsappBtn.href = `https://wa.me/${whatsappNumber}`;
    }
  }

  function initSearchInput() {
    if (!searchInput) return;
    searchInput.value = query;
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const newQuery = searchInput.value.trim();
        if (newQuery) window.location.href = `/id/search.html?q=${encodeURIComponent(newQuery)}`;
        else window.location.href = '/id/search.html';
      }
    });
  }

  function setupProfileDropdown() {
    const profileBtn = document.getElementById('userProfileBtn');
    const dropdown = document.getElementById('profileDropdown');
    const logoutBtn = document.getElementById('logoutBtn');

    if (profileBtn) {
      profileBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!currentUser) {
          window.location.href = '/id/login.html';
          return;
        }
        dropdown.classList.toggle('hidden');
        if (!dropdown.classList.contains('hidden')) {
          let avatarSrc = currentUser.profile_picture;
          if (!avatarSrc) avatarSrc = currentUser.role === 'admin' ? ADMIN_PROFILE : '/profile.jpg';
          document.getElementById('dropdownAvatar').src = avatarSrc;
          document.getElementById('dropdownName').innerText = currentUser.name;
          document.getElementById('dropdownEmail').innerText = currentUser.email;
        }
      });
    }

    document.addEventListener('click', (e) => {
      if (dropdown && !dropdown.contains(e.target) && e.target !== profileBtn && !profileBtn.contains(e.target)) {
        dropdown.classList.add('hidden');
      }
    });

    if (logoutBtn) {
      logoutBtn.addEventListener('click', async () => {
        await fetch('/api/logout', { method: 'POST', credentials: 'include' });
        window.location.reload();
      });
    }
  }

  async function init() {
    await fetchWhatsappNumber();
    await fetchUser();
    await fetchCategories();
    await fetchProducts();
    updateCartCount();
    setupProfileDropdown();
    initSearchInput();
    await performSearch();
  }

  init();
});