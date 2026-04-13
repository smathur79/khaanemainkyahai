import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

type Quote = { text: string; source: string | null };

export function useDailyQuote(): Quote | null {
  const [quote, setQuote] = useState<Quote | null>(null);

  useEffect(() => {
    supabase
      .from('motivational_sayings')
      .select('text, source')
      .eq('active', true)
      .order('created_at')
      .then(({ data }) => {
        if (!data || data.length === 0) return;
        const day = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
        setQuote(data[day % data.length]);
      });
  }, []);

  return quote;
}

export function formatQuoteFooter(quote: Quote | null): string {
  if (!quote) return '';
  const attribution = quote.source ? ` — ${quote.source}` : '';
  return `\n✨ _"${quote.text}"_${attribution}`;
}
