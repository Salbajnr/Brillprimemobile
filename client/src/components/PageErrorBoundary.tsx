
import React from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface PageErrorBoundaryProps {
  children: React.ReactNode;
  pageName?: string;
}

const PageErrorFallback: React.FC<{ pageName?: string }> = ({ pageName }) => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
    <Card className="max-w-lg w-full">
      <CardHeader className="text-center">
        <div className="mx-auto w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mb-4">
          <AlertCircle className="w-6 h-6 text-orange-600" />
        </div>
        <CardTitle className="text-xl text-gray-900">
          Page Error
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-gray-600 text-center">
          {pageName ? `There was an error loading the ${pageName} page.` : 'There was an error loading this page.'}
          {' '}Please try again or go back to the previous page.
        </p>
        
        <div className="flex space-x-3">
          <Button 
            onClick={() => window.location.reload()}
            className="flex-1 bg-blue-600 hover:bg-blue-700"
          >
            Refresh Page
          </Button>
          <Button 
            onClick={() => window.history.back()}
            variant="outline"
            className="flex-1"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </CardContent>
    </Card>
  </div>
);

export const PageErrorBoundary: React.FC<PageErrorBoundaryProps> = ({ 
  children, 
  pageName 
}) => {
  return (
    <ErrorBoundary 
      fallback={<PageErrorFallback pageName={pageName} />}
      onError={(error, errorInfo) => {
        console.error(`Error in ${pageName || 'page'}:`, error);
        // You can add additional page-specific error handling here
      }}
    >
      {children}
    </ErrorBoundary>
  );
};
