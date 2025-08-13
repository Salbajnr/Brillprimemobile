
import { useCallback } from 'react';
import { useDeviceInfo } from './useDeviceInfo';
import { storageService } from '../utils/storage';
import { apiService } from '../services/api';

interface AnalyticsEvent {
  eventName: string;
  properties?: Record<string, any>;
  timestamp: string;
  userId?: string;
  sessionId?: string;
}

export const useAnalytics = () => {
  const { deviceInfo } = useDeviceInfo();

  const trackEvent = useCallback(async (
    eventName: string,
    properties: Record<string, any> = {}
  ) => {
    try {
      const userSession = await storageService.getUserSession();
      
      const event: AnalyticsEvent = {
        eventName,
        properties: {
          ...properties,
          platform: deviceInfo?.platform,
          deviceModel: deviceInfo?.model,
          appVersion: deviceInfo?.appVersion,
          screenWidth: deviceInfo?.screenWidth,
          screenHeight: deviceInfo?.screenHeight,
        },
        timestamp: new Date().toISOString(),
        userId: userSession?.user?.id,
        sessionId: userSession?.sessionId,
      };

      // Send to analytics service
      await apiService.post('/analytics/events', event);
    } catch (error) {
      console.error('Analytics tracking error:', error);
      // Fail silently for analytics
    }
  }, [deviceInfo]);

  const trackScreen = useCallback(async (screenName: string, properties: Record<string, any> = {}) => {
    await trackEvent('screen_view', {
      screen_name: screenName,
      ...properties,
    });
  }, [trackEvent]);

  const trackUserAction = useCallback(async (action: string, properties: Record<string, any> = {}) => {
    await trackEvent('user_action', {
      action,
      ...properties,
    });
  }, [trackEvent]);

  const trackError = useCallback(async (error: Error, context?: string) => {
    await trackEvent('error', {
      error_message: error.message,
      error_stack: error.stack,
      context,
    });
  }, [trackEvent]);

  return {
    trackEvent,
    trackScreen,
    trackUserAction,
    trackError,
  };
};
