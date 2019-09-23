export function parseBinaryBoolean(boolArray: boolean[]) {
  return parseInt((boolArray || []).slice().map(i => +i).reverse().join(''), 2);
}
