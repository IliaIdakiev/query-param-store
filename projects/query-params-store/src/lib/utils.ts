import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';

export function binaryToNumber(...args) {
  if (args.length === 1 && Array.isArray(args[0])) { args = args[0]; }
  return args.reduce((acc, curr, index) => {
    if (!curr) { return acc; }
    return acc + Math.pow(2, index);
  }, 0);
}

export function compress(queryParams: object) {
  return compressToEncodedURIComponent(JSON.stringify(queryParams));
}

export function decompress(compression: string) {
  try {
    return JSON.parse(decompressFromEncodedURIComponent(compression));
  } catch {
    return null;
  }
}
