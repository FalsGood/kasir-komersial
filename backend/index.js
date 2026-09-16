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

// Pastikan import mysql pakai /promise di paling atas file backend
// const mysql = require('mysql2/promise');

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // 1. Cek User
    const [rows] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
    if (rows.length === 0) {
      return res.status(401).json({ message: 'Username tidak ditemukan' });
    }

    const user = rows[0];

    // 2. Cek Password (jika pakai bcrypt)
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Password salah' });
    }

    // 3. Return response sukses
    return res.json({
      message: 'Login berhasil',
      data: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    });

  } catch (err) {
    console.error('Error Login:', err);
    // Wajib ada respon di catch biar frontend gak hanging!
    return res.status(500).json({ message: 'Terjadi kesalahan pada server' });
  }
});

// ==========================================
// START SERVER
// ==========================================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`✅ Server backend jalan di http://localhost:${PORT}`);
});
// ==========================================
// API TRANSACTION CHECKOUT (CORE POS)
// ==========================================
app.post('/api/transactions', async (req, res) => {
    const { user_id, payment_method, paid_amount, items } = req.body; 
    // items formatnya nanti: [{ product_id: 1, quantity: 2 }, ...]

    // Buka koneksi khusus untuk transaksi (berbasis pool connection)
    const connection = await db.getConnection();

    try {
        // 1. Mulai MySQL Transaction (ACID)
        await connection.beginTransaction();

        let total_amount = 0;
        const processedItems = [];

        // 2. Validasi stok dan hitung total harga
        for (let item of items) {
            const [rows] = await connection.query(
                'SELECT id, price, stock FROM products WHERE id = ? FOR UPDATE', 
                [item.product_id]
            );

            if (rows.length === 0) {
                throw new Error(`Produk dengan ID ${item.product_id} tidak ditemukan!`);
            }

            const product = rows[0];

            if (product.stock < item.quantity) {
                throw new Error(`Stok tidak cukup untuk produk ID ${item.product_id}. Sisa stok: ${product.stock}`);
            }

            const subtotal = product.price * item.quantity;
            total_amount += subtotal;

            processedItems.push({
                product_id: product.id,
                quantity: item.quantity,
                price_at_transaction: product.price,
                subtotal: subtotal
            });
        }

        // 3. Validasi nominal bayar pelanggan
        if (paid_amount < total_amount) {
            throw new Error('Uang yang dibayarkan kurang dari total belanja!');
        }

        const change_amount = paid_amount - total_amount;
        const receipt_number = 'TRX-' + Date.now(); // Bikin nomor struk unik berdasarkan waktu

        // 4. Masukkan data ke tabel header (transactions)
        const [trxResult] = await connection.query(
            `INSERT INTO transactions (receipt_number, user_id, total_amount, payment_method, paid_amount, change_amount) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [receipt_number, user_id, total_amount, payment_method, paid_amount, change_amount]
        );

        const transaction_id = trxResult.insertId;

        // 5. Masukkan detail barang & kurangi stok produk satu per satu
        for (let item of processedItems) {
            // Masukkan ke transaction_details
            await connection.query(
                `INSERT INTO transaction_details (transaction_id, product_id, quantity, price_at_transaction, subtotal) 
                 VALUES (?, ?, ?, ?, ?)`,
                [transaction_id, item.product_id, item.quantity, item.price_at_transaction, item.subtotal]
            );

            // Potong stok produk di tabel products
            await connection.query(
                `UPDATE products SET stock = stock - ? WHERE id = ?`,
                [item.quantity, item.product_id]
            );
        }

        // 6. Kalau semua aman, commit transaksi permanen ke database!
        await connection.commit();
        connection.release();

        res.status(201).json({
            success: true,
            message: 'Transaksi berhasil!',
            data: {
                receipt_number,
                total_amount,
                paid_amount,
                change_amount
            }
        });

    } catch (error) {
        // Kalau ada error di tengah jalan, batalkan semua perubahan database!
        await connection.rollback();
        connection.release();

        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});
// ==========================================
// API GET RIWAYAT TRANSAKSI
// ==========================================
app.get('/api/transactions', async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT 
                t.id, 
                t.receipt_number, 
                t.total_amount, 
                t.paid_amount, 
                t.change_amount, 
                t.payment_method, 
                t.created_at, 
                u.username AS kasir_name
            FROM transactions t
            JOIN users u ON t.user_id = u.id
            ORDER BY t.created_at DESC
        `);

        res.json({
            success: true,
            data: rows
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});