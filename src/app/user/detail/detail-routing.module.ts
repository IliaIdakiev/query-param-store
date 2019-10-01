import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { DetailComponent } from './detail.component';
import { IQueryParamsStoreRoutes } from 'query-params-store';
import { DetailResolver } from './guards/detail.resolver';
import { DetailDeactivate } from './guards/detail.deactivate';
import { DetailActivate } from './guards/detail.activate';
import { TestComponent } from './test/test.component';
import { Test2Component } from './test2/test2.component';
import { TestActivate } from './guards/test.activate';
import { Test2Activate } from './guards/test2.activate';
import { TestDeactivate } from './guards/test.deactivate';
import { Test2Deactivate } from './guards/test2.deactivate';

const routes: IQueryParamsStoreRoutes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'detail',
  },
  {
    path: 'detail',
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
    },
    children: [{
      path: '',
      pathMatch: 'full',
      redirectTo: 'test',
      outlet: 'test',
    }, {
      path: 'test',
      component: TestComponent,
      outlet: 'test',
      canActivate: [TestActivate],
      canDeactivate: [TestDeactivate],
      data: {
        queryParamsConfig: {
          defaultValues: {
            test1: {
              value: 'test1',
              allowedValues: ['test1', 'test2'],
              multi: false,
              typeConvertor: String
            }
          },
          inherit: false,
          removeUnknown: true
        },
      },
    }, {
      path: 'test2',
      component: Test2Component,
      outlet: 'test',
      canActivate: [Test2Activate],
      canDeactivate: [Test2Deactivate],
      data: {
        queryParamsConfig: {
          defaultValues: {
            test2: 'test2',
            completed: {
              value: null,
              multi: false,
              typeConvertor: Boolean
            }
          },
          removeUnknown: true
        },
      },
    }]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class UserDetailRoutingModule { }
