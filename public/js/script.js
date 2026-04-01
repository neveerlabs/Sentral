document.addEventListener('DOMContentLoaded', () => {
  const splash = document.getElementById('splash-screen');
  const mainApp = document.getElementById('main-app');
  setTimeout(() => {
    splash.style.opacity = '0';
    setTimeout(() => {
      splash.style.display = 'none';
      mainApp.style.display = 'block';
      loadProducts();
      loadCategoriesForHome();
      updateCartCount();
    }, 500);
  }, 1500);

  const ADMIN_PROFILE = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect width="100" height="100" fill="%23F97316"/%3E%3Ctext x="50" y="67" font-size="48" text-anchor="middle" fill="%23FFFFFF" font-family="Arial" font-weight="bold"%3ESP%3C/text%3E%3C/svg%3E';

  let currentUser = null;
  const profileBtn = document.getElementById('userProfileBtn');
  const profileImg = document.getElementById('profileImage');
  const dropdown = document.getElementById('profileDropdown');
  let isLoggedIn = false;
  let slideshowIntervals = [];

  async function fetchUser() {
    const res = await fetch('/api/user', { credentials: 'include' });
    const data = await res.json();
    if (data.loggedIn) {
      currentUser = data.user;
      isLoggedIn = true;
      if (data.user.profile_picture) {
        profileImg.src = data.user.profile_picture;
      } else if (data.user.role === 'admin') {
        profileImg.src = ADMIN_PROFILE;
      } else {
        profileImg.src = '/profile.jpg';
      }
      const adminLink = document.getElementById('adminLink');
      if (adminLink && data.user.role === 'admin') {
        adminLink.classList.remove('hidden');
      }
    } else {
      currentUser = null;
      isLoggedIn = false;
      profileImg.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='22' height='22' viewBox='0 0 24 24' fill='%238f9bb3'%3E%3Cpath d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/%3E%3C/svg%3E";
    }

    const footerProfileImg = document.getElementById('footerProfileImg');
    if (footerProfileImg) {
      if (currentUser && currentUser.profile_picture) {
        footerProfileImg.src = currentUser.profile_picture;
      } else if (currentUser && currentUser.role === 'admin') {
        footerProfileImg.src = ADMIN_PROFILE;
      } else {
        footerProfileImg.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='%239ca3af'%3E%3Cpath d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/%3E%3C/svg%3E";
      }
    }

    buildCarousel();
  }
  fetchUser();

  profileBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!currentUser) {
      window.location.href = '/id/login.html';
      return;
    }
    dropdown.classList.toggle('hidden');
    if (!dropdown.classList.contains('hidden')) {
      let avatarSrc = currentUser.profile_picture;
      if (!avatarSrc) {
        if (currentUser.role === 'admin') {
          avatarSrc = ADMIN_PROFILE;
        } else {
          avatarSrc = '/profile.jpg';
        }
      }
      document.getElementById('dropdownAvatar').src = avatarSrc;
      document.getElementById('dropdownName').innerText = currentUser.name;
      document.getElementById('dropdownEmail').innerText = currentUser.email;
    }
  });

  document.addEventListener('click', (e) => {
    if (!dropdown.contains(e.target) && e.target !== profileBtn && !profileBtn.contains(e.target)) {
      dropdown.classList.add('hidden');
    }
  });

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await fetch('/api/logout', { method: 'POST', credentials: 'include' });
      window.location.reload();
    });
  }

  let carouselInterval;
  let currentIndex = 0;
  const track = document.getElementById('carouselTrack');
  const dotsContainer = document.getElementById('carouselDots');
  let startX = 0;
  let isDragging = false;
  let dragStartTime = 0;

  async function buildCarousel() {
    let slides = [];
    try {
      const res = await fetch('/img/banner/banner.json');
      if (res.ok) {
        const data = await res.json();
        if (isLoggedIn) {
          if (data.default && Array.isArray(data.default)) {
            slides = data.default;
          }
        } else {
          let combined = [];
          if (data.default && Array.isArray(data.default)) combined = combined.concat(data.default);
          if (data.loggedOut && Array.isArray(data.loggedOut)) combined = combined.concat(data.loggedOut);
          if (combined.length > 0) slides = combined;
        }
      }
    } catch (err) {
      console.warn('Failed to load banner.json, using fallback slides', err);
    }

    if (!slides.length) {
      slides = [
        { image: 'https://picsum.photos/id/20/1200/400', title: 'Grosir Plastik Hemat', description: 'Diskon s/d 40% untuk pembelian karton' },
        { image: 'https://picsum.photos/id/30/1200/400', title: 'Plastik Ramah Lingkungan', description: 'Bisa pakai ulang & biodegradable' },
        { image: 'https://picsum.photos/id/26/1200/400', title: 'Gratis Ongkir', description: 'Min. beli Rp150.000, area Jabodetabek' }
      ];
      if (!isLoggedIn) {
        slides.push({ image: 'https://picsum.photos/id/20/1200/400', title: 'Diskon 50% untuk Pengguna Baru!', description: 'Khusus aplikasi Sentral Plastik', button_text: 'Login Sekarang', button_link: '/id/login.html' });
      }
    }

    track.innerHTML = '';
    dotsContainer.innerHTML = '';
    slides.forEach((slide) => {
      const slideDiv = document.createElement('div');
      slideDiv.className = 'flex-shrink-0 w-full relative';
      slideDiv.innerHTML = `
        <img src="${slide.image}" alt="${slide.title}" class="w-full h-48 sm:h-64 object-cover">
        <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-6 text-white">
          <h3 class="text-xl font-bold">${slide.title}</h3>
          <p class="text-sm">${slide.description}</p>
          ${slide.button_text && slide.button_link ? `<a href="${slide.button_link}" class="carousel-cta inline-block mt-2">${slide.button_text}</a>` : ''}
        </div>
      `;
      track.appendChild(slideDiv);
    });

    for (let i = 0; i < slides.length; i++) {
      const dot = document.createElement('div');
      dot.classList.add('dot', 'w-1.5', 'h-1.5', 'bg-white/50', 'rounded-full', 'cursor-pointer', 'transition-all', 'duration-200');
      if (i === 0) dot.classList.add('active', 'bg-white', 'w-4');
      dot.addEventListener('click', () => { stopAutoSlide(); goToSlide(i); startAutoSlide(); });
      dotsContainer.appendChild(dot);
    }
    currentIndex = 0;
    goToSlide(0);
    startAutoSlide();
  }

  function updateDots() {
    const dots = document.querySelectorAll('.dot');
    dots.forEach((dot, i) => dot.classList.toggle('active', i === currentIndex));
  }

  function goToSlide(index) {
    const slides = Array.from(track.children);
    if (index < 0) index = slides.length - 1;
    if (index >= slides.length) index = 0;
    currentIndex = index;
    track.style.transform = `translateX(-${currentIndex * 100}%)`;
    updateDots();
  }

  function nextSlide() { goToSlide(currentIndex + 1); }
  function prevSlide() { goToSlide(currentIndex - 1); }

  function startAutoSlide() {
    if (carouselInterval) clearInterval(carouselInterval);
    carouselInterval = setInterval(nextSlide, 4000);
  }
  function stopAutoSlide() { if (carouselInterval) clearInterval(carouselInterval); }

  track.addEventListener('touchstart', (e) => {
    stopAutoSlide();
    startX = e.touches[0].clientX;
    isDragging = true;
    dragStartTime = Date.now();
  });
  track.addEventListener('touchmove', (e) => { if (!isDragging) return; });
  track.addEventListener('touchend', (e) => {
    if (!isDragging) return;
    const endX = e.changedTouches[0].clientX;
    const diffX = endX - startX;
    const swipeDuration = Date.now() - dragStartTime;
    if (Math.abs(diffX) > 50 && swipeDuration < 300) {
      if (diffX > 0) prevSlide();
      else nextSlide();
    }
    isDragging = false;
    startAutoSlide();
  });
  track.addEventListener('mousedown', (e) => {
    stopAutoSlide();
    startX = e.clientX;
    isDragging = true;
    dragStartTime = Date.now();
    e.preventDefault();
  });
  window.addEventListener('mousemove', (e) => { if (!isDragging) return; });
  window.addEventListener('mouseup', (e) => {
    if (!isDragging) return;
    const endX = e.clientX;
    const diffX = endX - startX;
    const swipeDuration = Date.now() - dragStartTime;
    if (Math.abs(diffX) > 50 && swipeDuration < 300) {
      if (diffX > 0) prevSlide();
      else nextSlide();
    }
    isDragging = false;
    startAutoSlide();
  });

  let allProducts = [];

  async function loadProducts() {
    try {
      const res = await fetch('/api/products', { credentials: 'include' });
      allProducts = await res.json();
      renderProducts(allProducts);
    } catch (err) {
      console.error('Failed to load products', err);
    }
  }

  async function loadCategoriesForHome() {
    try {
      const res = await fetch('/api/categories', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch categories');
      const categories = await res.json();
      renderCategoryIcons(categories);
    } catch (err) {
      console.error('Failed to load categories for home', err);
      const container = document.getElementById('categoriesContainer');
      if (container) {
        container.innerHTML = '<p class="text-gray-500">Gagal memuat kategori</p>';
      }
    }
  }

  function renderCategoryIcons(categories) {
    const container = document.getElementById('categoriesContainer');
    if (!container) return;
    if (!categories || !categories.length) {
      container.innerHTML = '<p class="text-gray-500">Kategori tidak tersedia</p>';
      return;
    }
    container.innerHTML = categories.map(cat => `
      <a href="kategori.html?category=${cat.id}" class="flex-shrink-0 text-center hover:opacity-80 transition" style="width: 70px;">
        <img src="${cat.image_url}" class="w-14 h-14 mx-auto rounded-full object-cover mb-1" alt="${cat.name}">
        <span class="text-xs text-gray-600">${escapeHtml(cat.name)}</span>
      </a>
    `).join('');
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
      if (m === '&') return '&amp;';
      if (m === '<') return '&lt;';
      if (m === '>') return '&gt;';
      return m;
    });
  }

  function addToCart(product) {
    if (currentUser && currentUser.role === 'admin') {
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
    stopAllSlideshows();
    const specialContainer = document.getElementById('specialProductsContainer');
    if (specialContainer) {
      const specials = products.slice(0, 4);
      specialContainer.innerHTML = specials.map(product => {
        const finalPrice = product.discount ? (product.price * (100 - product.discount) / 100).toFixed(0) : product.price;
        return `
          <div class="product-list-item" data-id="${product.id}">
            <div class="relative">
              ${product.video_url ? `
                <video autoplay muted loop playsinline class="product-list-image" poster="${product.images[0]}" style="object-fit: cover;">
                  <source src="${product.video_url}" type="video/mp4">
                </video>
              ` : `
                <img src="${product.images[0]}" alt="${product.name}" class="product-list-image" onerror="this.src='https://via.placeholder.com/80?text=No+Image'">
              `}
              ${product.discount ? `<span class="absolute top-0 left-0 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">-${product.discount}%</span>` : ''}
            </div>
            <div class="product-list-details">
              <div>
                <h3 class="product-list-title">${escapeHtml(product.name)}</h3>
                <p class="product-list-sub">${escapeHtml(product.description || '')}</p>
                <div class="mt-1">
                  ${product.discount ? `
                    <span class="text-gray-400 line-through text-xs">Rp ${parseFloat(product.price).toLocaleString()}</span>
                    <span class="product-list-price ml-2">Rp ${parseFloat(finalPrice).toLocaleString()}</span>
                  ` : `
                    <span class="product-list-price">Rp ${parseFloat(product.price).toLocaleString()}</span>
                  `}
                </div>
              </div>
              <div class="flex justify-end">
                <button class="product-list-btn" data-id="${product.id}">+ Keranjang</button>
              </div>
            </div>
          </div>
        `;
      }).join('');
    }

    const featuredContainer = document.getElementById('featuredProductsContainer');
    if (featuredContainer) {
      const featured = products.slice(4, 14);
      featuredContainer.innerHTML = featured.map(product => {
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
    }

    document.querySelectorAll('.modern-product-card').forEach(card => {
      const productId = card.dataset.id;
      const images = JSON.parse(card.dataset.images);
      if (!card.dataset.video && images && images.length > 1) {
        startSlideshow(card, images);
      }
    });

    document.querySelectorAll('.product-list-item, .modern-product-card').forEach(card => {
      const productId = card.dataset.id;
      if (!productId) return;
      card.addEventListener('click', (e) => {
        if (e.target.classList && (e.target.classList.contains('product-list-btn') || e.target.classList.contains('modern-product-btn'))) {
          return;
        }
        window.location.href = `/id/show.html?id=${productId}`;
      });
    });

    document.querySelectorAll('.product-list-btn, .modern-product-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        const productId = parseInt(btn.dataset.id);
        const product = allProducts.find(p => p.id === productId);
        if (product) {
          addToCart(product);
        }
      });
    });
  }

  const navItems = document.querySelectorAll('.bottom-nav > div');
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      navItems.forEach(i => i.classList.remove('text-orange-500', 'text-gray-400'));
      item.classList.add('text-orange-500');
      item.classList.remove('text-gray-400');
      const span = item.querySelector('span')?.innerText;
      if (span && span !== 'Beranda') alert(`Halaman "${span}" sedang dalam pengembangan.`);
    });
  });
});