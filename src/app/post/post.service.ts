import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { IPost, IQueryData, IComment } from '../shared/interfaces';
import { apiQueryBuilder } from '../shared/utils';
import { map, tap } from 'rxjs/operators';
import { ReplaySubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PostService {

  constructor(private http: HttpClient) { }

  getAll(data: IQueryData) {
    const query = apiQueryBuilder(data);
    return this.http.get<IPost[]>(
      `https://jsonplaceholder.typicode.com/posts${query}`, { observe: 'response' }).pipe(
        map(res => ({ posts: res.body, totalCount: +(res.headers.get('x-total-count') || 0) }))
      );
  }

  getOne(id: number) {
    return this.http.get<IPost>(`https://jsonplaceholder.typicode.com/posts/${id}`);
  }

  getAllComments(data: IQueryData) {
    const query = apiQueryBuilder(data);
    return this.http.get<IComment[]>(
      `https://jsonplaceholder.typicode.com/comments${query}`, { observe: 'response' }).pipe(
        map(res => ({ comments: res.body, totalCount: +(res.headers.get('x-total-count') || 0) }))
      );
  }
}
