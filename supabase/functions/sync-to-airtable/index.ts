import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const AIRTABLE_API_KEY = Deno.env.get('AIRTABLE_API_KEY');
const AIRTABLE_BASE_ID = 'app7BAYboMHMr7NtD';
const AIRTABLE_TABLE_NAME = 'MAP Tracking Sales & Data';

// Input validation schema
const TransactionSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  time: z.string().max(20),
  type: z.string().max(50),
  description: z.string().max(500),
  amount: z.number().finite(),
  net: z.number().finite(),
  category: z.string().max(100),
});

const TransactionsSchema = z.array(TransactionSchema).max(100);

interface Transaction {
  date: string;
  time: string;
  type: string;
  description: string;
  amount: number;
  net: number;
  category: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authentication check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('Missing Authorization header');
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Missing authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    
    if (authError || !user) {
      console.error('Authentication failed:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Authenticated request from user: ${user.id}`);

    const { transactions } = await req.json();
    
    if (!transactions || !Array.isArray(transactions)) {
      console.error('Invalid input: transactions must be an array');
      return new Response(
        JSON.stringify({ error: 'Invalid transactions data - must be an array' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate transaction data
    const validationResult = TransactionsSchema.safeParse(transactions);
    if (!validationResult.success) {
      console.error('Validation failed:', validationResult.error);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid transaction data', 
          details: validationResult.error.errors 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Syncing ${transactions.length} validated transactions to Airtable`);

    // Transform transactions to Airtable records format
    const records = transactions.map((transaction: Transaction) => ({
      fields: {
        'Date': transaction.date,
        'Time': transaction.time,
        'Type': transaction.type,
        'Description': transaction.description,
        'Amount': transaction.amount,
        'Net': transaction.net,
        'Category': transaction.category,
      }
    }));

    // Airtable API has a limit of 10 records per request, so we batch them
    const batchSize = 10;
    const batches = [];
    
    for (let i = 0; i < records.length; i += batchSize) {
      batches.push(records.slice(i, i + batchSize));
    }

    console.log(`Sending ${batches.length} batches to Airtable`);

    // Send all batches
    const results = await Promise.all(
      batches.map(async (batch) => {
        const response = await fetch(
          `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE_NAME)}`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ records: batch }),
          }
        );

        if (!response.ok) {
          const error = await response.text();
          console.error('Airtable API error:', error);
          throw new Error(`Airtable API error: ${error}`);
        }

        return await response.json();
      })
    );

    console.log('Successfully synced to Airtable');

    return new Response(
      JSON.stringify({ 
        success: true, 
        recordsCreated: transactions.length,
        batches: results.length 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in sync-to-airtable function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
