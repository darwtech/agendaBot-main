import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from 'sonner';
import { ThemeSync } from './components/ThemeSync';
import { AdminPage } from './pages/AdminPage';
import { ClientChatPage } from './pages/ClientChatPage';
import { SettingsPage } from './pages/SettingsPage';
import { routerBasename } from './lib/tenant';

export default function App() {
  return (
    <BrowserRouter basename={routerBasename}>
      <ThemeSync />
      <Toaster position="top-right" richColors closeButton />
      <Routes>
        <Route path="/" element={<ClientChatPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/admin/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
