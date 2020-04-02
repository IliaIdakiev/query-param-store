import { IQueryData } from '../interfaces';

const queryParamMap = {
  page: (value: number) => `_page=${value}`,
  pageSize: (value: number) => `_limit=${value}`,
  sort: (value: string) => {
    const values = value.split(',');
    return values.reduce((acc: string, curr: string) => {
      if (acc !== '') { acc += '&'; }
      const [key, order] = curr.split(':');
      return acc + `_sort=${key}&_order=${order}`;
    }, '');
  },
  filter: (value: string) => `q=${value}`,
  userId: (value: string) => `userId=${value}`,
};

export function apiQueryBuilder(data: IQueryData) {
  return Object.keys(data).reduce((acc, key) => {
    const currentValue = data[key];
    if (!currentValue) { return acc; }
    if (acc === '') {
      acc = '?';
    } else if (acc[acc.length - 1]) {
      acc += '&';
    }
    return acc += queryParamMap[key](data[key]);
  }, '');
}
