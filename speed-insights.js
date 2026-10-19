// Vercel Speed Insights - Vanilla JS Integration
// This file injects Vercel Speed Insights to track web vitals and performance metrics
import { injectSpeedInsights } from '@vercel/speed-insights';

// Initialize Speed Insights with proper configuration
try {
  injectSpeedInsights({
    // Enable debug logging in development mode
    debug: process.env.NODE_ENV === 'development' || window.location.hostname === 'localhost',
    
    // Optional: Add a beforeSend middleware to modify events before they are sent
    // beforeSend: (event) => {
    //   // You can modify the event here or return null to cancel sending
    //   return event;
    // },
    
    // Optional: Sample rate (default is 1, meaning 100% of events are sent)
    // sampleRate: 1
  });
  
  console.log('[Speed Insights] Successfully initialized');
} catch (error) {
  console.error('[Speed Insights] Failed to initialize:', error);
}
