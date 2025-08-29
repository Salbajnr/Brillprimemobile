
import { Route, Switch, Redirect } from 'wouter';
import { Splash } from '../pages/splash';
import { Onboarding } from '../pages/onboarding';
import { RoleSelection } from '../pages/role-selection';
import { Signin } from '../pages/signin';
import { Signup } from '../pages/signup';
import { Dashboard } from '../pages/dashboard';
import { Profile } from '../pages/profile';
import { NotFound } from '../pages/not-found';
import { useAuth } from '../hooks/use-auth';

export function Routes() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <Splash />;
  }

  return (
    <Switch>
      <Route path="/" component={Splash} />
      <Route path="/onboarding" component={Onboarding} />
      <Route path="/role-selection" component={RoleSelection} />
      <Route path="/signin" component={Signin} />
      <Route path="/signup" component={Signup} />
      
      {user && (
        <>
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/profile" component={Profile} />
        </>
      )}
      
      <Route path="/404" component={NotFound} />
      <Route path="*" component={NotFound} />
    </Switch>
  );
}
