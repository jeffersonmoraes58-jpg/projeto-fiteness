import { api } from './api';

export interface Student {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  _count?: { workoutPlans: number };
}

export interface Workout {
  id: string;
  name: string;
  description?: string;
  exercises?: any[];
  status?: string;
  createdAt: string;
  _count?: { exercises: number; assignedStudents: number };
}

export interface Exercise {
  id: string;
  name: string;
  description?: string;
  category: string;
  difficulty: string;
  equipment?: string;
  videoUrl?: string;
  imageUrl?: string;
}

export interface DashboardData {
  totalStudents: number;
  totalWorkouts: number;
  todayAppointments: number;
  recentActivity: any[];
}

export const trainerService = {
  // Dashboard
  async getDashboard(): Promise<DashboardData> {
    const { data } = await api.get('/trainers/me/dashboard');
    return data;
  },

  // Students
  async getStudents(search?: string): Promise<Student[]> {
    const params = search ? { search } : {};
    const { data } = await api.get('/trainers/me/students', { params });
    return data;
  },

  async addStudent(studentUserId: string, monthlyFee?: number) {
    const { data } = await api.post('/trainers/me/students', { studentUserId, monthlyFee });
    return data;
  },

  async removeStudent(studentId: string) {
    await api.delete(`/trainers/me/students/${studentId}`);
  },

  // Workouts
  async getWorkouts(search?: string): Promise<Workout[]> {
    const params = search ? { search } : {};
    const { data } = await api.get('/workouts', { params });
    return data;
  },

  async getWorkoutById(id: string): Promise<Workout> {
    const { data } = await api.get(`/workouts/${id}`);
    return data;
  },

  async createWorkout(body: { name: string; description?: string; exercises?: any[] }) {
    const { data } = await api.post('/workouts', body);
    return data;
  },

  async updateWorkout(id: string, body: any) {
    const { data } = await api.patch(`/workouts/${id}`, body);
    return data;
  },

  async deleteWorkout(id: string) {
    await api.delete(`/workouts/${id}`);
  },

  async assignWorkout(workoutId: string, studentId: string) {
    const { data } = await api.post(`/workouts/${workoutId}/assign`, { studentId });
    return data;
  },

  // Exercises
  async getExercises(category?: string, search?: string): Promise<Exercise[]> {
    const params: any = {};
    if (category) params.category = category;
    if (search) params.search = search;
    const { data } = await api.get('/exercises', { params });
    return data;
  },

  async getExerciseById(id: string): Promise<Exercise> {
    const { data } = await api.get(`/exercises/${id}`);
    return data;
  },

  async createExercise(body: {
    name: string;
    description?: string;
    category: string;
    difficulty: string;
    equipment?: string;
    videoUrl?: string;
  }) {
    const { data } = await api.post('/exercises', body);
    return data;
  },

  async updateExercise(id: string, body: any) {
    const { data } = await api.patch(`/exercises/${id}`, body);
    return data;
  },

  async deleteExercise(id: string) {
    await api.delete(`/exercises/${id}`);
  },
};
