import CryptoJS from 'crypto-js';

const HMAC_SECRET = process.env.QR_HMAC_SECRET || process.env.NEXT_PUBLIC_QR_HMAC_SECRET || 'aulau-caspian-secret-2024';

export function generateSignature(type: string, code: string): string {
  const message = `${type}:${code}`;
  return CryptoJS.HmacSHA256(message, HMAC_SECRET).toString(CryptoJS.enc.Hex).slice(0, 16);
}

export function generateQRPayload(type: 'NET' | 'BATCH' | 'PUBLIC' | 'INSPECTOR', code: string): string {
  const signature = generateSignature(type, code);
  return `${type}:${code}:${signature}`;
}

export function verifyQRPayload(payload: string): { valid: boolean; type: string; code: string } {
  const parts = payload.split(':');
  if (parts.length !== 3) {
    return { valid: false, type: '', code: '' };
  }
  const [type, code, signature] = parts;
  const expectedSignature = generateSignature(type, code);
  return {
    valid: signature === expectedSignature,
    type,
    code,
  };
}

export function getTraceUrl(type: 'NET' | 'BATCH' | 'PUBLIC' | 'INSPECTOR', code: string): string {
  if (type === 'PUBLIC') return `/trace/public/${code}`;
  if (type === 'INSPECTOR') return `/trace/batch/${code}`;
  const typePath = type === 'NET' ? 'net' : 'batch';
  return `/trace/${typePath}/${code}`;
}
