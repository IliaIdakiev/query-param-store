import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { IPost, IQueryData } from '../shared/interfaces';
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
        map(res => ({ posts: res.body, totalCount: +res.headers.get('x-total-count') }))
      );
  }

  getOne(id: number) {
    return this.http.get<IPost>(`https://jsonplaceholder.typicode.com/posts/${id}`);
  }
}