import { Directive } from '@angular/core';
import { HG_RESOLVERS, Resolver, ResolverConfig } from 'hg-resolvers';
import { UserService } from '../user.service';
import { IPost, IUser } from 'src/app/shared/interfaces';
import { map, filter, distinctUntilChanged } from 'rxjs/operators';
import { RouterHelperService } from 'src/app/shared/router-helper.service';

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
export class EntityResolverDirective extends Resolver<IUser> {

  config = ResolverConfig.AutoResolve;

  constructor(userService: UserService, routerHelper: RouterHelperService) {
    super(
      ([id]) => userService.getOne(id),
      () => routerHelper.routeData$.pipe(
        map(({ params }) => params.id),
        filter(val => !!val),
        distinctUntilChanged()
      )
    );
  }

}
