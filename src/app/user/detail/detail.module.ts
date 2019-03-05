import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DetailComponent } from './detail.component';
import { UserDetailRoutingModule } from './detail-routing.module';

@NgModule({
  declarations: [DetailComponent],
  imports: [
    CommonModule,
    UserDetailRoutingModule
  ]
})
export class DetailModule { }
