import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { DetailComponent } from './detail.component';
import { IQueryParamStoreRoutes } from 'query-params-store';
import { DetailResolver } from './detail.resolver';
import { DetailDeactivate } from './detail.deactivate';
import { DetailActivate } from './detail.activate';

const routes: IQueryParamStoreRoutes<any> = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'test',
  },
  {
    path: 'test',
    component: DetailComponent,
    resolve: [DetailResolver],
    canActivate: [DetailActivate],
    canDeactivate: [DetailDeactivate],
    data: {
      queryParamsConfig: {
        defaultValues: {
          best: {
            value: null,
            multi: false,
            typeConvertor: String
          },
        },
        inherit: true,
        removeUnknown: true
      },
    }
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class UserDetailRoutingModule { }
