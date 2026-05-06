import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Header } from './components/Header';
import { Studio } from './pages/Studio';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { EditStudio } from './pages/EditStudio';
import { Projects } from './pages/Projects';
import { Admin } from './pages/Admin';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Full-page routes — no global Header */}
          <Route path="/studio/:videoId" element={<EditStudio />} />
          <Route path="/admin"           element={<Admin />} />

          {/* All other pages share the global fixed Header */}
          <Route path="/*" element={
            <>
              <Header />
              <div style={{ paddingTop: '60px' }}>
                <Routes>
                  <Route path="/"         element={<Studio />} />
                  <Route path="/projects" element={<Projects />} />
                  <Route path="/login"    element={<Login />} />
                  <Route path="/signup"   element={<Signup />} />
                </Routes>
              </div>
            </>
          } />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
