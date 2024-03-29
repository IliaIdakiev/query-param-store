import { Directive, Input } from '@angular/core';
import { Resolver, HG_RESOLVERS, ResolverConfig, toObservable } from 'hg-resolvers';
import { IPost, IUser } from '../../shared/interfaces';
import { UserService } from '../user.service';
import { QueryParamsStore } from 'query-params-store';
import { Observable } from 'rxjs';
import { filter as observableFilter, startWith } from 'rxjs/operators';

@Directive({
  selector: '[appListResolver]',
  providers: [
    {
      provide: HG_RESOLVERS,
      useExisting: ListResolverDirective,
      multi: true
    }
  ],
  exportAs: 'appListResolver'
})
export class ListResolverDirective extends Resolver<{ users: IUser[] | null; totalCount: number; }> {

  // tslint:disable-next-line:no-input-rename
  @Input('refresh') @toObservable refresh$!: Observable<any>;
  override config = ResolverConfig.AutoResolve;

  selector = (name: string) => (s: any) => { const v = s[name]; return Array.isArray(v) ? v[0] : v; };

  constructor(userService: UserService, queryParamsStore: QueryParamsStore) {
    super(([page, pageSize, filter, sort]) => userService.getAll({ page, pageSize, filter, sort }), () => [
      queryParamsStore.select(this.selector('page')),
      queryParamsStore.select(this.selector('pageSize')),
      queryParamsStore.select(this.selector('filter')),
      queryParamsStore.select(this.selector('sort')),
      this.refresh$.pipe(observableFilter(val => val === null), startWith(null))
    ]);
  }

}
