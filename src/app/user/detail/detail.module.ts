import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DetailComponent } from './detail.component';
import { UserDetailRoutingModule } from './detail-routing.module';
import { TestComponent } from './test/test.component';
import { Test2Component } from './test2/test2.component';

@NgModule({
  declarations: [DetailComponent, TestComponent, Test2Component],
  imports: [
    CommonModule,
    UserDetailRoutingModule
  ]
})
export class DetailModule { }
