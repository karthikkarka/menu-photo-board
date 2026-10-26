export type DishStage = 'no_photo' | 'photo_taken' | 'photo_edited' | 'live';

export interface Dish {
  id: string;
  created_at: string;
  name: string;
  category: string;
  stage: DishStage;
  price: number;
  description?: string;
  updated_at?: string;
}

export const STAGE_CONFIG: Record<DishStage, {
  label: string;
  nextStage: DishStage | null;
  prevStage: DishStage | null;
  color: string;
  bgColor: string;
  badgeBg: string;
  badgeText: string;
  borderColor: string;
  description: string;
}> = {
  no_photo: {
    label: 'No Photo',
    nextStage: 'photo_taken',
    prevStage: null,
    color: '#e11d48',
    bgColor: '#fff1f2',
    badgeBg: 'bg-rose-100',
    badgeText: 'text-rose-700',
    borderColor: 'border-rose-300',
    description: 'Needs professional shoot'
  },
  photo_taken: {
    label: 'Photo Taken',
    nextStage: 'photo_edited',
    prevStage: 'no_photo',
    color: '#d97706',
    bgColor: '#fffbeb',
    badgeBg: 'bg-amber-100',
    badgeText: 'text-amber-800',
    borderColor: 'border-amber-300',
    description: 'Raw photo captured, awaiting edit'
  },
  photo_edited: {
    label: 'Photo Edited',
    nextStage: 'live',
    prevStage: 'photo_taken',
    color: '#2563eb',
    bgColor: '#eff6ff',
    badgeBg: 'bg-blue-100',
    badgeText: 'text-blue-800',
    borderColor: 'border-blue-300',
    description: 'Edited, ready for platform upload'
  },
  live: {
    label: 'Live',
    nextStage: null,
    prevStage: 'photo_edited',
    color: '#16a34a',
    bgColor: '#f0fdf4',
    badgeBg: 'bg-emerald-100',
    badgeText: 'text-emerald-800',
    borderColor: 'border-emerald-300',
    description: 'Live on Zomato, Swiggy & Instagram'
  }
};
