import { Component, DestroyRef, inject, OnInit, signal, WritableSignal } from '@angular/core';
import { BudgetService } from '../../core/services/budget/budget';
import { IncomeCard } from '../../shared/components/income-card/income-card';
import { BudgetCard } from '../../shared/components/budget-card/budget-card';
import { BudgetOverview } from '../../shared/components/budget-overview/budget-overview';
import { RecentExpenses } from '../../shared/components/recent-expenses/recent-expenses';
import { DashboardHero } from '../../features/dashboard-hero/dashboard-hero';
import { MoneyInsight } from '../../core/models/interface';
import { SmartInsightsService } from '../../core/services/smart-insights/smart-insights-service';
import { SmartInsights } from '../../shared/components/smart-insights/smart-insights';
import { NavigationEnd, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter, startWith } from 'rxjs';
import { IncomeBenefits } from '../../shared/components/income-benefits/income-benefits';

@Component({
  selector: 'app-dashboard',
  imports: [
    IncomeCard,
    BudgetCard,
    BudgetOverview,
    RecentExpenses,
    DashboardHero,
    SmartInsights,
    IncomeBenefits,
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit {
  protected readonly budgetService: BudgetService = inject<BudgetService>(BudgetService);
  private readonly smartInsightsService: SmartInsightsService =
    inject<SmartInsightsService>(SmartInsightsService);

  protected readonly moneyInsights: WritableSignal<MoneyInsight[]> = signal<MoneyInsight[]>([]);

  protected readonly loadingMoneyInsights: WritableSignal<boolean> = signal<boolean>(false);

  protected readonly moneyInsightsError: WritableSignal<string | null> = signal<string | null>(
    null,
  );

  private readonly router: Router = inject<Router>(Router);
  private readonly destroyRef: DestroyRef = inject<DestroyRef>(DestroyRef);

  private insightsLoadVersion = 0;

  public ngOnInit(): void {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        filter((event) => event.urlAfterRedirects.split('?')[0] === '/dashboard'),
        startWith(null),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        void this.loadMoneyInsights();
      });
  }

  protected async loadMoneyInsights(): Promise<void> {
    const currentLoadVersion = ++this.insightsLoadVersion;

    try {
      this.loadingMoneyInsights.set(true);
      this.moneyInsightsError.set(null);

      const insights = await this.smartInsightsService.getInsights();

      if (currentLoadVersion !== this.insightsLoadVersion) {
        return;
      }

      this.moneyInsights.set(insights);
    } catch (error) {
      if (currentLoadVersion !== this.insightsLoadVersion) {
        return;
      }

      console.error('Could not load smart insights:', error);

      this.moneyInsights.set([]);
      this.moneyInsightsError.set(
        error instanceof Error ? error.message : 'Could not load smart insights.',
      );
    } finally {
      if (currentLoadVersion === this.insightsLoadVersion) {
        this.loadingMoneyInsights.set(false);
      }
    }
  }
}
