import React from 'react';
import { Router, Route, Switch } from 'wouter';

// Import pages
import Splash from './pages/splash';
import SignIn from './pages/signin-simple';
import Dashboard from './pages/dashboard';
import NotFound from './pages/not-found';

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Router>
        <Switch>
          <Route path="/" component={Splash} />
          <Route path="/signin" component={SignIn} />
          <Route path="/dashboard" component={Dashboard} />
          <Route component={NotFound} />
        </Switch>
      </Router>
    </div>
  );
}

export default App;