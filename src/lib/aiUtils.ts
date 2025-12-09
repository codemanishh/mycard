import { Todo } from '@/pages/TodoApp';

/**
 * Simple AI heuristics for task analysis (no API calls required).
 * For production, integrate with OpenAI/Claude API.
 */

export const generateTaskSummary = (todo: Todo): string => {
  const parts: string[] = [];

  if (todo.priority === 'high') {
    parts.push('⚠️ High priority.');
  }

  const now = new Date();
  if (todo.due_date) {
    const dueDate = new Date(todo.due_date);
    const daysLeft = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysLeft < 0) {
      parts.push(`🔴 Overdue by ${Math.abs(daysLeft)} days.`);
    } else if (daysLeft === 0) {
      parts.push('🟡 Due today!');
    } else if (daysLeft <= 3) {
      parts.push(`🟡 Due in ${daysLeft} days.`);
    }
  }

  if (todo.assigned_to) {
    parts.push('👤 Assigned to someone.');
  }

  if (todo.subtasks && todo.subtasks.length > 0) {
    const completed = todo.subtasks.filter(s => s.is_completed).length;
    parts.push(`✓ ${completed}/${todo.subtasks.length} subtasks done.`);
  }

  if (parts.length === 0) {
    parts.push('📝 Regular task.');
  }

  return parts.join(' ');
};

export const suggestNextActions = (todos: Todo[]): string[] => {
  const suggestions: string[] = [];

  const overdue = todos.filter(t => {
    if (!t.due_date || t.is_completed || t.is_deleted) return false;
    const daysLeft = Math.ceil((new Date(t.due_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return daysLeft < 0;
  });

  if (overdue.length > 0) {
    suggestions.push(`⚠️ You have ${overdue.length} overdue task${overdue.length > 1 ? 's' : ''}.`);
  }

  const pending = todos.filter(t => t.assignment_status === 'pending' && !t.is_deleted);
  if (pending.length > 0) {
    suggestions.push(`📨 ${pending.length} assignment${pending.length > 1 ? 's' : ''} awaiting response.`);
  }

  const highPriority = todos.filter(t => t.priority === 'high' && !t.is_completed && !t.is_deleted);
  if (highPriority.length > 0) {
    suggestions.push(`🔴 Focus on ${highPriority.length} high-priority task${highPriority.length > 1 ? 's' : ''}.`);
  }

  const wip = todos.filter(t => t.assignment_status === 'wip' && !t.is_deleted);
  if (wip.length > 0) {
    suggestions.push(`🔄 You're working on ${wip.length} task${wip.length > 1 ? 's' : ''}.`);
  }

  return suggestions.slice(0, 3); // Show top 3 suggestions
};

export const estimateCompletionTime = (todo: Todo): string => {
  // Basic heuristic: estimate based on subtasks and priority
  let estimatedHours = 1;

  if (todo.priority === 'high') estimatedHours += 1;
  if (todo.subtasks && todo.subtasks.length > 0) {
    estimatedHours += Math.ceil(todo.subtasks.length / 3);
  }
  if (todo.description && todo.description.length > 200) {
    estimatedHours += 1;
  }

  if (estimatedHours <= 1) return '< 1 hour';
  if (estimatedHours <= 3) return '1-3 hours';
  if (estimatedHours <= 8) return '1 day';
  return '> 1 day';
};
