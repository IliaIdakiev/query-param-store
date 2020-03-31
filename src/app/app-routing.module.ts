import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { HomeActivate } from './home.activate';
import { IQueryParamsStoreRoutes } from 'query-params-store';

const routes: IQueryParamsStoreRoutes = [
  {
    path: '',
    pathMatch: 'full',
    component: HomeComponent,
    canActivate: [HomeActivate],
    data: {
      storeConfig: {
        stateConfig: {
          page: {
            value: '1;2;3',
            typeConvertor: Number,
            multi: true,
            separator: ';'
          }
        }
      }
    }
  },
  {
    path: 'user',
    loadChildren: './user/user.module#UserModule'
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { enableTracing: false })],
  exports: [RouterModule]
})
export class AppRoutingModule { }
