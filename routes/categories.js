const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { isAdmin } = require('../middlewares/auth');

const categoryStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../public/uploads/categories');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'cat-' + uniqueSuffix + ext);
  }
});

const categoryFileFilter = (req, file, cb) => {
  const imageTypes = /jpeg|jpg|png|gif/;
  const extname = path.extname(file.originalname).toLowerCase();
  if (imageTypes.test(extname)) {
    return cb(null, true);
  }
  cb(new Error('Only images are allowed'));
};

const uploadCategory = multer({
  storage: categoryStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: categoryFileFilter
});

router.get('/', async (req, res) => {
  try {
    const pool = req.app.get('db');
    const [rows] = await pool.query('SELECT * FROM categories ORDER BY name');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', isAdmin, uploadCategory.single('image'), async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Category name is required' });
    if (!req.file) return res.status(400).json({ error: 'Category image is required' });
    const imageUrl = '/uploads/categories/' + req.file.filename;
    const pool = req.app.get('db');
    const [result] = await pool.query(
      'INSERT INTO categories (name, image_url) VALUES (?, ?)',
      [name, imageUrl]
    );
    res.status(201).json({ id: result.insertId, name, image_url: imageUrl });
  } catch (err) {
    console.error(err);
    if (req.file) fs.unlinkSync(req.file.path);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', isAdmin, uploadCategory.single('image'), async (req, res) => {
  try {
    const categoryId = req.params.id;
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Category name is required' });
    const pool = req.app.get('db');
    const [rows] = await pool.query('SELECT * FROM categories WHERE id = ?', [categoryId]);
    if (rows.length === 0) return res.status(404).json({ error: 'Category not found' });
    const oldCategory = rows[0];
    let imageUrl = oldCategory.image_url;
    if (req.file) {
      if (oldCategory.image_url) {
        const oldImagePath = path.join(__dirname, '../public', oldCategory.image_url);
        if (fs.existsSync(oldImagePath)) fs.unlinkSync(oldImagePath);
      }
      imageUrl = '/uploads/categories/' + req.file.filename;
    }
    await pool.query(
      'UPDATE categories SET name = ?, image_url = ? WHERE id = ?',
      [name, imageUrl, categoryId]
    );
    res.json({ id: categoryId, name, image_url: imageUrl });
  } catch (err) {
    console.error(err);
    if (req.file) fs.unlinkSync(req.file.path);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', isAdmin, async (req, res) => {
  try {
    const categoryId = req.params.id;
    const pool = req.app.get('db');
    const [rows] = await pool.query('SELECT * FROM categories WHERE id = ?', [categoryId]);
    if (rows.length === 0) return res.status(404).json({ error: 'Category not found' });
    const category = rows[0];
    if (category.image_url) {
      const imagePath = path.join(__dirname, '../public', category.image_url);
      if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
    }
    await pool.query('UPDATE products SET category_id = NULL WHERE category_id = ?', [categoryId]);
    await pool.query('DELETE FROM categories WHERE id = ?', [categoryId]);
    res.json({ message: 'Category deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;