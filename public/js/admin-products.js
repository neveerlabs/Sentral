document.addEventListener('DOMContentLoaded', () => {
  const productsContainer = document.getElementById('productsContainer');
  const addBtn = document.getElementById('addProductBtn');
  const modal = document.getElementById('productModal');
  const modalTitle = document.getElementById('modalTitle');
  const productForm = document.getElementById('productForm');
  const cancelBtn = document.getElementById('cancelBtn');
  const closeModalBtn = document.getElementById('closeModalBtn');
  const modalBackdrop = document.getElementById('modalBackdrop');
  const loadingOverlay = document.getElementById('loadingOverlay');
  let currentProductId = null;

  const fetchAPI = (url, options = {}) => {
    options.credentials = 'include';
    return fetch(url, options);
  };

  let categories = [];

  async function loadCategoriesForAdmin() {
    try {
      const res = await fetchAPI('/api/categories');
      categories = await res.json();
      renderCategoryList(categories);
    } catch (err) {
      console.error('Failed to load categories for admin', err);
    }
  }

  function renderCategoryList(categories) {
    const container = document.getElementById('categoriesList');
    if (!container) return;
    if (!categories.length) {
      container.innerHTML = '<p class="text-center text-gray-500 py-4">Belum ada kategori. Klik tombol tambah.</p>';
      return;
    }
    container.innerHTML = categories.map(cat => `
    <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
      <div class="flex items-center gap-3">
        <img src="${cat.image_url}" alt="${cat.name}" class="w-12 h-12 rounded-full object-cover">
        <span class="font-medium text-gray-800">${escapeHtml(cat.name)}</span>
      </div>
      <div class="flex gap-2">
        <button data-id="${cat.id}" data-name="${escapeHtml(cat.name)}" data-image="${cat.image_url}" class="edit-category-btn text-blue-600 hover:text-blue-800 transition">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </button>
        <button data-id="${cat.id}" class="delete-category-btn text-red-600 hover:text-red-800 transition">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  `).join('');

    document.querySelectorAll('.edit-category-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const name = btn.dataset.name;
        const image = btn.dataset.image;
        openCategoryEditModal(id, name, image);
      });
    });
    document.querySelectorAll('.delete-category-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        if (confirm('Yakin hapus kategori ini? Produk dalam kategori ini akan kehilangan kategori.')) {
          showLoading(true);
          const res = await fetchAPI(`/api/categories/${id}`, { method: 'DELETE' });
          if (res.ok) {
            await loadCategoriesForAdmin();
            await loadCategories();
            alert('Kategori berhasil dihapus');
          } else {
            alert('Gagal menghapus kategori');
          }
          showLoading(false);
        }
      });
    });
  }

  function openCategoryEditModal(id, name, imageUrl) {
    document.getElementById('categoryId').value = id;
    document.getElementById('categoryName').value = name;
    const preview = document.getElementById('categoryImagePreview');
    preview.innerHTML = `<img src="${imageUrl}" class="w-24 h-24 object-cover rounded-md shadow">`;
    document.getElementById('categoryImage').value = '';
    document.getElementById('categoryFormTitle').innerText = 'Edit Kategori';
    document.getElementById('categoryFormModal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  function openCategoryAddModal() {
    document.getElementById('categoryId').value = '';
    document.getElementById('categoryName').value = '';
    document.getElementById('categoryImagePreview').innerHTML = '';
    document.getElementById('categoryImage').value = '';
    document.getElementById('categoryFormTitle').innerText = 'Tambah Kategori';
    document.getElementById('categoryFormModal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  async function submitCategoryForm(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const id = document.getElementById('categoryId').value;
    let url = '/api/categories';
    let method = 'POST';
    if (id) {
      url = `/api/categories/${id}`;
      method = 'PUT';
    }
    showLoading(true);
    try {
      const res = await fetchAPI(url, { method, body: formData });
      if (res.ok) {
        closeCategoryFormModal();
        await loadCategoriesForAdmin();
        await loadCategories();
        alert(id ? 'Kategori berhasil diupdate' : 'Kategori berhasil ditambahkan');
      } else {
        const err = await res.json();
        alert(err.error || 'Gagal menyimpan kategori');
      }
    } catch (err) {
      alert('Terjadi kesalahan');
    } finally {
      showLoading(false);
    }
  }

  function closeCategoryFormModal() {
    document.getElementById('categoryFormModal').classList.add('hidden');
    document.body.style.overflow = '';
  }

  async function checkAdminAndLoad() {
    try {
      const res = await fetchAPI('/api/user');
      const data = await res.json();
      if (!data.loggedIn || data.user.role !== 'admin') {
        window.location.href = '/id/login.html';
        return;
      }
      await loadCategories();
      loadProducts();
    } catch (err) {
      console.error('Auth check failed', err);
      window.location.href = '/id/login.html';
    }
  }

  async function loadCategories() {
    try {
      const res = await fetchAPI('/api/categories');
      const categories = await res.json();
      const select = document.getElementById('category');
      select.innerHTML = '<option value="">-- Pilih Kategori --</option>';
      categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.id;
        option.textContent = cat.name;
        select.appendChild(option);
      });
    } catch (err) {
      console.error('Failed to load categories', err);
    }
  }

  async function loadProducts() {
    showLoading(true);
    try {
      const res = await fetchAPI('/api/products');
      const products = await res.json();
      renderProducts(products);
    } catch (err) {
      console.error(err);
      productsContainer.innerHTML = '<p class="text-center text-red-500 col-span-full">Gagal memuat produk.</p>';
    } finally {
      showLoading(false);
    }
  }

  function renderProducts(products) {
    if (!productsContainer) return;
    const emptyState = document.getElementById('emptyState');
    if (!products.length) {
      productsContainer.innerHTML = '';
      if (emptyState) emptyState.classList.remove('hidden');
      return;
    }
    if (emptyState) emptyState.classList.add('hidden');
    productsContainer.innerHTML = '';
    products.forEach(product => {
      const finalPrice = product.discount ? (product.price * (100 - product.discount) / 100).toFixed(0) : product.price;
      const card = document.createElement('div');
      card.className = 'product-card bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100';
      card.innerHTML = `
        <div class="relative h-48 bg-gray-100">
          <img src="${product.images[0]}" alt="${product.name}" class="w-full h-full object-cover" onerror="this.src='https://via.placeholder.com/400?text=No+Image'">
          ${product.stock <= 0 ? '<span class="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">Habis</span>' : ''}
          ${product.discount ? `<span class="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">-${product.discount}%</span>` : ''}
        </div>
        <div class="p-4">
          <h3 class="font-bold text-lg text-gray-800 line-clamp-1">${escapeHtml(product.name)}</h3>
          <p class="text-gray-500 text-sm mt-1 line-clamp-2">${escapeHtml(product.description || '')}</p>
          <div class="mt-3 flex justify-between items-center">
            <div>
              ${product.discount ? `
                <span class="text-gray-400 line-through text-sm">Rp ${parseFloat(product.price).toLocaleString()}</span>
                <span class="text-orange-500 font-bold ml-2">Rp ${parseFloat(finalPrice).toLocaleString()}</span>
              ` : `
                <span class="text-orange-500 font-bold">Rp ${parseFloat(product.price).toLocaleString()}</span>
              `}
            </div>
            <span class="text-gray-500 text-sm">Stok: ${product.stock}</span>
          </div>
          ${product.video_url ? `<a href="${product.video_url}" target="_blank" class="inline-flex items-center gap-1 text-blue-500 text-sm mt-2 hover:underline">▶ Lihat Video</a>` : ''}
          <div class="mt-4 flex gap-2">
            <button data-id="${product.id}" data-name="${escapeHtml(product.name)}" data-desc="${escapeHtml(product.description || '')}" data-price="${product.price}" data-stock="${product.stock}" data-images='${JSON.stringify(product.images)}' data-video="${product.video_url || ''}" data-category="${product.category_id || ''}" data-discount="${product.discount || ''}" data-size="${product.size || ''}" data-quality="${product.quality || ''}" data-color="${product.color || ''}" class="edit-btn flex-1 bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition text-sm font-medium">Edit</button>
            <button data-id="${product.id}" class="delete-btn flex-1 bg-red-50 text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-100 transition text-sm font-medium">Hapus</button>
          </div>
        </div>
      `;
      productsContainer.appendChild(card);
    });

    document.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const name = btn.dataset.name;
        const desc = btn.dataset.desc;
        const price = btn.dataset.price;
        const stock = btn.dataset.stock;
        const images = JSON.parse(btn.dataset.images);
        const video = btn.dataset.video;
        const categoryId = btn.dataset.category;
        const discount = btn.dataset.discount;
        const size = btn.dataset.size;
        const quality = btn.dataset.quality;
        const color = btn.dataset.color;
        openEditModal(id, name, desc, price, stock, images, video, categoryId, discount, size, quality, color);
      });
    });
    document.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        if (confirm('Yakin hapus produk ini? Tindakan ini tidak dapat dibatalkan.')) {
          showLoading(true);
          const res = await fetchAPI(`/api/products/${id}`, { method: 'DELETE' });
          if (res.ok) {
            await loadProducts();
          } else {
            alert('Gagal menghapus produk.');
          }
          showLoading(false);
        }
      });
    });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function (m) {
      if (m === '&') return '&amp;';
      if (m === '<') return '&lt;';
      if (m === '>') return '&gt;';
      return m;
    });
  }

  let imagePreviews = [];

  function addImagePreview(url) {
    const previewContainer = document.getElementById('imagePreview');
    const wrapper = document.createElement('div');
    wrapper.className = 'relative inline-block mr-2 mb-2';
    wrapper.innerHTML = `
      <img src="${url}" class="w-20 h-20 object-cover rounded-md shadow">
      <button type="button" class="remove-image-btn absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600">×</button>
      <input type="hidden" name="existingImages" value="${url}">
    `;
    wrapper.querySelector('.remove-image-btn').addEventListener('click', () => {
      wrapper.remove();
      imagePreviews = imagePreviews.filter(img => img !== url);
    });
    previewContainer.appendChild(wrapper);
    imagePreviews.push(url);
  }

  function openEditModal(id, name, desc, price, stock, images, videoUrl, categoryId, discount, size, quality, color) {
    currentProductId = id;
    modalTitle.innerText = 'Edit Produk';
    document.getElementById('productId').value = id;
    document.getElementById('name').value = name;
    document.getElementById('description').value = desc;
    document.getElementById('price').value = price;
    document.getElementById('stock').value = stock;
    document.getElementById('category').value = categoryId || '';
    document.getElementById('discount').value = discount || '';
    document.getElementById('size').value = size || '';
    document.getElementById('quality').value = quality || '';
    document.getElementById('color').value = color || '';

    const imagePreviewDiv = document.getElementById('imagePreview');
    imagePreviewDiv.innerHTML = '';
    imagePreviews = [];
    images.forEach(img => addImagePreview(img));

    const videoPreview = document.getElementById('videoPreview');
    if (videoUrl) {
      videoPreview.innerHTML = `<video src="${videoUrl}" controls class="w-24 h-24 object-cover rounded-md shadow"></video>`;
    } else {
      videoPreview.innerHTML = '';
    }
    document.getElementById('images').value = '';
    document.getElementById('video').value = '';
    openModal();
  }

  function openAddModal() {
    currentProductId = null;
    modalTitle.innerText = 'Tambah Produk';
    productForm.reset();
    document.getElementById('productId').value = '';
    document.getElementById('imagePreview').innerHTML = '';
    document.getElementById('videoPreview').innerHTML = '';
    document.getElementById('category').value = '';
    document.getElementById('discount').value = '';
    document.getElementById('size').value = '';
    document.getElementById('quality').value = '';
    document.getElementById('color').value = '';
    imagePreviews = [];
    openModal();
  }

  function openModal() {
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    modal.classList.add('hidden');
    document.body.style.overflow = '';
  }

  async function submitForm(e) {
    e.preventDefault();
    const formData = new FormData(productForm);
    const id = document.getElementById('productId').value;
    let url = '/api/products';
    let method = 'POST';
    if (id) {
      url = `/api/products/${id}`;
      method = 'PUT';
    }
    showLoading(true);
    try {
      const res = await fetchAPI(url, { method, body: formData });
      if (res.ok) {
        closeModal();
        await loadProducts();
      } else {
        const error = await res.json();
        alert(error.error || 'Gagal menyimpan produk.');
      }
    } catch (err) {
      alert('Terjadi kesalahan. Coba lagi.');
    } finally {
      showLoading(false);
    }
  }

  function showLoading(show) {
    if (loadingOverlay) {
      loadingOverlay.classList.toggle('hidden', !show);
    }
  }

  addBtn.addEventListener('click', openAddModal);
  cancelBtn.addEventListener('click', closeModal);
  closeModalBtn.addEventListener('click', closeModal);
  modalBackdrop.addEventListener('click', closeModal);
  productForm.addEventListener('submit', submitForm);

  document.getElementById('manageCategoriesBtn')?.addEventListener('click', () => {
    document.getElementById('categoryModal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    loadCategoriesForAdmin();
  });
  document.getElementById('closeCategoryModalBtn')?.addEventListener('click', () => {
    document.getElementById('categoryModal').classList.add('hidden');
    document.body.style.overflow = '';
  });
  document.getElementById('addCategoryBtn')?.addEventListener('click', openCategoryAddModal);
  document.getElementById('closeCategoryFormBtn')?.addEventListener('click', closeCategoryFormModal);
  document.getElementById('cancelCategoryFormBtn')?.addEventListener('click', closeCategoryFormModal);
  document.getElementById('categoryForm')?.addEventListener('submit', submitCategoryForm);
  document.getElementById('categoryModalBackdrop')?.addEventListener('click', () => {
    document.getElementById('categoryModal').classList.add('hidden');
    document.body.style.overflow = '';
  });
  document.getElementById('categoryFormBackdrop')?.addEventListener('click', closeCategoryFormModal);

  const logoutBtn = document.getElementById('logoutBtnAdmin');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await fetchAPI('/api/logout', { method: 'POST' });
      window.location.href = '/';
    });
  }

  checkAdminAndLoad();

  // ========== PREVIEW UNTUK UPLOAD GAMBAR DAN VIDEO ==========
  const imagesInput = document.getElementById('images');
  const videoInput = document.getElementById('video');

  function previewImages(files) {
    const previewContainer = document.getElementById('imagePreview');
    // Hanya preview file baru, tidak menghapus existing (karena existing sudah ditambahkan via hidden inputs)
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith('image/')) continue;
      const reader = new FileReader();
      reader.onload = function(e) {
        const wrapper = document.createElement('div');
        wrapper.className = 'relative inline-block mr-2 mb-2';
        wrapper.innerHTML = `
          <img src="${e.target.result}" class="w-20 h-20 object-cover rounded-md shadow">
          <button type="button" class="remove-temp-image-btn absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600">×</button>
        `;
        wrapper.querySelector('.remove-temp-image-btn').addEventListener('click', () => {
          wrapper.remove();
        });
        previewContainer.appendChild(wrapper);
      };
      reader.readAsDataURL(file);
    }
  }

  function previewVideo(file) {
    const videoPreview = document.getElementById('videoPreview');
    if (file && file.type.startsWith('video/')) {
      const url = URL.createObjectURL(file);
      videoPreview.innerHTML = `
        <video controls class="w-24 h-24 object-cover rounded-md shadow">
          <source src="${url}" type="${file.type}">
        </video>
      `;
    } else {
      videoPreview.innerHTML = '';
    }
  }

  imagesInput.addEventListener('change', function() {
    previewImages(this.files);
  });
  videoInput.addEventListener('change', function() {
    if (this.files.length) previewVideo(this.files[0]);
    else document.getElementById('videoPreview').innerHTML = '';
  });
});