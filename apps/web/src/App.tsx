import { Routes, Route, Navigate } from 'react-router-dom';
import HomePage from './pages/HomePage';
import WorkspacePage from './pages/WorkspacePage';
import LoginPage from './pages/LoginPage';

function RequireAuth({ children }: { children: JSX.Element }) {
  const isAuth = sessionStorage.getItem('hr-concierge-auth') === 'true';
  return isAuth ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<RequireAuth><HomePage /></RequireAuth>} />
      <Route path="/workspace" element={<RequireAuth><WorkspacePage /></RequireAuth>} />
    </Routes>
  );
}
