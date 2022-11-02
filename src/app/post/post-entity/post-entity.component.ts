import { Component, Inject, OnDestroy } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { Observable, Subject } from 'rxjs';
import { IPost } from '../../shared/interfaces';
import { first } from 'rxjs/operators';
import { QueryParamsStore } from 'query-params-store';

@Component({
  selector: 'app-post-entity',
  templateUrl: './post-entity.component.html',
  styleUrls: ['./post-entity.component.scss']
})
export class PostEntityComponent implements OnDestroy {

  isAlive$: Subject<void> = new Subject<void>();
  completed$ = this.queryParamsStore.select<boolean>('completed');

  post$!: Observable<IPost>;

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
      this.router.navigate([], { queryParams: { completed: completed ? false : null }, queryParamsHandling: 'merge' });
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
