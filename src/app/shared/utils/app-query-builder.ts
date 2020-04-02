export function appQueryBuilder(data: any) {
  return Object.keys(data).reduce((acc, key) => {
    const currentValue = data[key];
    if (!currentValue) { return acc; }
    if (acc === '') {
      acc = '?';
    } else if (acc[acc.length - 1]) {
      acc += '&';
    }
    return acc += `${key}=${currentValue}`;
  }, '');
}
