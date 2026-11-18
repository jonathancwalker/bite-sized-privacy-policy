// Base64 adds one third to file size. Leave room for JSON under Vercel's 4.5 MB limit.
export const MAX_UPLOAD_BYTES = 3 * 1024 * 1024;
export const MAX_REQUEST_BYTES = 4_300_000;
export const UPLOAD_SIZE_MESSAGE = 'Use a file no larger than 3 MB.';
