import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
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
  ListTodo, Clock
} from 'lucide-react';
import { format } from 'date-fns';

interface Todo {
  id: string;
  title: string;
  description?: string;
  due_date?: string;
  priority: 'low' | 'medium' | 'high';
  category?: string;
  is_completed: boolean;
  created_at: string;
}

const CATEGORIES = ['Work', 'Personal', 'Shopping', 'Health', 'Finance', 'Other'];
const PRIORITY_COLORS = {
  low: 'bg-success/20 text-success border-success/30',
  medium: 'bg-warning/20 text-warning border-warning/30',
  high: 'bg-destructive/20 text-destructive border-destructive/30',
};

const TodoApp = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [showCompleted, setShowCompleted] = useState(true);
  
  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    due_date: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    category: '',
  });

  useEffect(() => {
    if (user) fetchTodos();
  }, [user]);

  const fetchTodos = async () => {
    const { data, error } = await supabase
      .from('todos')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setTodos(data.map(t => ({
        ...t,
        priority: t.priority as 'low' | 'medium' | 'high',
        description: t.description || undefined,
        due_date: t.due_date || undefined,
        category: t.category || undefined,
      })));
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !user) return;

    if (editingTodo) {
      const { error } = await supabase
        .from('todos')
        .update({
          title: formData.title,
          description: formData.description || null,
          due_date: formData.due_date || null,
          priority: formData.priority,
          category: formData.category || null,
        })
        .eq('id', editingTodo.id);

      if (!error) {
        setTodos(todos.map(t => 
          t.id === editingTodo.id 
            ? { ...t, ...formData, description: formData.description || undefined, due_date: formData.due_date || undefined, category: formData.category || undefined }
            : t
        ));
        toast({ title: 'Task Updated' });
      }
    } else {
      const { data, error } = await supabase
        .from('todos')
        .insert({
          user_id: user.id,
          title: formData.title,
          description: formData.description || null,
          due_date: formData.due_date || null,
          priority: formData.priority,
          category: formData.category || null,
        })
        .select()
        .single();

      if (!error && data) {
        setTodos([{
          ...data,
          priority: data.priority as 'low' | 'medium' | 'high',
          description: data.description || undefined,
          due_date: data.due_date || undefined,
          category: data.category || undefined,
        }, ...todos]);
        toast({ title: 'Task Added' });
      }
    }

    closeDialog();
  };

  const toggleComplete = async (todo: Todo) => {
    const { error } = await supabase
      .from('todos')
      .update({ is_completed: !todo.is_completed })
      .eq('id', todo.id);

    if (!error) {
      setTodos(todos.map(t => 
        t.id === todo.id ? { ...t, is_completed: !t.is_completed } : t
      ));
    }
  };

  const deleteTodo = async (id: string) => {
    const { error } = await supabase
      .from('todos')
      .delete()
      .eq('id', id);

    if (!error) {
      setTodos(todos.filter(t => t.id !== id));
      toast({ title: 'Task Deleted' });
    }
  };

  const openEditDialog = (todo: Todo) => {
    setEditingTodo(todo);
    setFormData({
      title: todo.title,
      description: todo.description || '',
      due_date: todo.due_date || '',
      priority: todo.priority,
      category: todo.category || '',
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingTodo(null);
    setFormData({ title: '', description: '', due_date: '', priority: 'medium', category: '' });
  };

  const filteredTodos = todos.filter(todo => {
    if (!showCompleted && todo.is_completed) return false;
    if (filterCategory !== 'all' && todo.category !== filterCategory) return false;
    if (filterPriority !== 'all' && todo.priority !== filterPriority) return false;
    if (searchQuery && !todo.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const completedCount = todos.filter(t => t.is_completed).length;
  const pendingCount = todos.length - completedCount;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="gradient-hero text-white relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
        </div>
        
        <div className="relative max-w-6xl mx-auto p-6">
          <div className="flex items-center gap-4 mb-6">
            <Button 
              onClick={() => navigate('/')}
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20 rounded-xl"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                <ListTodo className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight">Todo App</h1>
                <p className="text-xs text-white/70">Stay organized</p>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/15 backdrop-blur-md rounded-2xl p-4 border border-white/20">
              <div className="flex items-center gap-2 mb-1">
                <Circle className="w-4 h-4" />
                <span className="text-xs text-white/80">Pending</span>
              </div>
              <p className="text-2xl font-bold">{pendingCount}</p>
            </div>
            <div className="bg-white/15 backdrop-blur-md rounded-2xl p-4 border border-white/20">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-xs text-white/80">Completed</span>
              </div>
              <p className="text-2xl font-bold">{completedCount}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 md:p-6 -mt-4 relative z-10">
        {/* Search & Filters */}
        <Card className="p-4 mb-4 shadow-card border-border/50 rounded-2xl animate-fade-in">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tasks..."
                className="pl-10 rounded-xl"
              />
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-full sm:w-[140px] rounded-xl">
                <Tag className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {CATEGORIES.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger className="w-full sm:w-[140px] rounded-xl">
                <Flag className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <Checkbox 
              id="show-completed"
              checked={showCompleted}
              onCheckedChange={(c) => setShowCompleted(c as boolean)}
            />
            <label htmlFor="show-completed" className="text-sm text-muted-foreground cursor-pointer">
              Show completed tasks
            </label>
          </div>
        </Card>

        {/* Todo List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filteredTodos.length === 0 ? (
          <Card className="p-12 text-center shadow-card border-border/50 rounded-3xl animate-fade-in">
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
          <div className="space-y-3">
            {filteredTodos.map((todo, index) => (
              <Card 
                key={todo.id}
                className={`p-4 shadow-card border-border/50 rounded-2xl transition-all duration-300 hover:shadow-elevated animate-fade-in ${
                  todo.is_completed ? 'opacity-60' : ''
                }`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-start gap-3">
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
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary"
                          onClick={() => openEditDialog(todo)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => deleteTodo(todo.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    
                    {todo.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {todo.description}
                      </p>
                    )}
                    
                    <div className="flex flex-wrap items-center gap-2 mt-2">
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
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* FAB */}
        <Button
          onClick={() => setDialogOpen(true)}
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-elevated hover:scale-110 transition-transform"
          size="icon"
        >
          <Plus className="w-6 h-6" />
        </Button>
      </main>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-w-md rounded-3xl border-border/50 shadow-elevated">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              {editingTodo ? <Edit2 className="w-5 h-5 text-primary" /> : <Plus className="w-5 h-5 text-primary" />}
              {editingTodo ? 'Edit Task' : 'Add Task'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="What needs to be done?"
                className="rounded-xl"
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Add more details..."
                className="rounded-xl resize-none"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label>Priority</Label>
                <Select 
                  value={formData.priority} 
                  onValueChange={(v) => setFormData({ ...formData, priority: v as 'low' | 'medium' | 'high' })}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">🟢 Low</SelectItem>
                    <SelectItem value="medium">🟡 Medium</SelectItem>
                    <SelectItem value="high">🔴 High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Category</Label>
              <Select 
                value={formData.category} 
                onValueChange={(v) => setFormData({ ...formData, category: v })}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

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
