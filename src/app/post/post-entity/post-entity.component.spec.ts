import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { PostEntityComponent } from './post-entity.component';

describe('PostEntityComponent', () => {
  let component: PostEntityComponent;
  let fixture: ComponentFixture<PostEntityComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [PostEntityComponent]
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(PostEntityComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
