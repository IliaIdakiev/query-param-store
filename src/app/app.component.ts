import { Component, OnDestroy } from '@angular/core';
import { QueryParamsStore } from 'query-params-store';
import { Subject, Observable } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnDestroy {
  title = 'query-param-store';
  store: Observable<any>;

  isAlive$: Subject<any> = new Subject<any>();

  constructor(private qpsStore: QueryParamsStore) {
    this.store = qpsStore.store;
    this.store.pipe(
      takeUntil(this.isAlive$)
    ).subscribe((data) => console.log('app', data));

    this.qpsStore.prevStore.pipe(
      takeUntil(this.isAlive$)
    ).subscribe((data) => console.log('app - prev', data));
  }

  ngOnDestroy() {
    this.isAlive$.next(); this.isAlive$.complete();
  }
}
