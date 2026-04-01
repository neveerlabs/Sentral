document.addEventListener('DOMContentLoaded', () => {
  const cartContent = document.getElementById('cartContent');
  const userTabsDiv = document.getElementById('userTabs');
  const adminTabsDiv = document.getElementById('adminTabs');
  const tabCart = document.getElementById('tabCart');
  const tabOrders = document.getElementById('tabOrders');
  let currentUser = null;
  let isAdmin = false;
  let activeAdminTab = 'pending';
  let whatsappNumber = '';

  const statusModal = document.getElementById('statusModal');
  const modalOrderIdSpan = document.getElementById('modalOrderId');
  const statusSelect = document.getElementById('statusSelect');
  let currentOrderId = null;

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

  function getCart() {
    const cart = localStorage.getItem('cart');
    return cart ? JSON.parse(cart) : [];
  }

  function saveCart(cart) {
    localStorage.setItem('cart', JSON.stringify(cart));
  }

  function updateCartCount() {
    const cartCountSpan = document.getElementById('cartCount');
    if (!cartCountSpan) return;
    const cart = getCart();
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    if (totalItems > 0) {
      cartCountSpan.textContent = totalItems;
      cartCountSpan.classList.remove('hidden');
    } else {
      cartCountSpan.classList.add('hidden');
    }
  }

  async function fetchUser() {
    const res = await fetch('/api/user', { credentials: 'include' });
    const data = await res.json();
    if (data.loggedIn) {
      currentUser = data.user;
      isAdmin = currentUser.role === 'admin';
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
    } else {
      currentUser = null;
      isAdmin = false;
    }
    if (isAdmin) {
      localStorage.removeItem('cart');
      updateCartCount();
    }
  }

  function formatRupiah(amount) {
    return 'Rp ' + parseFloat(amount).toLocaleString();
  }

  function renderCartTab() {
    const cart = getCart();
    if (!cart.length) {
      cartContent.innerHTML = `
        <div class="empty-cart flex flex-col items-center justify-center py-16 text-center">
          <svg class="w-20 h-20 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/>
          </svg>
          <p class="text-gray-500">Keranjang Anda kosong</p>
          <a href="/" class="mt-4 inline-flex items-center gap-2 bg-orange-500 text-white px-5 py-2 rounded-full text-sm hover:bg-orange-600 transition">Mulai Belanja</a>
        </div>
      `;
      return;
    }

    let itemsHtml = '';
    let total = 0;
    cart.forEach((item, index) => {
      const finalPrice = item.discount ? (item.price * (100 - item.discount) / 100) : item.price;
      const subtotal = finalPrice * item.quantity;
      total += subtotal;

      itemsHtml += `
        <div class="cart-item p-4 flex flex-wrap items-center gap-4">
          <input type="checkbox" class="item-checkbox w-5 h-5 text-orange-500 rounded" data-index="${index}" checked>
          <img src="${item.image_url}" alt="${item.name}" class="w-20 h-20 object-cover rounded-xl bg-gray-50">
          <div class="flex-1 min-w-[150px]">
            <h3 class="font-medium text-gray-800">${escapeHtml(item.name)}</h3>
            <div class="text-sm mt-1">
              ${item.discount ? `
                <span class="text-gray-400 line-through">${formatRupiah(item.price)}</span>
                <span class="text-orange-500 font-semibold ml-2">${formatRupiah(finalPrice)}</span>
                <span class="ml-1 text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">-${item.discount}%</span>
              ` : `
                <span class="text-orange-500 font-semibold">${formatRupiah(item.price)}</span>
              `}
            </div>
          </div>
          <div class="flex items-center gap-3">
            <button class="quantity-btn decrement" data-index="${index}">−</button>
            <span class="w-8 text-center text-gray-700">${item.quantity}</span>
            <button class="quantity-btn increment" data-index="${index}">+</button>
            <button class="remove-btn text-red-400 hover:text-red-600 ml-2" data-index="${index}">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
            </button>
          </div>
          <div class="text-right font-medium text-gray-700 w-24">
            ${formatRupiah(subtotal)}
          </div>
        </div>
      `;
    });

    const paymentMethods = `
      <div class="payment-method bg-gray-50 rounded-xl p-5 mt-6">
        <h3 class="text-sm font-medium text-gray-700 mb-3">Metode Pembayaran</h3>
        <div class="space-y-2">
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="radio" name="payment_method" value="COD" class="payment-radio" checked>
            <span class="text-sm text-gray-700">COD (Bayar di Tempat)</span>
          </label>
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="radio" name="payment_method" value="Transfer" class="payment-radio">
            <span class="text-sm text-gray-700">Transfer Bank / Dana / GoPay</span>
          </label>
        </div>
        <p class="text-xs text-gray-500 mt-3">* Untuk pembayaran transfer, hubungi admin via WhatsApp setelah checkout.</p>
        <a href="https://wa.me/${whatsappNumber}" target="_blank" class="inline-flex items-center gap-1 text-green-600 hover:text-green-700 text-xs mt-2">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
          Hubungi Admin via WhatsApp
        </a>
      </div>
    `;

    cartContent.innerHTML = `
      <div class="bg-white rounded-xl shadow-sm">
        <div class="divide-y divide-gray-100">
          ${itemsHtml}
        </div>
        <div class="p-5 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div class="text-lg font-semibold text-gray-800">Total terpilih: <span id="selectedTotal" class="text-orange-500">${formatRupiah(total)}</span></div>
          <button id="checkoutBtn" class="checkout-btn px-6 py-2.5 text-sm">Checkout</button>
        </div>
        ${paymentMethods}
      </div>
    `;

    const checkboxes = document.querySelectorAll('.item-checkbox');
    const updateSelectedTotal = () => {
      let selectedTotal = 0;
      document.querySelectorAll('.item-checkbox:checked').forEach(cb => {
        const idx = parseInt(cb.dataset.index);
        const item = cart[idx];
        const finalPrice = item.discount ? (item.price * (100 - item.discount) / 100) : item.price;
        selectedTotal += finalPrice * item.quantity;
      });
      document.getElementById('selectedTotal').innerText = formatRupiah(selectedTotal);
    };
    checkboxes.forEach(cb => cb.addEventListener('change', updateSelectedTotal));

    document.querySelectorAll('.increment').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.index);
        const newCart = [...cart];
        newCart[idx].quantity += 1;
        saveCart(newCart);
        renderCartTab();
        updateCartCount();
      });
    });
    document.querySelectorAll('.decrement').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.index);
        const newCart = [...cart];
        if (newCart[idx].quantity > 1) {
          newCart[idx].quantity -= 1;
        } else {
          newCart.splice(idx, 1);
        }
        saveCart(newCart);
        renderCartTab();
        updateCartCount();
      });
    });
    document.querySelectorAll('.remove-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.index);
        const newCart = [...cart];
        newCart.splice(idx, 1);
        saveCart(newCart);
        renderCartTab();
        updateCartCount();
      });
    });

    const checkoutBtn = document.getElementById('checkoutBtn');
    if (checkoutBtn) {
      checkoutBtn.addEventListener('click', async () => {
        const selectedItems = [];
        document.querySelectorAll('.item-checkbox:checked').forEach(cb => {
          const idx = parseInt(cb.dataset.index);
          selectedItems.push(cart[idx]);
        });
        if (selectedItems.length === 0) {
          alert('Pilih minimal satu produk untuk checkout.');
          return;
        }
        const paymentMethod = document.querySelector('input[name="payment_method"]:checked').value;
        if (!paymentMethod) {
          alert('Pilih metode pembayaran.');
          return;
        }
        if (!currentUser) {
          alert('Silakan login terlebih dahulu.');
          window.location.href = '/id/login.html';
          return;
        }
        if (isAdmin) {
          alert('Admin tidak dapat melakukan checkout.');
          return;
        }

        const res = await fetch('/api/orders/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: selectedItems, payment_method: paymentMethod }),
          credentials: 'include'
        });
        const data = await res.json();
        if (data.success) {
          const remainingCart = cart.filter(item => !selectedItems.some(sel => sel.id === item.id));
          saveCart(remainingCart);
          updateCartCount();
          alert('Checkout berhasil! Pesanan Anda telah disimpan.');
          renderCartTab();
          document.getElementById('tabOrders').click();
        } else {
          alert('Checkout gagal: ' + (data.error || 'Terjadi kesalahan'));
        }
      });
    }
  }

  async function renderOrdersTab() {
    cartContent.innerHTML = `<div class="flex justify-center py-12"><svg class="animate-spin h-8 w-8 text-orange-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg></div>`;
    try {
      const res = await fetch('/api/orders/my', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch orders');
      const orders = await res.json();

      if (!orders.length) {
        cartContent.innerHTML = `
          <div class="empty-cart flex flex-col items-center justify-center py-16 text-center">
            <svg class="w-20 h-20 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            <p class="text-gray-500">Anda belum memiliki pesanan.</p>
          </div>
        `;
        return;
      }

      const statusMap = {
        pending: 'Menunggu Konfirmasi',
        processing: 'Diproses',
        shipped: 'Dalam Perjalanan',
        cancelled: 'Dibatalkan',
        delivered: 'Diterima'
      };
      const statusClass = {
        pending: 'status-pending',
        processing: 'status-processing',
        shipped: 'status-shipped',
        cancelled: 'status-cancelled',
        delivered: 'status-delivered'
      };

      let ordersHtml = '';
      for (const order of orders) {
        const date = new Date(order.order_date).toLocaleString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        ordersHtml += `
          <div class="order-card">
            <div class="order-header flex flex-col sm:flex-row justify-between gap-2">
              <div>
                <span class="font-semibold text-gray-800">Pesanan #${order.id}</span>
                <span class="text-sm text-gray-500 ml-2">${date}</span>
                <span class="ml-2 status-badge ${statusClass[order.status] || 'status-pending'}">${statusMap[order.status] || order.status}</span>
              </div>
              <div class="text-sm text-gray-600">
                <span>Metode: ${order.payment_method || '-'}</span>
                <span class="ml-4 font-medium text-orange-500">Total: ${formatRupiah(order.total_price)}</span>
              </div>
            </div>
            <div class="order-items">
              ${order.items.map(item => `
                <div class="order-item">
                  <img src="${item.image_url}" alt="${item.name}" onerror="this.src='https://via.placeholder.com/60?text=No+Image'">
                  <div class="order-item-details">
                    <div class="order-item-name">${escapeHtml(item.name)}</div>
                    <div class="order-item-price">
                      ${item.discount ? `
                        <span class="line-through text-gray-400">${formatRupiah(item.price)}</span>
                        <span class="ml-2">${formatRupiah((item.price * (100 - item.discount) / 100))}</span>
                        <span class="text-xs bg-red-100 text-red-600 px-1 rounded ml-1">-${item.discount}%</span>
                      ` : formatRupiah(item.price)}
                    </div>
                    <div class="order-item-quantity">Jumlah: ${item.quantity}</div>
                  </div>
                  <div class="text-right font-medium text-gray-700">${formatRupiah(item.subtotal)}</div>
                </div>
              `).join('')}
            </div>
            <div class="p-4 border-t border-gray-100 flex justify-end">
              <a href="https://wa.me/${whatsappNumber}" target="_blank" class="inline-flex items-center gap-1 text-green-600 hover:text-green-700 text-sm">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                Hubungi Admin via WhatsApp
              </a>
            </div>
          </div>
        `;
      }
      cartContent.innerHTML = `<div class="space-y-4">${ordersHtml}</div>`;
    } catch (err) {
      console.error(err);
      cartContent.innerHTML = '<div class="text-center text-red-500 py-12">Gagal memuat pesanan.</div>';
    }
  }

  async function renderAdminOrdersByStatus(status) {
    cartContent.innerHTML = `<div class="flex justify-center py-12"><svg class="animate-spin h-8 w-8 text-orange-500" ...></svg></div>`;
    try {
      const res = await fetch('/api/orders/admin', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch orders');
      const orders = await res.json();
      const filteredOrders = orders.filter(order => order.status === status);

      if (!filteredOrders.length) {
        cartContent.innerHTML = `
          <div class="empty-cart flex flex-col items-center justify-center py-16 text-center">
            <svg class="w-20 h-20 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            <p class="text-gray-500">Tidak ada pesanan dengan status ini.</p>
          </div>
        `;
        return;
      }

      const statusMap = {
        pending: 'Menunggu Konfirmasi',
        processing: 'Diproses',
        shipped: 'Dalam Perjalanan',
        cancelled: 'Dibatalkan',
        delivered: 'Diterima'
      };
      const statusClass = {
        pending: 'status-pending',
        processing: 'status-processing',
        shipped: 'status-shipped',
        cancelled: 'status-cancelled',
        delivered: 'status-delivered'
      };

      let ordersHtml = '';
      for (const order of filteredOrders) {
        const date = new Date(order.order_date).toLocaleString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        ordersHtml += `
          <div class="order-card" data-order-id="${order.id}">
            <div class="order-header flex flex-col sm:flex-row justify-between gap-2">
              <div>
                <span class="font-semibold text-gray-800">Pesanan #${order.id}</span>
                <span class="text-sm text-gray-500 ml-2">${date}</span>
                <span class="ml-2 status-badge ${statusClass[order.status] || 'status-pending'}">${statusMap[order.status] || order.status}</span>
              </div>
              <div class="text-sm text-gray-600">
                <span>Pelanggan: ${escapeHtml(order.user_name)} (${escapeHtml(order.user_email)})</span>
                <span class="ml-4 font-medium text-orange-500">Total: ${formatRupiah(order.total_price)}</span>
              </div>
            </div>
            <div class="order-items">
              ${order.items.map(item => `
                <div class="order-item">
                  <img src="${item.image_url}" alt="${item.name}" onerror="this.src='https://via.placeholder.com/60?text=No+Image'">
                  <div class="order-item-details">
                    <div class="order-item-name">${escapeHtml(item.name)}</div>
                    <div class="order-item-price">
                      ${item.discount ? `
                        <span class="line-through text-gray-400">${formatRupiah(item.price)}</span>
                        <span class="ml-2">${formatRupiah((item.price * (100 - item.discount) / 100))}</span>
                        <span class="text-xs bg-red-100 text-red-600 px-1 rounded ml-1">-${item.discount}%</span>
                      ` : formatRupiah(item.price)}
                    </div>
                    <div class="order-item-quantity">Jumlah: ${item.quantity}</div>
                  </div>
                  <div class="text-right font-medium text-gray-700">${formatRupiah(item.subtotal)}</div>
                </div>
              `).join('')}
            </div>
            <div class="p-4 border-t border-gray-100 flex justify-end">
              <button class="update-status-btn bg-orange-500 hover:bg-orange-600 text-black px-4 py-1.5 rounded-lg text-sm transition" data-order-id="${order.id}">Update Status</button>
            </div>
          </div>
        `;
      }
      cartContent.innerHTML = `<div class="space-y-4">${ordersHtml}</div>`;

      document.querySelectorAll('.update-status-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const orderId = parseInt(btn.dataset.orderId);
          currentOrderId = orderId;
          modalOrderIdSpan.innerText = `#${orderId}`;
          const order = filteredOrders.find(o => o.id === orderId);
          if (order) statusSelect.value = order.status;
          statusModal.classList.remove('hidden');
          document.body.style.overflow = 'hidden';
        });
      });
    } catch (err) {
      console.error(err);
      cartContent.innerHTML = '<div class="text-center text-red-500 py-12">Gagal memuat pesanan.</div>';
    }
  }

  function closeStatusModal() {
    statusModal.classList.add('hidden');
    document.body.style.overflow = '';
    currentOrderId = null;
  }

  async function confirmStatusUpdate() {
    if (!currentOrderId) return;
    const newStatus = statusSelect.value;
    const res = await fetch(`/api/orders/${currentOrderId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
      credentials: 'include'
    });
    if (res.ok) {
      closeStatusModal();
      await renderAdminOrdersByStatus(activeAdminTab);
    } else {
      alert('Gagal memperbarui status');
    }
  }

  function buildAdminTabs() {
    const tabs = [
      { key: 'pending', label: 'Pesanan' },
      { key: 'processing', label: 'Dalam proses' },
      { key: 'shipped', label: 'Diperjalanan' },
      { key: 'cancelled', label: 'Dibatalkan' },
      { key: 'delivered', label: 'Diterima' }
    ];
    adminTabsDiv.innerHTML = '';
    const container = document.createElement('div');
    container.className = 'admin-tabs-container';
    tabs.forEach(tab => {
      const btn = document.createElement('button');
      btn.className = `admin-tab-btn ${activeAdminTab === tab.key ? 'active' : ''}`;
      btn.textContent = tab.label;
      btn.dataset.status = tab.key;
      btn.addEventListener('click', async () => {
        document.querySelectorAll('.admin-tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeAdminTab = tab.key;
        await renderAdminOrdersByStatus(activeAdminTab);
      });
      container.appendChild(btn);
    });
    adminTabsDiv.appendChild(container);
    adminTabsDiv.classList.remove('hidden');
  }

  function switchUserTab(tab) {
    if (tab === 'cart') {
      tabCart.classList.add('active');
      tabOrders.classList.remove('active');
      renderCartTab();
    } else {
      tabOrders.classList.add('active');
      tabCart.classList.remove('active');
      renderOrdersTab();
    }
  }

  async function init() {
    await fetchWhatsappNumber();
    await fetchUser();
    if (isAdmin) {
      userTabsDiv.classList.add('hidden');
      buildAdminTabs();
      await renderAdminOrdersByStatus(activeAdminTab);
    } else {
      userTabsDiv.classList.remove('hidden');
      adminTabsDiv.classList.add('hidden');
      tabCart.classList.add('active');
      renderCartTab();
    }
  }

  document.getElementById('closeStatusModalBtn')?.addEventListener('click', closeStatusModal);
  document.getElementById('cancelStatusBtn')?.addEventListener('click', closeStatusModal);
  document.getElementById('confirmStatusBtn')?.addEventListener('click', confirmStatusUpdate);
  document.getElementById('statusModalBackdrop')?.addEventListener('click', closeStatusModal);

  if (!isAdmin) {
    tabCart.addEventListener('click', () => switchUserTab('cart'));
    tabOrders.addEventListener('click', () => switchUserTab('orders'));
  }

  init();

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, m => {
      if (m === '&') return '&amp;';
      if (m === '<') return '&lt;';
      if (m === '>') return '&gt;';
      return m;
    });
  }
});