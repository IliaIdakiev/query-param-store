[![Build Status](https://travis-ci.org/IliaIdakiev/query-param-store.svg?branch=master)](https://travis-ci.org/IliaIdakiev/query-param-store)

# Angular Query Params Store - RxJS Query Params State Management Container for Angular

Developing web applications requires persistent state and what better way to store it than using the query parameters for that. With this npm module (`yarn add query-params-store` || `npm install query-params-store`) you can easily configure what query perameters your application route will have, what are the default values (values used when the query parameter doesn't exist in the URL),
restrict what query parameters can be used on the current route and more.

Real world example: [Angular Air Demo App](https://github.com/IliaIdakiev/angular-air-qps)


# Video Presentations

[![IMAGE ALT TEXT HERE](https://img.youtube.com/vi/gTJVfRq7uog/0.jpg)](https://www.youtube.com/watch?v=gTJVfRq7uog)
[![IMAGE ALT TEXT HERE](https://img.youtube.com/vi/jCzZbl9b7w4/0.jpg)](https://www.youtube.com/watch?v=jCzZbl9b7w4)

---

## Configuration
app.module.ts
```typescript
@NgModule({
  declarations: [...],
  imports: [
    BrowserModule,
    AppRoutingModule,
    QueryParamsStoreModule // <-- Import the Query Params Module to AppModule
    // Or you can use QueryParamsStoreModule.withConfig({ debug: true }) to have some extra console logging while developing
    // Check out the section on the bottom in order to find out about QueryParamsStoreModule.withConfig({ useCompression: true })
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
```

app-routing.module.ts
```typescript
import { IQueryParamsStoreRoute, IQueryParamsStoreRoutes } from 'query-params-store';

const listRoute: IQueryParamsStoreRoute = {
  path: 'list',
  canActivate: [ListActivate],
  resolve: [ListResolver],
  component: ListComponent,
  data: {
    storeConfig: {
      stateConfig: {
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
          count: 2 //use in order to limit the number of items (this is useful when you have default value set to null)
          value: 'name:asc;email:asc;age:desc', // the default value of the query parameter sort will be
          // ''name:asc;email:asc;age:desc' but since we have 'multi: true' it will be split by the given separator and
          // at the end we will recevice an array - ['name:asc', 'email:asc', 'age:desc'];
          typeConvertor: String, // the convertor will be used on each value from the split array
          // (possible values for typeConvertor - String | Number | Boolean)
        },
        // we call this option (Binary Boolean - it converts a given number query parameter to a boolean array and it's very
        // useful when dealing with a lot of toggles/popups or whatever and you want ot use the store to take care of the state)
        // we also provide a utility function for easier navigation when using the Binary Boolean option - binaryToNumber so 
        // navigation will look something like: 
        // this.router.navigate([], { queryParams: { openToggles: binaryToNumber(updatedOpenTogglesBooleanArray) ... } ... }) 
        openToggles: {
          typeConvertor: Boolean, // Convert the values to booleans
          multi: true, // We will be getting a boolean array with true or false values for each open/closed toggle section
          value: 0, // The initial value will be converted to binary. Since we have 0 it will just be 0 which will be
          // represented as [false]. If we had 10 we would have 1010 which will be represented as [false, true, false, true]
          // which is the reversed of [true, false, true, false] - 1010 (binaries are read from right to left)
          length: 6, // limit the length of the binary array
          // in the case of 6 if we have ?openToggles=0 we will have [false, false, false, false, false, false]
          // if we have ?openToggles=10 we will have [false, true, false, true, false, false]
          removeInvalid: true // remove the invalid numbers that overflow the lenght
          // if we have length: 6 and query ?openToggles=800 since 800 is 1100100000 and its length is 10 then it will be removed
        }
      },
      removeUnknown: true, // remove all query params that don't match the ones provided in stateConfig config property
      // (default value - false) (this triggers a router.navigate with all unknown query params set to undefined)
      noQueryParams: false, // remove all query params for current route (default value - false)
      inherit: true, // inherit all query parameters from parent routes (default value - true)
      caseSensitive: true // match query parameters with case sensitive logic (default value - true)
    },
  }
};

const routes: IQueryParamsStoreRoutes = [
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
    //   storeConfig: {
    //     stateConfig: {
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
    return this.queryParamsStore.canActivate({ role: { match: [null, 'ADMIN'] } }, route);
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
    //     storeConfig: {
    //       stateConfig: {
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
    return this.queryParamsStore.canDeactivate({ completed: { match: [null, true] } }, currentRoute, currentState)
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
    this.userList = this.activatedRoute.snapshot.data[0];
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

## Now (from v.3.5) you also have the option to use lz-string (LZ-based compression algorithm) to minimize the size of your query parameters.

app.module.ts
```typescript
@NgModule({
  declarations: [...],
  imports: [
    BrowserModule,
    AppRoutingModule,
    QueryParamsStoreModule.withConfig({ 
      useCompression: true,
      compressionKey: 'i' // you can use this in order to provide a custom query parameter key that will be for the compressed query params
    })
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
```


This repository contains an example app showing how you can use the *query params store*. You can also view it on [**Stackblitz**](https://stackblitz.com/github/IliaIdakiev/query-param-store)!

[Check our website](https://hillgrand.com/);