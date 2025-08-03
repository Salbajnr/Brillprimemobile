import React from 'react';
import { useAdmin } from '../lib/admin-auth';

interface AdminProtectedRouteProps {
  children: React.ReactNode;
}

export function AdminProtectedRoute({ children }: AdminProtectedRouteProps) {
  const { isAuthenticated } = useAdmin();

  if (!isAuthenticated) {
    return null; // This will be handled by the parent component showing AdminLogin
  }

  return <>{children}</>;
}