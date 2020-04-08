import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { UserEntityComponent } from './user-entity.component';

describe('EntityComponent', () => {
  let component: UserEntityComponent;
  let fixture: ComponentFixture<UserEntityComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [UserEntityComponent]
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(UserEntityComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
