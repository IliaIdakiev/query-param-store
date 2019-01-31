import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { QueryParamStoreModule } from './query-param-store/query-param-store.module';
import { HomeComponent } from './home/home.component';


@NgModule({
  declarations: [
    AppComponent,
    HomeComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    QueryParamStoreModule.forRoot({
      handleInvalidValues: true
    })
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
