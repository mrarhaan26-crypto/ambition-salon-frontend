export interface TaskItem {
  id: string;
  title: string;
  description: string;
  assignedTo: string | null;
  assignedName: string | null;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'TODO' | 'IN_PROGRESS' | 'DONE' | 'ARCHIVED';
  dueDate: string;
  createdAt: string;
}
