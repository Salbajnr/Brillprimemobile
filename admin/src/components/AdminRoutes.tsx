
import { Route, Switch, Redirect } from 'wouter';
import { AdminLogin } from '../pages/admin-login';
import { AdminDashboard } from '../pages/admin-dashboard';
import { AdminUserManagement } from '../pages/admin-user-management';
import { AdminSupport } from '../pages/admin-support';
import { AdminTransactions } from '../pages/admin-transactions';
import { AdminMonitoring } from '../pages/admin-monitoring';
import { AdminEscrowManagement } from '../pages/admin-escrow-management';
import { useAdmin } from '../lib/admin-auth';

export function AdminRoutes() {
  const { isAuthenticated, isLoading } = useAdmin();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading admin dashboard...</p>
        </div>
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
    <Switch>
      <Route path="/dashboard" component={AdminDashboard} />
      <Route path="/users" component={AdminUserManagement} />
      <Route path="/support" component={AdminSupport} />
      <Route path="/transactions" component={AdminTransactions} />
      <Route path="/monitoring" component={AdminMonitoring} />
      <Route path="/escrow" component={AdminEscrowManagement} />
      <Route path="/login" component={AdminLogin} />
      <Route path="/">
        <Redirect to="/dashboard" />
      </Route>
      <Route path="*">
        <Redirect to="/dashboard" />
      </Route>
    </Switch>
  );
}
