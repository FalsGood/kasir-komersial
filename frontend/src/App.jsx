import { useState, useEffect } from 'react';
import Login from './Login';
import Kasir from './Kasir';
import Laporan from './Laporan';

function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('kasir'); // State untuk atur halaman (kasir / laporan)

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    
    if (savedUser && token) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <div>
      {!user ? (
        <Login onLoginSuccess={(userData) => setUser(userData)} />
      ) : view === 'kasir' ? (
        <div>
          {/* Tambahin tombol ke laporan di atas atau passing via props, kita bungkus navigasi kecil disini */}
          <div className="bg-slate-800 text-white p-2 flex justify-end gap-4 pr-6">
            <button onClick={() => setView('laporan')} className="text-sm hover:text-blue-300">Lihat Laporan</button>
          </div>
          <Kasir user={user} onLogout={handleLogout} />
        </div>
      ) : (
        <Laporan onBack={() => setView('kasir')} />
      )}
    </div>
  );
}

export default App;