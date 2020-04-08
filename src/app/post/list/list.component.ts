import { Component, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, Observable, fromEvent } from 'rxjs';
import { QueryParamsStore } from 'query-params-store';
import {
  takeUntil,
  distinctUntilChanged,
  map,
  shareReplay,
  first,
  withLatestFrom,
  debounceTime,
  filter,
  tap
} from 'rxjs/operators';
import { EntityComponent } from '../entity/entity.component';
import { RouterHelperService } from '../../shared/router-helper.service';
import { IPost, IUser } from '../../shared/interfaces';
import { PostService } from '../post.service';
import { appQueryBuilder } from '../../shared/utils';

@Component({
  selector: 'app-list',
  templateUrl: './list.component.html',
  styleUrls: ['./list.component.scss']
})
export class ListComponent implements AfterViewInit, OnDestroy {

  @ViewChild('filterInput', { static: true }) filterInput: ElementRef;
  isAlive$: Subject<void> = new Subject<void>();
  dialogRef: MatDialogRef<EntityComponent, any>;

  displayedColumns: string[] = ['id', 'title', 'userId', 'actions'];

  pageSize$: Observable<number>;
  filter$: Observable<string>;
  page$: Observable<number>;

  currentURL: string;

  constructor(
    dialog: MatDialog,
    routeHelper: RouterHelperService,
    activatedRoute: ActivatedRoute,
    private queryParamsStore: QueryParamsStore,
    private router: Router
  ) {
    this.queryParamsStore.store.pipe(takeUntil(this.isAlive$)).subscribe(console.log);
    this.pageSize$ = queryParamsStore.select('pageSize').pipe(shareReplay());
    this.filter$ = queryParamsStore.select('filter').pipe(shareReplay());
    this.page$ = queryParamsStore.select(state => state.page).pipe(shareReplay());

    this.currentURL = activatedRoute.snapshot.url.map(({ path }) => path).join('/');

    routeHelper.routeData$.pipe(
      takeUntil(this.isAlive$),
      distinctUntilChanged(),
      withLatestFrom(queryParamsStore.store)
    ).subscribe(([{ data: { dialogId = null } }, queryParamsState]) => {
      if (dialogId && !this.dialogRef) {
        const query = appQueryBuilder(queryParamsState);
        const closeNavigationUrl = `${this.currentURL}${query}`;
        this.dialogRef = dialog.open(EntityComponent, {
          data: { closeNavigationUrl },
          disableClose: true,
          width: '600px'
        });
      } else if (this.dialogRef) {
        this.dialogRef.close();
        this.dialogRef = null;
      }
    });
  }

  onPageChange(data: { length: number, pageIndex: number, pageSize: number, previousPageIndex: number }) {
    this.router.navigate([this.currentURL], {
      queryParams: {
        pageSize: data.pageSize,
        page: data.pageIndex === 0 ? undefined : ++data.pageIndex
      },
      queryParamsHandling: 'merge'
    });
  }

  clearFilter() {
    this.queryParamsStore.store.pipe(
      first(),
      map(({ filter: filterText, userId, page, ...others }) => ({ page: 1, ...others })),
      map(appQueryBuilder)
    ).subscribe(query => {
      this.router.navigateByUrl(`${this.currentURL}${query}`);
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
