import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useOffline } from '@/contexts/OfflineContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { 
  ArrowLeft, Plus, Search, Edit2, Trash2, Calendar, 
  Flag, Tag, CheckCircle2, Circle, Loader2, X,
  ListTodo, Clock, Mic, MicOff
} from 'lucide-react';
import { format } from 'date-fns';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { generateTaskSummary, suggestNextActions } from '@/lib/aiUtils';
import { detectMissedFinancialTasks, SuggestedTask } from '@/lib/smartAutoTodo';
import { SmartTodoDetector } from '@/components/SmartTodoDetector';
import { CreditCard as CreditCardType } from '@/types/creditCard';
import { BankAccount, Lending } from '@/types/expense';
import { checkIsAssignerAllowed, verifyAndAddAssigner } from '@/lib/assignmentPermissions';
import { KeyRound, ShieldAlert, Copy, User } from 'lucide-react';

interface Subtask {
  id: string;
  todo_id: string;
  title: string;
  is_completed: boolean;
  order_index: number;
  created_at: string;
}

interface Todo {
  id: string;
  title: string;
  description?: string;
  due_date?: string;
  expected_completion_date?: string;
  assigned_to?: string | null;
  assigned_by?: string | null;
  assignment_status?: string | null; // open | pending | accepted | rejected | closed
  assigned_at?: string | null;
  accepted_at?: string | null;
  priority: 'low' | 'medium' | 'high';
  category?: string;
  is_completed: boolean;
  is_deleted?: boolean | null;
  deleted_by?: string | null;
  deleted_at?: string | null;
  recurrence_pattern?: string | null; // 'daily' | 'weekly' | 'monthly' | 'yearly'
  recurrence_end_date?: string | null;
  parent_todo_id?: string | null;
  is_template?: boolean | null;
  created_at: string;
  subtasks?: Subtask[];
}

const CATEGORIES = ['Work', 'Personal', 'Shopping', 'Health', 'Finance', 'Other'];
const PRIORITY_COLORS = {
  low: 'bg-success/20 text-success border-success/30',
  medium: 'bg-warning/20 text-warning border-warning/30',
  high: 'bg-destructive/20 text-destructive border-destructive/30',
};

// Utility function to check if date is today
const isToday = (dateString?: string): boolean => {
  if (!dateString) return false;
  const today = new Date();
  const date = new Date(dateString);
  return date.getFullYear() === today.getFullYear() &&
         date.getMonth() === today.getMonth() &&
         date.getDate() === today.getDate();
};

// Utility function to check if date is within this week
const isThisWeek = (dateString?: string): boolean => {
  if (!dateString) return false;
  const date = new Date(dateString);
  const today = new Date();
  const weekFromToday = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
  return date >= today && date <= weekFromToday;
};

// Utility function to get days until due date safely
const daysUntilDue = (dateString?: string): number | null => {
  if (!dateString) return null;
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    const diff = date.getTime() - today.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  } catch {
    return null;
  }
};

// Safe date-fns formatter helper to prevent RangeError crashes on invalid date strings
const safeFormatDueDate = (dateString?: string): string | null => {
  if (!dateString) return null;
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return null;
    return format(d, 'MMM d');
  } catch {
    return null;
  }
};

// Utility function to sort todos primarily by due date
const sortTodosByDueDate = (todosToSort: Todo[]): Todo[] => {
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  
  return [...todosToSort].sort((a, b) => {
    const aDays = daysUntilDue(a.due_date);
    const bDays = daysUntilDue(b.due_date);

    // 1. Primary sort: Due Date (nearest due date first; overdue/today at top)
    if (aDays !== null && bDays !== null) {
      if (aDays !== bDays) return aDays - bDays;
    }
    // Tasks with a due date come before tasks without a due date
    if (aDays !== null && bDays === null) return -1;
    if (aDays === null && bDays !== null) return 1;

    // 2. Secondary sort: Priority
    const aPri = priorityOrder[a.priority as 'high' | 'medium' | 'low'] ?? 1;
    const bPri = priorityOrder[b.priority as 'high' | 'medium' | 'low'] ?? 1;
    const priorityDiff = aPri - bPri;
    if (priorityDiff !== 0) return priorityDiff;

    // 3. Tertiary sort: Creation date (newest first)
    const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
    const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
    const validA = isNaN(aTime) ? 0 : aTime;
    const validB = isNaN(bTime) ? 0 : bTime;
    return validB - validA;
  });
};

interface TodoAppProps {
  embedMode?: boolean;
}

const TodoApp = ({ embedMode = false }: TodoAppProps = {}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { transcript, isListening, startListening, stopListening, clearTranscript, setTranscript } = useVoiceInput();
  const isOnline = useOnlineStatus();
  
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'all' | 'assigned_to_me' | 'assigned_by_me' | 'completed' | 'deleted'>('all');
  const [completedFilter, setCompletedFilter] = useState<'all' | 'own' | 'assigned'>('all');
  const [deletedFilter, setDeletedFilter] = useState<'all' | 'own' | 'assigned'>('all');
  
  // User Profile Info Modal state
  const [userModalProfile, setUserModalProfile] = useState<{ name: string; email: string; user_id?: string } | null>(null);

  // OTP Verification Modal state
  const [otpModalOpen, setOtpModalOpen] = useState(false);
  const [otpCodeInput, setOtpCodeInput] = useState('');
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [pendingAssignmentData, setPendingAssignmentData] = useState<{
    targetUserId: string;
    targetEmail: string;
    targetName: string;
    formData: any;
    editingTodo: any;
  } | null>(null);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [showSubtasks, setShowSubtasks] = useState<string | null>(null); // ID of todo showing subtasks
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [upcomingReminders, setUpcomingReminders] = useState<Array<{ id: string; title: string; scheduled_at: string }>>([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    due_date: '',
    expected_completion_date: '',
    assignee_email: '',
    assigned_to: '',
    assignTo: false,
    priority: 'medium' as 'low' | 'medium' | 'high',
    category: '',
    recurrence_pattern: 'none' as 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly',
    is_template: false,
  });

  const { queueMutation } = useOffline();

  const [assigneeProfile, setAssigneeProfile] = useState<{ id: string; full_name?: string; avatar_url?: string; email?: string } | null>(null);
  const [profileCache, setProfileCache] = useState<Record<string, { full_name?: string; avatar_url?: string; email?: string }>>({});

  const [detectedTasks, setDetectedTasks] = useState<SuggestedTask[]>([]);

  useEffect(() => {
    if (!user) return;
    fetchTodos();

    // Subscribe to real-time changes on todos table
    const channel = supabase
      .channel('public:todos-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'todos' }, () => {
        fetchTodos();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const runAutoDetection = async (currentTodos: Todo[]) => {
    try {
      const [cardsRes, banksRes, lendingsRes] = await Promise.all([
        supabase.from('credit_cards').select('*'),
        supabase.from('bank_accounts').select('*'),
        supabase.from('lendings').select('*'),
      ]);

      const cards: CreditCardType[] = (cardsRes.data || []).map((c: any) => ({
        id: c.id,
        cardName: c.card_name,
        bankName: c.bank_name,
        billingDate: Number(c.billing_date),
        currentBill: Number(c.current_bill) || 0,
        limitAmount: Number(c.limit_amount) || 0,
        limitType: c.limit_type,
        status: c.status,
        notes: c.notes || '',
        createdAt: c.created_at,
      }));

      const bankAccounts: BankAccount[] = (banksRes.data || []).map((b: any) => ({
        id: b.id,
        bankName: b.bank_name,
        balance: Number(b.balance) || 0,
        type: b.type,
      }));

      const lendings: Lending[] = (lendingsRes.data || []).map((l: any) => ({
        id: l.id,
        personName: l.person_name,
        amount: Number(l.amount) || 0,
        givenDate: l.given_date,
        reminderDate: l.reminder_date || undefined,
        borrowerPhone: l.borrower_phone || undefined,
        isReturned: l.is_returned || false,
        note: l.note || undefined,
        createdAt: l.created_at,
      }));

      const existingTitles = currentTodos.map(t => t.title);
      const found = detectMissedFinancialTasks(cards, bankAccounts, lendings, existingTitles);
      setDetectedTasks(found);
    } catch (err) {
      console.warn('Auto detection scan error:', err);
    }
  };

  const handleAddSingleTask = async (task: {
    title: string;
    description?: string;
    category: string;
    priority: 'low' | 'medium' | 'high';
    due_date?: string;
  }) => {
    if (!user) return;
    const newTodoData = {
      user_id: user.id,
      title: task.title,
      description: task.description || null,
      due_date: task.due_date || null,
      priority: task.priority,
      category: task.category || 'Finance',
      is_completed: false,
    };

    if (navigator.onLine) {
      const { data, error } = await supabase.from('todos').insert(newTodoData).select().single();
      if (!error && data) {
        const addedTodo = {
          ...data,
          priority: data.priority as 'low' | 'medium' | 'high',
          description: data.description || undefined,
          due_date: data.due_date || undefined,
          subtasks: [],
        };
        setTodos(prev => sortTodosByDueDate([addedTodo as any, ...prev]));
        toast({ title: 'Task Added', description: task.title });
      }
    } else {
      const tempId = `offline-todo-${Date.now()}`;
      await queueMutation('supabase', { op: 'insert', table: 'todos', data: newTodoData });
      const newTodo = { id: tempId, ...newTodoData, created_at: new Date().toISOString(), subtasks: [] } as any;
      setTodos(prev => sortTodosByDueDate([newTodo, ...prev]));
      toast({ title: 'Task Added (offline)', description: task.title });
    }

    setDetectedTasks(prev => prev.filter(t => t.title.toLowerCase().trim() !== task.title.toLowerCase().trim()));
  };

  const handleAddAllDetectedTasks = async () => {
    for (const task of detectedTasks) {
      await handleAddSingleTask(task);
    }
    toast({ title: `Added ${detectedTasks.length} Missed Tasks!` });
    setDetectedTasks([]);
  };

  const getDisplayName = (userId?: string | null, fallbackEmail?: string) => {
    if (userId && profileCache[userId]) {
      const p = profileCache[userId];
      if (p.full_name && p.full_name.trim()) return p.full_name.trim();
      if (p.email) {
        const uname = p.email.split('@')[0];
        return uname.charAt(0).toUpperCase() + uname.slice(1);
      }
    }
    if (fallbackEmail && fallbackEmail.includes('@')) {
      const uname = fallbackEmail.split('@')[0];
      return uname.charAt(0).toUpperCase() + uname.slice(1);
    }
    return fallbackEmail || 'User';
  };

  const getFullEmail = (userId?: string | null, fallbackEmail?: string) => {
    if (userId && profileCache[userId]?.email) return profileCache[userId].email;
    return fallbackEmail || '';
  };

  const handleOpenUserModal = (userId?: string | null, fallbackEmail?: string) => {
    const name = getDisplayName(userId, fallbackEmail);
    const email = getFullEmail(userId, fallbackEmail);
    if (email || name) {
      setUserModalProfile({ name, email: email || 'N/A', user_id: userId || undefined });
    }
  };

  const getProfileById = async (userId: string) => {
    if (!userId) return null;
    if (profileCache[userId]) return profileCache[userId];
    const { data, error } = await supabase
      .from('public_profiles_view')
      .select('user_id, id, email, full_name, avatar_url')
      .or(`user_id.eq.${userId},id.eq.${userId}`)
      .maybeSingle();
    if (!error && data) {
      const normalized = {
        user_id: (data as any).user_id,
        profile_id: (data as any).id,
        id: (data as any).user_id || (data as any).id,
        full_name: (data as any).full_name || undefined,
        avatar_url: (data as any).avatar_url || undefined,
        email: (data as any).email,
      };
      setProfileCache(prev => ({
        ...prev,
        [(data as any).user_id]: normalized,
        [(data as any).id]: normalized,
        [((data as any).email || '').toLowerCase()]: normalized,
      }));
      return normalized;
    }
    return null;
  };

  const fetchTodos = async () => {
    const { data, error } = await supabase
      .from('todos')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      const mappedTodos = data
        .filter(t => t.category !== '__USER_OTP_CODE__')
        .map(t => ({
        ...t,
        priority: t.priority as 'low' | 'medium' | 'high',
        description: t.description || undefined,
        due_date: t.due_date || undefined,
        expected_completion_date: t.expected_completion_date || undefined,
        assigned_to: t.assigned_to || undefined,
        assigned_by: t.assigned_by || undefined,
        assignment_status: t.assignment_status || undefined,
        assigned_at: t.assigned_at || undefined,
        accepted_at: t.accepted_at || undefined,
        is_deleted: t.is_deleted || false,
        deleted_by: t.deleted_by || undefined,
        deleted_at: t.deleted_at || undefined,
        recurrence_pattern: t.recurrence_pattern || undefined,
        recurrence_end_date: t.recurrence_end_date || undefined,
        parent_todo_id: t.parent_todo_id || undefined,
        is_template: t.is_template || false,
        category: t.category || undefined,
        subtasks: [],
      }));

      // Fetch subtasks for all todos
      const { data: subtasksData } = await supabase
        .from('subtasks')
        .select('*')
        .in('todo_id', mappedTodos.map(t => t.id));

      if (subtasksData) {
        const subtasksByTodo = subtasksData.reduce((acc: Record<string, Subtask[]>, s) => {
          if (!acc[s.todo_id]) acc[s.todo_id] = [];
          acc[s.todo_id].push(s);
          return acc;
        }, {});

        const todosWithSubtasks = mappedTodos.map(t => ({
          ...t,
          subtasks: (subtasksByTodo[t.id] || []).sort((a, b) => a.order_index - b.order_index),
        }));
        setTodos(todosWithSubtasks);
      } else {
        setTodos(mappedTodos);
      }

      // Pre-fetch both assignee and assigner profiles so email/name badges work
      const userIdsToFetch = [...new Set([user.id, ...mappedTodos.flatMap(t => [t.user_id, t.assigned_to, t.assigned_by]).filter(Boolean)])];
      for (const id of userIdsToFetch) {
        await getProfileById(id as string);
      }

      // Run smart auto-detection scan for missed financial tasks
      runAutoDetection(mappedTodos);
    }
    setLoading(false);
  };

  const lookupProfileByEmail = async (email: string) => {
    if (!email || !email.includes('@')) {
      setAssigneeProfile(null);
      return null;
    }
    try {
      const { data, error } = await supabase
        .from('public_profiles_view')
        .select('user_id, id, email, full_name, avatar_url')
        .ilike('email', email.trim())
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        const normalized = {
          id: (data as any).user_id || (data as any).id,
          user_id: (data as any).user_id,
          profile_id: (data as any).id,
          email: (data as any).email,
          full_name: (data as any).full_name,
          avatar_url: (data as any).avatar_url,
        };
        setAssigneeProfile(normalized);
        setProfileCache(prev => ({
          ...prev,
          [normalized.user_id]: normalized,
          [normalized.profile_id]: normalized,
          [normalized.email.toLowerCase()]: normalized,
        }));
        return normalized;
      }
      setAssigneeProfile(null);
      return null;
    } catch (err: any) {
      setAssigneeProfile(null);
      return null;
    }
  };

  // Profile search/autocomplete (returns up to 5 matches)
  const [profileSuggestions, setProfileSuggestions] = useState<Array<{ id: string; user_id?: string; profile_id?: string; full_name?: string; email?: string; avatar_url?: string }>>([]);
  const [profileSearchQuery, setProfileSearchQuery] = useState('');
  const [profileSearchLoading, setProfileSearchLoading] = useState(false);

  const searchProfiles = async (q: string) => {
    if (!q || q.length < 2) {
      setProfileSuggestions([]);
      return;
    }
    setProfileSearchLoading(true);
    try {
      const { data, error } = await supabase
        .from('public_profiles_view')
        .select('user_id, id, email, full_name, avatar_url')
        .ilike('email', `%${q}%`)
        .limit(5);
      setProfileSearchLoading(false);
      if (error) {
        setProfileSuggestions([]);
        return;
      }
      setProfileSuggestions((data as any || []).map((d: any) => ({
        user_id: d.user_id,
        id: d.user_id || d.id, // Always auth user UUID!
        profile_id: d.id,
        email: d.email,
        full_name: d.full_name,
        avatar_url: d.avatar_url
      })));
    } catch (err: any) {
      setProfileSearchLoading(false);
      setProfileSuggestions([]);
    }
  };

  // Debounced search when typing into assign input
  useEffect(() => {
    const t = setTimeout(() => {
      if (formData.assignTo) searchProfiles(profileSearchQuery || formData.assignee_email);
    }, 300);
    return () => clearTimeout(t);
  }, [profileSearchQuery, formData.assignee_email, formData.assignTo]);

  const executeSaveTodo = async (form: any, editing: any, targetAssignedTo: string | null) => {
    if (!user) return;
    if (editing) {
      if (navigator.onLine) {
        const { error } = await supabase
          .from('todos')
          .update({
            title: form.title,
            description: form.description || null,
            due_date: form.due_date || null,
            expected_completion_date: form.expected_completion_date || null,
            assigned_to: targetAssignedTo,
            assigned_by: targetAssignedTo ? user.id : null,
            assignment_status: targetAssignedTo ? 'pending' : 'open',
            assigned_at: targetAssignedTo ? new Date().toISOString() : null,
            priority: form.priority,
            category: form.category || null,
            recurrence_pattern: form.recurrence_pattern === 'none' ? null : form.recurrence_pattern,
            is_template: (form as any).is_template,
          })
          .eq('id', editing.id);

        if (!error) {
          const updatedTodos = todos.map(t => 
            t.id === editing.id 
              ? { ...t, ...form, assigned_to: targetAssignedTo || undefined, assigned_by: targetAssignedTo ? user.id : undefined, description: form.description || undefined, due_date: form.due_date || undefined, expected_completion_date: form.expected_completion_date || undefined, category: form.category || undefined }
              : t
          );
          setTodos(sortTodosByDueDate(updatedTodos));
          toast({ title: 'Task Updated' });
        }
      } else {
        await queueMutation('supabase', { op: 'update', table: 'todos', data: { title: form.title, description: form.description || null, due_date: form.due_date || null, expected_completion_date: form.expected_completion_date || null, assigned_to: targetAssignedTo, assigned_by: targetAssignedTo ? user.id : null, assignment_status: targetAssignedTo ? 'pending' : 'open', assigned_at: targetAssignedTo ? new Date().toISOString() : null, priority: form.priority, category: form.category || null, recurrence_pattern: form.recurrence_pattern === 'none' ? null : form.recurrence_pattern, is_template: (form as any).is_template }, match: { id: editing.id } });
        const updatedTodos = todos.map(t => t.id === editing.id ? { ...t, ...form, assigned_to: targetAssignedTo || undefined, assigned_by: targetAssignedTo ? user.id : undefined } : t);
        setTodos(sortTodosByDueDate(updatedTodos));
        toast({ title: 'Task Updated (offline)' });
      }
    } else {
      if (navigator.onLine) {
        const { data, error } = await supabase
          .from('todos')
          .insert({
            user_id: user.id,
            title: form.title,
            description: form.description || null,
            due_date: form.due_date || null,
            expected_completion_date: form.expected_completion_date || null,
            priority: form.priority,
            category: form.category || null,
            recurrence_pattern: form.recurrence_pattern === 'none' ? null : form.recurrence_pattern,
            is_template: (form as any).is_template,
            assigned_to: targetAssignedTo,
            assigned_by: targetAssignedTo ? user.id : null,
            assignment_status: targetAssignedTo ? 'pending' : 'open',
            assigned_at: targetAssignedTo ? new Date().toISOString() : null,
          })
          .select()
          .single();

        if (!error && data) {
          const newTodo = {
            ...data,
            priority: data.priority as 'low' | 'medium' | 'high',
            description: data.description || undefined,
            due_date: data.due_date || undefined,
            expected_completion_date: data.expected_completion_date || undefined,
            assigned_to: data.assigned_to || undefined,
            assigned_by: data.assigned_by || undefined,
            assignment_status: data.assignment_status || undefined,
            assigned_at: data.assigned_at || undefined,
            accepted_at: data.accepted_at || undefined,
            category: data.category || undefined,
          };
          setTodos(sortTodosByDueDate([newTodo, ...todos]));
          toast({ title: 'Task Added' });
        }
      } else {
        const tempId = `offline-todo-${Date.now()}`;
        await queueMutation('supabase', { op: 'insert', table: 'todos', data: { user_id: user.id, title: form.title, description: form.description || null, due_date: form.due_date || null, expected_completion_date: form.expected_completion_date || null, priority: form.priority, category: form.category || null, recurrence_pattern: form.recurrence_pattern === 'none' ? null : form.recurrence_pattern, is_template: (form as any).is_template, assigned_to: targetAssignedTo, assigned_by: targetAssignedTo ? user.id : null, assignment_status: targetAssignedTo ? 'pending' : 'open', assigned_at: targetAssignedTo ? new Date().toISOString() : null } });
        const newTodo = { id: tempId, title: form.title, description: form.description || undefined, due_date: form.due_date || undefined, expected_completion_date: form.expected_completion_date || undefined, priority: form.priority, category: form.category || undefined, is_deleted: false, is_completed: false, created_at: new Date().toISOString(), subtasks: [] } as any;
        setTodos(sortTodosByDueDate([newTodo, ...todos]));
        toast({ title: 'Task Added (offline)' });
      }
    }
    closeDialog();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !user) return;

    let targetAssignedTo: string | null = null;
    let targetAssignedEmail: string | null = null;
    let targetAssignedName: string | null = null;

    if ((formData as any).assignTo && (formData as any).assignee_email) {
      const targetProfile = await lookupProfileByEmail((formData as any).assignee_email);
      if (targetProfile) {
        targetAssignedTo = targetProfile.user_id || targetProfile.id;
        targetAssignedEmail = targetProfile.email;
        targetAssignedName = targetProfile.full_name || targetProfile.email.split('@')[0];
      } else if ((formData as any).assigned_to) {
        targetAssignedTo = (formData as any).assigned_to;
        targetAssignedEmail = (formData as any).assignee_email;
      } else {
        toast({ title: 'User email not found', description: `No account matching "${(formData as any).assignee_email}"`, variant: 'destructive' });
        return;
      }
    }

    // OTP Permission Guard: Check if target user has allowed task assignment from current user
    if (targetAssignedTo && targetAssignedTo !== user.id && targetAssignedEmail) {
      const isAllowed = await checkIsAssignerAllowed(targetAssignedTo, targetAssignedEmail, user.email || '', user.id);
      if (!isAllowed) {
        setPendingAssignmentData({
          targetUserId: targetAssignedTo,
          targetEmail: targetAssignedEmail,
          targetName: targetAssignedName || targetAssignedEmail,
          formData,
          editingTodo,
        });
        setOtpCodeInput('');
        setOtpModalOpen(true);
        return;
      }
    }

    await executeSaveTodo(formData, editingTodo, targetAssignedTo);
  };

  const handleVerifyOtpAndSave = async () => {
    if (!pendingAssignmentData || !user) return;
    if (!otpCodeInput || otpCodeInput.trim().length !== 3) {
      toast({ title: 'Invalid Code', description: 'Please enter a 3-digit OTP code.', variant: 'destructive' });
      return;
    }

    setOtpVerifying(true);
    const res = await verifyAndAddAssigner(
      pendingAssignmentData.targetUserId,
      pendingAssignmentData.targetEmail,
      otpCodeInput.trim(),
      user.email || '',
      user.user_metadata?.full_name || user.email?.split('@')[0],
      user.id
    );
    setOtpVerifying(false);

    if (!res.success) {
      toast({ title: 'Authorization Failed', description: res.error || 'Invalid 3-digit passcode', variant: 'destructive' });
      return;
    }

    toast({ title: 'Permission Granted!', description: `You are now an authorized assigner for ${pendingAssignmentData.targetName}.` });
    setOtpModalOpen(false);
    await executeSaveTodo(pendingAssignmentData.formData, pendingAssignmentData.editingTodo, pendingAssignmentData.targetUserId);
    setPendingAssignmentData(null);
  };

  const respondToAssignment = async (todo: Todo, action: 'accept' | 'reject' | 'wip' | 'closed') => {
    if (!user) return;
    // Only assignee can accept/reject/wip, but both can close
    if (action !== 'closed' && user.id !== todo.assigned_to) return;
    if (action === 'closed' && user.id !== todo.assigned_to && user.id !== todo.assigned_by) return;

    const statusMap: Record<string, string> = {
      accept: 'accepted',
      reject: 'rejected',
      wip: 'wip',
      closed: 'closed',
    };
    const status = statusMap[action];
    const updates: any = { assignment_status: status };
    if (action === 'accept') updates.accepted_at = new Date().toISOString();

    if (navigator.onLine) {
      const { error } = await supabase.from('todos').update(updates).eq('id', todo.id);
      if (!error) {
        const updatedTodos = todos.map(t => t.id === todo.id ? { ...t, assignment_status: status } : t);
        setTodos(sortTodosByDueDate(updatedTodos));
        toast({ title: `Assignment ${status}` });
      }
    } else {
      await queueMutation('supabase', { op: 'update', table: 'todos', data: updates, match: { id: todo.id } });
      const updatedTodos = todos.map(t => t.id === todo.id ? { ...t, assignment_status: status } : t);
      setTodos(sortTodosByDueDate(updatedTodos));
      toast({ title: `Assignment ${status} (offline)` });
    }
  };

  const toggleComplete = async (todo: Todo) => {
    const newCompleted = !todo.is_completed;
    const updates: any = { is_completed: newCompleted };
    if (todo.assigned_to || todo.assigned_by) {
      updates.assignment_status = newCompleted ? 'closed' : 'accepted';
    }

    if (navigator.onLine) {
      const { error } = await supabase.from('todos').update(updates).eq('id', todo.id);
      if (!error) {
        const updatedTodos = todos.map(t => t.id === todo.id ? { ...t, ...updates } : t);
        setTodos(sortTodosByDueDate(updatedTodos));
        toast({
          title: newCompleted ? 'Moved to Completed Tab' : 'Task Re-opened',
          description: newCompleted ? `"${todo.title}" completed!` : `"${todo.title}" re-opened.`,
        });
      }
    } else {
      await queueMutation('supabase', { op: 'update', table: 'todos', data: updates, match: { id: todo.id } });
      const updatedTodos = todos.map(t => t.id === todo.id ? { ...t, ...updates } : t);
      setTodos(sortTodosByDueDate(updatedTodos));
      toast({
        title: newCompleted ? 'Moved to Completed Tab (offline)' : 'Task Re-opened (offline)',
      });
    }
  };

  const deleteTodo = async (id: string) => {
    if (!user) return;
    if (navigator.onLine) {
      const { error } = await supabase.from('todos').update({ is_deleted: true, deleted_by: user.id, deleted_at: new Date().toISOString() }).eq('id', id);
      if (!error) {
        const updatedTodos = todos.map(t => t.id === id ? { ...t, is_deleted: true, deleted_by: user.id, deleted_at: new Date().toISOString() } : t);
        setTodos(sortTodosByDueDate(updatedTodos));
        toast({ title: 'Task Deleted' });
      }
    } else {
      await queueMutation('supabase', { op: 'update', table: 'todos', data: { is_deleted: true, deleted_by: user.id, deleted_at: new Date().toISOString() }, match: { id } });
      const updatedTodos = todos.map(t => t.id === id ? { ...t, is_deleted: true, deleted_by: user.id, deleted_at: new Date().toISOString() } : t);
      setTodos(sortTodosByDueDate(updatedTodos));
      toast({ title: 'Task Deleted (offline)' });
    }
  };

  const restoreTodo = async (id: string) => {
    if (navigator.onLine) {
      const { error } = await supabase.from('todos').update({ is_deleted: false, deleted_by: null, deleted_at: null }).eq('id', id);
      if (!error) {
        const updatedTodos = todos.map(t => t.id === id ? { ...t, is_deleted: false, deleted_by: undefined, deleted_at: undefined } : t);
        setTodos(sortTodosByDueDate(updatedTodos));
        toast({ title: 'Task Restored' });
      }
    } else {
      await queueMutation('supabase', { op: 'update', table: 'todos', data: { is_deleted: false, deleted_by: null, deleted_at: null }, match: { id } });
      const updatedTodos = todos.map(t => t.id === id ? { ...t, is_deleted: false, deleted_by: undefined, deleted_at: undefined } : t);
      setTodos(sortTodosByDueDate(updatedTodos));
      toast({ title: 'Task Restored (offline)' });
    }
  };

  const addSubtask = async (todoId: string, title: string) => {
    if (!title.trim()) return;
    if (navigator.onLine) {
      const { data, error } = await supabase.from('subtasks').insert({ todo_id: todoId, title: title.trim(), is_completed: false, order_index: (todos.find(t => t.id === todoId)?.subtasks?.length || 0) }).select().single();
      if (!error && data) {
        const updatedTodos = todos.map(t => t.id === todoId ? { ...t, subtasks: [...(t.subtasks || []), data] } : t);
        setTodos(updatedTodos);
        setNewSubtaskTitle('');
      }
    } else {
      const tempId = `offline-subtask-${Date.now()}`;
      await queueMutation('supabase', { op: 'insert', table: 'subtasks', data: { todo_id: todoId, title: title.trim(), is_completed: false, order_index: (todos.find(t => t.id === todoId)?.subtasks?.length || 0) } });
      const updatedTodos = todos.map(t => t.id === todoId ? { ...t, subtasks: [...(t.subtasks || []), { id: tempId, todo_id: todoId, title: title.trim(), is_completed: false, order_index: (todos.find(tt => tt.id === todoId)?.subtasks?.length || 0), created_at: new Date().toISOString() }] } : t);
      setTodos(updatedTodos);
      setNewSubtaskTitle('');
    }
  };

  const toggleSubtask = async (subtaskId: string, isCompleted: boolean) => {
    if (navigator.onLine) {
      const { error } = await supabase.from('subtasks').update({ is_completed: !isCompleted }).eq('id', subtaskId);
      if (!error) {
        const updatedTodos = todos.map(t => ({ ...t, subtasks: t.subtasks?.map(s => s.id === subtaskId ? { ...s, is_completed: !isCompleted } : s) || [] }));
        setTodos(updatedTodos);
      }
    } else {
      await queueMutation('supabase', { op: 'update', table: 'subtasks', data: { is_completed: !isCompleted }, match: { id: subtaskId } });
      const updatedTodos = todos.map(t => ({ ...t, subtasks: t.subtasks?.map(s => s.id === subtaskId ? { ...s, is_completed: !isCompleted } : s) || [] }));
      setTodos(updatedTodos);
    }
  };

  const deleteSubtask = async (subtaskId: string, todoId: string) => {
    if (navigator.onLine) {
      const { error } = await supabase.from('subtasks').delete().eq('id', subtaskId);
      if (!error) {
        const updatedTodos = todos.map(t => t.id === todoId ? { ...t, subtasks: t.subtasks?.filter(s => s.id !== subtaskId) || [] } : t);
        setTodos(updatedTodos);
      }
    } else {
      await queueMutation('supabase', { op: 'delete', table: 'subtasks', match: { id: subtaskId } });
      const updatedTodos = todos.map(t => t.id === todoId ? { ...t, subtasks: t.subtasks?.filter(s => s.id !== subtaskId) || [] } : t);
      setTodos(updatedTodos);
    }
  };

  const createReminder = async (todoId: string, scheduledAt: Date) => {
    if (!user) return;
    if (navigator.onLine) {
      const { data, error } = await supabase.from('reminders').insert({ todo_id: todoId, user_id: user.id, scheduled_at: scheduledAt.toISOString() }).select().single();
      if (!error && data) {
        toast({ title: 'Reminder set' });
        fetchReminders();
      }
    } else {
      await queueMutation('supabase', { op: 'insert', table: 'reminders', data: { todo_id: todoId, user_id: user.id, scheduled_at: scheduledAt.toISOString() } });
      toast({ title: 'Reminder set (offline)' });
      fetchReminders();
    }
  };

  const snoozeReminder = async (reminderId: string, snoozeMinutes: number) => {
    const snoozeUntil = new Date(Date.now() + snoozeMinutes * 60 * 1000).toISOString();
    if (navigator.onLine) {
      const { error } = await supabase.from('reminders').update({ snoozed_until: snoozeUntil }).eq('id', reminderId);
      if (!error) { toast({ title: `Reminder snoozed for ${snoozeMinutes} minutes` }); fetchReminders(); }
    } else {
      await queueMutation('supabase', { op: 'update', table: 'reminders', data: { snoozed_until: snoozeUntil }, match: { id: reminderId } });
      toast({ title: `Reminder snoozed for ${snoozeMinutes} minutes (offline)` });
      fetchReminders();
    }
  };

  const dismissReminder = async (reminderId: string) => {
    if (navigator.onLine) {
      const { error } = await supabase.from('reminders').update({ is_dismissed: true }).eq('id', reminderId);
      if (!error) { fetchReminders(); }
    } else {
      await queueMutation('supabase', { op: 'update', table: 'reminders', data: { is_dismissed: true }, match: { id: reminderId } });
      fetchReminders();
    }
  };

  const fetchReminders = async () => {
    if (!user) return;
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('reminders')
      .select('r:*, t:todos(id, title)')
      .eq('user_id', user.id)
      .eq('is_dismissed', false)
      .lte('scheduled_at', now)
      .or(`snoozed_until.is.null, snoozed_until.lte.${now}`);

    if (!error && data) {
      const reminders = data.map((r: any) => ({
        id: r.id,
        title: r.t?.title || 'Task',
        scheduled_at: r.scheduled_at,
      }));
      setUpcomingReminders(reminders);
    }
  };

  // Fetch reminders on load
  useEffect(() => {
    if (user) fetchReminders();
    const interval = setInterval(() => {
      if (user) fetchReminders();
    }, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [user]);

  const openEditDialog = (todo: Todo) => {
    setEditingTodo(todo);
    setFormData({
      title: todo.title,
      description: todo.description || '',
      due_date: todo.due_date || '',
      expected_completion_date: todo.expected_completion_date || '',
      priority: todo.priority,
      category: todo.category || '',
      assignee_email: todo.assigned_to ? (profileCache[todo.assigned_to]?.email || '') : '',
      assigned_to: todo.assigned_to || '',
      assignTo: !!todo.assigned_to,
      recurrence_pattern: todo.recurrence_pattern || 'none',
      is_template: todo.is_template || false,
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingTodo(null);
    setFormData({ title: '', description: '', due_date: '', expected_completion_date: '', assignee_email: '', assigned_to: '', assignTo: false, priority: 'medium', category: '', recurrence_pattern: 'none', is_template: false });
  };

  // Robust user matching helpers for assigned_to and assigned_by
  const isTaskAssignedToUser = (todo: Todo, userId: string, userEmail?: string) => {
    if (!todo.assigned_to || !userId) return false;
    if (todo.assigned_to === userId) return true;
    const targetProfile = profileCache[todo.assigned_to];
    if (targetProfile) {
      if (targetProfile.user_id === userId || targetProfile.profile_id === userId) return true;
      if (userEmail && targetProfile.email?.toLowerCase() === userEmail.toLowerCase()) return true;
    }
    const myProfile = profileCache[userId];
    if (myProfile) {
      if (todo.assigned_to === myProfile.profile_id || todo.assigned_to === myProfile.user_id) return true;
      if (myProfile.email && profileCache[todo.assigned_to]?.email?.toLowerCase() === myProfile.email.toLowerCase()) return true;
    }
    return false;
  };

  const isTaskAssignedByUser = (todo: Todo, userId: string, userEmail?: string) => {
    if (!todo.assigned_by || !userId) return false;
    if (todo.assigned_by === userId) return true;
    const targetProfile = profileCache[todo.assigned_by];
    if (targetProfile) {
      if (targetProfile.user_id === userId || targetProfile.profile_id === userId) return true;
      if (userEmail && targetProfile.email?.toLowerCase() === userEmail.toLowerCase()) return true;
    }
    const myProfile = profileCache[userId];
    if (myProfile) {
      if (todo.assigned_by === myProfile.profile_id || todo.assigned_by === myProfile.user_id) return true;
      if (myProfile.email && profileCache[todo.assigned_by]?.email?.toLowerCase() === myProfile.email.toLowerCase()) return true;
    }
    return false;
  };

  const filteredTodos = sortTodosByDueDate(
    todos.filter(todo => {
      // 1. Search Query Filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchTitle = todo.title.toLowerCase().includes(query);
        const matchDesc = todo.description && todo.description.toLowerCase().includes(query);
        const matchAssignee = todo.assigned_to && profileCache[todo.assigned_to]?.email?.toLowerCase().includes(query);
        const matchAssigner = todo.assigned_by && profileCache[todo.assigned_by]?.email?.toLowerCase().includes(query);
        if (!matchTitle && !matchDesc && !matchAssignee && !matchAssigner) return false;
      }

      // 2. Category & Priority Filter
      if (filterCategory !== 'all' && todo.category !== filterCategory) return false;
      if (filterPriority !== 'all' && todo.priority !== filterPriority) return false;

      // 3. Tab Specific Filtering
      if (activeTab === 'deleted') {
        if (!todo.is_deleted) return false;
        if (deletedFilter === 'own') {
          return todo.user_id === user?.id && !todo.assigned_to;
        }
        if (deletedFilter === 'assigned') {
          return user ? (isTaskAssignedToUser(todo, user.id, user.email) || isTaskAssignedByUser(todo, user.id, user.email)) : false;
        }
        return true;
      }

      // Hide deleted tasks in all non-deleted tabs
      if (todo.is_deleted) return false;

      if (activeTab === 'completed') {
        if (!todo.is_completed) return false;
        if (completedFilter === 'own') {
          return (todo.user_id === user?.id && !todo.assigned_to) || (todo.user_id === user?.id && todo.assigned_by === user?.id && !todo.assigned_to);
        }
        if (completedFilter === 'assigned') {
          return user ? (isTaskAssignedToUser(todo, user.id, user.email) || isTaskAssignedByUser(todo, user.id, user.email)) : false;
        }
        return true;
      }

      // Active tabs ('all', 'assigned_to_me', 'assigned_by_me'): hide completed tasks!
      if (todo.is_completed) return false;

      if (activeTab === 'assigned_to_me') {
        return user ? isTaskAssignedToUser(todo, user.id, user.email) : false;
      }
      if (activeTab === 'assigned_by_me') {
        return user ? isTaskAssignedByUser(todo, user.id, user.email) : false;
      }

      // Default 'all' tab: shows all active (uncompleted, non-deleted) tasks
      return true;
    })
  );

  const completedCount = todos.filter(t => t.is_completed).length;
  const pendingCount = todos.length - completedCount;

  // Get top priority tasks for summary (max 3)
  const topPriorityTasks = sortTodosByDueDate(
    todos.filter(t => !t.is_completed)
  ).slice(0, 3);

  return (
    <div className={cn("bg-background", !embedMode && "min-h-screen")}>
      {/* Header (Standalone mode) */}
      {!embedMode && (
        <header className="gradient-hero text-white relative overflow-hidden backdrop-blur-md bg-gradient-to-br from-primary/90 to-primary/70 dark:from-slate-900/95 dark:to-slate-800/80">
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-24 -right-24 w-64 sm:w-96 h-64 sm:h-96 bg-white/5 dark:bg-white/2 rounded-full blur-3xl animate-pulse" />
            <div className="absolute -bottom-32 -left-32 w-56 sm:w-80 h-56 sm:h-80 bg-white/5 dark:bg-white/2 rounded-full blur-3xl animate-pulse" />
          </div>
          
          <div className="relative max-w-6xl mx-auto p-4 sm:p-6">
            <div className="flex items-center gap-2 sm:gap-4 mb-4 sm:mb-6">
              <Button 
                onClick={() => navigate('/')}
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20 rounded-xl h-10 w-10"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm flex-shrink-0">
                  <ListTodo className="w-5 sm:w-6 h-5 sm:h-6" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-lg sm:text-xl font-bold tracking-tight line-clamp-1">Todo App</h1>
                  <p className="text-xs text-white/70">Stay organized</p>
                  {!isOnline && <p className="text-xs text-warning mt-1">📡 Offline Mode</p>}
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <div className="bg-white/15 backdrop-blur-md rounded-2xl p-3 sm:p-4 border border-white/20">
                <div className="flex items-center gap-2 mb-1">
                  <Circle className="w-4 h-4" />
                  <span className="text-xs text-white/80">Pending</span>
                </div>
                <p className="text-2xl sm:text-3xl font-bold">{pendingCount}</p>
              </div>
              <div className="bg-white/15 backdrop-blur-md rounded-2xl p-3 sm:p-4 border border-white/20">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="text-xs text-white/80">Completed</span>
                </div>
                <p className="text-2xl sm:text-3xl font-bold">{completedCount}</p>
              </div>
            </div>
          </div>
        </header>
      )}

      <main className={cn("max-w-6xl mx-auto p-1 sm:p-2 md:p-4 relative z-10", !embedMode && "-mt-4")}>

        {/* Reminders Notifications */}
        {upcomingReminders.length > 0 && (
          <div className="mb-4 space-y-2">
            {upcomingReminders.map((reminder) => (
              <Card key={reminder.id} className="p-3 bg-warning/10 border-warning/30 rounded-xl animate-fade-in">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">🔔 Reminder: {reminder.title}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="ghost" onClick={() => snoozeReminder(reminder.id, 5)}>5m</Button>
                    <Button size="sm" variant="ghost" onClick={() => snoozeReminder(reminder.id, 15)}>15m</Button>
                    <Button size="sm" variant="ghost" onClick={() => dismissReminder(reminder.id)}>✕</Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}



        {/* Sub-Tabs inside To-Do */}
        <div className="mb-3 sm:mb-4 overflow-x-auto">
          <div className="grid grid-cols-5 w-full bg-card/80 backdrop-blur-lg border border-border/50 p-1 rounded-2xl">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={cn(
                "py-1.5 px-2 rounded-xl text-xs sm:text-sm font-medium transition-all text-center",
                activeTab === 'all'
                  ? "bg-primary text-white shadow-md font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              All <span className="hidden sm:inline ml-1 font-semibold">({todos.filter(t => !t.is_completed && !t.is_deleted).length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('assigned_to_me')}
              className={cn(
                "py-1.5 px-2 rounded-xl text-xs sm:text-sm font-medium transition-all text-center truncate",
                activeTab === 'assigned_to_me'
                  ? "bg-primary text-white shadow-md font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              For me <span className="hidden sm:inline ml-1 font-semibold">({user ? todos.filter(t => isTaskAssignedToUser(t, user.id, user.email) && !t.is_completed && !t.is_deleted).length : 0})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('assigned_by_me')}
              className={cn(
                "py-1.5 px-2 rounded-xl text-xs sm:text-sm font-medium transition-all text-center truncate",
                activeTab === 'assigned_by_me'
                  ? "bg-primary text-white shadow-md font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              By me <span className="hidden sm:inline ml-1 font-semibold">({user ? todos.filter(t => isTaskAssignedByUser(t, user.id, user.email) && !t.is_completed && !t.is_deleted).length : 0})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('completed')}
              className={cn(
                "py-1.5 px-2 rounded-xl text-xs sm:text-sm font-medium transition-all text-center truncate",
                activeTab === 'completed'
                  ? "bg-primary text-white shadow-md font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Done <span className="hidden sm:inline ml-1 font-semibold">({todos.filter(t => t.is_completed && !t.is_deleted).length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('deleted')}
              className={cn(
                "py-1.5 px-2 rounded-xl text-xs sm:text-sm font-medium transition-all text-center",
                activeTab === 'deleted'
                  ? "bg-primary text-white shadow-md font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Del <span className="hidden sm:inline ml-1 font-semibold">({todos.filter(t => t.is_deleted).length})</span>
            </button>
          </div>

          {/* Sub-filters for Completed & Deleted Tabs */}
          {(activeTab === 'completed' || activeTab === 'deleted') && (
            <div className="flex items-center gap-2 mt-3 bg-card/60 backdrop-blur-md p-1.5 rounded-xl border border-border/50 text-xs w-fit">
              <span className="text-muted-foreground font-medium px-1">Filter:</span>
              <button
                onClick={() => activeTab === 'completed' ? setCompletedFilter('all') : setDeletedFilter('all')}
                className={cn(
                  "px-3 py-1 rounded-lg font-medium transition-all",
                  (activeTab === 'completed' ? completedFilter === 'all' : deletedFilter === 'all')
                    ? "bg-primary text-white shadow-sm font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                ALL
              </button>
              <button
                onClick={() => activeTab === 'completed' ? setCompletedFilter('own') : setDeletedFilter('own')}
                className={cn(
                  "px-3 py-1 rounded-lg font-medium transition-all",
                  (activeTab === 'completed' ? completedFilter === 'own' : deletedFilter === 'own')
                    ? "bg-primary text-white shadow-sm font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                OWN
              </button>
              <button
                onClick={() => activeTab === 'completed' ? setCompletedFilter('assigned') : setDeletedFilter('assigned')}
                className={cn(
                  "px-3 py-1 rounded-lg font-medium transition-all",
                  (activeTab === 'completed' ? completedFilter === 'assigned' : deletedFilter === 'assigned')
                    ? "bg-primary text-white shadow-sm font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                ASSIGNED
              </button>
            </div>
          )}
        </div>


        {/* Search & Filters */}
        <Card className="p-3 sm:p-4 mb-3 sm:mb-4 shadow-card border-border/50 rounded-2xl animate-fade-in backdrop-blur-sm bg-white/40 dark:bg-slate-950/40 hover:shadow-elevated transition-all duration-300">
          <div className="flex flex-col gap-2 sm:gap-3">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tasks..."
                className="pl-10 rounded-xl h-10 text-sm"
              />
            </div>
            <div className="flex gap-2 w-full">
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="flex-1 rounded-xl h-10 text-sm">
                <Tag className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Cat" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {CATEGORIES.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger className="flex-1 rounded-xl h-10 text-sm">
                <Flag className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Pri" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            </div>
          </div>

        </Card>

        {/* Todo List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filteredTodos.length === 0 ? (
          <Card className="p-12 text-center shadow-card border-border/50 rounded-3xl animate-fade-in backdrop-blur-sm bg-white/40 dark:bg-slate-950/40 hover:shadow-elevated transition-all duration-300">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-primary/10 flex items-center justify-center">
              <ListTodo className="w-10 h-10 text-primary" />
            </div>
            <h3 className="text-xl font-bold mb-2">No tasks found</h3>
            <p className="text-muted-foreground mb-6">
              {searchQuery || filterCategory !== 'all' || filterPriority !== 'all' 
                ? 'Try adjusting your filters' 
                : 'Create your first task to get started'}
            </p>
            <Button onClick={() => setDialogOpen(true)} className="rounded-xl px-6">
              <Plus className="w-5 h-5 mr-2" />
              Add Task
            </Button>
          </Card>
        ) : (
          <div className="space-y-2 sm:space-y-3">
            {filteredTodos.map((todo, index) => (
              <Card 
                key={todo.id}
                className={`p-3 sm:p-4 shadow-card border-border/50 rounded-2xl transition-all duration-300 hover:shadow-elevated hover:scale-[1.01] hover:border-primary/30 animate-fade-in backdrop-blur-sm bg-white/40 dark:bg-slate-950/40 ${
                  todo.is_completed ? 'opacity-60' : ''
                }`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-start gap-2 sm:gap-3">
                  <button
                    onClick={() => toggleComplete(todo)}
                    className="mt-1 transition-transform hover:scale-110"
                  >
                    {todo.is_completed ? (
                      <CheckCircle2 className="w-5 h-5 text-success" />
                    ) : (
                      <Circle className="w-5 h-5 text-muted-foreground hover:text-primary" />
                    )}
                  </button>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className={`font-semibold ${todo.is_completed ? 'line-through text-muted-foreground' : ''}`}>
                        {todo.title}
                      </h3>
                      <div className="flex items-center gap-1 shrink-0">
                        {!todo.is_deleted && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary flex-shrink-0"
                              onClick={() => openEditDialog(todo)}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-lg hover:bg-destructive/10 hover:text-destructive flex-shrink-0"
                              onClick={() => deleteTodo(todo.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                        {todo.is_deleted && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-xs rounded-lg hover:bg-success/10 hover:text-success flex-shrink-0"
                            onClick={() => restoreTodo(todo.id)}
                          >
                            Restore
                          </Button>
                        )}
                      </div>
                    </div>
                    
                    {todo.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {todo.description}
                      </p>
                    )}

                    {/* AI Summary */}
                    <p className="text-xs text-muted-foreground mt-2 italic">
                      {generateTaskSummary(todo)}
                    </p>
                    
                    <div className="flex flex-wrap items-center gap-1 sm:gap-2 mt-2">
                      <Badge variant="outline" className={`text-xs ${PRIORITY_COLORS[todo.priority as 'low' | 'medium' | 'high'] || 'bg-muted text-muted-foreground'}`}>
                        <Flag className="w-3 h-3 mr-1" />
                        {todo.priority}
                      </Badge>
                      
                      {todo.category && (
                        <Badge variant="secondary" className="text-xs">
                          <Tag className="w-3 h-3 mr-1" />
                          {todo.category}
                        </Badge>
                      )}
                      
                      {safeFormatDueDate(todo.due_date) && (
                        <Badge variant="outline" className="text-xs">
                          <Calendar className="w-3 h-3 mr-1" />
                          {safeFormatDueDate(todo.due_date)}
                        </Badge>
                      )}

                      {todo.recurrence_pattern && (
                        <Badge variant="outline" className="text-xs">
                          🔄 {todo.recurrence_pattern}
                        </Badge>
                      )}

                      {todo.is_template && (
                        <Badge variant="outline" className="text-xs">
                          📋 Template
                        </Badge>
                      )}
                    </div>
                    {/* Assigner / Assignee info tag */}
                    {(todo.assigned_to || todo.assigned_by) && (
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        {user && isTaskAssignedToUser(todo, user.id, user.email) && todo.assigned_by && (
                          <Badge
                            variant="outline"
                            onClick={() => handleOpenUserModal(todo.assigned_by)}
                            className="text-xs bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 font-medium cursor-pointer hover:bg-blue-500/20 transition-colors flex items-center gap-1"
                          >
                            👤 Assigned by: <span className="font-bold underline underline-offset-2">{getDisplayName(todo.assigned_by)}</span>
                          </Badge>
                        )}
                        {user && isTaskAssignedByUser(todo, user.id, user.email) && todo.assigned_to && (
                          <Badge
                            variant="outline"
                            onClick={() => handleOpenUserModal(todo.assigned_to)}
                            className="text-xs bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30 font-medium cursor-pointer hover:bg-purple-500/20 transition-colors flex items-center gap-1"
                          >
                            👤 Assigned to: <span className="font-bold underline underline-offset-2">{getDisplayName(todo.assigned_to)}</span>
                          </Badge>
                        )}
                        {todo.assignment_status && (
                          <Badge variant="secondary" className="text-xs capitalize">
                            Status: {todo.assignment_status}
                          </Badge>
                        )}
                      </div>
                    )}

                    {todo.assigned_to && (
                      <div className="mt-2 space-y-2">
                        <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                          {user && user.id === todo.assigned_to && todo.assignment_status === 'pending' && (
                            <>
                              <Button size="sm" variant="ghost" onClick={() => respondToAssignment(todo, 'accept')} className="h-8 px-2 text-xs">Accept</Button>
                              <Button size="sm" variant="ghost" onClick={() => respondToAssignment(todo, 'reject')} className="h-8 px-2 text-xs">Reject</Button>
                            </>
                          )}
                          {user && user.id === todo.assigned_to && todo.assignment_status === 'accepted' && (
                            <Button size="sm" variant="ghost" onClick={() => respondToAssignment(todo, 'wip')} className="h-8 px-2 text-xs">Start</Button>
                          )}
                          {user && user.id === todo.assigned_to && todo.assignment_status === 'wip' && (
                            <Button size="sm" variant="ghost" onClick={() => respondToAssignment(todo, 'closed')} className="h-8 px-2 text-xs">Done</Button>
                          )}
                          {(user?.id === todo.assigned_to || user?.id === todo.assigned_by) && ['pending', 'accepted', 'wip'].includes(todo.assignment_status || '') && (
                            <Button size="sm" variant="ghost" onClick={() => respondToAssignment(todo, 'closed')} className="h-8 px-2 text-xs">Close</Button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Subtasks */}
                    {!todo.is_deleted && (todo.subtasks?.length || 0) > 0 && (
                      <div className="mt-3 pt-2 border-t border-border/30">
                        <button
                          onClick={() => setShowSubtasks(showSubtasks === todo.id ? null : todo.id)}
                          className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                        >
                          ✓ {todo.subtasks?.filter(s => s.is_completed).length}/{todo.subtasks?.length} Subtasks
                        </button>
                        {showSubtasks === todo.id && (
                          <div className="mt-2 space-y-2 max-h-48 overflow-y-auto">
                            {todo.subtasks?.map(subtask => (
                              <div key={subtask.id} className="flex items-center gap-2">
                                <Checkbox
                                  checked={subtask.is_completed}
                                  onCheckedChange={() => toggleSubtask(subtask.id, subtask.is_completed)}
                                  className="w-4 h-4"
                                />
                                <span className={`text-xs flex-1 ${subtask.is_completed ? 'line-through text-muted-foreground' : ''}`}>{subtask.title}</span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-5 w-5"
                                  onClick={() => deleteSubtask(subtask.id, todo.id)}
                                >
                                  <X className="w-3 h-3" />
                                </Button>
                              </div>
                            ))}
                            <div className="flex items-center gap-2 mt-2">
                              <Input
                                value={newSubtaskTitle}
                                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter') {
                                    addSubtask(todo.id, newSubtaskTitle);
                                  }
                                }}
                                placeholder="Add subtask..."
                                className="text-xs h-7"
                              />
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => addSubtask(todo.id, newSubtaskTitle)}
                              >
                                +
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

      </main>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-w-md w-[calc(100vw-2rem)] rounded-3xl border-border/50 shadow-elevated max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              {editingTodo ? <Edit2 className="w-5 h-5 text-primary" /> : <Plus className="w-5 h-5 text-primary" />}
              {editingTodo ? 'Edit Task' : 'Add Task'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Title *</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => isListening ? stopListening() : startListening()}
                  className="text-xs h-8 px-2"
                >
                  {isListening ? (
                    <>
                      <MicOff className="w-4 h-4 mr-1" />
                      Stop
                    </>
                  ) : (
                    <>
                      <Mic className="w-4 h-4 mr-1" />
                      Voice
                    </>
                  )}
                </Button>
              </div>
              <Input
                value={formData.title || transcript}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="What needs to be done?"
                className="rounded-xl h-10 text-sm"
                autoFocus
              />
              {transcript && (
                <div className="text-xs text-muted-foreground flex items-center justify-between">
                  <span>Listening: {transcript.slice(0, 50)}...</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setFormData({ ...formData, title: transcript });
                      clearTranscript();
                      stopListening();
                    }}
                    className="text-xs h-8 px-2"
                  >
                    Use
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Add more details..."
                className="rounded-xl resize-none text-sm"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Due Date (Optional)</Label>
              <Input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                className="rounded-xl h-10 text-sm"
              />
            </div>

            {/* Priority & Category in 2-column grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select 
                  value={formData.priority} 
                  onValueChange={(v) => setFormData({ ...formData, priority: v as 'low' | 'medium' | 'high' })}
                >
                  <SelectTrigger className="rounded-xl h-10 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">🟢 Low</SelectItem>
                    <SelectItem value="medium">🟡 Medium</SelectItem>
                    <SelectItem value="high">🔴 High</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Category</Label>
                <Select 
                  value={formData.category} 
                  onValueChange={(v) => setFormData({ ...formData, category: v })}
                >
                  <SelectTrigger className="rounded-xl h-10 text-sm">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Assign To (optional)</Label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Assign to someone</span>
                  <Checkbox
                    id="assign-to-toggle"
                    checked={(formData as any).assignTo}
                    onCheckedChange={(c) => setFormData({ ...formData, assignTo: c as boolean, assigned_to: c ? (formData as any).assigned_to : '' , assignee_email: c ? (formData as any).assignee_email : '' })}
                  />
                </div>
              </div>

              {(formData as any).assignTo ? (
                <div className="relative">
                  <Input
                    value={(formData as any).assignee_email}
                    onChange={(e) => {
                      const email = e.target.value;
                      setFormData({ ...formData, assignee_email: email, assigned_to: '' });
                      setProfileSearchQuery(email);
                    }}
                    onKeyDown={async (e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const email = (formData as any).assignee_email;
                        if (email) {
                          const profile = await lookupProfileByEmail(email);
                          if (profile) {
                            setFormData({ ...formData, assigned_to: profile.id, assignee_email: profile.email, assignTo: true });
                            setProfileSuggestions([]);
                          } else {
                            toast({ title: 'No matching user found', description: 'Please select from suggestions or check the email' });
                          }
                        }
                      }
                    }}
                    placeholder="Start typing email to search users..."
                    className="rounded-xl"
                    autoComplete="off"
                  />
                  {/* Suggestions dropdown */}
                  {profileSuggestions.length > 0 && (formData as any).assignee_email && (
                    <div className="absolute z-20 mt-1 w-full bg-popover border border-border/20 rounded-lg shadow-md overflow-hidden">
                      {profileSuggestions.map(p => (
                        <button
                          key={p.id}
                          type="button"
                          className="w-full text-left px-3 py-2 hover:bg-muted-foreground/5"
                            onClick={() => {
                            // use profile.id for assigned_to so filtering matches auth.id
                            setFormData({ ...formData, assigned_to: p.id, assignee_email: p.email, assignTo: true });
                            // cache profile under id
                            setAssigneeProfile({ id: p.id, email: p.email, full_name: p.full_name, avatar_url: p.avatar_url });
                            setProfileSuggestions([]);
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-7 h-7 rounded-full bg-muted-foreground/10 flex items-center justify-center text-xs font-medium">{p.full_name ? p.full_name.charAt(0) : p.email?.charAt(0)}</div>
                            <div className="text-sm">
                              <div className="font-medium">{p.full_name || p.email}</div>
                              <div className="text-xs text-muted-foreground">{p.email}</div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Fallback if a single exact match found after blur */}
                  {assigneeProfile && (formData as any).assigned_to && (
                    <div className="flex items-center gap-3 mt-2">
                      <div className="w-8 h-8 rounded-full bg-muted-foreground/10 flex items-center justify-center text-xs font-medium">{assigneeProfile.full_name ? assigneeProfile.full_name.charAt(0) : assigneeProfile.email?.charAt(0)}</div>
                      <div className="text-sm">
                        <div className="font-medium">{assigneeProfile.full_name || assigneeProfile.email}</div>
                        <div className="text-xs text-muted-foreground">Selected</div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => { setFormData({ ...formData, assignee_email: '', assigned_to: '', assignTo: false }); setAssigneeProfile(null); setProfileSuggestions([]); }}>Clear</Button>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No assignee — task will be unassigned</p>
              )}
            </div>



            {editingTodo && (
              <div className="space-y-2">
                <Label>Set Reminder</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => createReminder(editingTodo.id, new Date(Date.now() + 5 * 60000))}
                    className="text-xs"
                  >
                    5 min
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => createReminder(editingTodo.id, new Date(Date.now() + 60 * 60000))}
                    className="text-xs"
                  >
                    1 hour
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => createReminder(editingTodo.id, new Date(Date.now() + 24 * 60 * 60000))}
                    className="text-xs"
                  >
                    1 day
                  </Button>
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" onClick={closeDialog} className="flex-1 rounded-xl">
                Cancel
              </Button>
              <Button type="submit" className="flex-1 rounded-xl">
                {editingTodo ? 'Update' : 'Add Task'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* User Info Popover Modal */}
      <Dialog open={!!userModalProfile} onOpenChange={(open) => !open && setUserModalProfile(null)}>
        <DialogContent className="max-w-xs rounded-3xl border-border/50 p-5 shadow-elevated">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <User className="w-4 h-4 text-primary" /> User Details
            </DialogTitle>
          </DialogHeader>
          {userModalProfile && (
            <div className="space-y-3 pt-1">
              <div className="flex items-center gap-3 bg-muted/40 p-3 rounded-2xl border border-border/50">
                <div className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center font-extrabold text-base">
                  {userModalProfile.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-sm text-foreground truncate">{userModalProfile.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{userModalProfile.email}</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full rounded-xl text-xs gap-1.5"
                onClick={() => {
                  navigator.clipboard.writeText(userModalProfile.email);
                  toast({ title: 'Email Copied!', description: userModalProfile.email });
                }}
              >
                <Copy className="w-3.5 h-3.5 text-primary" /> Copy Email Address
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* OTP Passcode Assignment Modal */}
      <Dialog open={otpModalOpen} onOpenChange={(open) => !open && setOtpModalOpen(false)}>
        <DialogContent className="max-w-sm rounded-3xl border-border/50 p-5 shadow-elevated">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-primary">
              <KeyRound className="w-5 h-5 text-primary" /> Permission Required (3-Digit OTP)
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-start gap-2.5">
              <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs text-foreground leading-relaxed">
                To assign a task to <span className="font-bold">{pendingAssignmentData?.targetName}</span> ({pendingAssignmentData?.targetEmail}) for the first time, please enter their <span className="font-bold">3-digit profile passcode</span>.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Enter 3-Digit Passcode</Label>
              <Input
                value={otpCodeInput}
                onChange={(e) => setOtpCodeInput(e.target.value.replace(/\D/g, '').slice(0, 3))}
                placeholder="e.g. 742"
                maxLength={3}
                className="text-center font-mono text-2xl tracking-widest h-12 rounded-xl border-primary/40 focus:border-primary"
              />
              <p className="text-[11px] text-muted-foreground text-center">
                Ask {pendingAssignmentData?.targetName} for their 3-digit OTP code found in their Profile Settings.
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setOtpModalOpen(false)} className="flex-1 rounded-xl text-xs">
                Cancel
              </Button>
              <Button onClick={handleVerifyOtpAndSave} disabled={otpVerifying || otpCodeInput.length !== 3} className="flex-1 rounded-xl text-xs">
                {otpVerifying ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                Verify & Assign
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Floating Action Button (FAB) */}
      <Button
        onClick={() => setDialogOpen(true)}
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-2xl bg-primary text-primary-foreground hover:scale-110 active:scale-95 transition-all duration-300 flex items-center justify-center border-2 border-white/30"
        size="icon"
        title="Add Task"
      >
        <Plus className="w-7 h-7 text-white" />
      </Button>
    </div>
  );
};

export default TodoApp;
