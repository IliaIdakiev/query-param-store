import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { ListComponent } from './list/list.component';

const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'list',
  },
  {
    path: 'list',
    component: ListComponent,
    data: {
      queryParamsConfig: {
        page: 0,
        pageSize: 30,
        filter: '',
        test: {
          value: null,
          typeConvertor: String
        }
      },
      protected: true
    }
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class UserRoutingModule { }
