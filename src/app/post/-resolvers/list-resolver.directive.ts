import { Directive, Input } from '@angular/core';
import { Resolver, HG_RESOLVERS, ResolverConfig, toObservable } from 'hg-resolvers';
import { IPost } from '../../shared/interfaces';
import { PostService } from '../post.service';
import { QueryParamsStore } from 'query-params-store';
import { Observable } from 'rxjs';
import { filter as observableFilter, startWith, distinctUntilChanged } from 'rxjs/operators';

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
export class ListResolverDirective extends Resolver<{ posts: IPost[]; totalCount: number; }> {

  // tslint:disable-next-line:no-input-rename
  @Input('refresh') @toObservable refresh$: Observable<any>;
  config = ResolverConfig.AutoResolve;

  selector = (name) => s => { const v = s[name]; return Array.isArray(v) ? v[0] : v; };

  constructor(postService: PostService, queryParamsStore: QueryParamsStore) {
    super(([page, pageSize, filter, sort]) => postService.getAll({ page, pageSize, filter, sort }), () => [
      queryParamsStore.select(this.selector('page')).pipe(distinctUntilChanged()),
      queryParamsStore.select(this.selector('pageSize')).pipe(distinctUntilChanged()),
      queryParamsStore.select(this.selector('filter')).pipe(distinctUntilChanged()),
      queryParamsStore.select(this.selector('sort')).pipe(distinctUntilChanged()),
      this.refresh$.pipe(observableFilter(val => val === null), startWith(null))
    ]);
  }

}
