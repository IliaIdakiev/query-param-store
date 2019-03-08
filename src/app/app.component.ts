import { Component } from '@angular/core';
import { QueryParamsStore } from 'query-params-store';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'query-param-store';
  store: Observable<any>;

  constructor(private qpsStore: QueryParamsStore<any>) {
    this.store = qpsStore.store;
    this.store.subscribe((data) => console.log('app', data));
  }
}
