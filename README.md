[![Build Status](https://travis-ci.com/IliaIdakiev/query-param-store.svg?branch=master)](https://travis-ci.com/IliaIdakiev/query-param-store)

# Angular Query Params Store

Developing applications often requires persisting state and what better way than using the query parameters for that. With this npm module (`yarn add query-params-store` || `npm install query-params-store`) you can easily configure what query params your application route will have, what are the default values (values used when the query param doesn't exist in the URL),
restrict what query params can be used on the current route and more.

---

## Configuration
app-routing.module.ts
```typescript
import { IQueryParamsStoreRoute, IQueryParamStoreRoutes } from 'query-params-store';

const listRoute: IQueryParamsStoreRoute = {
  path: 'list',
  canActivate: [ListActivate],
  resolve: [ListResolver],
  component: ListComponent,
  data: {
    queryParamsConfig: {
      defaultValues: {
        page: 0, // the query parameter - page will be of type number with default value of 0 (type number)
        pageSize: { 
          value: '30' // the query parameter - pageSize will be of type string with default value of '30' (type string)
          allowedValues: ['30', '20', '10'] // (optional) the full set of allowed values for the current query param
          // if the provided value doesn't match any of the listed once it will be removed and the default one
          // will be provided
        }, 
        filter: {
          value: null, // the default value of the query parameter filter will be null
          typeConvertor: String, // if a value inside the URL is provided it will be automatically parsed as String 
          // If parsing is not successful the query parameter will be removed.
          // (possible values for typeConvertor - String | Number | Boolean)
          multi: false // it will be a single value (not an array)
        },
        sort: {
          multi: true, // the provided value (either from the URL or the default one) will be threated as a string and it 
          // will be split by the given separator bellow
          separator: ';' // the seperator that we split by
          value: 'name:asc;email:asc;age:desc', // the default value of the query parameter sort will be 
          // ''name:asc;email:asc;age:desc' but since we have 'multi: true' it will be split by the given separator and 
          // at the end we will recevice an array - ['name:asc', 'email:asc', 'age:desc'];
          typeConvertor: String, // the convertor will be used on each value from the split array 
          // (possible values for typeConvertor - String | Number | Boolean)
        }
      },
      removeUnknown: true, // remove all query params that don't match the ones provided in defaultValues config property 
      // (default value - false) (this triggers a router.navigate with all unknown query params set to undefined)
      noQueryParams: false, // remove all query params for current route (default value - false)
      inherit: true // inherit all query parameters from parent routes (default value - true)
    },
  }
};

const routes: IQueryParamStoreRoutes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'list',
  },
  listRoute
];

export const AppRoutingModule = RouterModule.forRoot(routes);
```

## Usage

The QueryParamsStore can be used anywhere inside you application. One example is using it inside your resolver:

list.resolver.ts
```typescript
import { Injectable } from '@angular/core';
import { Resolve } from '@angular/router';
import { Observable } from 'rxjs';
import { switchMap, first } from 'rxjs/operators';
import { QueryParamsStore } from 'query-params-store';
import { UserService } from './user.service';

@Injectable({ providedIn: 'root' })
export class ListResolver implements Resolve<Observable<any[]>> {

  constructor(
    private queryParamsStore: QueryParamsStore,
    private userService: UserService
  ) { }

  resolve() {
    return this.queryParamsStore.store.pipe(
      switchMap((queryParams) => {
        const { page, pageSize, filter, sort } = queryParams;
        return this.userService.load(page, pageSize, filter, sort);
      }), 
      first(),
      catchError(error => {
        // handle error...
      })
    );
  }
}
```

protect your routes from unwanted query parameters inside canActivate

```typescript
@Injectable({ providedIn: 'root' })
export class ListActivate implements CanActivate {

  constructor(
    private queryParamsStore: QueryParamsStore<any>
  ) { }

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean> {
    // if we have this route query params store configuration for the route
    // data: {
    //   queryParamsConfig: {
    //     defaultValues: {
    //       role: {
    //         value: null,
    //         multi: false,
    //         typeConvertor: String
    //       }
    //     }
    //   }
    // },
    // this guard will allow the route to be accessed only if the role query param is 'ADMIN' or the defaultValue from
    // the configuration object (null). If we don't have a defaultValue we should add undefined instead of null
    return this.queryParamsStore.canActivate({ role: { match: [null, 'ADMIN'] } });
  }
}

```

protect exiting routes with unwanted query parameters inside canDeactivate

```typescript
@Injectable({ providedIn: 'root' })
export class DialogDeactivate implements CanDeactivate<Observable<boolean>> {

  constructor(
    private queryParamsStore: QueryParamsStore
  ) { }


  canDeactivate(component: any, currentRoute: ActivatedRouteSnapshot, currentState: RouterStateSnapshot, nextState?: RouterStateSnapshot) {
    // if we have this route query params store configuration for the route
    // data: {
    //     queryParamsConfig: {
    //       defaultValues: {
    //         completed: {
    //           value: null,
    //           multi: false,
    //           typeConvertor: Boolean
    //         }
    //       }
    //     }
    //   },
    // this guard will allow the route to be exited only if the completed query param is true or the defaultValue from
    // the configuration object (null).
    return this.queryParamsStore.canDeactivate({ completed: { match: [null, true] } }, currentState);
  }
}
```

* There is an additional **queryParamsStore.match(allowedValues: IAllowedValuesConfig | Observable<IAllowedValuesConfig>)** method that can be used.

Using query params store inside our components:

list.component.ts
```typescript
import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { QueryParamsStore } from 'query-params-store';
import { Observable } from 'rxjs';

@Component({
  selector: 'list-component',
  templateUrl: './list.component.html',
  styleUrls: ['./list.component.css']
})
export class ListComponent {
  filter$: Observable<string>;
  userList: any[];

  constructor(private queryParamsStore: QueryParamsStore, activatedRoute: ActivatedRoute) {
    this.filter$ = queryParamsStore.select<string>('filter');
    // this.filter$ = queryParamsStore.select<string>(queryParams => queryParams.filter);
    this.userList = this.activatedRoute.snapshot.data;
  }
}

```

list.component.html
```html
<div class="filter-input">
  <input type="text" [value]="filter$ | async" placeholder="Search..." #searchInput>
  <button (click)="search(searchInput.value)">Search</button>
</div>
<ul>
  <li *ngFor="let user of userList">{{user.email}}</li>
</ul>
```


Looking for an example app? [Check out this **simple demo**](https://stackblitz.com/github/IliaIdakiev/query-param-store)!

(Deveoped with angular~7.1.0)