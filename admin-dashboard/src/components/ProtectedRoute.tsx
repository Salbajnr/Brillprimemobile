
import React from 'react';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string[];
  requiredPermission?: string;
}

export function ProtectedRoute({ 
  children, 
  requiredRole = [], 
  requiredPermission 
}: ProtectedRouteProps) {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated || !user) {
    return null;
  }

  // Check role requirements
  if (requiredRole.length > 0 && !requiredRole.includes(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600">You don't have permission to access this resource.</p>
        </div>
      </div>
    );
  }

  // Check permission requirements
  if (requiredPermission && !user.permissions.includes(requiredPermission) && user.role !== 'SUPER_ADMIN') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Permission Required</h1>
          <p className="text-gray-600">You need the '{requiredPermission}' permission to access this resource.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
