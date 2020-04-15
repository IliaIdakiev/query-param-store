import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef, Input } from '@angular/core';
import { QueryParamsStore } from 'query-params-store';
import { map, shareReplay, first, debounceTime, withLatestFrom } from 'rxjs/operators';
import { Observable, fromEvent, Subject } from 'rxjs';
import { Router, ActivatedRoute } from '@angular/router';
import { appQueryBuilder } from '../../shared/utils';

@Component({
  selector: 'app-comments',
  templateUrl: './comments.component.html',
  styleUrls: ['./comments.component.scss']
})
export class CommentsComponent implements OnDestroy, AfterViewInit {
  @ViewChild('filterInput', { static: true }) filterInput: ElementRef;
  isAlive$: Subject<void> = new Subject<void>();
  @Input() postId: number;

  displayedColumns: string[] = ['id', 'name', 'email'];

  pageSize$: Observable<number>;
  filter$: Observable<string>;
  page$: Observable<number>;

  selectedPostId: number;

  getValue = (v) => v[1] || '';

  constructor(private queryParamsStore: QueryParamsStore, private router: Router) {
    this.pageSize$ = queryParamsStore.select('pageSize').pipe(map(this.getValue), shareReplay());
    this.filter$ = queryParamsStore.select('filter').pipe(map(this.getValue), shareReplay());
    this.page$ = queryParamsStore.select('page').pipe(map(this.getValue), shareReplay());
  }

  onPageChange(data: { length: number, pageIndex: number, pageSize: number, previousPageIndex: number }) {
    this.queryParamsStore.select(state => [state.page, state.pageSize]).pipe(first()).subscribe(([page, pageSize]) => {
      this.router.navigate([], {
        queryParams: {
          pageSize: `${pageSize[0]},${data.pageSize}`,
          page: `${page[0]},${data.pageIndex + 1}`
        },
        queryParamsHandling: 'merge'
      });
    });
  }

  clearFilter() {
    this.queryParamsStore.select(s => [s.page, s.pageSize]).pipe(first()).subscribe(([page, pageSize]) => {
      this.router.navigate([], {
        queryParams: {
          page: [page[0], 1],
          filter: ''
        }
      });
    });
  }

  ngAfterViewInit() {
    fromEvent<KeyboardEvent>(this.filterInput.nativeElement, 'keyup').pipe(
      debounceTime(500),
      map(e => (e.target as HTMLInputElement).value),
      withLatestFrom(this.queryParamsStore.select(s => s.filter[0]))
    ).subscribe(([currentFilter, firstTableFilter]) => {
      this.router.navigate([], {
        queryParams: {
          filter: `${firstTableFilter},${currentFilter}`,
          page: null
        }, queryParamsHandling: 'merge'
      });
    });
  }

  ngOnDestroy() {
    this.isAlive$.next(); this.isAlive$.complete();
  }

}
