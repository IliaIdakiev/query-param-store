import { RouterModule } from '@angular/router';
import { IQueryParamsStoreRoutes } from 'query-params-store';
import { ListComponent } from './list/list.component';

const routes: IQueryParamsStoreRoutes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: '/post/list'
  },
  {
    path: 'post/list',
    component: ListComponent,
    runGuardsAndResolvers: 'paramsOrQueryParamsChange',
    data: {
      dialogComponentReuse: true,
      storeConfig: {
        stateConfig: {
          page: 1,
          pageSize: 20,
          filter: ''
        }
      }
    },
    children: [
      {
        path: 'add',
        component: ListComponent,
        runGuardsAndResolvers: 'paramsOrQueryParamsChange',
        data: {
          dialogComponentReuse: true,
          dialogId: 'add-post',
          storeConfig: {
            inherit: true
          }
        }
      },
      {
        path: 'edit/:id',
        component: ListComponent,
        runGuardsAndResolvers: 'paramsOrQueryParamsChange',
        data: {
          dialogComponentReuse: true,
          dialogId: 'edit-post',
          storeConfig: {
            inherit: true
          }
        }
      }
    ]
  },
];

export const PostRoutingModule = RouterModule.forChild(routes);
