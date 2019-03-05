import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { ListComponent } from './list/list.component';
import { IQueryParamStoreRoutes } from '../query-param-store/query-param-store-route';
import { ListResolver } from './guards/list.resolver';

const routes: IQueryParamStoreRoutes<any> = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'list',
  },
  {
    path: 'list',
    // component: ListComponent,
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
            typeConvertor: String
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
