import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabase } from '../../../../lib/supabase';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature')!;

  let event: any;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('[webhook] Firma inválida:', err);
    return NextResponse.json({ error: 'Webhook inválido' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription: any = event.data.object;
        const customerId = subscription.customer as string;
        const customer: any = await stripe.customers.retrieve(customerId);
        const userId = customer.metadata?.userId;
        if (!userId) break;
        const isActive = ['active', 'trialing'].includes(subscription.status);
        const rawEnd = subscription.current_period_end;
        const periodEnd = rawEnd
          ? new Date(typeof rawEnd === 'number' ? rawEnd * 1000 : rawEnd).toISOString()
          : null;
        await supabase.from('subscriptions').upsert({
          user_id: userId,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscription.id,
          status: isActive ? 'pro' : 'free',
          current_period_end: periodEnd,
        });
        console.log(`[webhook] Usuario ${userId} → ${isActive ? 'PRO ✅' : 'FREE'}`);
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription: any = event.data.object;
        const customerId = subscription.customer as string;
        const customer: any = await stripe.customers.retrieve(customerId);
        const userId = customer.metadata?.userId;
        if (!userId) break;
        await supabase.from('subscriptions').update({ status: 'free', stripe_subscription_id: null }).eq('user_id', userId);
        console.log(`[webhook] Usuario ${userId} canceló Pro`);
        break;
      }
      case 'invoice.payment_failed': {
        const invoice: any = event.data.object;
        const customerId = invoice.customer as string;
        const customer: any = await stripe.customers.retrieve(customerId);
        const userId = customer.metadata?.userId;
        if (!userId) break;
        await supabase.from('subscriptions').update({ status: 'free' }).eq('user_id', userId);
        console.log(`[webhook] Pago fallido → Usuario ${userId} → FREE`);
        break;
      }
    }
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[webhook] Error procesando evento:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}