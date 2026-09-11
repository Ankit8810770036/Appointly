import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

/**
 * A wrapper for routes that require authentication and optionally a specific role.
 * - Unauthenticated users → redirected to /login (with return URL saved in state)
 * - Wrong-role users → redirected to their own correct dashboard
 */
export default function ProtectedRoute({ children, requiredRole }) {
    const { isAuthenticated, user } = useAuth();
    const location = useLocation();

    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (requiredRole && user?.role?.toLowerCase() !== requiredRole.toLowerCase()) {
        const userRole = user?.role?.toLowerCase();
        let correctDashboard = '/dashboard/client';
        if (userRole === 'provider') correctDashboard = '/dashboard/provider';
        else if (userRole === 'admin') correctDashboard = '/dashboard/admin';

        return <Navigate to={correctDashboard} replace />;
    }

    return children;
}
