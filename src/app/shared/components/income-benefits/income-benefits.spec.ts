import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IncomeBenefits } from './income-benefits';

describe('IncomeBenefits', () => {
  let component: IncomeBenefits;
  let fixture: ComponentFixture<IncomeBenefits>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IncomeBenefits],
    }).compileComponents();

    fixture = TestBed.createComponent(IncomeBenefits);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
