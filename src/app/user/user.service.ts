import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { IPost, IQueryData, IUser } from '../shared/interfaces';
import { apiQueryBuilder } from '../shared/utils';
import { map, tap } from 'rxjs/operators';
import { ReplaySubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class UserService {

  constructor(private http: HttpClient) { }

  getAll(data: IQueryData) {
    const query = apiQueryBuilder(data);
    return this.http.get<IUser[]>(
      `https://jsonplaceholder.typicode.com/users${query}`, { observe: 'response' }).pipe(
        map(res => ({ users: res.body, totalCount: +(res.headers.get('x-total-count') || 0) }))
      );
  }

  getOne(id: number) {
    return this.http.get<IUser>(`https://jsonplaceholder.typicode.com/users/${id}`);
  }
}
