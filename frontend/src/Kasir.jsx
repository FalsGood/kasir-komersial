import { useState, useEffect } from 'react';
import axios from 'axios';

export default function Kasir({ user, onLogout }) {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [paidAmount, setPaidAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');

  // Load produk dari Backend
  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/products');
      setProducts(res.data.data);
    } catch (err) {
      alert('Gagal mengambil data produk');
    }
  };

  // Tambah barang ke keranjang
  const addToCart = (product) => {
    const existing = cart.find((item) => item.product_id === product.id);
    if (existing) {
      if (existing.quantity >= product.stock) {
        return alert('Stok produk tidak mencukupi!');
      }
      setCart(
        cart.map((item) =>
          item.product_id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      if (product.stock < 1) return alert('Stok habis!');
      setCart([
        ...cart,
        {
          product_id: product.id,
          name: product.name,
          price: product.price,
          quantity: 1,
        },
      ]);
    }
  };

  // Hitung total belanjaan
  const totalAmount = cart.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0
  );

  // Handle Checkout
  const handleCheckout = async () => {
    if (cart.length === 0) return alert('Keranjang masih kosong!');
    if (Number(paidAmount) < totalAmount)
      return alert('Uang pembayaran kurang!');

    try {
      const payload = {
        user_id: user?.id || 1, // Otomatis ambil ID dari user yang sedang login
        payment_method: paymentMethod,
        paid_amount: Number(paidAmount),
        items: cart.map((item) => ({
          product_id: item.product_id,
          quantity: item.quantity,
        })),
      };

      const res = await axios.post(
        'http://localhost:5000/api/transactions',
        payload
      );
      alert(`Transaksi Berhasil! Kembalian: Rp ${res.data.data.change_amount}`);

      // Reset Form & Reload Produk
      setCart([]);
      setPaidAmount('');
      fetchProducts();
    } catch (err) {
      alert(err.response?.data?.message || 'Transaksi Gagal');
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      {/* BAR HEADER USER & LOGOUT */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          padding: '12px 20px',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          border: '1px solid #e9ecef',
        }}
      >
        <span>
          Kasir Bertugas: <strong>{user?.username || 'Kasir'}</strong> (
          {user?.role || 'kasir'})
        </span>
        <button
          onClick={onLogout}
          style={{
            padding: '6px 12px',
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Logout
        </button>
      </div>

      <div style={{ display: 'flex', gap: '20px' }}>
        {/* SISI KIRI: KATALOG PRODUK */}
        <div style={{ flex: 2 }}>
          <h2>Katalog Produk</h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '10px',
            }}
          >
            {products.map((p) => (
              <div
                key={p.id}
                onClick={() => addToCart(p)}
                style={{
                  border: '1px solid #ccc',
                  padding: '10px',
                  cursor: 'pointer',
                  borderRadius: '8px',
                }}
              >
                <h4>{p.name}</h4>
                <p>Rp {p.price.toLocaleString()}</p>
                <small>Stok: {p.stock}</small>
              </div>
            ))}
          </div>
        </div>

        {/* SISI KANAN: KERANJANG & BAYAR */}
        <div
          style={{
            flex: 1,
            borderLeft: '2px solid #ddd',
            paddingLeft: '20px',
          }}
        >
          <h2>Keranjang Belanja</h2>
          {cart.map((item) => (
            <div
              key={item.product_id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '10px',
              }}
            >
              <span>
                {item.name} (x{item.quantity})
              </span>
              <span>Rp {(item.price * item.quantity).toLocaleString()}</span>
            </div>
          ))}

          <hr />
          <h3>Total: Rp {totalAmount.toLocaleString()}</h3>

          <div style={{ marginTop: '15px' }}>
            <label>Metode Pembayaran: </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
            >
              <option value="cash">Tunai (Cash)</option>
              <option value="qris">QRIS</option>
              <option value="ewallet">E-Wallet</option>
            </select>
          </div>

          <div style={{ marginTop: '10px' }}>
            <label>Uang Diterima: </label>
            <input
              type="number"
              value={paidAmount}
              onChange={(e) => setPaidAmount(e.target.value)}
              placeholder="Masukkan nominal"
            />
          </div>

          <button
            onClick={handleCheckout}
            style={{
              marginTop: '20px',
              width: '100%',
              padding: '10px',
              backgroundColor: 'green',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
            }}
          >
            BAYAR SEKARANG
          </button>
        </div>
      </div>
    </div>
  );
}