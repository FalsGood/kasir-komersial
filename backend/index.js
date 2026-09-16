// File: backend/index.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const db = require('./config/db');

const app = express();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
// Middleware
app.use(cors());
app.use(express.json()); // Biar bisa baca req.body format JSON

// ==========================================
// API CRUD PRODUCTS
// ==========================================
app.get('/', (req, res) => {
    res.send('Welcome to API Kasir Komersial!');
});
// 1. READ - Ambil semua produk
app.get('/api/products', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM products ORDER BY id DESC');
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 2. CREATE - Tambah produk baru
app.post('/api/products', async (req, res) => {
    const { sku, name, price, stock } = req.body;
    try {
        const [result] = await db.query(
            'INSERT INTO products (sku, name, price, stock) VALUES (?, ?, ?, ?)',
            [sku, name, price, stock]
        );
        res.status(201).json({ success: true, message: 'Produk berhasil ditambahkan', id: result.insertId });
    } catch (error) {
        // Handle error kalau SKU duplikat
        if(error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ success: false, message: 'SKU sudah terdaftar!' });
        }
        res.status(500).json({ success: false, message: error.message });
    }
});

// 3. UPDATE - Edit data produk
app.put('/api/products/:id', async (req, res) => {
    const { id } = req.params;
    const { sku, name, price, stock } = req.body;
    try {
        await db.query(
            'UPDATE products SET sku=?, name=?, price=?, stock=? WHERE id=?',
            [sku, name, price, stock, id]
        );
        res.json({ success: true, message: 'Produk berhasil diupdate' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 4. DELETE - Hapus produk
app.delete('/api/products/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM products WHERE id=?', [id]);
        res.json({ success: true, message: 'Produk berhasil dihapus' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ==========================================
// API AUTHENTICATION (LOGIN & REGISTER)
// ==========================================

// 1. REGISTER - Bikin akun baru (Biasanya cuma Admin yang bisa akses ini nanti)
app.post('/api/register', async (req, res) => {
    const { username, password, role } = req.body;
    
    try {
        // Enkripsi password (di-hash 10 kali putaran)
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Simpan ke database
        const [result] = await db.query(
            'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
            [username, hashedPassword, role || 'kasir']
        );
        
        res.status(201).json({ success: true, message: 'User berhasil didaftarkan!' });
    } catch (error) {
        if(error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ success: false, message: 'Username sudah dipakai!' });
        }
        res.status(500).json({ success: false, message: error.message });
    }
});

// 2. LOGIN - Validasi masuk aplikasi
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    
    try {
        // Cari user di database
        const [users] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
        if (users.length === 0) {
            return res.status(401).json({ success: false, message: 'Username tidak ditemukan!' });
        }
        
        const user = users[0];
        
        // Cocokkan password yang diketik dengan yang ada di database
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Password salah!' });
        }
        
        // Buat Token JWT (berlaku 1 hari)
        const token = jwt.sign(
            { id: user.id, role: user.role }, 
            process.env.JWT_SECRET, 
            { expiresIn: '1d' }
        );
        
        // Kirim respon sukses ke frontend
        res.json({
            success: true,
            message: 'Login berhasil!',
            token: token,
            user: {
                username: user.username,
                role: user.role
            }
        });
        
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ==========================================
// START SERVER
// ==========================================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`✅ Server backend jalan di http://localhost:${PORT}`);
});