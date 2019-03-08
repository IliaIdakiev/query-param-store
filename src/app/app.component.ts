import { Component } from '@angular/core';
import { QueryParamsStore } from 'query-params-store';
// import { QueryParamStoreService } from './query-param-store/query-param-store.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'query-param-store';

  constructor(private store: QueryParamsStore<any>) {
    store.store.subscribe((data) => console.log('app', data));
  }
}
