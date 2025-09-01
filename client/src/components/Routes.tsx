import { Route, Switch } from 'wouter';
import Splash from '../pages/splash';
import Onboarding from '../pages/onboarding';
import RoleSelection from '../pages/role-selection';
import Signin from '../pages/signin';
import Signup from '../pages/signup';
import Dashboard from '../pages/dashboard';
import Profile from '../pages/profile';
import NotFound from '../pages/not-found';
import RateDelivery from '../pages/rate-delivery';
import RealTimeTracking from '../pages/real-time-tracking';
import MerchantRatings from '../pages/merchant-ratings';
import { useAuth } from '../hooks/use-auth';

export function Routes() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <Splash />;
  }

  return (
    <Switch>
      <Route path="/">{() => <Splash />}</Route>
      <Route path="/onboarding">{() => <Onboarding />}</Route>
      <Route path="/role-selection">{() => <RoleSelection />}</Route>
      <Route path="/signin">{() => <Signin />}</Route>
      <Route path="/signup">{() => <Signup />}</Route>

      {user && (
        <>
          <Route path="/dashboard">{() => <Dashboard />}</Route>
          <Route path="/profile">{() => <Profile />}</Route>
          <Route path="/rate-delivery/:orderId">{() => <RateDelivery />}</Route>
          <Route path="/real-time-tracking/:orderId">{() => <RealTimeTracking />}</Route>
          <Route path="/merchant-ratings/:merchantId">{() => <MerchantRatings />}</Route>
        </>
      )}

      <Route path="/404">{() => <NotFound />}</Route>
      <Route path="*">{() => <NotFound />}</Route>
    </Switch>
  );
}