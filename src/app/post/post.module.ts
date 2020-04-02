import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ListComponent } from './list/list.component';
import { EntityComponent } from './entity/entity.component';
import { MatInputModule, MatTableModule, MatPaginatorModule, MatButtonModule, MatSelectModule } from '@angular/material';
import { FormsModule } from '@angular/forms';
import { PostRoutingModule } from './post-routing.module';
import { ListResolverDirective } from './-resolvers/list-resolver.directive';
import { EntityResolverDirective } from './-resolvers/entity-resolver.directive';
import { HGResolversModule } from 'hg-resolvers';
import { LoaderComponent } from '../shared/loader/loader.component';

@NgModule({
  declarations: [
    ListComponent,
    EntityComponent,
    ListResolverDirective,
    EntityResolverDirective,
    LoaderComponent
  ],
  imports: [
    PostRoutingModule,
    CommonModule,
    MatInputModule,
    MatTableModule,
    MatButtonModule,
    MatPaginatorModule,
    MatSelectModule,
    FormsModule,
    HGResolversModule
  ],
  entryComponents: [
    EntityComponent
  ]
})
export class PostModule { }
