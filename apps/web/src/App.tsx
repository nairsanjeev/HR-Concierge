import { Routes, Route, Navigate } from 'react-router-dom';
import HomePage from './pages/HomePage';
import HRPortalPage from './pages/HRPortalPage';
import TabConfigPage from './pages/TabConfigPage';
import WorkspacePage from './pages/WorkspacePage';
import LoginPage from './pages/LoginPage';
import ArchitecturePage from './pages/ArchitecturePage';
import DemoScriptPage from './pages/DemoScriptPage';

function RequireAuth({ children }: { children: JSX.Element }) {
  const isAuth = sessionStorage.getItem('hr-concierge-auth') === 'true';
  return isAuth ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<HomePage />} />
      <Route path="/portal" element={<HRPortalPage />} />
      <Route path="/tab-config" element={<TabConfigPage />} />
      <Route path="/workspace" element={<RequireAuth><WorkspacePage /></RequireAuth>} />
      <Route path="/architecture" element={<ArchitecturePage />} />
      <Route path="/demo-script" element={<DemoScriptPage />} />
    </Routes>
  );
}
