import { Component, computed, inject } from '@angular/core';
import { BudgetService } from '../../../core/services/budget/budget';
import { MoneyFormatter } from '../../services/moeny-formatter/money-formatter';

@Component({
  selector: 'app-budget-overview',
  templateUrl: './budget-overview.html',
  styleUrl: './budget-overview.scss',
})
export class BudgetOverview {
  protected readonly budgetService: BudgetService = inject<BudgetService>(BudgetService);

  protected readonly moneyFormatterService: MoneyFormatter = inject<MoneyFormatter>(MoneyFormatter);

  protected readonly chartBackground = computed<string>(() => {
    const summary = this.budgetService.budgetSummary();
    const totalAvailable = summary.totalAvailableIncome;

    if (totalAvailable <= 0) {
      return `
        conic-gradient(
          var(--surface-muted) 0deg 360deg
        )
      `;
    }

    const needsEnd = (summary.needs.amount / totalAvailable) * 360;

    const wantsEnd = needsEnd + (summary.wants.amount / totalAvailable) * 360;

    return `
      conic-gradient(
        var(--needs) 0deg ${needsEnd}deg,
        var(--wants) ${needsEnd}deg ${wantsEnd}deg,
        var(--savings) ${wantsEnd}deg 360deg
      )
    `;
  });
}
