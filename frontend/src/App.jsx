import { useState, useEffect } from 'react';
import Login from './Login';
import Kasir from './Kasir';
import Laporan from './Laporan';

function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('kasir'); // State halaman ('kasir' / 'laporan')

  // Load user dari localStorage pas aplikasi pertama kali dibuka
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
      }
    }
  }, []);

  // Handler pas Login Berhasil
  const handleLoginSuccess = (data) => {
    const userData = data.user || data;
    const token = data.token || 'dummy-token';

    // Simpen ke State & LocalStorage biar gak ilang pas di-refresh
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('token', token);
  };

  // Handler Logout
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setView('kasir');
  };

  if (!user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-slate-100 font-sans">
      {/* Top Navbar Navigasi */}
      <nav className="bg-slate-900 text-slate-200 px-6 py-3 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-6">
          <span className="font-bold text-lg text-white tracking-wide">POS System</span>
          
          <div className="flex gap-2">
            <button
              onClick={() => setView('kasir')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                view === 'kasir'
                  ? 'bg-blue-600 text-white'
                  : 'hover:bg-slate-800 text-slate-300'
              }`}
            >
              Kasir / Transaksi
            </button>
            <button
              onClick={() => setView('laporan')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                view === 'laporan'
                  ? 'bg-blue-600 text-white'
                  : 'hover:bg-slate-800 text-slate-300'
              }`}
            >
              Laporan Penjualan
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-xs text-slate-400">
            Halo, <strong className="text-white">{user.username}</strong> ({user.role || 'Kasir'})
          </span>
          <button
            onClick={handleLogout}
            className="bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer"
          >
            Logout
          </button>
        </div>
      </nav>

      {/* Main Content View */}
      <main>
        {view === 'kasir' ? (
          <Kasir user={user} onLogout={handleLogout} />
        ) : (
          <Laporan onBack={() => setView('kasir')} />
        )}
      </main>
    </div>
  );
}

export default App;