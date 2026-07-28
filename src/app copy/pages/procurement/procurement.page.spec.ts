import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProcurementPage } from './procurement.page';

describe('ProcurementPage', () => {
  let component: ProcurementPage;
  let fixture: ComponentFixture<ProcurementPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(ProcurementPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
