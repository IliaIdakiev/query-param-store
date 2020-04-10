import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef, Input } from '@angular/core';
import { QueryParamsStore } from 'query-params-store';
import { map, shareReplay, first, debounceTime } from 'rxjs/operators';
import { Observable, fromEvent, Subject } from 'rxjs';
import { Router, ActivatedRoute } from '@angular/router';
import { appQueryBuilder } from 'src/app/shared/utils';

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

  getValue = (v) => v[1];

  constructor(private queryParamsStore: QueryParamsStore, private router: Router) {
    this.pageSize$ = queryParamsStore.select('pageSize').pipe(map(this.getValue), shareReplay());
    this.filter$ = queryParamsStore.select('filter').pipe(map(this.getValue), shareReplay());
    this.page$ = queryParamsStore.select('page').pipe(map(this.getValue), shareReplay());
  }

  onPageChange(data: { length: number, pageIndex: number, pageSize: number, previousPageIndex: number }) {
    this.router.navigate([], {
      queryParams: {
        pageSize: data.pageSize,
        page: data.pageIndex === 0 ? undefined : ++data.pageIndex
      },
      queryParamsHandling: 'merge'
    });
  }

  clearFilter() {
    this.queryParamsStore.store.pipe(first()).subscribe(store => {
      this.router.navigate([], {});
    });
  }

  ngAfterViewInit() {
    fromEvent<KeyboardEvent>(this.filterInput.nativeElement, 'keyup').pipe(
      debounceTime(500),
      map(e => (e.target as HTMLInputElement).value),
    ).subscribe((f: string) => {
      this.router.navigate([], { queryParams: { filter: f ? f : null, page: null }, queryParamsHandling: 'merge' });
    });
  }

  ngOnDestroy() {
    this.isAlive$.next(); this.isAlive$.complete();
  }

}
