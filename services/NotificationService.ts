import { GAS_WEB_APP_URL } from '../constants';
import { SharboxItem, TracerTodo } from '../types';

export interface NotificationData {
  sharbox: SharboxItem[];
  todos: TracerTodo[];
}

export const fetchNotifications = async (): Promise<NotificationData> => {
  if (!GAS_WEB_APP_URL) return { sharbox: [], todos: [] };
  try {
    const response = await fetch(`${GAS_WEB_APP_URL}?action=getNotifications`);
    const result = await response.json();
    if (result.status === 'success') {
      return result.data;
    }
    return { sharbox: [], todos: [] };
  } catch (error) {
    console.error("Failed to fetch notifications:", error);
    return { sharbox: [], todos: [] };
  }
};

export const getUrgencyColor = (todo: TracerTodo): string => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadline = new Date(todo.deadline);
  
  if (today > deadline) return 'text-red-500'; // Overdue
  
  const diffTime = deadline.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'text-orange-500'; // Today
  if (diffDays <= 3) return 'text-yellow-600'; // Urgent
  return 'text-[#004A74]';
};

export const getUrgencyLabel = (todo: TracerTodo): string => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadline = new Date(todo.deadline);
  
  if (today > deadline) return 'Overdue';
  
  const diffTime = deadline.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Due Today';
  if (diffDays <= 3) return `${diffDays} days left`;
  return '';
};