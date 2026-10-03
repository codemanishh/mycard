-- Migration to create the savings table in Supabase

CREATE TABLE IF NOT EXISTS public.savings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('cash', 'sip', 'stock')),
    real_value NUMERIC(12, 2) NOT NULL DEFAULT 0,
    current_value NUMERIC(12, 2) NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.savings ENABLE ROW LEVEL SECURITY;

-- Row Level Security Policies
CREATE POLICY "Users can view own savings" ON public.savings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own savings" ON public.savings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own savings" ON public.savings
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own savings" ON public.savings
    FOR DELETE USING (auth.uid() = user_id);
