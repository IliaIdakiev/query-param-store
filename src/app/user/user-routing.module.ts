import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ListComponent } from './list/list.component';
import { ListResolver } from './guards/list.resolver';
import { ListActivate } from './guards/list.activate';
import { IQueryParamStoreRoutes, IQueryParamsStoreRoute } from 'query-params-store';

const listRoute: IQueryParamsStoreRoute = {
  path: 'list',
  canActivate: [ListActivate],
  resolve: [ListResolver],
  component: ListComponent,
  data: {
    queryParamsConfig: {
      defaultValues: {
        page: 0,
        pageSize: 30,
        filter: {
          value: null,
          typeConvertor: String,
          multi: false
        },
        sort: {
          value: 'name:asc;email:asc;age:desc',
          typeConvertor: String,
          multi: true,
          separator: ';'
        }
      },
      removeUnknown: true, // (default value false)
      noQueryParams: false, // (default value false)
      inherit: true // (default value true)
    },
  }
};


const routes1: IQueryParamStoreRoutes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'list',
  },
  listRoute
];


const routes: IQueryParamStoreRoutes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'list',
  },
  {
    path: 'list',
    canActivate: [ListActivate],
    resolve: [ListResolver],
    loadChildren: './detail/detail.module#DetailModule',
    data: {
      queryParamsConfig: {
        defaultValues: {
          page: 0,
          pageSize: 30,
          filter: '',
          test: {
            value: null,
            typeConvertor: String,
            multi: false
          }
        },
        removeUnknown: true
      },
    }
  },
  {
    path: 'add',
    component: ListComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class UserRoutingModule { }
