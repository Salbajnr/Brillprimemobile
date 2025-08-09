
import React, { Component, ReactNode } from 'react';
import { AlertTriangle, Wifi, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  isNetworkError: boolean;
  retryCount: number;
}

export class AsyncErrorBoundary extends Component<Props, State> {
  private maxRetries = 3;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      isNetworkError: false,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    const isNetworkError = error.message.includes('fetch') || 
                          error.message.includes('network') ||
                          error.message.includes('NetworkError');
    
    return {
      hasError: true,
      isNetworkError
    };
  }

  componentDidCatch(error: Error) {
    if (this.state.isNetworkError) {
      console.warn('Network error caught by AsyncErrorBoundary:', error);
    } else {
      console.error('Async error caught by AsyncErrorBoundary:', error);
    }
  }

  private handleRetry = () => {
    if (this.state.retryCount < this.maxRetries) {
      this.setState(prevState => ({
        hasError: false,
        retryCount: prevState.retryCount + 1
      }));
    } else {
      // Max retries reached, reload the page
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isMaxRetriesReached = this.state.retryCount >= this.maxRetries;

      return (
        <div className="flex items-center justify-center p-4">
          <Card className="max-w-sm w-full">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
                {this.state.isNetworkError ? (
                  <WifiOff className="w-6 h-6 text-yellow-600" />
                ) : (
                  <AlertTriangle className="w-6 h-6 text-yellow-600" />
                )}
              </div>
              <CardTitle className="text-lg text-gray-900">
                {this.state.isNetworkError ? 'Connection Error' : 'Loading Error'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600 text-center text-sm">
                {this.state.isNetworkError 
                  ? 'Unable to connect to the server. Please check your internet connection.'
                  : 'Failed to load content. Please try again.'
                }
              </p>
              
              {this.state.retryCount > 0 && (
                <p className="text-gray-500 text-center text-xs">
                  Retry attempt: {this.state.retryCount}/{this.maxRetries}
                </p>
              )}

              <Button 
                onClick={this.handleRetry}
                className="w-full bg-blue-600 hover:bg-blue-700"
                disabled={isMaxRetriesReached}
              >
                {this.state.isNetworkError ? (
                  <Wifi className="w-4 h-4 mr-2" />
                ) : (
                  <AlertTriangle className="w-4 h-4 mr-2" />
                )}
                {isMaxRetriesReached ? 'Refreshing Page...' : 'Try Again'}
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
