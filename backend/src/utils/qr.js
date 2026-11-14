'use strict';

const QRCode = require('qrcode');

/**
 * Generate a base64 PNG data URL for a given payload.
 */
async function generateQRDataURL(payload) {
  const text = typeof payload === 'string' ? payload : JSON.stringify(payload);
  return QRCode.toDataURL(text, {
    errorCorrectionLevel: 'M',
    type: 'image/png',
    margin: 2,
    width: 320,
    color: {
      dark: '#0f172a',
      light: '#ffffff',
    },
  });
}

/**
 * Generate an SVG string for a given payload.
 */
async function generateQRSVG(payload) {
  const text = typeof payload === 'string' ? payload : JSON.stringify(payload);
  return QRCode.toString(text, {
    type: 'svg',
    margin: 2,
  });
}

module.exports = {
  generateQRDataURL,
  generateQRSVG,
};

