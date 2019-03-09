import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { HomeActivate } from './home.activate';
import { IQueryParamStoreRoutes } from 'projects/query-params-store/src/public_api';

const routes: IQueryParamStoreRoutes = [
  {
    path: '',
    pathMatch: 'full',
    component: HomeComponent,
    canActivate: [HomeActivate],
    data: {
      queryParamsConfig: {
        defaultValues: {
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
