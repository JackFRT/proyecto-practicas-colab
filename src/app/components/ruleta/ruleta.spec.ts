import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Ruleta } from './ruleta';

describe('Ruleta', () => {
  let component: Ruleta;
  let fixture: ComponentFixture<Ruleta>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Ruleta],
    }).compileComponents();

    fixture = TestBed.createComponent(Ruleta);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
