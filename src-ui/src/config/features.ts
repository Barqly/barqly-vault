/**
 * Feature flags for gradual rollout of new features
 * Allows toggling between old and new implementations
 */

export const FEATURE_FLAGS = {
  // Enable the refactored encrypt screen with progressive disclosure
  USE_REFACTORED_ENCRYPT_SCREEN: import.meta.env.VITE_USE_REFACTORED_ENCRYPT === 'true' || true,

  // Other feature flags can be added here
  ENABLE_DEBUG_MODE: import.meta.env.VITE_DEBUG === 'true' || false,
  SHOW_EXPERIMENTAL_FEATURES: import.meta.env.VITE_EXPERIMENTAL === 'true' || false,
};

// Helper to check if a feature is enabled
export const isFeatureEnabled = (flag: keyof typeof FEATURE_FLAGS): boolean => {
  return FEATURE_FLAGS[flag] === true;
};
