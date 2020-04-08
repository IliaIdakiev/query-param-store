// import { Directive, Input } from '@angular/core';
// import { Resolver, HG_RESOLVERS, ResolverConfig, toObservable } from 'hg-resolvers';
// import { IPost } from 'src/app/shared/interfaces';
// import { PostService } from '../post.service';
// import { QueryParamsStore } from 'query-params-store';
// import { Observable } from 'rxjs';
// import { filter as observableFilter, startWith } from 'rxjs/operators';

// @Directive({
//   selector: '[appPostListResolver]',
//   providers: [
//     {
//       provide: HG_RESOLVERS,
//       useExisting: PostCommentsResolverDirective,
//       multi: true
//     }
//   ],
//   exportAs: 'appPostListResolver'
// })
// export class PostCommentsResolverDirective extends Resolver<{ posts: IPost[]; totalCount: number; }> {

//   // tslint:disable-next-line:no-input-rename
//   @Input('refresh') @toObservable refresh$: Observable<any>;
//   config = ResolverConfig.AutoResolve;

//   constructor(postService: PostService, queryParamsStore: QueryParamsStore) {
//     super(([page, pageSize, filter, sort]) => postService.getAll({ page, pageSize, filter, sort }), () => [
//       queryParamsStore.select('page'),
//       queryParamsStore.select('pageSize'),
//       queryParamsStore.select('filter'),
//       queryParamsStore.select('sort'),
//       this.refresh$.pipe(observableFilter(val => val === null), startWith(null))
//     ]);
//   }

// }