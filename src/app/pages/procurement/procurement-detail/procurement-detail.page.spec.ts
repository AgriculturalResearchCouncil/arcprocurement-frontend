import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProcurementDetailPage } from './procurement-detail.page';

describe('ProcurementDetailPage', () => {
  let component: ProcurementDetailPage;
  let fixture: ComponentFixture<ProcurementDetailPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(ProcurementDetailPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
