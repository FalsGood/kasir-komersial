import { useState, useEffect } from 'react';
import axios from 'axios';

export default function Laporan({ onBack }) {
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/transactions');
      setTransactions(res.data.data);
    } catch (err) {
      alert('Gagal mengambil data riwayat transaksi');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 p-6 font-sans">
      <div className="mb-6 flex items-center justify-between rounded-xl bg-white p-4 shadow-sm border border-slate-200">
        <h1 className="text-xl font-bold text-slate-800">Laporan Penjualan</h1>
        <button
          onClick={onBack}
          className="rounded-lg bg-slate-500 px-4 py-2 text-sm font-medium text-white hover:bg-slate-600 transition"
        >
          Kembali ke Kasir
        </button>
      </div>

      <div className="overflow-hidden rounded-xl bg-white shadow-sm border border-slate-200">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50 text-slate-800 border-b border-slate-200">
            <tr>
              <th className="p-4 font-semibold">No. Struk</th>
              <th className="p-4 font-semibold">Tanggal</th>
              <th className="p-4 font-semibold">Kasir</th>
              <th className="p-4 font-semibold">Metode</th>
              <th className="p-4 font-semibold">Total Belanja</th>
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 ? (
              <tr>
                <td colSpan="5" className="p-4 text-center text-slate-400">Belum ada transaksi.</td>
              </tr>
            ) : (
              transactions.map((trx) => (
                <tr key={trx.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="p-4 font-medium text-blue-600">{trx.receipt_number}</td>
                  <td className="p-4">{new Date(trx.created_at).toLocaleString('id-ID')}</td>
                  <td className="p-4">{trx.kasir_name}</td>
                  <td className="p-4 uppercase">{trx.payment_method}</td>
                  <td className="p-4 font-bold text-slate-700">Rp {trx.total_amount.toLocaleString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}