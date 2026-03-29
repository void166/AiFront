import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Header } from './components/Header';
import { Studio } from './pages/Studio';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { EditStudio } from './pages/EditStudio';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Edit Studio has its own full-page header — no global Header */}
          <Route path="/studio/:videoId" element={<EditStudio />} />

          {/* All other pages share the global Header */}
          <Route path="/*" element={
            <>
              <Header />
              <Routes>
                <Route path="/"       element={<Studio />} />
                <Route path="/login"  element={<Login />} />
                <Route path="/signup" element={<Signup />} />
              </Routes>
            </>
          } />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
