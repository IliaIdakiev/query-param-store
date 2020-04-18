export function binaryToNumber(...args) {
  if (args.length === 1 && Array.isArray(args[0])) { args = args[0]; }
  return args.reduce((acc, curr, index) => {
    if (!curr) { return acc; }
    return acc + Math.pow(2, index);
  }, 0);
}
