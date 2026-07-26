import { Injectable, inject } from '@angular/core';
import { AuthService } from '../../auth/auth-service';
import { supabase } from '../../cloud/supabase.client';
import {
  CloudSpendingPeriod,
  CreateCloudSpendingPeriodPayload,
  UpdateCloudSpendingPeriodPayload,
} from '../../models/interface';

@Injectable({
  providedIn: 'root',
})
export class SpendingPeriodsService {
  private readonly authService: AuthService = inject<AuthService>(AuthService);

  public async getSpendingPeriods(): Promise<CloudSpendingPeriod[]> {
    const userId = this.authService.getCurrentUserId();

    const { data, error } = await supabase
      .from('spending_periods')
      .select('*')
      .eq('user_id', userId)
      .order('period_start', { ascending: false });

    if (error) throw error;

    return data ?? [];
  }

  public async getCurrentSpendingPeriod(
    date: Date = new Date(),
  ): Promise<CloudSpendingPeriod | null> {
    const userId = this.authService.getCurrentUserId();
    const periodStart = this.getMonthStart(date);

    const { data, error } = await supabase
      .from('spending_periods')
      .select('*')
      .eq('user_id', userId)
      .eq('period_start', periodStart)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data ? this.normalizeSpendingPeriod(data) : null;
  }

  public async getOrCreateCurrentSpendingPeriod(
    date: Date = new Date(),
  ): Promise<CloudSpendingPeriod> {
    const existingPeriod = await this.getCurrentSpendingPeriod(date);

    if (existingPeriod) return existingPeriod;

    const userId = this.authService.getCurrentUserId();

    const periodStart = this.getMonthStart(date);
    const periodEnd = this.getMonthEnd(date);
    const defaultDailyLimit = await this.getLastDailyLimit();

    return this.createSpendingPeriod({
      user_id: userId,
      period_start: periodStart,
      period_end: periodEnd,
      daily_limit: defaultDailyLimit,
      currency: 'RON',
      include_planned_recurring: true,
      meal_vouchers_amount: 0,
      gift_cards_amount: 0,
    });
  }

  public async createSpendingPeriod(
    payload: CreateCloudSpendingPeriodPayload,
  ): Promise<CloudSpendingPeriod> {
    const userId = this.authService.getCurrentUserId();

    const { data, error } = await supabase
      .from('spending_periods')
      .insert({
        ...payload,
        user_id: userId,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return this.normalizeSpendingPeriod(data);
  }

  public async updateSpendingPeriod(
    id: string,
    payload: UpdateCloudSpendingPeriodPayload,
  ): Promise<CloudSpendingPeriod> {
    const userId = this.authService.getCurrentUserId();

    const { data, error } = await supabase
      .from('spending_periods')
      .update({
        ...payload,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return this.normalizeSpendingPeriod(data);
  }

  public async updateDailyLimit(id: string, dailyLimit: number): Promise<CloudSpendingPeriod> {
    return this.updateSpendingPeriod(id, {
      daily_limit: dailyLimit,
    });
  }

  public async updateIncomeBenefits(
    id: string,
    mealVouchersAmount: number,
    giftCardsAmount: number,
  ): Promise<CloudSpendingPeriod> {
    return this.updateSpendingPeriod(id, {
      meal_vouchers_amount: mealVouchersAmount,
      gift_cards_amount: giftCardsAmount,
    });
  }

  private async getLastDailyLimit(): Promise<number> {
    const userId = this.authService.getCurrentUserId();

    const { data, error } = await supabase
      .from('spending_periods')
      .select('daily_limit')
      .eq('user_id', userId)
      .order('period_start', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    return Number(data?.daily_limit ?? 100);
  }

  private getMonthStart(date: Date): string {
    return this.formatDateOnly(new Date(date.getFullYear(), date.getMonth(), 1));
  }

  private getMonthEnd(date: Date): string {
    return this.formatDateOnly(new Date(date.getFullYear(), date.getMonth() + 1, 0));
  }

  private formatDateOnly(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  private normalizeSpendingPeriod(period: CloudSpendingPeriod): CloudSpendingPeriod {
    return {
      ...period,
      daily_limit: Number(period.daily_limit ?? 0),
      meal_vouchers_amount: Number(period.meal_vouchers_amount ?? 0),
      gift_cards_amount: Number(period.gift_cards_amount ?? 0),
    };
  }
}
