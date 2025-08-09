import React from 'react';
import { Route, Switch } from 'wouter';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const queryClient = new QueryClient();

function HomePage() {
  return (
    <div className="container mx-auto p-6">
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Brillprime</CardTitle>
          <CardDescription>
            Cross-Platform Financial Solutions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            Welcome to Brillprime - Your comprehensive financial services platform for Nigeria.
          </p>
          <div className="space-y-2">
            <Button className="w-full" data-testid="button-consumer">
              Consumer Portal
            </Button>
            <Button variant="outline" className="w-full" data-testid="button-merchant">
              Merchant Dashboard
            </Button>
            <Button variant="outline" className="w-full" data-testid="button-driver">
              Driver Hub
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-background">
        <Switch>
          <Route path="/" component={HomePage} />
          <Route>
            <div className="container mx-auto p-6 text-center">
              <h1 className="text-2xl font-bold">Page Not Found</h1>
              <p className="text-muted-foreground">The page you're looking for doesn't exist.</p>
            </div>
          </Route>
        </Switch>
      </div>
    </QueryClientProvider>
  );
}

export default App;