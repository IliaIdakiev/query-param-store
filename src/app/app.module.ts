import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NgModule } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { CoreModule } from './core/core.module';
import { PostModule } from './post/post.module';
import { HttpClientModule } from '@angular/common/http';
import { QueryParamsStoreModule } from 'query-params-store';
import { NotFoundComponent } from './not-found/not-found.component';

@NgModule({
  declarations: [
    AppComponent,
    NotFoundComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    CoreModule,
    PostModule,
    MatTableModule,
    AppRoutingModule,
    HttpClientModule,
    QueryParamsStoreModule.withConfig({ debug: true })
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
