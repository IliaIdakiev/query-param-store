import { Directive } from '@angular/core';
import { HG_RESOLVERS, Resolver, ResolverConfig } from 'hg-resolvers';
import { PostService } from '../post.service';
import { IPost } from '../../shared/interfaces';
import { map, filter, distinctUntilChanged } from 'rxjs/operators';
import { RouterHelperService } from '../../shared/router-helper.service';

@Directive({
  selector: '[appEntityResolver]',
  providers: [
    {
      provide: HG_RESOLVERS,
      useExisting: EntityResolverDirective,
      multi: true
    }
  ],
  exportAs: 'appEntityResolver'
})
export class EntityResolverDirective extends Resolver<IPost> {

  override config = ResolverConfig.AutoResolve;

  constructor(postService: PostService, routerHelper: RouterHelperService) {
    super(
      ([id]) => postService.getOne(id),
      () => routerHelper.routeData$.pipe(
        map(({ params }) => params.id),
        filter(val => !!val),
        distinctUntilChanged()
      )
    );
  }

}
