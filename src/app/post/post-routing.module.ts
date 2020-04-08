import { RouterModule } from '@angular/router';
import { IQueryParamsStoreRoutes } from 'query-params-store';
import { ListComponent } from './list/list.component';
import { EntityDeactivate } from './guards/entity.deactivate';
import { EntityActivate } from './guards/entity.activate';

const routes: IQueryParamsStoreRoutes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: '/post/list'
  },
  {
    path: 'post/list',
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
            inherit: true,
            stateConfig: {
              blockEdit: false,
            }
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
          dialogId: 'edit-post',
          storeConfig: {
            inherit: true,
            stateConfig: {
              blockEdit: false,
            }
          }
        }
      }
    ]
  },
];

export const PostRoutingModule = RouterModule.forChild(routes);
