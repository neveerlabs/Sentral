# Sentral Plastik

E-commerce modern untuk toko plastik dengan autentikasi Google dan MySQL.

## Setup

### 1. Prasyarat
- Node.js (v16+)
- MySQL (v5.7+)

### 2. Konfigurasi Database

Buat database baru, dengan nama `sentral_plastik`, lalu jalankan SQL berikut:

```sql
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  google_id VARCHAR(255) UNIQUE,
  profile_picture TEXT,
  role ENUM('user', 'admin') DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  image_url VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  stock INT NOT NULL DEFAULT 0,
  image_url VARCHAR(255) NOT NULL,
  video_url VARCHAR(255),
  category_id INT,
  discount INT DEFAULT NULL COMMENT 'Discount percentage (0-100)',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

CREATE TABLE sessions (
  session_id VARCHAR(128) PRIMARY KEY,
  expires INT UNSIGNED NOT NULL,
  data TEXT
);
```

### 3. Konfigurasi Environment
Salin file `.env.example` menjadi `.env` dan isi dengan kredensial Anda:
```env
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=sentral_plastik
SESSION_SECRET=rahasia123
ADMIN_USERNAME=admin
ADMIN_PASSWORD=salmanaja
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback
```

### 4. Instalasi Dependensi:
```bash
npm install
```

### 5. Menjalankan Aplikasi
Mode development (auto-reload):
```bash
npm run dev
```
Mode production:
```bash
npm start
```

Aplikasi akan berjalan di `http://localhost:3000`

---

### Catatan
* Pastikan server MySQL berjalan sebelum menjalankan aplikasi.
* Untuk login dengan Google, buat OAuth 2.0 Client ID di `Google Cloud Console` dan tambahkan domain `http://localhost:3000` ke authorized redirect URIs.
* Upload file (gambar/video) akan disimpan di folder `public/uploads/` Pastikan folder tersebut memiliki hak akses tulis.

---

### Halaman
* beranda:
```bash
http://localhost:3000
```
* Admin Panel:
```bash
http://localhost:3000/admin/products.html
```
> *Catatan: sudah login dengan akun role admin.*