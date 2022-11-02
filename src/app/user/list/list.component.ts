import { Component, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { Subject, Observable, fromEvent } from 'rxjs';
import { QueryParamsStore } from 'query-params-store';
import {
  takeUntil,
  distinctUntilChanged,
  map,
  shareReplay,
  first,
  withLatestFrom,
  debounceTime
} from 'rxjs/operators';
import { UserEntityComponent } from '../user-entity/user-entity.component';
import { RouterHelperService } from '../../shared/router-helper.service';
import { appQueryBuilder } from '../../shared/utils';
import { PageEvent } from '@angular/material/paginator';

@Component({
  selector: 'app-list',
  templateUrl: './list.component.html',
  styleUrls: ['./list.component.scss']
})
export class ListComponent implements AfterViewInit, OnDestroy {

  @ViewChild('filterInput', { static: true }) filterInput!: ElementRef;
  isAlive$: Subject<void> = new Subject<void>();
  dialogRef!: MatDialogRef<UserEntityComponent, any> | null;

  displayedColumns: string[] = ['id', 'username', 'email', 'actions'];

  pageSize$: Observable<number>;
  filter$: Observable<string>;
  page$: Observable<number>;

  isDialogDisabled$ = this.queryParamsStore.select<boolean>('disableDialog');

  constructor(
    dialog: MatDialog,
    routeHelper: RouterHelperService,
    private queryParamsStore: QueryParamsStore,
    private router: Router
  ) {
    this.pageSize$ = queryParamsStore.select('pageSize').pipe(shareReplay());
    this.filter$ = queryParamsStore.select('filter').pipe(shareReplay());
    this.page$ = queryParamsStore.select(state => state.page).pipe(shareReplay());

    routeHelper.routeData$.pipe(
      takeUntil(this.isAlive$),
      distinctUntilChanged(),
      withLatestFrom(queryParamsStore.store)
    ).subscribe(([{ data: { dialogId = null } }, queryParamsState]) => {
      if (dialogId && !this.dialogRef) {
        this.dialogRef = dialog.open(UserEntityComponent, {
          autoFocus: false,
          data: { closeNavigationUrl: '/user/list' },
          disableClose: true,
          width: '600px',
          closeOnNavigation: false
        });
      } else if (this.dialogRef && !dialogId) {
        this.dialogRef.close();
        this.dialogRef = null;
      }
    });
  }

  onPageChange(data: PageEvent) {
    this.router.navigate([], {
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
      this.router.navigate([]);
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

  toggleDialogDisable() {
    this.isDialogDisabled$.pipe(first()).subscribe(isDialogDisabled => {
      this.router.navigate([], {
        queryParams: {
          disableDialog: isDialogDisabled ? null : true, page: null
        },
        queryParamsHandling: 'merge'
      });
    });
  }

  ngOnDestroy() {
    this.isAlive$.next(); this.isAlive$.complete();
  }

}
