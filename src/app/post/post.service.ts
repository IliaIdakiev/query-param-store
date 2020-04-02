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

  // tslint:disable-next-line:variable-name
  private _list$: ReplaySubject<{ posts: IPost[]; totalCount: number; }> = new ReplaySubject(1);
  // tslint:disable-next-line:variable-name
  private _entity$: ReplaySubject<IPost> = new ReplaySubject(1);

  get list$() {
    return this._list$.asObservable();
  }

  get entity$() {
    return this._entity$.asObservable();
  }

  constructor(private http: HttpClient) {
    this._entity$.next(null);
    this._list$.next({ posts: null, totalCount: null });
  }

  getAll(data: IQueryData) {
    const query = apiQueryBuilder(data);
    return this.http.get<IPost[]>(
      `https://jsonplaceholder.typicode.com/posts${query}`, { observe: 'response' }).pipe(
        map(res => ({ posts: res.body, totalCount: +res.headers.get('x-total-count') })),
        tap(val => this._list$.next(val))
      );
  }

  getOne(id: number) {
    return this.http.get<IPost>(`https://jsonplaceholder.typicode.com/posts/${id}`).pipe(
      tap(val => this._entity$.next(val))
    );
  }

  clearList() {
    this._list$.next({ posts: null, totalCount: null });
  }

  clearEntity() {
    this._entity$.next(null);
  }

}
