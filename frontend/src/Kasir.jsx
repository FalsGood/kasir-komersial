import { useState, useEffect } from 'react';
import axios from 'axios';

export default function Kasir({ user, onLogout }) {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [paidAmount, setPaidAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [receiptData, setReceiptData] = useState(null); // State simpan data struk

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

  const addToCart = (product) => {
    const existing = cart.find((item) => item.product_id === product.id);
    if (existing) {
      if (existing.quantity >= product.stock) return alert('Stok produk tidak mencukupi!');
      setCart(
        cart.map((item) =>
          item.product_id === product.id ? { ...item, quantity: item.quantity + 1 } : item
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

  const totalAmount = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);

  const handleCheckout = async () => {
    if (cart.length === 0) return alert('Keranjang masih kosong!');
    if (Number(paidAmount) < totalAmount) return alert('Uang pembayaran kurang!');

    try {
      const payload = {
        user_id: user?.id || 1,
        payment_method: paymentMethod,
        paid_amount: Number(paidAmount),
        items: cart.map((item) => ({
          product_id: item.product_id,
          quantity: item.quantity,
        })),
      };

      const res = await axios.post('http://localhost:5000/api/transactions', payload);
      
      // Simpan rincian untuk struk sebelum keranjang di-reset
      setReceiptData({
        receipt_number: res.data.data.receipt_number,
        items: [...cart],
        total_amount: totalAmount,
        paid_amount: Number(paidAmount),
        change_amount: res.data.data.change_amount,
        payment_method: paymentMethod,
        date: new Date().toLocaleString('id-ID'),
        kasir: user?.username || 'Kasir',
      });

      setCart([]);
      setPaidAmount('');
      fetchProducts();
    } catch (err) {
      alert(err.response?.data?.message || 'Transaksi Gagal');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 p-6 font-sans">
      {/* NAVBAR HEADER */}
      <header className="mb-6 flex items-center justify-between rounded-xl bg-white p-4 shadow-sm border border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-800">POS System</h1>
          <p className="text-xs text-slate-500">
            Kasir Bertugas: <span className="font-semibold text-slate-700">{user?.username}</span> ({user?.role})
          </p>
        </div>
        <button
          onClick={onLogout}
          className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 transition"
        >
          Logout
        </button>
      </header>

      {/* MAIN CONTENT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* KATALOG PRODUK */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-bold text-slate-700">Katalog Produk</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {products.map((p) => (
              <div
                key={p.id}
                onClick={() => addToCart(p)}
                className="group flex flex-col justify-between rounded-xl bg-white p-4 shadow-sm border border-slate-200 cursor-pointer hover:border-blue-500 transition"
              >
                <div>
                  <h3 className="font-semibold text-slate-800 group-hover:text-blue-600">{p.name}</h3>
                  <p className="mt-1 text-sm font-bold text-slate-600">Rp {p.price.toLocaleString()}</p>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${p.stock > 5 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    Stok: {p.stock}
                  </span>
                  <span className="text-xs text-blue-500 font-medium">+ Tambah</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* KERANJANG */}
        <div className="rounded-xl bg-white p-5 shadow-sm border border-slate-200 flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-700 border-b pb-3 mb-4">Keranjang Belanja</h2>
            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {cart.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">Keranjang masih kosong</p>
              ) : (
                cart.map((item) => (
                  <div key={item.product_id} className="flex justify-between items-center text-sm border-b border-slate-100 pb-2">
                    <div>
                      <p className="font-medium text-slate-800">{item.name}</p>
                      <p className="text-xs text-slate-400">x{item.quantity} @ Rp {item.price.toLocaleString()}</p>
                    </div>
                    <span className="font-semibold text-slate-700">Rp {(item.price * item.quantity).toLocaleString()}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-6 border-t border-slate-200 pt-4 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-slate-500">Total Bayar</span>
              <span className="text-xl font-extrabold text-blue-600">Rp {totalAmount.toLocaleString()}</span>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Metode Pembayaran</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full rounded-lg border border-slate-300 p-2.5 text-sm bg-white"
              >
                <option value="cash">Tunai (Cash)</option>
                <option value="qris">QRIS</option>
                <option value="ewallet">E-Wallet</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Nominal Diterima</label>
              <input
                type="number"
                value={paidAmount}
                onChange={(e) => setPaidAmount(e.target.value)}
                placeholder="0"
                className="w-full rounded-lg border border-slate-300 p-2.5 text-sm"
              />
            </div>

            <button
              onClick={handleCheckout}
              className="w-full rounded-lg bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition"
            >
              BAYAR SEKARANG
            </button>
          </div>
        </div>
      </div>

      {/* MODAL POPUP STRUK BELANJA */}
      {receiptData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-2xl space-y-4 font-mono text-xs">
            <div className="text-center border-b pb-3">
              <h2 className="text-base font-bold text-slate-800 uppercase">Toko Kelontong Komersial</h2>
              <p className="text-slate-500">No: {receiptData.receipt_number}</p>
              <p className="text-slate-500">{receiptData.date}</p>
              <p className="text-slate-500">Kasir: {receiptData.kasir}</p>
            </div>

            <div className="space-y-2 border-b pb-3">
              {receiptData.items.map((item) => (
                <div key={item.product_id} className="flex justify-between">
                  <span>{item.name} x{item.quantity}</span>
                  <span>Rp {(item.price * item.quantity).toLocaleString()}</span>
                </div>
              ))}
            </div>

            <div className="space-y-1 border-b pb-3">
              <div className="flex justify-between font-bold text-slate-800">
                <span>TOTAL</span>
                <span>Rp {receiptData.total_amount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>BAYAR ({receiptData.payment_method.toUpperCase()})</span>
                <span>Rp {receiptData.paid_amount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>KEMBALI</span>
                <span>Rp {receiptData.change_amount.toLocaleString()}</span>
              </div>
            </div>

            <p className="text-center text-slate-400">--- Terima Kasih ---</p>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => window.print()}
                className="flex-1 bg-emerald-600 text-white font-sans font-semibold py-2 rounded-lg hover:bg-emerald-700"
              >
                Cetak Struk
              </button>
              <button
                onClick={() => setReceiptData(null)}
                className="flex-1 bg-slate-200 text-slate-700 font-sans font-semibold py-2 rounded-lg hover:bg-slate-300"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}