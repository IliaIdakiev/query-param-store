import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, RouteReuseStrategy } from '@angular/router';
import { NavigationComponent } from './navigation/navigation.component';
import { DialogRouteReuseStrategy } from './dialog-route-reuse-strategy';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';

@NgModule({
  declarations: [
    NavigationComponent
  ],
  imports: [
    CommonModule,
    RouterModule,
    MatToolbarModule,
    MatButtonModule
  ],
  providers: [
    {
      provide: RouteReuseStrategy,
      useClass: DialogRouteReuseStrategy
    },
  ],
  exports: [
    NavigationComponent
  ]
})
export class CoreModule { }
