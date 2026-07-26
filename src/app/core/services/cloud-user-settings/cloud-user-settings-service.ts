import { Injectable, inject } from '@angular/core';
import { AuthService } from '../../auth/auth-service';
import { supabase } from '../../cloud/supabase.client';
import { CloudUserSettings, UpsertCloudUserSettingsPayload } from '../../models/interface';

@Injectable({
  providedIn: 'root',
})
export class CloudUserSettingsService {
  private readonly authService: AuthService = inject<AuthService>(AuthService);

  public async getSettings(): Promise<CloudUserSettings | null> {
    const userId = this.authService.getCurrentUserId();

    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;

    return data;
  }

  public async upsertSettings(
    payload: Omit<UpsertCloudUserSettingsPayload, 'user_id'>,
  ): Promise<CloudUserSettings> {
    const userId = this.authService.getCurrentUserId();

    const { data, error } = await supabase
      .from('user_settings')
      .upsert({ ...payload, user_id: userId }, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) throw error;

    return data;
  }
}
