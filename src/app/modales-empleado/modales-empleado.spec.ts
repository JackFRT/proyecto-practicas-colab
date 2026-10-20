import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalesEmpleado } from './modales-empleado';

describe('ModalesEmpleado', () => {
  let component: ModalesEmpleado;
  let fixture: ComponentFixture<ModalesEmpleado>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModalesEmpleado],
    }).compileComponents();

    fixture = TestBed.createComponent(ModalesEmpleado);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
