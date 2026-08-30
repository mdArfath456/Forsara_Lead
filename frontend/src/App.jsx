import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppLayout } from './components/AppLayout';
import { RequireAuth } from './routes/RequireAuth';

import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import SearchLeadsPage from './pages/SearchLeadsPage';
import ProjectsPage from './pages/ProjectsPage';
import LeadManagementPage from './pages/LeadManagementPage';
import MapPage from './pages/MapPage';
import AnalyticsPage from './pages/AnalyticsPage';
import SavedAlertsPage from './pages/SavedAlertsPage';
import ExportPage from './pages/ExportPage';
import SettingsPage from './pages/SettingsPage';

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route
          element={
            <RequireAuth>
              <AppLayout />
            </RequireAuth>
          }
        >
          <Route path="/" element={<DashboardPage />} />
          <Route path="/search" element={<SearchLeadsPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/leads" element={<LeadManagementPage />} />
          <Route path="/map" element={<MapPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/alerts" element={<SavedAlertsPage />} />
          <Route path="/export" element={<ExportPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
