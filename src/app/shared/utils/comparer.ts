export function comparer(initialValue, currentValue, compareObjectFieldFn = null): boolean {
  if (Array.isArray(initialValue)) {
    if (initialValue.length !== currentValue.length) { return false; }
    const result = initialValue.reduce((acc, value, idx) => {
      return acc && comparer(value, currentValue[idx], compareObjectFieldFn);
    }, true);
    return result;
  } else if (typeof initialValue === 'object' && initialValue !== null && typeof currentValue === 'object' && currentValue !== null) {
    const initialKeys = Object.keys(initialValue);
    const currentKeys = Object.keys(currentValue);
    const result = initialKeys.length === currentKeys.length && initialKeys.reduce((acc, key) => {
      return acc && (compareObjectFieldFn ?
        compareObjectFieldFn(initialValue[key]) === compareObjectFieldFn(currentValue[key]) :
        comparer(initialValue[key], currentValue[key], compareObjectFieldFn));
    }, true);
    return result;
  }
  return initialValue === currentValue;
}