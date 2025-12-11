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
import { 
  ArrowLeft, Plus, Search, Edit2, Trash2, Calendar, 
  Flag, Tag, CheckCircle2, Circle, Loader2, X,
  ListTodo, Clock, Mic, MicOff
} from 'lucide-react';
import { format } from 'date-fns';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { generateTaskSummary, suggestNextActions } from '@/lib/aiUtils';

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

// Utility function to get days until due date
const daysUntilDue = (dateString?: string): number | null => {
  if (!dateString) return null;
  const date = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  const diff = date.getTime() - today.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

// Utility function to sort todos with priority and date-based logic
const sortTodosByPriorityAndDate = (todosToSort: Todo[]): Todo[] => {
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  
  return [...todosToSort].sort((a, b) => {
    // First, separate by priority
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (priorityDiff !== 0) return priorityDiff;

    // Within same priority, prioritize by date
    const aDays = daysUntilDue(a.expected_completion_date || a.due_date);
    const bDays = daysUntilDue(b.expected_completion_date || b.due_date);

    // Tasks with completion date today come first
    const aIsToday = isToday(a.expected_completion_date || a.due_date);
    const bIsToday = isToday(b.expected_completion_date || b.due_date);

    if (aIsToday && !bIsToday) return -1;
    if (!aIsToday && bIsToday) return 1;

    // Then sort by nearest deadline
    if (aDays !== null && bDays !== null) {
      return aDays - bDays;
    }
    if (aDays !== null) return -1;
    if (bDays !== null) return 1;

    // Finally, sort by creation date
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
};

const TodoApp = () => {
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
  const [showCompleted, setShowCompleted] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'assigned_to_me' | 'assigned_by_me' | 'deleted'>('all');
  
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

  useEffect(() => {
    if (user) fetchTodos();
  }, [user]);

  const getProfileById = async (userId: string) => {
    // profileCache keys are auth user ids (profiles.user_id)
    if (profileCache[userId]) return profileCache[userId];
    const { data, error } = await supabase
      .from('public_profiles_view')
      .select('user_id, id, email, full_name, avatar_url')
      .eq('user_id', userId)
      .maybeSingle();
    if (!error && data) {
      const normalized = { full_name: (data as any).full_name || undefined, avatar_url: (data as any).avatar_url || undefined, email: (data as any).email };
      setProfileCache(prev => ({ ...prev, [userId]: normalized }));
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
      const mappedTodos = data.map(t => ({
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

      // Pre-fetch assignee profiles
      // assigned_to stores auth user id (profiles.user_id). Pre-fetch those profiles.
      const assigneeIds = [...new Set(mappedTodos.map(t => t.assigned_to).filter(Boolean))];
      for (const id of assigneeIds) {
        await getProfileById(id as string);
      }
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
        .ilike('email', email)
        .limit(1)
        .maybeSingle();

      console.debug('lookupProfileByEmail result:', { email, data, error });
      if (error) {
        toast({ title: 'Profile lookup error', description: error.message, variant: 'destructive' });
        setAssigneeProfile(null);
        return null;
      }
      if (data) {
        // store profile keyed by auth user id (user_id)
        setAssigneeProfile({ id: (data as any).id, user_id: (data as any).user_id, email: (data as any).email, full_name: (data as any).full_name, avatar_url: (data as any).avatar_url } as any);
        return data as any;
      }
      setAssigneeProfile(null);
      return null;
    } catch (err: any) {
      console.error('lookupProfileByEmail exception', err);
      toast({ title: 'Profile lookup failed', description: err.message || String(err), variant: 'destructive' });
      setAssigneeProfile(null);
      return null;
    }
  };

  // Profile search/autocomplete (returns up to 5 matches)
  const [profileSuggestions, setProfileSuggestions] = useState<Array<{ id: string; full_name?: string; email?: string; avatar_url?: string }>>([]);
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
      console.debug('searchProfiles', { q, data, error });
      if (error) {
        toast({ title: 'Profile search error', description: error.message, variant: 'destructive' });
        setProfileSuggestions([]);
        return;
      }
      setProfileSuggestions((data as any || []).map((d: any) => ({ user_id: d.user_id, id: d.id, email: d.email, full_name: d.full_name, avatar_url: d.avatar_url })));
    } catch (err: any) {
      setProfileSearchLoading(false);
      console.error('searchProfiles exception', err);
      toast({ title: 'Profile search failed', description: err.message || String(err), variant: 'destructive' });
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !user) return;
    // If assign toggle is on, require a selected assignee
    if ((formData as any).assignTo && !(formData as any).assigned_to) {
      toast({ title: 'Please select a user to assign to' });
      return;
    }

    if (editingTodo) {
      if (navigator.onLine) {
        const { error } = await supabase
          .from('todos')
          .update({
            title: formData.title,
            description: formData.description || null,
            due_date: formData.due_date || null,
            expected_completion_date: formData.expected_completion_date || null,
            assigned_to: formData.assigned_to || null,
            assigned_by: formData.assigned_to ? user.id : null,
            assignment_status: formData.assigned_to ? 'pending' : 'open',
            assigned_at: formData.assigned_to ? new Date().toISOString() : null,
            priority: formData.priority,
            category: formData.category || null,
            recurrence_pattern: formData.recurrence_pattern === 'none' ? null : formData.recurrence_pattern,
            is_template: (formData as any).is_template,
          })
          .eq('id', editingTodo.id);

        if (!error) {
          const updatedTodos = todos.map(t => 
            t.id === editingTodo.id 
              ? { ...t, ...formData, description: formData.description || undefined, due_date: formData.due_date || undefined, expected_completion_date: formData.expected_completion_date || undefined, category: formData.category || undefined }
              : t
          );
          setTodos(sortTodosByPriorityAndDate(updatedTodos));
          toast({ title: 'Task Updated' });
        }
      } else {
        // offline: queue update and optimistically update
        await queueMutation('supabase', { op: 'update', table: 'todos', data: { title: formData.title, description: formData.description || null, due_date: formData.due_date || null, expected_completion_date: formData.expected_completion_date || null, assigned_to: formData.assigned_to || null, assigned_by: formData.assigned_to ? user.id : null, assignment_status: formData.assigned_to ? 'pending' : 'open', assigned_at: formData.assigned_to ? new Date().toISOString() : null, priority: formData.priority, category: formData.category || null, recurrence_pattern: formData.recurrence_pattern === 'none' ? null : formData.recurrence_pattern, is_template: (formData as any).is_template }, match: { id: editingTodo.id } });
        const updatedTodos = todos.map(t => t.id === editingTodo.id ? { ...t, ...formData } : t);
        setTodos(sortTodosByPriorityAndDate(updatedTodos));
        toast({ title: 'Task Updated (offline)' });
      }
    } else {
      if (navigator.onLine) {
        const { data, error } = await supabase
          .from('todos')
          .insert({
            user_id: user.id,
            title: formData.title,
            description: formData.description || null,
            due_date: formData.due_date || null,
            expected_completion_date: formData.expected_completion_date || null,
            priority: formData.priority,
            category: formData.category || null,
            recurrence_pattern: formData.recurrence_pattern === 'none' ? null : formData.recurrence_pattern,
            is_template: (formData as any).is_template,
            // Assignment fields: include when assigning at creation
            assigned_to: (formData as any).assigned_to || null,
            assigned_by: (formData as any).assigned_to ? user.id : null,
            assignment_status: (formData as any).assigned_to ? 'pending' : 'open',
            assigned_at: (formData as any).assigned_to ? new Date().toISOString() : null,
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
          setTodos(sortTodosByPriorityAndDate([newTodo, ...todos]));
          toast({ title: 'Task Added' });
        }
      } else {
        // offline: queue insert and optimistic UI
        const tempId = `offline-todo-${Date.now()}`;
        await queueMutation('supabase', { op: 'insert', table: 'todos', data: { user_id: user.id, title: formData.title, description: formData.description || null, due_date: formData.due_date || null, expected_completion_date: formData.expected_completion_date || null, priority: formData.priority, category: formData.category || null, recurrence_pattern: formData.recurrence_pattern === 'none' ? null : formData.recurrence_pattern, is_template: (formData as any).is_template, assigned_to: (formData as any).assigned_to || null, assigned_by: (formData as any).assigned_to ? user.id : null, assignment_status: (formData as any).assigned_to ? 'pending' : 'open', assigned_at: (formData as any).assigned_to ? new Date().toISOString() : null } });
        const newTodo = { id: tempId, title: formData.title, description: formData.description || undefined, due_date: formData.due_date || undefined, expected_completion_date: formData.expected_completion_date || undefined, priority: formData.priority, category: formData.category || undefined, is_deleted: false, is_completed: false, created_at: new Date().toISOString(), subtasks: [] } as any;
        setTodos(sortTodosByPriorityAndDate([newTodo, ...todos]));
        toast({ title: 'Task Added (offline)' });
      }
    }

    closeDialog();
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
        setTodos(sortTodosByPriorityAndDate(updatedTodos));
        toast({ title: `Assignment ${status}` });
      }
    } else {
      await queueMutation('supabase', { op: 'update', table: 'todos', data: updates, match: { id: todo.id } });
      const updatedTodos = todos.map(t => t.id === todo.id ? { ...t, assignment_status: status } : t);
      setTodos(sortTodosByPriorityAndDate(updatedTodos));
      toast({ title: `Assignment ${status} (offline)` });
    }
  };

  const toggleComplete = async (todo: Todo) => {
    if (navigator.onLine) {
      const { error } = await supabase.from('todos').update({ is_completed: !todo.is_completed }).eq('id', todo.id);
      if (!error) {
        const updatedTodos = todos.map(t => t.id === todo.id ? { ...t, is_completed: !t.is_completed } : t);
        setTodos(sortTodosByPriorityAndDate(updatedTodos));
      }
    } else {
      await queueMutation('supabase', { op: 'update', table: 'todos', data: { is_completed: !todo.is_completed }, match: { id: todo.id } });
      const updatedTodos = todos.map(t => t.id === todo.id ? { ...t, is_completed: !t.is_completed } : t);
      setTodos(sortTodosByPriorityAndDate(updatedTodos));
    }
  };

  const deleteTodo = async (id: string) => {
    if (!user) return;
    if (navigator.onLine) {
      const { error } = await supabase.from('todos').update({ is_deleted: true, deleted_by: user.id, deleted_at: new Date().toISOString() }).eq('id', id);
      if (!error) {
        const updatedTodos = todos.map(t => t.id === id ? { ...t, is_deleted: true, deleted_by: user.id, deleted_at: new Date().toISOString() } : t);
        setTodos(sortTodosByPriorityAndDate(updatedTodos));
        toast({ title: 'Task Deleted' });
      }
    } else {
      await queueMutation('supabase', { op: 'update', table: 'todos', data: { is_deleted: true, deleted_by: user.id, deleted_at: new Date().toISOString() }, match: { id } });
      const updatedTodos = todos.map(t => t.id === id ? { ...t, is_deleted: true, deleted_by: user.id, deleted_at: new Date().toISOString() } : t);
      setTodos(sortTodosByPriorityAndDate(updatedTodos));
      toast({ title: 'Task Deleted (offline)' });
    }
  };

  const restoreTodo = async (id: string) => {
    if (navigator.onLine) {
      const { error } = await supabase.from('todos').update({ is_deleted: false, deleted_by: null, deleted_at: null }).eq('id', id);
      if (!error) {
        const updatedTodos = todos.map(t => t.id === id ? { ...t, is_deleted: false, deleted_by: undefined, deleted_at: undefined } : t);
        setTodos(sortTodosByPriorityAndDate(updatedTodos));
        toast({ title: 'Task Restored' });
      }
    } else {
      await queueMutation('supabase', { op: 'update', table: 'todos', data: { is_deleted: false, deleted_by: null, deleted_at: null }, match: { id } });
      const updatedTodos = todos.map(t => t.id === id ? { ...t, is_deleted: false, deleted_by: undefined, deleted_at: undefined } : t);
      setTodos(sortTodosByPriorityAndDate(updatedTodos));
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

  const filteredTodos = sortTodosByPriorityAndDate(
    todos.filter(todo => {
      // Tabs filtering (deleted overrides others)
      if (activeTab === 'deleted') {
        return todo.is_deleted === true;
      }
      if (todo.is_deleted === true) return false; // Hide deleted in other tabs
      
      if (!showCompleted && todo.is_completed) return false;
      if (filterCategory !== 'all' && todo.category !== filterCategory) return false;
      if (filterPriority !== 'all' && todo.priority !== filterPriority) return false;
      if (searchQuery && !todo.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      // Tabs filtering
      if (activeTab === 'assigned_to_me' && (!user || todo.assigned_to !== user.id)) return false;
      if (activeTab === 'assigned_by_me' && (!user || todo.assigned_by !== user.id)) return false;
      return true;
    })
  );

  const completedCount = todos.filter(t => t.is_completed).length;
  const pendingCount = todos.length - completedCount;

  // Get top priority tasks for summary (max 3)
  const topPriorityTasks = sortTodosByPriorityAndDate(
    todos.filter(t => !t.is_completed)
  ).slice(0, 3);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
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

      <main className="max-w-6xl mx-auto p-3 sm:p-4 md:p-6 -mt-4 relative z-10">
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

        {/* Tabs */}
        <div className="mb-3 sm:mb-4 overflow-x-auto">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="all" className="text-xs sm:text-sm">All</TabsTrigger>
              <TabsTrigger value="assigned_to_me" className="text-xs sm:text-sm truncate">For me <span className="hidden sm:inline ml-1 text-muted-foreground">{user ? todos.filter(t => t.assigned_to === user.id && !t.is_deleted).length : 0}</span></TabsTrigger>
              <TabsTrigger value="assigned_by_me" className="text-xs sm:text-sm truncate">By me <span className="hidden sm:inline ml-1 text-muted-foreground">{user ? todos.filter(t => t.assigned_by === user.id && !t.is_deleted).length : 0}</span></TabsTrigger>
              <TabsTrigger value="deleted" className="text-xs sm:text-sm">Del</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* AI Insights & Suggestions */}
        {!loading && todos.length > 0 && (
          <>
            {suggestNextActions(todos).length > 0 && (
              <Card className="p-4 mb-4 shadow-card border-border/50 rounded-2xl animate-fade-in bg-gradient-to-br from-blue/5 to-blue/2 border-blue/20 backdrop-blur-sm hover:shadow-elevated transition-all duration-300">
                <h3 className="font-semibold text-sm mb-3 flex items-center gap-2 text-blue-600 dark:text-blue-400">
                  🤖 AI Insights
                </h3>
                <div className="space-y-2">
                  {suggestNextActions(todos).map((suggestion, idx) => (
                    <p key={idx} className="text-xs text-muted-foreground leading-relaxed">
                      {suggestion}
                    </p>
                  ))}
                </div>
              </Card>
            )}

            {/* Task Summary */}
            {topPriorityTasks.length > 0 && (
              <Card className="p-4 mb-4 shadow-card border-border/50 rounded-2xl animate-fade-in bg-gradient-to-br from-primary/5 to-primary/2 border-primary/20 backdrop-blur-sm hover:shadow-elevated transition-all duration-300">
                <h3 className="font-semibold text-sm mb-3 flex items-center gap-2 text-primary">
                  <ListTodo className="w-4 h-4" />
                  Top Priority Tasks
                </h3>
                <div className="space-y-2">
                  {topPriorityTasks.map((task, idx) => {
                    const daysLeft = daysUntilDue(task.expected_completion_date || task.due_date);
                    const isOverdue = daysLeft !== null && daysLeft < 0;
                    const dueSoon = daysLeft !== null && daysLeft <= 3 && daysLeft >= 0;
                    
                    return (
                      <div key={task.id} className="flex items-start gap-3 p-2 rounded-lg bg-white/50 dark:bg-slate-950/50 hover:bg-white/80 dark:hover:bg-slate-900/50 transition-colors">
                        <span className="text-xs font-bold text-primary mt-1 min-w-fit">#{idx + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium line-clamp-1">{task.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className={`text-xs ${PRIORITY_COLORS[task.priority]}`}>
                              <Flag className="w-3 h-3 mr-1" />
                              {task.priority}
                            </Badge>
                            {(task.expected_completion_date || task.due_date) && (
                              <Badge 
                                variant="outline" 
                                className={`text-xs ${
                                  isOverdue ? 'bg-destructive/20 text-destructive border-destructive/30' :
                                  dueSoon ? 'bg-warning/20 text-warning border-warning/30' :
                                  'bg-success/20 text-success border-success/30'
                                }`}
                              >
                                <Calendar className="w-3 h-3 mr-1" />
                                {isToday(task.expected_completion_date || task.due_date) ? 'Today' :
                                 isOverdue ? `${Math.abs(daysLeft!)} days overdue` :
                                 daysLeft === 0 ? 'Due today' :
                                 `${daysLeft} ${daysLeft === 1 ? 'day' : 'days'} left`}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}
          </>
        )}

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
          <div className="flex items-center gap-2 mt-2 sm:mt-3">
            <Checkbox 
              id="show-completed"
              checked={showCompleted}
              onCheckedChange={(c) => setShowCompleted(c as boolean)}
            />
            <label htmlFor="show-completed" className="text-xs sm:text-sm text-muted-foreground cursor-pointer">
              Completed
            </label>
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
                      <Badge variant="outline" className={`text-xs ${PRIORITY_COLORS[todo.priority]}`}>
                        <Flag className="w-3 h-3 mr-1" />
                        {todo.priority}
                      </Badge>
                      
                      {todo.category && (
                        <Badge variant="secondary" className="text-xs">
                          <Tag className="w-3 h-3 mr-1" />
                          {todo.category}
                        </Badge>
                      )}
                      
                      {todo.due_date && (
                        <Badge variant="outline" className="text-xs">
                          <Calendar className="w-3 h-3 mr-1" />
                          {format(new Date(todo.due_date), 'MMM d')}
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
                    {/* Assignment status + actions */}
                    {todo.assignment_status && (
                      <div className="mt-2">
                        <Badge variant="outline" className="text-xs">{todo.assignment_status}</Badge>
                      </div>
                    )}

                    {todo.assigned_to && (
                      <div className="mt-2 space-y-2">
                        <div className="flex items-center gap-2">
                          {profileCache[todo.assigned_to] ? (
                            <>
                              <div className="w-6 h-6 rounded-full bg-muted-foreground/20 flex items-center justify-center text-xs font-medium overflow-hidden flex-shrink-0">
                                {profileCache[todo.assigned_to].avatar_url ? (
                                  <img src={profileCache[todo.assigned_to].avatar_url} alt="avatar" className="w-full h-full object-cover" />
                                ) : (
                                  <span>{profileCache[todo.assigned_to].full_name ? profileCache[todo.assigned_to].full_name.charAt(0) : '?'}</span>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground line-clamp-1">Assigned to: <span className="font-medium">{profileCache[todo.assigned_to].full_name || profileCache[todo.assigned_to].email}</span></p>
                            </>
                          ) : (
                            <p className="text-xs text-muted-foreground">Assigned to: <span className="font-medium">{todo.assigned_to.slice(0, 8)}</span></p>
                          )}
                        </div>
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

        {/* FAB */}
        <Button
          onClick={() => setDialogOpen(true)}
          className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 h-12 w-12 sm:h-14 sm:w-14 rounded-full shadow-elevated hover:scale-110 transition-transform"
          size="icon"
        >
          <Plus className="w-6 h-6" />
        </Button>
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
              <Label>Due Date</Label>
              <Input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                className="rounded-xl h-10 text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label>Expected Completion Date</Label>
              <Input
                type="date"
                value={formData.expected_completion_date}
                onChange={(e) => setFormData({ ...formData, expected_completion_date: e.target.value })}
                className="rounded-xl h-10 text-sm"
              />
              <p className="text-xs text-muted-foreground">If set, this date will be prioritized for task ordering</p>
            </div>

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
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

            <div className="space-y-2">
              <Label>Recurrence</Label>
              <Select 
                value={(formData as any).recurrence_pattern} 
                onValueChange={(v) => setFormData({ ...formData, recurrence_pattern: v as any })}
              >
                <SelectTrigger className="rounded-xl h-10 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox 
                  id="is-template"
                  checked={(formData as any).is_template}
                  onCheckedChange={(c) => setFormData({ ...formData, is_template: c as boolean })}
                />
                <Label htmlFor="is-template" className="text-sm cursor-pointer">Save as template</Label>
              </div>
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
    </div>
  );
};

export default TodoApp;
