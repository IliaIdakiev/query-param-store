import { Component } from '@angular/core';
import { QueryParamsStore } from 'query-params-store';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  constructor(qps: QueryParamsStore) {
    qps.store.subscribe(console.log);
  }
}
