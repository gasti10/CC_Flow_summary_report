// Utility functions for handling asset paths in different environments

export const getAssetPath = (assetName: string): string => {
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return `/${assetName}`;
  }
  return `/CC_Flow_summary_report/${assetName}`;
};

export const getLogoPath = (): string => {
  return getAssetPath('CC-logo-NEW_1.webp');
};

export const getFaviconPath = (): string => {
  return getAssetPath('favicon.png');
};
