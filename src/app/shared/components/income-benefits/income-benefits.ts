import {
  Component,
  EventEmitter,
  OnInit,
  Output,
  WritableSignal,
  computed,
  inject,
  signal,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { CloudSpendingPeriod } from '../../../core/models/interface';
import { SpendingPeriodsService } from '../../../core/services/spending-periods/spending-periods-service';
import { BudgetService } from '../../../core/services/budget/budget';

@Component({
  selector: 'app-income-benefits',
  imports: [DecimalPipe],
  templateUrl: './income-benefits.html',
  styleUrl: './income-benefits.scss',
})
export class IncomeBenefits implements OnInit {
  private readonly spendingPeriodsService: SpendingPeriodsService =
    inject<SpendingPeriodsService>(SpendingPeriodsService);
  private readonly budgetService: BudgetService = inject<BudgetService>(BudgetService);

  @Output()
  public readonly benefitsUpdated = new EventEmitter<CloudSpendingPeriod>();

  protected readonly currentPeriod: WritableSignal<CloudSpendingPeriod | null> =
    signal<CloudSpendingPeriod | null>(null);

  protected readonly loading: WritableSignal<boolean> = signal<boolean>(true);

  protected readonly saving: WritableSignal<boolean> = signal<boolean>(false);

  protected readonly editing: WritableSignal<boolean> = signal<boolean>(false);

  protected readonly error: WritableSignal<string | null> = signal<string | null>(null);

  protected readonly mealVouchersInput: WritableSignal<string> = signal<string>('0');

  protected readonly giftCardsInput: WritableSignal<string> = signal<string>('0');

  protected readonly mealVouchersAmount = computed<number>(() =>
    Number(this.currentPeriod()?.meal_vouchers_amount ?? 0),
  );

  protected readonly giftCardsAmount = computed<number>(() =>
    Number(this.currentPeriod()?.gift_cards_amount ?? 0),
  );

  protected readonly totalBenefits = computed<number>(
    () => this.mealVouchersAmount() + this.giftCardsAmount(),
  );

  public async ngOnInit(): Promise<void> {
    await this.loadCurrentPeriod();
  }

  protected startEditing(): void {
    this.mealVouchersInput.set(String(this.mealVouchersAmount()));

    this.giftCardsInput.set(String(this.giftCardsAmount()));

    this.error.set(null);
    this.editing.set(true);
  }

  protected cancelEditing(): void {
    this.editing.set(false);
    this.error.set(null);
  }

  protected updateMealVouchersInput(event: Event): void {
    const input = event.target as HTMLInputElement;

    this.mealVouchersInput.set(input.value);
  }

  protected updateGiftCardsInput(event: Event): void {
    const input = event.target as HTMLInputElement;

    this.giftCardsInput.set(input.value);
  }

  protected async saveBenefits(): Promise<void> {
    const currentPeriod = this.currentPeriod();

    if (!currentPeriod) {
      this.error.set('The current spending period is unavailable.');
      return;
    }

    const mealVouchersAmount = Number(this.mealVouchersInput());

    const giftCardsAmount = Number(this.giftCardsInput());

    if (!Number.isFinite(mealVouchersAmount) || mealVouchersAmount < 0) {
      this.error.set('Please enter a valid meal vouchers amount.');
      return;
    }

    if (!Number.isFinite(giftCardsAmount) || giftCardsAmount < 0) {
      this.error.set('Please enter a valid gift cards amount.');
      return;
    }

    try {
      this.saving.set(true);
      this.error.set(null);

      const updatedPeriod = await this.spendingPeriodsService.updateIncomeBenefits(
        currentPeriod.id,
        mealVouchersAmount,
        giftCardsAmount,
      );

      this.currentPeriod.set(updatedPeriod);
      this.applyBenefitsToBudget(updatedPeriod);
      this.editing.set(false);

      this.benefitsUpdated.emit(updatedPeriod);
    } catch (error) {
      console.error('Could not update income benefits:', error);

      this.error.set(error instanceof Error ? error.message : 'Could not update income benefits.');
    } finally {
      this.saving.set(false);
    }
  }

  private async loadCurrentPeriod(): Promise<void> {
    try {
      this.loading.set(true);
      this.error.set(null);

      const period = await this.spendingPeriodsService.getOrCreateCurrentSpendingPeriod();

      this.currentPeriod.set(period);
      this.applyBenefitsToBudget(period);
    } catch (error) {
      console.error('Could not load income benefits:', error);

      this.error.set(error instanceof Error ? error.message : 'Could not load income benefits.');
    } finally {
      this.loading.set(false);
    }
  }

  private applyBenefitsToBudget(period: CloudSpendingPeriod): void {
    this.budgetService.setMonthlyBenefits(
      Number(period.meal_vouchers_amount ?? 0),
      Number(period.gift_cards_amount ?? 0),
    );
  }
}
