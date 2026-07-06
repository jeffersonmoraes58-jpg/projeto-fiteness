import { api } from './api';

export interface StudentDashboard {
  points: number;
  level: number;
  streak: number;
  todayWorkout: {
    id: string;
    name: string;
    description?: string;
    exercises: { name: string }[];
    totalExercises: number;
    estimatedMinutes: number;
  } | null;
  diet: {
    calories: { current: number; target: number };
    protein: { current: number; target: number };
    carbs: { current: number; target: number };
    fat: { current: number; target: number };
  } | null;
  water: { current: number; target: number };
  recentAchievements: { id: string; title: string; description: string; emoji: string }[];
}

export interface WorkoutPlan {
  id: string;
  name: string;
  description?: string;
  exercises: WorkoutExercise[];
  estimatedMinutes?: number;
}

export interface WorkoutExercise {
  id: string;
  exerciseId: string;
  name: string;
  sets: number;
  reps: string;
  restSeconds: number;
  weight?: number;
  notes?: string;
  videoUrl?: string;
  gifUrl?: string;
  category?: string;
  completed?: boolean;
}


export interface WorkoutLog {
  id: string;
  workoutPlanId: string;
  startedAt: string;
  completedAt?: string;
  exercises: any[];
  notes?: string;
}

export interface DietPlan {
  id: string;
  name: string;
  description?: string;
  meals: Meal[];
  dailyCalories: number;
  dailyProtein: number;
  dailyCarbs: number;
  dailyFat: number;
}

export interface Meal {
  id: string;
  name: string;
  time: string;
  foods: FoodItem[];
}

export interface FoodItem {
  id: string;
  name: string;
  amount: number;
  unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface MealLog {
  id: string;
  mealId: string;
  mealName: string;
  foods: any[];
  loggedAt: string;
}

export interface ProgressData {
  measurements: Measurement[];
  photos: ProgressPhoto[];
  assessments: Assessment[];
  charts: {
    weight: ChartDataPoint[];
    bodyFat: ChartDataPoint[];
    muscle: ChartDataPoint[];
  };
}

export interface Measurement {
  id: string;
  weight: number;
  bodyFat?: number;
  muscleMass?: number;
  chest?: number;
  waist?: number;
  hips?: number;
  arms?: number;
  thighs?: number;
  date: string;
}

export interface ProgressPhoto {
  id: string;
  photoUrl: string;
  angle: string;
  weight?: number;
  notes?: string;
  date: string;
}

export interface Assessment {
  id: string;
  type: string;
  data: any;
  notes?: string;
  date: string;
}

export interface ChartDataPoint {
  date: string;
  value: number;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  emoji: string;
  unlockedAt: string;
}

export interface Contact {
  trainer?: { id: string; name: string; email: string; avatarUrl?: string };
  nutritionist?: { id: string; name: string; email: string; avatarUrl?: string };
}

export interface Appointment {
  id: string;
  title: string;
  date: string;
  status: string;
  professionalName: string;
}

export const studentService = {
  // Dashboard
  async getDashboard(): Promise<StudentDashboard> {
    const { data } = await api.get('/students/me/dashboard');
    return data;
  },

  // Workout Plan
  async getWorkoutPlan(): Promise<WorkoutPlan | null> {
    const { data } = await api.get('/students/me/workout-plan');
    return data;
  },

  async getWorkoutLogs(): Promise<WorkoutLog[]> {
    const { data } = await api.get('/students/me/workout-logs');
    return data;
  },

  async startWorkout(workoutPlanId: string) {
    const { data } = await api.post('/students/me/workout-start', { workoutPlanId });
    return data;
  },

  async logWorkout(body: any) {
    const { data } = await api.post('/students/me/workout-logs', body);
    return data;
  },

  // Diet
  async getDiet(): Promise<DietPlan | null> {
    const { data } = await api.get('/students/me/diet');
    return data;
  },

  async logMeal(body: any) {
    const { data } = await api.post('/students/me/meal-logs', body);
    return data;
  },

  async getMealLogsToday(): Promise<MealLog[]> {
    const { data } = await api.get('/students/me/meal-logs/today');
    return data;
  },

  // Water
  async logWater(amount: number) {
    const { data } = await api.post('/students/me/water', { amount });
    return data;
  },

  async getWaterToday(): Promise<{ total: number; target: number; glasses: { time: string; amount: number }[] }> {
    const { data } = await api.get('/students/me/water/today');
    return data;
  },

  // Progress
  async getProgress(): Promise<ProgressData> {
    const { data } = await api.get('/students/me/progress');
    return data;
  },

  async addMeasurement(body: any) {
    const { data } = await api.post('/students/me/measurements', body);
    return data;
  },

  // Achievements
  async getAchievements(): Promise<Achievement[]> {
    const { data } = await api.get('/students/me/achievements');
    return data;
  },

  // Profile
  async updateProfile(body: any) {
    const { data } = await api.patch('/students/me', body);
    return data;
  },

  // Contacts
  async getContacts(): Promise<Contact> {
    const { data } = await api.get('/students/me/contacts');
    return data;
  },

  // Appointments
  async getAppointments(): Promise<Appointment[]> {
    const { data } = await api.get('/students/me/appointments');
    return data;
  },
};
