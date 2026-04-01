document.addEventListener('DOMContentLoaded', () => {
  const adminLoginTab = document.getElementById('tabAdminLogin');
  const userLoginTab = document.getElementById('tabUserLogin');
  const adminLoginForm = document.getElementById('adminLoginForm');
  const userLoginForm = document.getElementById('userLoginForm');
  const adminLoginBtn = document.getElementById('adminLoginBtn');

  function hideAllForms() {
    adminLoginForm.classList.add('hidden');
    userLoginForm.classList.add('hidden');
  }

  function setActiveTab(tab) {
    [adminLoginTab, userLoginTab].forEach(t => t.classList.remove('border-orange-500', 'text-orange-500'));
    tab.classList.add('border-orange-500', 'text-orange-500');
  }

  adminLoginTab.addEventListener('click', () => {
    hideAllForms();
    adminLoginForm.classList.remove('hidden');
    setActiveTab(adminLoginTab);
  });
  userLoginTab.addEventListener('click', () => {
    hideAllForms();
    userLoginForm.classList.remove('hidden');
    setActiveTab(userLoginTab);
  });

  adminLoginBtn.addEventListener('click', async () => {
    const username = document.getElementById('adminUsername').value.trim();
    const password = document.getElementById('adminPassword').value.trim();
    if (!username || !password) return alert('Isi username dan password');
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
      credentials: 'include'
    });
    if (res.ok) {
      window.location.href = '/';
    } else {
      alert('Login gagal. Username atau password salah.');
    }
  });

  userLoginTab.click();
});