export interface Exercise {
  name: string
  met: number
  category: 'Cardio' | 'Strength' | 'Sports' | 'Other'
}

export const EXERCISES: Exercise[] = [
  // Cardio
  { name: 'Running (6 km/h)', met: 6.0, category: 'Cardio' },
  { name: 'Running (8 km/h)', met: 8.3, category: 'Cardio' },
  { name: 'Running (10 km/h)', met: 9.8, category: 'Cardio' },
  { name: 'Running (12 km/h)', met: 11.5, category: 'Cardio' },
  { name: 'Running (14 km/h)', met: 13.5, category: 'Cardio' },
  { name: 'Jogging (light)', met: 7.0, category: 'Cardio' },
  { name: 'Walking (4 km/h)', met: 3.0, category: 'Cardio' },
  { name: 'Walking (brisk, 6 km/h)', met: 4.5, category: 'Cardio' },
  { name: 'Cycling (moderate)', met: 6.8, category: 'Cardio' },
  { name: 'Cycling (vigorous)', met: 10.0, category: 'Cardio' },
  { name: 'Stationary Bike (moderate)', met: 5.5, category: 'Cardio' },
  { name: 'Stationary Bike (vigorous)', met: 8.5, category: 'Cardio' },
  { name: 'Swimming (moderate)', met: 6.0, category: 'Cardio' },
  { name: 'Swimming (vigorous)', met: 9.8, category: 'Cardio' },
  { name: 'Elliptical (moderate)', met: 5.0, category: 'Cardio' },
  { name: 'Elliptical (vigorous)', met: 8.0, category: 'Cardio' },
  { name: 'Jump Rope', met: 10.0, category: 'Cardio' },
  { name: 'Rowing Machine (moderate)', met: 7.0, category: 'Cardio' },
  { name: 'Rowing Machine (vigorous)', met: 12.0, category: 'Cardio' },
  { name: 'Stair Climbing', met: 8.8, category: 'Cardio' },
  { name: 'HIIT', met: 10.0, category: 'Cardio' },
  { name: 'Treadmill (incline walk)', met: 5.0, category: 'Cardio' },

  // Strength
  { name: 'Weight Training (light)', met: 3.0, category: 'Strength' },
  { name: 'Weight Training (moderate)', met: 5.0, category: 'Strength' },
  { name: 'Weight Training (vigorous)', met: 6.0, category: 'Strength' },
  { name: 'Powerlifting', met: 6.0, category: 'Strength' },
  { name: 'CrossFit', met: 9.0, category: 'Strength' },
  { name: 'Bodyweight Training', met: 4.0, category: 'Strength' },
  { name: 'Kettlebell Training', met: 8.0, category: 'Strength' },
  { name: 'Circuit Training', met: 8.0, category: 'Strength' },

  // Sports
  { name: 'Basketball', met: 8.0, category: 'Sports' },
  { name: 'Soccer / Football', met: 7.0, category: 'Sports' },
  { name: 'Tennis', met: 7.3, category: 'Sports' },
  { name: 'Boxing', met: 9.0, category: 'Sports' },
  { name: 'Martial Arts', met: 10.0, category: 'Sports' },
  { name: 'Volleyball', met: 4.0, category: 'Sports' },
  { name: 'Badminton', met: 5.5, category: 'Sports' },

  // Other
  { name: 'Yoga', met: 2.5, category: 'Other' },
  { name: 'Pilates', met: 3.0, category: 'Other' },
  { name: 'Stretching', met: 2.3, category: 'Other' },
  { name: 'Dancing', met: 5.5, category: 'Other' },
  { name: 'Hiking', met: 6.0, category: 'Other' },
]

export function calcCaloriesBurned(met: number, weight_kg: number, duration_min: number): number {
  return Math.round(met * weight_kg * (duration_min / 60))
}

export const EXERCISE_CATEGORIES = ['Cardio', 'Strength', 'Sports', 'Other'] as const

export function searchExercises(query: string): Exercise[] {
  if (!query.trim()) return EXERCISES
  const q = query.toLowerCase()
  return EXERCISES.filter(
    (e) => e.name.toLowerCase().includes(q) || e.category.toLowerCase().includes(q)
  )
}
