const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { isAdmin } = require('../middlewares/auth');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../public/uploads');
    if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const fileFilter = (req, file, cb) => {
  const imageTypes = /jpeg|jpg|png|gif|webp|bmp|tiff|svg/;
  const videoTypes = /mp4|mov|avi|mkv|webm/;
  const extname = path.extname(file.originalname).toLowerCase();
  const mimetype = file.mimetype.toLowerCase();

  if (file.fieldname === 'images') {
    if (imageTypes.test(extname) || mimetype.startsWith('image/')) {
      return cb(null, true);
    }
    console.error(`Rejected image file: ${file.originalname} (ext: ${extname}, mime: ${mimetype})`);
    cb(new Error('Only images are allowed for images field. Supported: jpg, jpeg, png, gif, webp, bmp, tiff, svg'));
  } else if (file.fieldname === 'video') {
    if (videoTypes.test(extname) || mimetype.startsWith('video/')) {
      return cb(null, true);
    }
    console.error(`Rejected video file: ${file.originalname} (ext: ${extname}, mime: ${mimetype})`);
    cb(new Error('Only video files are allowed for video field. Supported: mp4, mov, avi, mkv, webm'));
  } else {
    cb(new Error('Unexpected field'));
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: fileFilter
});

const uploadFields = upload.fields([
  { name: 'images', maxCount: 10 },
  { name: 'video', maxCount: 1 }
]);

router.get('/', async (req, res) => {
  try {
    const pool = req.app.get('db');
    const { category } = req.query;
    let query = `
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
    `;
    let params = [];
    if (category) {
      query += ' WHERE p.category_id = ?';
      params.push(category);
    }
    query += ' ORDER BY p.created_at DESC';
    const [rows] = await pool.query(query, params);
    const products = rows.map(p => ({
      ...p,
      images: p.images ? p.images.split(',') : (p.image_url ? [p.image_url] : [])
    }));
    res.json(products);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const pool = req.app.get('db');
    const [rows] = await pool.query('SELECT * FROM products WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Product not found' });
    const product = rows[0];
    product.images = product.images ? product.images.split(',') : (product.image_url ? [product.image_url] : []);
    res.json(product);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', isAdmin, uploadFields, async (req, res) => {
  try {
    const { name, description, price, stock, category_id, discount, size, quality, color, existingImages } = req.body;
    if (!name || !price || !stock) {
      return res.status(400).json({ error: 'Name, price and stock are required' });
    }

    let imageUrls = [];
    if (req.files.images) {
      imageUrls = req.files.images.map(file => '/uploads/' + file.filename);
    }
    if (existingImages) {
      const existingArray = Array.isArray(existingImages) ? existingImages : [existingImages];
      imageUrls.push(...existingArray);
    }
    if (imageUrls.length === 0) {
      return res.status(400).json({ error: 'At least one image is required' });
    }

    let videoUrl = null;
    if (req.files.video) {
      videoUrl = '/uploads/' + req.files.video[0].filename;
    }

    const imagesStr = imageUrls.join(',');
    const pool = req.app.get('db');
    const [result] = await pool.query(
      `INSERT INTO products 
       (name, description, price, stock, images, video_url, category_id, discount, size, quality, color)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, description, price, stock, imagesStr, videoUrl, category_id || null, discount || null, size || null, quality || null, color || null]
    );
    res.status(201).json({ id: result.insertId, images: imageUrls, videoUrl });
  } catch (err) {
    console.error(err);
    if (req.files.images) req.files.images.forEach(f => fs.unlinkSync(f.path));
    if (req.files.video) fs.unlinkSync(req.files.video[0].path);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', isAdmin, uploadFields, async (req, res) => {
  try {
    const { name, description, price, stock, category_id, discount, size, quality, color, existingImages } = req.body;
    const productId = req.params.id;

    const pool = req.app.get('db');
    const [rows] = await pool.query('SELECT * FROM products WHERE id = ?', [productId]);
    if (rows.length === 0) return res.status(404).json({ error: 'Product not found' });
    const oldProduct = rows[0];

    let imageUrls = [];
    if (existingImages) {
      const existingArray = Array.isArray(existingImages) ? existingImages : [existingImages];
      imageUrls.push(...existingArray);
    }
    if (req.files.images) {
      const newImages = req.files.images.map(file => '/uploads/' + file.filename);
      imageUrls.push(...newImages);
    }
    if (imageUrls.length === 0) {
      return res.status(400).json({ error: 'At least one image is required' });
    }

    let videoUrl = oldProduct.video_url;
    if (req.files.video) {
      if (oldProduct.video_url) {
        const oldVideoPath = path.join(__dirname, '../public', oldProduct.video_url);
        if (fs.existsSync(oldVideoPath)) fs.unlinkSync(oldVideoPath);
      }
      videoUrl = '/uploads/' + req.files.video[0].filename;
    }

    const imagesStr = imageUrls.join(',');
    await pool.query(
      `UPDATE products SET 
       name = ?, description = ?, price = ?, stock = ?, images = ?, video_url = ?,
       category_id = ?, discount = ?, size = ?, quality = ?, color = ?
       WHERE id = ?`,
      [name, description, price, stock, imagesStr, videoUrl, category_id || null, discount || null, size || null, quality || null, color || null, productId]
    );

    const oldImages = oldProduct.images ? oldProduct.images.split(',') : (oldProduct.image_url ? [oldProduct.image_url] : []);
    const keptImages = imageUrls;
    const removedImages = oldImages.filter(img => !keptImages.includes(img));
    for (const imgPath of removedImages) {
      const fullPath = path.join(__dirname, '../public', imgPath);
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    }

    res.json({ message: 'Product updated', images: imageUrls, videoUrl });
  } catch (err) {
    console.error(err);
    if (req.files.images) req.files.images.forEach(f => fs.unlinkSync(f.path));
    if (req.files.video) fs.unlinkSync(req.files.video[0].path);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', isAdmin, async (req, res) => {
  try {
    const pool = req.app.get('db');
    const [rows] = await pool.query('SELECT * FROM products WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Product not found' });
    const product = rows[0];

    const images = product.images ? product.images.split(',') : (product.image_url ? [product.image_url] : []);
    for (const imgPath of images) {
      const fullPath = path.join(__dirname, '../public', imgPath);
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    }
    if (product.video_url) {
      const videoPath = path.join(__dirname, '../public', product.video_url);
      if (fs.existsSync(videoPath)) fs.unlinkSync(videoPath);
    }

    await pool.query('DELETE FROM products WHERE id = ?', [req.params.id]);
    res.json({ message: 'Product deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;