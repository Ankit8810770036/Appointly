import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { SocketProvider } from './context/SocketContext';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import { Toaster } from 'sonner';
import LoadingFallback from './components/ui/LoadingFallback/LoadingFallback';
import ProtectedRoute from './components/auth/ProtectedRoute';
import './App.css';

// Immediate primary import for instant Home page load
import Home from './pages/Home/Home';

// Lazy-loaded secondary routes (code-split)
const Login = lazy(() => import('./pages/Auth/Login'));
const Signup = lazy(() => import('./pages/Auth/Signup'));
const ForgotPassword = lazy(() => import('./pages/Auth/ForgotPassword'));
const ProviderProfile = lazy(() => import('./pages/ProviderProfile/ProviderProfile'));
const ClientDashboard = lazy(() => import('./pages/ClientDashboard/ClientDashboard'));
const ProviderDashboard = lazy(() => import('./pages/ProviderDashboard/ProviderDashboard'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard/AdminDashboard'));
const Terms = lazy(() => import('./pages/Legal/Terms'));
const Privacy = lazy(() => import('./pages/Legal/Privacy'));
const About = lazy(() => import('./pages/About/About'));
const Contact = lazy(() => import('./pages/Contact/Contact'));
const NotFound = lazy(() => import('./pages/NotFound/NotFound'));

// Preloader helper to warm up secondary route bundles in background
function prefetchSecondaryRoutes() {
  const prefetchers = [
    () => import('./pages/Auth/Login'),
    () => import('./pages/Auth/Signup'),
    () => import('./pages/ProviderProfile/ProviderProfile'),
    () => import('./pages/ClientDashboard/ClientDashboard'),
    () => import('./pages/ProviderDashboard/ProviderDashboard'),
  ];

  prefetchers.forEach((loader, index) => {
    setTimeout(() => {
      loader().catch(() => {});
    }, 1200 + index * 400);
  });
}

function BookRedirect() {
  const { providerId } = useParams();
  return <Navigate to={`/provider/${providerId}`} replace />;
}

function ProfileRedirect() {
  const { user, isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  const role = user?.role?.toUpperCase();
  if (role === 'PROVIDER') return <Navigate to={`/provider/${user.id}`} replace />;
  if (role === 'ADMIN') return <Navigate to="/dashboard/admin" replace />;
  return <Navigate to="/dashboard/client" replace />;
}

function DashboardRedirect() {
  const { user, isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  const role = user?.role?.toUpperCase();
  if (role === 'PROVIDER') return <Navigate to="/dashboard/provider" replace />;
  if (role === 'ADMIN') return <Navigate to="/dashboard/admin" replace />;
  return <Navigate to="/dashboard/client" replace />;
}

function App() {
  useEffect(() => {
    // Once the initial render is complete and browser is idle, silently prefetch other routes
    if ('requestIdleCallback' in window) {
      const handle = window.requestIdleCallback(() => {
        prefetchSecondaryRoutes();
      }, { timeout: 2500 });
      return () => window.cancelIdleCallback?.(handle);
    } else {
      const timer = setTimeout(prefetchSecondaryRoutes, 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'placeholder-client-id';

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <ThemeProvider>
        <LanguageProvider>
          <AuthProvider>
            <Toaster position="top-right" richColors />
            <SocketProvider>
              <Router>
                <Suspense fallback={<LoadingFallback />}>
                  <Routes>
                    <Route path="/" element={<Home />} />

                    {/* Provider Profile & Direct Booking */}
                    <Route path="/provider/:id" element={<ProviderProfile />} />
                    <Route path="/providers/:id" element={<ProviderProfile />} />
                    <Route path="/profile" element={<ProfileRedirect />} />
                    <Route path="/book/:providerId" element={<BookRedirect />} />

                    {/* Role-Specific Dashboards */}
                    <Route path="/dashboard" element={<DashboardRedirect />} />

                    {/* Specific Dashboards */}
                    <Route
                      path="/dashboard/client"
                      element={
                        <ProtectedRoute requiredRole="client">
                          <ClientDashboard />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/dashboard/provider"
                      element={
                        <ProtectedRoute requiredRole="provider">
                          <ProviderDashboard />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/dashboard/admin"
                      element={
                        <ProtectedRoute requiredRole="admin">
                          <AdminDashboard />
                        </ProtectedRoute>
                      }
                    />

                    {/* Auth & Static Pages */}
                    <Route path="/login" element={<Login />} />
                    <Route path="/signup" element={<Signup />} />
                    <Route path="/forgot-password" element={<ForgotPassword />} />
                    <Route path="/terms" element={<Terms />} />
                    <Route path="/privacy" element={<Privacy />} />
                    <Route path="/about" element={<About />} />
                    <Route path="/contact" element={<Contact />} />

                    {/* 404 Catch-All Route */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </Router>
            </SocketProvider>
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
