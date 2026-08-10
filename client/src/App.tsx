import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { GamificationProvider } from './context/GamificationContext';
import { NotificationsProvider } from './context/NotificationsContext';
import { HomeContentProvider } from './context/HomeContentContext';
import { ToastProvider } from './components/ui/Toast';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import UnderConstruction from './components/UnderConstruction';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Problems from './pages/Problems';
import ProblemDetail from './pages/ProblemDetail';
import ProblemForm from './pages/ProblemForm';
import Submissions from './pages/Submissions';
import Leaderboard from './pages/Leaderboard';
import Progress from './pages/Progress';
import PublicProfile from './pages/PublicProfile';
import Favourites from './pages/Favourites';
import Settings from './pages/Settings';
import NotificationsPage from './pages/Notifications';
import Resources from './pages/Resources';
import ResourceDetail from './pages/ResourceDetail';
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminSubmissions from './pages/admin/AdminSubmissions';
import AdminProblems from './pages/admin/AdminProblems';
import AdminHomeCms from './pages/admin/AdminHomeCms';
import AdminResourcesCms from './pages/admin/AdminResourcesCms';
import AdminGamification from './pages/admin/AdminGamification';
import AdminAudit from './pages/admin/AdminAudit';
import NotFound from './pages/NotFound';

export default function App() {
  return (
    <AuthProvider>
      <GamificationProvider>
        <NotificationsProvider>
        <HomeContentProvider>
        <ToastProvider>
          <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              {/* public */}
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/problems" element={<Problems />} />
              <Route path="/problems/:id" element={<ProblemDetail />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route path="/u/:username" element={<PublicProfile />} />
              <Route path="/resources" element={<Resources />} />
              <Route path="/resources/:slug" element={<ResourceDetail />} />
              {/* Footer "Company" destinations. Real pages rather than dead links —
                  but deliberately empty: inventing a Privacy Policy or Terms of
                  Service would be worse than admitting they aren't written. */}
              <Route path="/about" element={<UnderConstruction page="About Us" step="a later step" />} />
              <Route path="/privacy" element={<UnderConstruction page="Privacy Policy" step="a later step" />} />
              <Route path="/terms" element={<UnderConstruction page="Terms of Service" step="a later step" />} />

              {/* signed-in only */}
              <Route element={<ProtectedRoute />}>
                <Route path="/submissions" element={<Submissions />} />
                <Route path="/progress" element={<Progress />} />
                <Route path="/favourites" element={<Favourites />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/notifications" element={<NotificationsPage />} />
              </Route>

              {/* admin only */}
              <Route element={<ProtectedRoute adminOnly />}>
                <Route path="/problems/new" element={<ProblemForm />} />
                <Route path="/problems/:id/edit" element={<ProblemForm />} />
                <Route path="/admin" element={<AdminLayout />}>
                  <Route index element={<AdminDashboard />} />
                  <Route path="users" element={<AdminUsers />} />
                  <Route path="submissions" element={<AdminSubmissions />} />
                  <Route path="problems" element={<AdminProblems />} />
                  <Route path="home" element={<AdminHomeCms />} />
                  <Route path="resources" element={<AdminResourcesCms />} />
                  <Route path="gamification" element={<AdminGamification />} />
                  <Route path="audit" element={<AdminAudit />} />
                </Route>
              </Route>

              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
          </BrowserRouter>
        </ToastProvider>
        </HomeContentProvider>
        </NotificationsProvider>
      </GamificationProvider>
    </AuthProvider>
  );
}
