document.addEventListener('DOMContentLoaded', () => {
  const backBtn = document.getElementById('backBtn');
  const productNameEl = document.getElementById('productName');
  const productDetail = document.getElementById('productDetail');
  const shareBtn = document.getElementById('shareBtn');
  const shareModal = document.getElementById('shareModal');
  const shareModalBackdrop = document.getElementById('shareModalBackdrop');
  const closeShareModalBtn = document.getElementById('closeShareModalBtn');
  const shareLinkInput = document.getElementById('shareLinkInput');
  const copyLinkBtn = document.getElementById('copyLinkBtn');
  const copyFeedback = document.getElementById('copyFeedback');
  let currentUser = null;
  let currentIndex = 0;
  let slides = [];
  let touchStartX = 0;
  let touchEndX = 0;

  backBtn.addEventListener('click', () => {
    window.history.back();
  });

  const urlParams = new URLSearchParams(window.location.search);
  const productId = urlParams.get('id');
  if (!productId) {
    productDetail.innerHTML = '<div class="text-center text-red-500 py-12">Produk tidak ditemukan.</div>';
    return;
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

  async function fetchUser() {
    const res = await fetch('/api/user', { credentials: 'include' });
    const data = await res.json();
    if (data.loggedIn) {
      currentUser = data.user;
    } else {
      currentUser = null;
    }
    const footerProfileImg = document.getElementById('footerProfileImg');
    if (footerProfileImg) {
      if (currentUser && currentUser.profile_picture) {
        footerProfileImg.src = currentUser.profile_picture;
      } else if (currentUser && currentUser.role === 'admin') {
        footerProfileImg.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23F97316'/%3E%3Ctext x='50' y='67' font-size='48' text-anchor='middle' fill='%23FFFFFF' font-family='Arial' font-weight='bold'%3ESP%3C/text%3E%3C/svg%3E";
      } else {
        footerProfileImg.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='%239ca3af'%3E%3Cpath d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/%3E%3C/svg%3E";
      }
    }
  }

  async function fetchProduct() {
    try {
      const res = await fetch(`/api/products/${productId}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Product not found');
      const product = await res.json();
      renderProduct(product);
      document.title = `Sentral Plastik | ${product.name}`;
      const currentUrl = `${window.location.origin}/id/show.html?id=${product.id}`;
      shareLinkInput.value = currentUrl;
    } catch (err) {
      console.error(err);
      productDetail.innerHTML = '<div class="text-center text-red-500 py-12">Gagal memuat produk. Silakan coba lagi.</div>';
    }
  }

  function renderProduct(product) {
    productNameEl.textContent = product.name;
    productNameEl.title = product.name;

    // Buat array slide: video (jika ada) diikuti semua gambar
    slides = [];
    if (product.video_url) {
      slides.push({ type: 'video', url: product.video_url, poster: product.images[0] });
    }
    product.images.forEach(img => {
      slides.push({ type: 'image', url: img });
    });

    // Jika tidak ada video dan hanya satu gambar, gunakan tampilan biasa
    // Jika ada video atau banyak gambar, gunakan carousel
    let mediaHtml = '';
    if (slides.length === 1 && slides[0].type === 'image') {
      mediaHtml = `
        <div class="product-image-container">
          <img src="${slides[0].url}" alt="${product.name}" class="w-full h-full object-contain">
        </div>
      `;
    } else {
      mediaHtml = `
        <div class="carousel-container">
          <div id="carouselTrack" class="carousel-track">
            ${slides.map(slide => `
              <div class="carousel-slide" data-type="${slide.type}" data-url="${slide.url}" ${slide.poster ? `data-poster="${slide.poster}"` : ''}>
                ${slide.type === 'video' ? `
                  <video autoplay loop muted playsinline class="w-full h-full object-contain" poster="${slide.poster}">
                    <source src="${slide.url}" type="video/mp4">
                  </video>
                ` : `
                  <img src="${slide.url}" alt="${product.name}" class="w-full h-full object-contain">
                `}
              </div>
            `).join('')}
          </div>
          <button id="prevImage" class="carousel-btn carousel-prev">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
          </button>
          <button id="nextImage" class="carousel-btn carousel-next">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
          </button>
          <div class="carousel-dots">
            ${slides.map((_, idx) => `<div class="carousel-dot ${idx === 0 ? 'active' : ''}" data-index="${idx}"></div>`).join('')}
          </div>
          ${slides.some(s => s.type === 'video') ? `
            <button id="volumeToggle" class="absolute bottom-3 right-3 bg-black/60 hover:bg-black/80 text-white rounded-full p-2 transition z-20">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              </svg>
            </button>
          ` : ''}
        </div>
      `;
    }

    const finalPrice = product.discount ? (product.price * (100 - product.discount) / 100).toFixed(0) : product.price;
    const priceDisplay = product.discount 
      ? `<div class="flex items-baseline gap-2">
          <span class="text-3xl font-bold text-orange-500">Rp ${parseFloat(finalPrice).toLocaleString()}</span>
          <span class="text-gray-400 line-through">Rp ${parseFloat(product.price).toLocaleString()}</span>
          <span class="bg-red-100 text-red-600 text-sm font-semibold px-2 py-0.5 rounded-full">-${product.discount}%</span>
         </div>`
      : `<span class="text-3xl font-bold text-orange-500">Rp ${parseFloat(product.price).toLocaleString()}</span>`;

    const stockStatus = product.stock > 0 
      ? `<div class="flex items-center gap-1 text-green-600 bg-green-50 px-3 py-1 rounded-full">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
          <span class="text-sm font-medium">Stok: ${product.stock}</span>
         </div>`
      : `<div class="flex items-center gap-1 text-red-600 bg-red-50 px-3 py-1 rounded-full">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          <span class="text-sm font-medium">Stok Habis</span>
         </div>`;

    const attributes = [];
    if (product.size) attributes.push({ label: 'Ukuran', value: product.size, icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' });
    if (product.quality) attributes.push({ label: 'Kualitas', value: product.quality, icon: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z' });
    if (product.color) attributes.push({ label: 'Warna', value: product.color, icon: 'M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01' });
    const attributesHtml = attributes.length 
      ? `<div class="bg-gray-50 rounded-2xl p-5">
          <h3 class="text-sm font-semibold text-gray-700 mb-3">Detail Produk</h3>
          <div class="space-y-3">
            ${attributes.map(attr => `
              <div class="flex items-center gap-3 text-sm">
                <svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="${attr.icon}"/></svg>
                <span class="text-gray-600">${attr.label}:</span>
                <span class="font-medium text-gray-800">${escapeHtml(attr.value)}</span>
              </div>
            `).join('')}
          </div>
        </div>`
      : '';

    productDetail.innerHTML = `
      <div class="bg-white rounded-2xl overflow-hidden shadow-sm">
        <div class="p-4 bg-gray-50">
          ${mediaHtml}
        </div>
        <div class="p-5 space-y-4">
          <h2 class="text-2xl font-bold text-gray-800">${escapeHtml(product.name)}</h2>
          <div class="flex flex-wrap items-center justify-between gap-3">
            ${priceDisplay}
            ${stockStatus}
          </div>
          <div class="border-t pt-4">
            <h3 class="text-sm font-semibold text-gray-700 mb-2">Deskripsi</h3>
            <p class="text-gray-600 text-sm leading-relaxed whitespace-pre-line">${escapeHtml(product.description || 'Tidak ada deskripsi.')}</p>
          </div>
          ${attributesHtml}
          <button id="addToCartBtn" class="w-full mt-2 bg-orange-500 hover:bg-orange-600 text-black font-semibold py-3 rounded-full transition shadow-md flex items-center justify-center gap-2">
            + Keranjang
          </button>
        </div>
      </div>
    `;

    // Aktifkan carousel jika lebih dari satu slide
    if (slides.length > 1) {
      const track = document.getElementById('carouselTrack');
      const prevBtn = document.getElementById('prevImage');
      const nextBtn = document.getElementById('nextImage');
      const dots = document.querySelectorAll('.carousel-dot');
      const volumeBtn = document.getElementById('volumeToggle');
      let currentVideo = null;
      let isMuted = true;

      function updateCarousel() {
        if (track) track.style.transform = `translateX(-${currentIndex * 100}%)`;
        dots.forEach((dot, idx) => {
          if (idx === currentIndex) dot.classList.add('active');
          else dot.classList.remove('active');
        });
        // Jika slide saat ini adalah video, pastikan video dimainkan (dan mute sesuai)
        if (slides[currentIndex].type === 'video') {
          const videoEl = document.querySelector(`.carousel-slide[data-type="video"] video`);
          if (videoEl && videoEl !== currentVideo) {
            if (currentVideo) currentVideo.pause();
            currentVideo = videoEl;
            videoEl.muted = isMuted;
            videoEl.play().catch(e => console.log('Autoplay prevented:', e));
          } else if (videoEl && videoEl.paused) {
            videoEl.play().catch(e => console.log('Autoplay prevented:', e));
          }
        } else {
          if (currentVideo) currentVideo.pause();
        }
      }

      function nextSlide() {
        if (currentIndex < slides.length - 1) {
          currentIndex++;
          updateCarousel();
        }
      }

      function prevSlide() {
        if (currentIndex > 0) {
          currentIndex--;
          updateCarousel();
        }
      }

      prevBtn.addEventListener('click', prevSlide);
      nextBtn.addEventListener('click', nextSlide);
      dots.forEach((dot, idx) => {
        dot.addEventListener('click', () => {
          currentIndex = idx;
          updateCarousel();
        });
      });

      if (volumeBtn && slides.some(s => s.type === 'video')) {
        volumeBtn.addEventListener('click', () => {
          if (currentVideo) {
            currentVideo.muted = !currentVideo.muted;
            isMuted = currentVideo.muted;
            volumeBtn.innerHTML = isMuted ? `
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              </svg>
            ` : `
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                <line x1="3" y1="3" x2="21" y2="21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
            `;
          }
        });
      }

      track.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
      });
      track.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        if (touchEndX < touchStartX - 50) nextSlide();
        if (touchEndX > touchStartX + 50) prevSlide();
      });

      updateCarousel();
    } else if (slides.length === 1 && slides[0].type === 'video') {
      // Jika hanya video, tetap tampilkan tombol volume
      const volumeBtn = document.getElementById('volumeToggle');
      if (volumeBtn) {
        const videoEl = document.querySelector('.carousel-slide video');
        if (videoEl) {
          let isMuted = true;
          volumeBtn.addEventListener('click', () => {
            videoEl.muted = !videoEl.muted;
            isMuted = videoEl.muted;
            volumeBtn.innerHTML = isMuted ? `
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              </svg>
            ` : `
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                <line x1="3" y1="3" x2="21" y2="21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
            `;
          });
        }
      }
    }

    const addToCartBtn = document.getElementById('addToCartBtn');
    if (addToCartBtn) {
      addToCartBtn.addEventListener('click', () => {
        addToCart(product);
      });
    }
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

  function openShareModal() {
    shareModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    copyFeedback.classList.add('hidden');
  }

  function closeShareModal() {
    shareModal.classList.add('hidden');
    document.body.style.overflow = '';
  }

  function copyLink() {
    shareLinkInput.select();
    shareLinkInput.setSelectionRange(0, 99999);
    navigator.clipboard.writeText(shareLinkInput.value).then(() => {
      copyFeedback.classList.remove('hidden');
      setTimeout(() => {
        copyFeedback.classList.add('hidden');
      }, 2000);
    }).catch(() => {
      alert('Gagal menyalin link. Silakan salin secara manual.');
    });
  }

  shareBtn.addEventListener('click', openShareModal);
  closeShareModalBtn.addEventListener('click', closeShareModal);
  shareModalBackdrop.addEventListener('click', closeShareModal);
  copyLinkBtn.addEventListener('click', copyLink);

  fetchUser().then(() => {
    fetchProduct();
    updateCartCount();
  });
});