// Vercel Speed Insights - Vanilla JS Integration
// This file sets up Vercel Speed Insights to track web vitals and performance metrics

(function() {
  'use strict';
  
  // Initialize the Speed Insights queue
  // This allows tracking to start before the main script loads
  window.si = window.si || function() {
    (window.siq = window.siq || []).push(arguments);
  };
  
  // Determine the correct script source based on environment
  // When deployed on Vercel, this will automatically use the Vercel-provided script
  const scriptSrc = '/_vercel/speed-insights/script.js';
  
  // Load the Speed Insights script
  const script = document.createElement('script');
  script.src = scriptSrc;
  script.defer = true;
  
  // Optional: Add error handler
  script.onerror = function() {
    console.warn('Vercel Speed Insights script failed to load. This is expected in local development without Vercel deployment.');
  };
  
  // Inject the script into the document
  document.head.appendChild(script);
  
  // Optional: Log initialization in development
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    console.log('Speed Insights initialized (will be active when deployed to Vercel)');
  }
})();
