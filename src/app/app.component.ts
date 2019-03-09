import { Component, OnDestroy } from '@angular/core';
import { QueryParamsStore } from 'query-params-store';
import { Observable, Subscription } from 'rxjs';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnDestroy {
  title = 'query-param-store';
  store: Observable<any>;

  subscription: Subscription;

  constructor(private qpsStore: QueryParamsStore) {
    this.store = qpsStore.store;
    this.subscription = this.store.subscribe((data) => console.log('app', data));
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }
}
