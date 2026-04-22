import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ used: 0, limit: 30, remaining: 30, isPro: false });
    }

    const month = new Date().toISOString().slice(0, 7);

    // Uso del mes
    const { data: usageData } = await supabase
      .from('usage')
      .select('generations')
      .eq('user_id', userId)
      .eq('month', month)
      .maybeSingle();

    // Estado de suscripción
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('status, current_period_end')
      .eq('user_id', userId)
      .maybeSingle();

    const isPro =
      subscription?.status === 'pro' &&
      subscription?.current_period_end &&
      new Date(subscription.current_period_end) > new Date();

    const used = usageData?.generations ?? 0;
    const limit = isPro ? Infinity : 30;
    const remaining = isPro ? Infinity : Math.max(30 - used, 0);

    return NextResponse.json({ used, limit, remaining, isPro: !!isPro });
  } catch (error) {
    console.error('[usage]', error);
    return NextResponse.json({ used: 0, limit: 30, remaining: 30, isPro: false });
  }
}