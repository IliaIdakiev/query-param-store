import { Directive, Input } from '@angular/core';
import { Resolver, HG_RESOLVERS, ResolverConfig, toObservable } from 'hg-resolvers';
import { IPost, IComment } from 'src/app/shared/interfaces';
import { PostService } from '../post.service';
import { QueryParamsStore } from 'query-params-store';
import { Observable } from 'rxjs';
import { filter as observableFilter, startWith, map, distinctUntilChanged, filter } from 'rxjs/operators';

@Directive({
  selector: '[appPostCommentsListResolver]',
  providers: [
    {
      provide: HG_RESOLVERS,
      useExisting: PostCommentsResolverDirective,
      multi: true
    }
  ],
  exportAs: 'appPostCommentsListResolver'
})
export class PostCommentsResolverDirective extends Resolver<{ comments: IComment[]; totalCount: number; }> {

  // tslint:disable-next-line:no-input-rename
  @Input('postId') @toObservable postId$: Observable<number>;

  config = ResolverConfig.AutoResolve;

  constructor(postService: PostService, queryParamsStore: QueryParamsStore) {
    super(([postId, page, pageSize, f, sort]) => postService.getAllComments({ postId, page, pageSize, filter: f, sort }), () => [
      this.postId$.pipe(filter(v => !!v), distinctUntilChanged()),
      queryParamsStore.select('page').pipe(map(v => v[1]), filter(v => v !== undefined), distinctUntilChanged()),
      queryParamsStore.select('pageSize').pipe(map(v => v[1]), filter(v => v !== undefined), distinctUntilChanged()),
      queryParamsStore.select('filter').pipe(map(v => {
        return v[1];
      }), filter(v => v !== undefined), distinctUntilChanged()),
      // queryParamsStore.select('sort').pipe(map(v => v[1])),
    ]);
  }

}
