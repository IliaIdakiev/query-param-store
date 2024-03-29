import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ListComponent } from './list/list.component';
import { UserEntityComponent } from './user-entity/user-entity.component';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatDialogModule } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { UserRoutingModule } from './user-routing.module';
import { ListResolverDirective } from './-resolvers/list-resolver.directive';
import { EntityResolverDirective } from './-resolvers/entity-resolver.directive';
import { HGResolversModule } from 'hg-resolvers';
import { EntityDeactivate } from './guards/entity.deactivate';
import { EntityActivate } from './guards/entity.activate';
import { SharedModule } from '../shared/shared.module';

@NgModule({
  declarations: [
    ListComponent,
    UserEntityComponent,
    ListResolverDirective,
    EntityResolverDirective
  ],
  imports: [
    UserRoutingModule,
    CommonModule,
    MatDialogModule,
    MatInputModule,
    MatTableModule,
    MatButtonModule,
    MatPaginatorModule,
    MatSelectModule,
    FormsModule,
    HGResolversModule,
    SharedModule
  ],
  providers: [
    EntityActivate,
    EntityDeactivate
  ],
  entryComponents: [
    UserEntityComponent
  ]
})
export class UserModule { }
