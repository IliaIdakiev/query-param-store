import { RouterModule } from '@angular/router';
import { IQueryParamsStoreRoutes } from 'query-params-store';
import { ListComponent } from './list/list.component';
import { EntityDeactivate } from './guards/entity.deactivate';
import { EntityActivate } from './guards/entity.activate';

const routes: IQueryParamsStoreRoutes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: '/user/list'
  },
  {
    path: 'list',
    component: ListComponent,
    data: {
      dialogComponentReuse: true,
      storeConfig: {
        stateConfig: {
          page: 1,
          pageSize: 20,
          filter: '',
          disableDialog: false
        },
        removeUnknown: true
      }
    },
    children: [
      {
        path: 'add',
        component: ListComponent,
        canActivate: [EntityActivate],
        canDeactivate: [EntityDeactivate],
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
        canActivate: [EntityActivate],
        canDeactivate: [EntityDeactivate],
        data: {
          dialogComponentReuse: true,
          dialogId: 'edit-user',
          storeConfig: {
            inherit: true
          }
        }
      }
    ]
  },
];

export const UserRoutingModule = RouterModule.forChild(routes);
