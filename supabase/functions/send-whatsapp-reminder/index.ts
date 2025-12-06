import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ReminderRequest {
  userId: string;
  cardName: string;
  bankName: string;
  billAmount: number;
  dueDate: number;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Extract user ID from JWT token instead of trusting request body
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    
    const userId = user.id;
    const { cardName, bankName, billAmount, dueDate }: Omit<ReminderRequest, 'userId'> = await req.json();

    // Get user's phone number from profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('phone_number')
      .eq('user_id', userId)
      .single();

    if (profileError || !profile?.phone_number) {
      return new Response(
        JSON.stringify({ error: 'Phone number not found. Please update your profile.' }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const phoneNumber = profile.phone_number.replace(/\D/g, '');
    
    // Format message
    const message = `🔔 *Credit Card Bill Reminder*

💳 Card: ${bankName} ${cardName}
💰 Amount: ₹${billAmount.toLocaleString('en-IN')}
📅 Due Date: ${dueDate}th of this month

Don't forget to pay your bill on time to avoid late fees!

- Finance Tracker`;

    // Using WhatsApp Business API via direct link (fallback)
    // In production, you'd integrate with Twilio, MessageBird, or WhatsApp Business API
    const whatsappUrl = `https://api.whatsapp.com/send?phone=${phoneNumber}&text=${encodeURIComponent(message)}`;

    console.log(`Reminder prepared for ${phoneNumber}`);
    console.log(`WhatsApp URL: ${whatsappUrl}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Reminder prepared',
        whatsappUrl,
        phoneNumber
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-whatsapp-reminder:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
