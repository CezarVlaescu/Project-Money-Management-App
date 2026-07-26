import { Injectable, inject } from '@angular/core';
import { AuthService } from '../../auth/auth-service';
import {
  MoneyInsight,
  CloudSubscription,
  CloudSubscriptionPayment,
  CloudSavingsAccount,
  Expense,
  SavingsGoal,
  DailyAllowanceSummary,
} from '../../models/interface';
import { BudgetService } from '../budget/budget';
import { CloudSavingsAccountsService } from '../cloud-savings-accounts/cloud-savings-accounts-service';
import { CloudSubscriptionPaymentsService } from '../cloud-subscription-payments/cloud-subscription-payments-service';
import { CloudSubscriptionsService } from '../cloud-subscriptions/cloud-subscriptions-service';
import { ExpensesService } from '../expenses/expenses';
import { SavingsGoalsService } from '../savings/savings';
import { CloudExpensesService } from '../cloud-expenses/cloud-expenses-service';
import { DailyAllowanceCalculatorService } from '../daily-allowance-calculator/daily-allowance-calculator-service';
import { SpendingPeriodsService } from '../spending-periods/spending-periods-service';
import { MoneyInsightCategory } from '../../models/types/core.types';

@Injectable({
  providedIn: 'root',
})
export class SmartInsightsService {
  private readonly spendingPeriodsService: SpendingPeriodsService =
    inject<SpendingPeriodsService>(SpendingPeriodsService);

  private readonly cloudExpensesService: CloudExpensesService =
    inject<CloudExpensesService>(CloudExpensesService);

  private readonly dailyAllowanceCalculatorService: DailyAllowanceCalculatorService =
    inject<DailyAllowanceCalculatorService>(DailyAllowanceCalculatorService);
  private readonly authService: AuthService = inject<AuthService>(AuthService);
  private readonly budgetService: BudgetService = inject<BudgetService>(BudgetService);
  private readonly expensesService: ExpensesService = inject<ExpensesService>(ExpensesService);
  private readonly savingsGoalsService: SavingsGoalsService =
    inject<SavingsGoalsService>(SavingsGoalsService);

  private readonly cloudSubscriptionsService: CloudSubscriptionsService =
    inject<CloudSubscriptionsService>(CloudSubscriptionsService);

  private readonly cloudSavingsAccountsService: CloudSavingsAccountsService =
    inject<CloudSavingsAccountsService>(CloudSavingsAccountsService);

  private readonly cloudSubscriptionPaymentsService: CloudSubscriptionPaymentsService =
    inject<CloudSubscriptionPaymentsService>(CloudSubscriptionPaymentsService);

  public async getInsights(): Promise<MoneyInsight[]> {
    const income = this.budgetService.income();
    const expenses = this.expensesService.expenses();
    const goals = this.savingsGoalsService.goals();

    const [subscriptions, subscriptionPayments, savingsAccounts, dailyAllowanceSummary] =
      await this.getCloudDataSafely();

    const insights: MoneyInsight[] = [
      ...this.getDailyAllowanceInsights(dailyAllowanceSummary),
      ...this.getForecastInsights(dailyAllowanceSummary),
      ...this.getBudgetSplitInsights(income, expenses),
      ...this.getSpendingInsights(income, expenses),
      ...this.getSubscriptionInsights(income, subscriptions, subscriptionPayments),
      ...this.getSavingsInsights(savingsAccounts),
      ...this.getSavingsGoalInsights(goals),
    ];

    return this.selectTopInsights(insights);
  }

  private async getCloudDataSafely(): Promise<
    [
      CloudSubscription[],
      CloudSubscriptionPayment[],
      CloudSavingsAccount[],
      DailyAllowanceSummary | null,
    ]
  > {
    if (!this.authService.isLoggedIn()) {
      return [[], [], [], null];
    }

    try {
      const currentPeriod = await this.spendingPeriodsService.getOrCreateCurrentSpendingPeriod(
        new Date(),
      );

      const results = await Promise.allSettled([
        this.cloudSubscriptionsService.getActiveSubscriptions(),

        this.cloudSubscriptionPaymentsService.getPaymentsForPeriod(currentPeriod.period_start),

        this.cloudSavingsAccountsService.getSavingsAccounts(),

        this.cloudExpensesService.getExpensesByDateRange(
          currentPeriod.period_start,
          currentPeriod.period_end,
        ),
      ]);

      const subscriptions = results[0].status === 'fulfilled' ? results[0].value : [];

      const subscriptionPayments = results[1].status === 'fulfilled' ? results[1].value : [];

      const savingsAccounts = results[2].status === 'fulfilled' ? results[2].value : [];

      const cloudExpenses = results[3].status === 'fulfilled' ? results[3].value : [];

      const dailyAllowanceSummary = this.dailyAllowanceCalculatorService.calculateSummary(
        {
          id: currentPeriod.id,
          user_id: currentPeriod.user_id,
          period_start: currentPeriod.period_start,
          period_end: currentPeriod.period_end,
          daily_limit: Number(currentPeriod.daily_limit),
          currency: currentPeriod.currency,
          include_planned_recurring: currentPeriod.include_planned_recurring,
          created_at: currentPeriod.created_at,
          updated_at: currentPeriod.updated_at,
          meal_vouchers_amount: 0,
          gift_cards_amount: 0
        },
        cloudExpenses.map((expense) => ({
          id: expense.id,
          amount: Number(expense.amount),
          date: expense.expense_date,
        })),
        new Date(),
      );

      return [subscriptions, subscriptionPayments, savingsAccounts, dailyAllowanceSummary];
    } catch (error) {
      console.error('Could not load cloud data for insights:', error);

      return [[], [], [], null];
    }
  }

  private getSpendingInsights(income: number, expenses: Expense[]): MoneyInsight[] {
    if (income <= 0) {
      return [
        {
          id: 'missing-income',
          type: 'info',
          category: 'spending',
          title: 'Set your monthly income',
          message: 'Add your income so Money Bloom can calculate your budget and smarter insights.',
          icon: '💸',
          priority: 90,
          actionLabel: 'Go to settings',
          route: '/settings',
        },
      ];
    }

    const currentMonthExpenses = this.getCurrentMonthExpenses(expenses);
    const spentThisMonth = this.sumExpenses(currentMonthExpenses);
    const spendingRatio = spentThisMonth / income;

    const insights: MoneyInsight[] = [];

    if (spendingRatio >= 0.9) {
      insights.push({
        id: 'high-monthly-spending',
        type: 'danger',
        category: 'spending',
        title: 'You are close to your monthly income',
        message: `You already spent ${this.formatMoney(spentThisMonth)}, which is ${Math.round(
          spendingRatio * 100,
        )}% of your income.`,
        icon: '🚨',
        priority: 100,
        actionLabel: 'View expenses',
        route: '/expenses',
      });
    } else if (spendingRatio >= 0.7) {
      insights.push({
        id: 'medium-monthly-spending',
        type: 'warning',
        category: 'spending',
        title: 'Spending is getting high',
        message: `You spent ${this.formatMoney(
          spentThisMonth,
        )} this month. Keep an eye on the next purchases.`,
        icon: '⚠️',
        priority: 80,
        actionLabel: 'View expenses',
        route: '/expenses',
      });
    } else if (spentThisMonth > 0) {
      insights.push({
        id: 'healthy-monthly-spending',
        type: 'success',
        category: 'spending',
        title: 'Your spending looks controlled',
        message: `You spent ${this.formatMoney(
          spentThisMonth,
        )} so far this month. You are still below 70% of your income.`,
        icon: '✅',
        priority: 50,
      });
    }

    return insights;
  }

  private getSubscriptionInsights(
    income: number,
    subscriptions: CloudSubscription[],
    payments: CloudSubscriptionPayment[],
  ): MoneyInsight[] {
    const insights: MoneyInsight[] = [];

    if (!subscriptions.length) {
      return [
        {
          id: 'no-subscriptions',
          type: 'info',
          category: 'subscriptions',
          title: 'Track recurring payments',
          message: 'Add rent, Netflix, phone bills or other monthly payments to see their impact.',
          icon: '🔁',
          priority: 35,
          actionLabel: 'Open calendar',
          route: '/calendar',
        },
      ];
    }

    const monthlySubscriptionsTotal = subscriptions.reduce(
      (total, subscription) => total + Number(subscription.amount),
      0,
    );

    if (income > 0) {
      const subscriptionRatio = monthlySubscriptionsTotal / income;

      if (subscriptionRatio >= 0.3) {
        insights.push({
          id: 'high-subscriptions',
          type: 'warning',
          category: 'subscriptions',
          title: 'Recurring payments are high',
          message: `Your active recurring payments total ${this.formatMoney(
            monthlySubscriptionsTotal,
          )}/month, around ${Math.round(subscriptionRatio * 100)}% of your income.`,
          icon: '📆',
          priority: 85,
          actionLabel: 'Review payments',
          route: '/calendar',
        });
      } else {
        insights.push({
          id: 'subscriptions-total',
          type: 'info',
          category: 'subscriptions',
          title: 'Recurring payments tracked',
          message: `You have ${subscriptions.length} active recurring payments worth ${this.formatMoney(
            monthlySubscriptionsTotal,
          )}/month.`,
          icon: '🔁',
          priority: 45,
          actionLabel: 'Open calendar',
          route: '/calendar',
        });
      }
    }

    const pendingPayments = payments.filter((payment) => payment.status === 'pending');

    if (pendingPayments.length) {
      insights.push({
        id: 'pending-subscription-payments',
        type: 'warning',
        category: 'subscriptions',
        title: 'You have pending recurring payments',
        message: `${pendingPayments.length} recurring payment${
          pendingPayments.length === 1 ? ' is' : 's are'
        } still pending.`,
        icon: '⏳',
        priority: 75,
        actionLabel: 'Review payments',
        route: '/calendar',
      });
    }

    return insights;
  }

  private getSavingsInsights(accounts: CloudSavingsAccount[]): MoneyInsight[] {
    if (!accounts.length) {
      return [
        {
          id: 'no-savings-accounts',
          type: 'info',
          category: 'savings',
          title: 'Add where your savings are',
          message: 'Track money stored in bank accounts, XTB, deposits, cash or other places.',
          icon: '🏦',
          priority: 40,
          actionLabel: 'Open savings',
          route: '/savings-goals',
        },
      ];
    }

    const totalSaved = accounts.reduce(
      (total, account) => total + Number(account.current_amount),
      0,
    );

    const investmentsTotal = accounts
      .filter((account) => account.type === 'investment')
      .reduce((total, account) => total + Number(account.current_amount), 0);

    const insights: MoneyInsight[] = [
      {
        id: 'total-savings-accounts',
        type: 'success',
        category: 'savings',
        title: 'Savings are tracked',
        message: `You have ${this.formatMoney(totalSaved)} saved across ${
          accounts.length
        } place${accounts.length === 1 ? '' : 's'}.`,
        icon: '🌱',
        priority: 70,
        actionLabel: 'Open savings',
        route: '/savings-goals',
      },
    ];

    if (totalSaved > 0 && investmentsTotal / totalSaved >= 0.5) {
      insights.push({
        id: 'investment-heavy-savings',
        type: 'info',
        category: 'savings',
        title: 'Most savings are invested',
        message: `${Math.round(
          (investmentsTotal / totalSaved) * 100,
        )}% of your tracked savings are in investments.`,
        icon: '📈',
        priority: 55,
      });
    }

    return insights;
  }

  private getSavingsGoalInsights(goals: SavingsGoal[]): MoneyInsight[] {
    if (!goals.length) {
      return [
        {
          id: 'no-savings-goals',
          type: 'info',
          category: 'goals',
          title: 'Create your first savings goal',
          message: 'Add an emergency fund, vacation, house deposit or any goal you want to grow.',
          icon: '🎯',
          priority: 30,
          actionLabel: 'Open savings',
          route: '/savings-goals',
        },
      ];
    }

    const completedGoals = goals.filter(
      (goal) => Number(goal.currentAmount) >= Number(goal.targetAmount),
    );

    if (completedGoals.length) {
      return [
        {
          id: 'completed-savings-goals',
          type: 'success',
          category: 'goals',
          title: 'Savings goal completed',
          message: `${completedGoals.length} savings goal${
            completedGoals.length === 1 ? ' is' : 's are'
          } fully funded.`,
          icon: '🏆',
          priority: 65,
          actionLabel: 'Open savings',
          route: '/savings-goals',
        },
      ];
    }

    return [];
  }

  private getCurrentMonthExpenses(expenses: Expense[]): Expense[] {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    return expenses.filter((expense) => {
      const expenseDate = this.parseDateOnly(expense.date);

      return expenseDate.getFullYear() === currentYear && expenseDate.getMonth() === currentMonth;
    });
  }

  private sumExpenses(expenses: Expense[]): number {
    return expenses.reduce((total, expense) => total + Number(expense.amount), 0);
  }

  private parseDateOnly(value: string): Date {
    const datePart = value.split('T')[0];
    const [year, month, day] = datePart.split('-').map(Number);

    return new Date(year, month - 1, day);
  }

  private formatMoney(value: number): string {
    return (
      new Intl.NumberFormat('ro-RO', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(value) + ' lei'
    );
  }

  private getDailyAllowanceInsights(summary: DailyAllowanceSummary | null): MoneyInsight[] {
    if (!summary || summary.dailyLimit <= 0) {
      return [];
    }

    if (summary.isOverBudget) {
      return [
        {
          id: 'monthly-budget-exceeded',
          type: 'danger',
          category: 'daily_allowance',
          title: 'Monthly spending limit exceeded',
          message: `You are ${this.formatMoney(
            Math.abs(summary.remainingMonthlyBudget),
          )} over your planned monthly spending budget.`,
          icon: '🚨',
          priority: 110,
          actionLabel: 'Open calendar',
          route: '/calendar',
        },
      ];
    }

    if (summary.todayRemaining < 0) {
      return [
        {
          id: 'today-allowance-exceeded',
          type: 'warning',
          category: 'daily_allowance',
          title: 'Today’s allowance was exceeded',
          message: `You spent ${this.formatMoney(
            Math.abs(summary.todayRemaining),
          )} more than today’s adaptive allowance.`,
          icon: '⚠️',
          priority: 95,
          actionLabel: 'Review today',
          route: '/calendar',
        },
      ];
    }

    const allowanceRatio = summary.adaptiveDailyAllowance / summary.dailyLimit;

    if (allowanceRatio <= 0.75) {
      return [
        {
          id: 'daily-allowance-reduced',
          type: 'warning',
          category: 'daily_allowance',
          title: 'Your daily allowance has decreased',
          message: `Your allowance is now ${this.formatMoney(
            summary.adaptiveDailyAllowance,
          )} per day, down from ${this.formatMoney(summary.dailyLimit)}.`,
          icon: '📉',
          priority: 90,
          actionLabel: 'Open calendar',
          route: '/calendar',
        },
      ];
    }

    if (allowanceRatio >= 1.15) {
      return [
        {
          id: 'daily-allowance-ahead',
          type: 'success',
          category: 'daily_allowance',
          title: 'You are ahead of your spending plan',
          message: `Because you spent less earlier this month, your adaptive allowance is now ${this.formatMoney(
            summary.adaptiveDailyAllowance,
          )} per day.`,
          icon: '🌿',
          priority: 72,
          actionLabel: 'Open calendar',
          route: '/calendar',
        },
      ];
    }

    return [
      {
        id: 'daily-allowance-on-track',
        type: 'success',
        category: 'daily_allowance',
        title: 'Your daily allowance is on track',
        message: `You have ${this.formatMoney(
          Math.max(summary.todayRemaining, 0),
        )} available for today.`,
        icon: '🌱',
        priority: 60,
        actionLabel: 'Open calendar',
        route: '/calendar',
      },
    ];
  }

  private getForecastInsights(summary: DailyAllowanceSummary | null): MoneyInsight[] {
    if (!summary || summary.monthlyBudget <= 0) {
      return [];
    }

    const periodStart = this.parseDateOnly(summary.periodStart);
    const periodEnd = this.parseDateOnly(summary.periodEnd);

    const today = new Date();
    const normalizedToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    const totalDays = this.getDaysDifference(periodStart, periodEnd) + 1;

    const completedDays = this.getDaysDifference(periodStart, normalizedToday);

    if (completedDays < 3 || summary.spentBeforeToday <= 0) {
      return [];
    }

    const averageDailySpending = summary.spentBeforeToday / completedDays;

    const projectedMonthlySpending = averageDailySpending * totalDays;

    const projectedDifference = projectedMonthlySpending - summary.monthlyBudget;

    const projectedRatio = projectedMonthlySpending / summary.monthlyBudget;

    if (projectedRatio >= 1.2) {
      return [
        {
          id: 'monthly-forecast-danger',
          type: 'danger',
          category: 'forecast',
          title: 'You may significantly exceed your budget',
          message: `At your current pace, you may spend around ${this.formatMoney(
            projectedMonthlySpending,
          )}, approximately ${this.formatMoney(projectedDifference)} over your monthly plan.`,
          icon: '📈',
          priority: 105,
          actionLabel: 'Review calendar',
          route: '/calendar',
        },
      ];
    }

    if (projectedRatio > 1.05) {
      return [
        {
          id: 'monthly-forecast-warning',
          type: 'warning',
          category: 'forecast',
          title: 'You may exceed your monthly budget',
          message: `Your projected spending is approximately ${this.formatMoney(
            projectedMonthlySpending,
          )}, around ${this.formatMoney(projectedDifference)} above your plan.`,
          icon: '🔮',
          priority: 92,
          actionLabel: 'Review expenses',
          route: '/expenses',
        },
      ];
    }

    if (projectedRatio <= 0.85) {
      return [
        {
          id: 'monthly-forecast-success',
          type: 'success',
          category: 'forecast',
          title: 'You are projected to stay under budget',
          message: `At your current pace, you may finish the period around ${this.formatMoney(
            projectedMonthlySpending,
          )}.`,
          icon: '🌿',
          priority: 73,
          actionLabel: 'Open calendar',
          route: '/calendar',
        },
      ];
    }

    return [
      {
        id: 'monthly-forecast-on-track',
        type: 'info',
        category: 'forecast',
        title: 'Your monthly forecast is on track',
        message: `Your projected spending is approximately ${this.formatMoney(
          projectedMonthlySpending,
        )}, close to your planned monthly budget.`,
        icon: '🔮',
        priority: 58,
        actionLabel: 'Open calendar',
        route: '/calendar',
      },
    ];
  }

  private getDaysDifference(start: Date, end: Date): number {
    const millisecondsPerDay = 24 * 60 * 60 * 1000;

    const normalizedStart = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());

    const normalizedEnd = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());

    return Math.floor((normalizedEnd - normalizedStart) / millisecondsPerDay);
  }

  private getBudgetSplitInsights(income: number, expenses: Expense[]): MoneyInsight[] {
    if (income <= 0) {
      return [];
    }

    const currentMonthExpenses = this.getCurrentMonthExpenses(expenses);

    if (!currentMonthExpenses.length) {
      return [];
    }

    const totals = currentMonthExpenses.reduce(
      (result, expense) => {
        const amount = Number(expense.amount);

        if (!Number.isFinite(amount)) {
          return result;
        }

        switch (expense.category) {
          case 'needs':
            result.needs += amount;
            break;

          case 'wants':
            result.wants += amount;
            break;

          case 'savings':
            result.savings += amount;
            break;
        }

        return result;
      },
      {
        needs: 0,
        wants: 0,
        savings: 0,
      },
    );

    const needsRatio = totals.needs / income;
    const wantsRatio = totals.wants / income;
    const savingsRatio = totals.savings / income;

    const insights: MoneyInsight[] = [];

    if (wantsRatio > 0.3) {
      insights.push({
        id: 'wants-budget-exceeded',
        type: wantsRatio >= 0.4 ? 'danger' : 'warning',
        category: 'budget_split',
        title: 'Your wants budget is above 30%',
        message: `You recorded ${this.formatMoney(
          totals.wants,
        )} for wants this month, approximately ${Math.round(wantsRatio * 100)}% of your income.`,
        icon: '🛍️',
        priority: wantsRatio >= 0.4 ? 98 : 88,
        actionLabel: 'Review wants',
        route: '/expenses',
      });
    }

    if (needsRatio > 0.5) {
      insights.push({
        id: 'needs-budget-exceeded',
        type: needsRatio >= 0.65 ? 'danger' : 'warning',
        category: 'budget_split',
        title: 'Your needs budget is above 50%',
        message: `Your needs total ${this.formatMoney(totals.needs)}, approximately ${Math.round(
          needsRatio * 100,
        )}% of your monthly income.`,
        icon: '🏠',
        priority: needsRatio >= 0.65 ? 96 : 84,
        actionLabel: 'Review needs',
        route: '/expenses',
      });
    }

    if (savingsRatio >= 0.2) {
      insights.push({
        id: 'savings-target-reached',
        type: 'success',
        category: 'budget_split',
        title: 'You reached the 20% savings target',
        message: `You recorded ${this.formatMoney(
          totals.savings,
        )} toward savings this month, approximately ${Math.round(
          savingsRatio * 100,
        )}% of your income.`,
        icon: '🌱',
        priority: 69,
        actionLabel: 'Open savings',
        route: '/savings-goals',
      });
    } else if (this.isPastMiddleOfCurrentMonth() && savingsRatio < 0.1) {
      insights.push({
        id: 'savings-progress-low',
        type: 'info',
        category: 'budget_split',
        title: 'Savings progress is below your target',
        message: `You have recorded ${this.formatMoney(
          totals.savings,
        )} toward savings this month. Your 20% target would be ${this.formatMoney(income * 0.2)}.`,
        icon: '🎯',
        priority: 57,
        actionLabel: 'Open savings',
        route: '/savings-goals',
      });
    }

    return insights;
  }

  private isPastMiddleOfCurrentMonth(): boolean {
    const today = new Date();
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();

    return today.getDate() >= Math.ceil(daysInMonth / 2);
  }

  private selectTopInsights(insights: MoneyInsight[], limit = 5): MoneyInsight[] {
    const sortedInsights = [...insights].sort((first, second) => second.priority - first.priority);

    const selectedInsights: MoneyInsight[] = [];
    const selectedCategories = new Set<MoneyInsightCategory>();

    for (const insight of sortedInsights) {
      if (selectedCategories.has(insight.category)) {
        continue;
      }

      selectedInsights.push(insight);
      selectedCategories.add(insight.category);

      if (selectedInsights.length === limit) {
        break;
      }
    }

    return selectedInsights;
  }
}
