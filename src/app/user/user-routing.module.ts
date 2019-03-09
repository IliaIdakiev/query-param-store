import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ListComponent } from './list/list.component';
import { ListResolver } from './guards/list.resolver';
import { ListActivate } from './guards/list.activate';
import { IQueryParamStoreRoutes } from 'query-params-store';

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
