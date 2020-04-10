export interface IQueryData {
  page: number;
  pageSize: number;
  filter: string;
  sort: string;
  userId?: number;
  postId?: number;
}
