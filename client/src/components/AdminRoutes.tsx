
import { Route, Switch, Redirect } from 'wouter';
import { AdminLogin } from '../pages/admin-login';
import { AdminDashboard } from '../pages/admin-dashboard';
import { AdminLayout } from './admin-layout';
import { useAdmin } from '../lib/admin-auth';

export function AdminRoutes() {
  const { isAuthenticated, isLoading } = useAdmin();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/login" component={AdminLogin} />
        <Route path="*">
          <Redirect to="/login" />
        </Route>
      </Switch>
    );
  }

  return (
    <AdminLayout>
      <Switch>
        <Route path="/dashboard" component={AdminDashboard} />
        <Route path="/login" component={AdminLogin} />
        <Route path="/">
          <Redirect to="/dashboard" />
        </Route>
        <Route path="*">
          <Redirect to="/dashboard" />
        </Route>
      </Switch>
    </AdminLayout>
  );
}
