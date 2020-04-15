import { Component, Inject, ViewChild, OnDestroy } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material';
import { Router } from '@angular/router';
import { Observable, of, Subject } from 'rxjs';
import { IPost } from '../../shared/interfaces';
import { first } from 'rxjs/operators';
import { NgForm } from '@angular/forms';
import { QueryParamsStore } from 'query-params-store';

@Component({
  selector: 'app-user-entity',
  templateUrl: './user-entity.component.html',
  styleUrls: ['./user-entity.component.scss']
})
export class UserEntityComponent implements OnDestroy {

  isAlive$: Subject<void> = new Subject<void>();
  completed$ = this.queryParamsStore.select<boolean>('completed');

  post$: Observable<IPost>;

  emptyPost: IPost = {
    title: '',
    id: 0,
    userId: 0,
    body: ''
  };

  get closeNavigationUrl(): string {
    return this.data && this.data.closeNavigationUrl;
  }

  constructor(
    @Inject(MAT_DIALOG_DATA) private data: any,
    private queryParamsStore: QueryParamsStore,
    private router: Router
  ) { }

  private closeDialog() {
    this.router.navigate([this.closeNavigationUrl], { queryParamsHandling: 'merge' });
  }

  toggleCompleted() {
    this.queryParamsStore.select('completed').pipe(first()).subscribe(completed => {
      this.router.navigate([], { queryParams: { completed: completed ? null : false }, queryParamsHandling: 'merge' });
    });
  }

  saveHandler() {
    this.closeDialog();
  }

  cancelHandler() {
    this.closeDialog();
  }

  ngOnDestroy() {
    this.isAlive$.next();
    this.isAlive$.complete();
  }
}
