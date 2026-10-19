// Vercel Speed Insights - Vanilla JS Integration
// This file injects Vercel Speed Insights to track web vitals and performance metrics
import { injectSpeedInsights } from '@vercel/speed-insights';

// Initialize Speed Insights
injectSpeedInsights({
  debug: false // Set to true to enable debug logging in development
});
