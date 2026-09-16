import { useState, useEffect } from 'react';
import Login from './Login';
import Kasir from './Kasir';

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Cek apakah ada session tersimpan di browser
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
      ) : (
        <Kasir user={user} onLogout={handleLogout} />
      )}
    </div>
  );
}

export default App;