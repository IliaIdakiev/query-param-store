import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ListComponent } from './list/list.component';
import { PostEntityComponent } from './post-entity/post-entity.component';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatDialogModule } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { PostRoutingModule } from './post-routing.module';
import { ListResolverDirective } from './-resolvers/list-resolver.directive';
import { EntityResolverDirective } from './-resolvers/entity-resolver.directive';
import { HGResolversModule } from 'hg-resolvers';
import { EntityDeactivate } from './guards/entity.deactivate';
import { EntityActivate } from './guards/entity.activate';
import { CommentsComponent } from './comments/comments.component';
import { SharedModule } from '../shared/shared.module';
import { PostCommentsResolverDirective } from './-resolvers/post-comments.directive';
// import { PostCommentsDirective } from './-resolvers/post-comments.directive';

@NgModule({
  declarations: [
    ListComponent,
    PostEntityComponent,
    CommentsComponent,
    ListResolverDirective,
    EntityResolverDirective,
    PostCommentsResolverDirective
  ],
  imports: [
    PostRoutingModule,
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
    PostEntityComponent
  ]
})
export class PostModule { }
