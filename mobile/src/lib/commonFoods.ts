import { FoodItem } from '../types'

export const COMMON_FOODS: FoodItem[] = [
  // Meats & Poultry
  { name: 'Chicken Breast (cooked)', calories_100g: 165, protein_100g: 31, carbs_100g: 0, fat_100g: 3.6, fiber_100g: 0, source: 'common', category: 'Meat' },
  { name: 'Chicken Thigh (cooked)', calories_100g: 209, protein_100g: 26, carbs_100g: 0, fat_100g: 11, fiber_100g: 0, source: 'common', category: 'Meat' },
  { name: 'Ground Beef 80/20 (cooked)', calories_100g: 215, protein_100g: 26, carbs_100g: 0, fat_100g: 13, fiber_100g: 0, source: 'common', category: 'Meat' },
  { name: 'Ground Beef 90/10 (cooked)', calories_100g: 176, protein_100g: 28, carbs_100g: 0, fat_100g: 7, fiber_100g: 0, source: 'common', category: 'Meat' },
  { name: 'Turkey Breast (cooked)', calories_100g: 135, protein_100g: 30, carbs_100g: 0, fat_100g: 1, fiber_100g: 0, source: 'common', category: 'Meat' },
  { name: 'Beef Steak (sirloin)', calories_100g: 207, protein_100g: 26, carbs_100g: 0, fat_100g: 11, fiber_100g: 0, source: 'common', category: 'Meat' },
  { name: 'Pork Tenderloin (cooked)', calories_100g: 166, protein_100g: 29, carbs_100g: 0, fat_100g: 5, fiber_100g: 0, source: 'common', category: 'Meat' },
  { name: 'Bacon (cooked)', calories_100g: 541, protein_100g: 37, carbs_100g: 1.4, fat_100g: 42, fiber_100g: 0, source: 'common', category: 'Meat' },
  { name: 'Ham', calories_100g: 145, protein_100g: 21, carbs_100g: 1.5, fat_100g: 6, fiber_100g: 0, source: 'common', category: 'Meat' },

  // Fish & Seafood
  { name: 'Salmon (cooked)', calories_100g: 208, protein_100g: 20, carbs_100g: 0, fat_100g: 13, fiber_100g: 0, source: 'common', category: 'Fish' },
  { name: 'Tuna (canned in water)', calories_100g: 116, protein_100g: 26, carbs_100g: 0, fat_100g: 0.8, fiber_100g: 0, source: 'common', category: 'Fish' },
  { name: 'Cod (cooked)', calories_100g: 105, protein_100g: 23, carbs_100g: 0, fat_100g: 0.9, fiber_100g: 0, source: 'common', category: 'Fish' },
  { name: 'Shrimp (cooked)', calories_100g: 99, protein_100g: 24, carbs_100g: 0.2, fat_100g: 0.3, fiber_100g: 0, source: 'common', category: 'Fish' },
  { name: 'Tilapia (cooked)', calories_100g: 128, protein_100g: 26, carbs_100g: 0, fat_100g: 2.7, fiber_100g: 0, source: 'common', category: 'Fish' },
  { name: 'Sardines (canned in oil)', calories_100g: 208, protein_100g: 25, carbs_100g: 0, fat_100g: 11, fiber_100g: 0, source: 'common', category: 'Fish' },

  // Eggs & Dairy
  { name: 'Whole Egg', calories_100g: 155, protein_100g: 13, carbs_100g: 1.1, fat_100g: 11, fiber_100g: 0, source: 'common', category: 'Eggs & Dairy', piece_weight_g: 55 },
  { name: 'Egg White', calories_100g: 52, protein_100g: 11, carbs_100g: 0.7, fat_100g: 0.2, fiber_100g: 0, source: 'common', category: 'Eggs & Dairy', piece_weight_g: 33 },
  { name: 'Whole Milk', calories_100g: 61, protein_100g: 3.2, carbs_100g: 4.8, fat_100g: 3.3, fiber_100g: 0, source: 'common', category: 'Eggs & Dairy' },
  { name: 'Skim Milk', calories_100g: 34, protein_100g: 3.4, carbs_100g: 5, fat_100g: 0.1, fiber_100g: 0, source: 'common', category: 'Eggs & Dairy' },
  { name: 'Greek Yogurt 0%', calories_100g: 59, protein_100g: 10, carbs_100g: 3.6, fat_100g: 0.4, fiber_100g: 0, source: 'common', category: 'Eggs & Dairy' },
  { name: 'Greek Yogurt Full Fat', calories_100g: 97, protein_100g: 9, carbs_100g: 3.8, fat_100g: 5, fiber_100g: 0, source: 'common', category: 'Eggs & Dairy' },
  { name: 'Cottage Cheese (low fat)', calories_100g: 98, protein_100g: 11, carbs_100g: 3.4, fat_100g: 4.3, fiber_100g: 0, source: 'common', category: 'Eggs & Dairy' },
  { name: 'Cheddar Cheese', calories_100g: 403, protein_100g: 25, carbs_100g: 1.3, fat_100g: 33, fiber_100g: 0, source: 'common', category: 'Eggs & Dairy' },
  { name: 'Mozzarella', calories_100g: 280, protein_100g: 28, carbs_100g: 2.2, fat_100g: 17, fiber_100g: 0, source: 'common', category: 'Eggs & Dairy' },
  { name: 'Butter', calories_100g: 717, protein_100g: 0.9, carbs_100g: 0.1, fat_100g: 81, fiber_100g: 0, source: 'common', category: 'Eggs & Dairy' },

  // Grains & Carbs
  { name: 'White Rice (cooked)', calories_100g: 130, protein_100g: 2.7, carbs_100g: 28, fat_100g: 0.3, fiber_100g: 0.4, source: 'common', category: 'Grains' },
  { name: 'Brown Rice (cooked)', calories_100g: 123, protein_100g: 2.7, carbs_100g: 26, fat_100g: 0.9, fiber_100g: 1.8, source: 'common', category: 'Grains' },
  { name: 'Pasta (cooked)', calories_100g: 131, protein_100g: 5, carbs_100g: 25, fat_100g: 1.1, fiber_100g: 1.8, source: 'common', category: 'Grains' },
  { name: 'Oats (dry)', calories_100g: 389, protein_100g: 17, carbs_100g: 66, fat_100g: 7, fiber_100g: 10, source: 'common', category: 'Grains' },
  { name: 'Oatmeal (cooked)', calories_100g: 68, protein_100g: 2.4, carbs_100g: 12, fat_100g: 1.4, fiber_100g: 1.7, source: 'common', category: 'Grains' },
  { name: 'Quinoa (cooked)', calories_100g: 120, protein_100g: 4.4, carbs_100g: 22, fat_100g: 1.9, fiber_100g: 2.8, source: 'common', category: 'Grains' },
  { name: 'White Bread', calories_100g: 265, protein_100g: 9, carbs_100g: 49, fat_100g: 3.2, fiber_100g: 2.7, source: 'common', category: 'Grains' },
  { name: 'Whole Wheat Bread', calories_100g: 247, protein_100g: 13, carbs_100g: 41, fat_100g: 4.2, fiber_100g: 7, source: 'common', category: 'Grains' },
  { name: 'Tortilla (flour)', calories_100g: 312, protein_100g: 8.6, carbs_100g: 51, fat_100g: 7.5, fiber_100g: 3.5, source: 'common', category: 'Grains' },

  // Legumes
  { name: 'Black Beans (cooked)', calories_100g: 132, protein_100g: 8.9, carbs_100g: 24, fat_100g: 0.5, fiber_100g: 8.7, source: 'common', category: 'Legumes' },
  { name: 'Chickpeas (cooked)', calories_100g: 164, protein_100g: 8.9, carbs_100g: 27, fat_100g: 2.6, fiber_100g: 7.6, source: 'common', category: 'Legumes' },
  { name: 'Lentils (cooked)', calories_100g: 116, protein_100g: 9, carbs_100g: 20, fat_100g: 0.4, fiber_100g: 7.9, source: 'common', category: 'Legumes' },
  { name: 'Kidney Beans (cooked)', calories_100g: 127, protein_100g: 8.7, carbs_100g: 23, fat_100g: 0.5, fiber_100g: 6.4, source: 'common', category: 'Legumes' },
  { name: 'Edamame', calories_100g: 121, protein_100g: 11, carbs_100g: 8.9, fat_100g: 5.2, fiber_100g: 5.2, source: 'common', category: 'Legumes' },
  { name: 'Tofu (firm)', calories_100g: 76, protein_100g: 8, carbs_100g: 1.9, fat_100g: 4.8, fiber_100g: 0.3, source: 'common', category: 'Legumes' },

  // Fruits
  { name: 'Banana', calories_100g: 89, protein_100g: 1.1, carbs_100g: 23, fat_100g: 0.3, fiber_100g: 2.6, sugar_100g: 12, source: 'common', category: 'Fruit', piece_weight_g: 120 },
  { name: 'Apple', calories_100g: 52, protein_100g: 0.3, carbs_100g: 14, fat_100g: 0.2, fiber_100g: 2.4, sugar_100g: 10, source: 'common', category: 'Fruit', piece_weight_g: 182 },
  { name: 'Orange', calories_100g: 47, protein_100g: 0.9, carbs_100g: 12, fat_100g: 0.1, fiber_100g: 2.4, sugar_100g: 9, source: 'common', category: 'Fruit', piece_weight_g: 130 },
  { name: 'Strawberries', calories_100g: 32, protein_100g: 0.7, carbs_100g: 7.7, fat_100g: 0.3, fiber_100g: 2, sugar_100g: 4.9, source: 'common', category: 'Fruit', piece_weight_g: 12 },
  { name: 'Blueberries', calories_100g: 57, protein_100g: 0.7, carbs_100g: 14, fat_100g: 0.3, fiber_100g: 2.4, sugar_100g: 10, source: 'common', category: 'Fruit', piece_weight_g: 2 },
  { name: 'Grapes', calories_100g: 69, protein_100g: 0.7, carbs_100g: 18, fat_100g: 0.2, fiber_100g: 0.9, sugar_100g: 15, source: 'common', category: 'Fruit', piece_weight_g: 5 },
  { name: 'Mango', calories_100g: 60, protein_100g: 0.8, carbs_100g: 15, fat_100g: 0.4, fiber_100g: 1.6, sugar_100g: 14, source: 'common', category: 'Fruit', piece_weight_g: 200 },
  { name: 'Avocado', calories_100g: 160, protein_100g: 2, carbs_100g: 9, fat_100g: 15, fiber_100g: 6.7, sugar_100g: 0.7, source: 'common', category: 'Fruit', piece_weight_g: 150 },
  { name: 'Watermelon', calories_100g: 30, protein_100g: 0.6, carbs_100g: 7.6, fat_100g: 0.2, fiber_100g: 0.4, sugar_100g: 6.2, source: 'common', category: 'Fruit' },
  { name: 'Pineapple', calories_100g: 50, protein_100g: 0.5, carbs_100g: 13, fat_100g: 0.1, fiber_100g: 1.4, sugar_100g: 10, source: 'common', category: 'Fruit' },

  // Vegetables
  { name: 'Broccoli', calories_100g: 34, protein_100g: 2.8, carbs_100g: 7, fat_100g: 0.4, fiber_100g: 2.6, source: 'common', category: 'Vegetable' },
  { name: 'Spinach', calories_100g: 23, protein_100g: 2.9, carbs_100g: 3.6, fat_100g: 0.4, fiber_100g: 2.2, source: 'common', category: 'Vegetable' },
  { name: 'Sweet Potato (cooked)', calories_100g: 86, protein_100g: 1.6, carbs_100g: 20, fat_100g: 0.1, fiber_100g: 3, source: 'common', category: 'Vegetable' },
  { name: 'White Potato (cooked)', calories_100g: 77, protein_100g: 2, carbs_100g: 17, fat_100g: 0.1, fiber_100g: 1.8, source: 'common', category: 'Vegetable' },
  { name: 'Carrot', calories_100g: 41, protein_100g: 0.9, carbs_100g: 10, fat_100g: 0.2, fiber_100g: 2.8, source: 'common', category: 'Vegetable' },
  { name: 'Bell Pepper', calories_100g: 31, protein_100g: 1, carbs_100g: 6, fat_100g: 0.3, fiber_100g: 2.1, source: 'common', category: 'Vegetable' },
  { name: 'Tomato', calories_100g: 18, protein_100g: 0.9, carbs_100g: 3.9, fat_100g: 0.2, fiber_100g: 1.2, source: 'common', category: 'Vegetable' },
  { name: 'Cucumber', calories_100g: 15, protein_100g: 0.7, carbs_100g: 3.6, fat_100g: 0.1, fiber_100g: 0.5, source: 'common', category: 'Vegetable' },
  { name: 'Zucchini', calories_100g: 17, protein_100g: 1.2, carbs_100g: 3.1, fat_100g: 0.3, fiber_100g: 1, source: 'common', category: 'Vegetable' },
  { name: 'Mushrooms', calories_100g: 22, protein_100g: 3.1, carbs_100g: 3.3, fat_100g: 0.3, fiber_100g: 1, source: 'common', category: 'Vegetable' },
  { name: 'Onion', calories_100g: 40, protein_100g: 1.1, carbs_100g: 9.3, fat_100g: 0.1, fiber_100g: 1.7, source: 'common', category: 'Vegetable' },
  { name: 'Lettuce (romaine)', calories_100g: 17, protein_100g: 1.2, carbs_100g: 3.3, fat_100g: 0.3, fiber_100g: 2.1, source: 'common', category: 'Vegetable' },
  { name: 'Kale', calories_100g: 49, protein_100g: 4.3, carbs_100g: 9, fat_100g: 0.9, fiber_100g: 3.6, source: 'common', category: 'Vegetable' },

  // Nuts & Seeds
  { name: 'Almonds', calories_100g: 579, protein_100g: 21, carbs_100g: 22, fat_100g: 50, fiber_100g: 12, source: 'common', category: 'Nuts & Seeds', piece_weight_g: 1.2 },
  { name: 'Walnuts', calories_100g: 654, protein_100g: 15, carbs_100g: 14, fat_100g: 65, fiber_100g: 6.7, source: 'common', category: 'Nuts & Seeds', piece_weight_g: 4 },
  { name: 'Peanut Butter', calories_100g: 588, protein_100g: 25, carbs_100g: 20, fat_100g: 50, fiber_100g: 6, source: 'common', category: 'Nuts & Seeds' },
  { name: 'Cashews', calories_100g: 553, protein_100g: 18, carbs_100g: 30, fat_100g: 44, fiber_100g: 3.3, source: 'common', category: 'Nuts & Seeds', piece_weight_g: 2 },
  { name: 'Chia Seeds', calories_100g: 486, protein_100g: 17, carbs_100g: 42, fat_100g: 31, fiber_100g: 34, source: 'common', category: 'Nuts & Seeds' },
  { name: 'Sunflower Seeds', calories_100g: 584, protein_100g: 21, carbs_100g: 20, fat_100g: 51, fiber_100g: 8.6, source: 'common', category: 'Nuts & Seeds' },

  // Oils & Fats
  { name: 'Olive Oil', calories_100g: 884, protein_100g: 0, carbs_100g: 0, fat_100g: 100, fiber_100g: 0, source: 'common', category: 'Oils' },
  { name: 'Coconut Oil', calories_100g: 892, protein_100g: 0, carbs_100g: 0, fat_100g: 99, fiber_100g: 0, source: 'common', category: 'Oils' },
  { name: 'Canola Oil', calories_100g: 884, protein_100g: 0, carbs_100g: 0, fat_100g: 100, fiber_100g: 0, source: 'common', category: 'Oils' },

  // Protein Supplements
  { name: 'Whey Protein Powder', calories_100g: 400, protein_100g: 80, carbs_100g: 8, fat_100g: 5, fiber_100g: 0, source: 'common', category: 'Supplements' },
  { name: 'Casein Protein Powder', calories_100g: 370, protein_100g: 78, carbs_100g: 7, fat_100g: 2, fiber_100g: 0, source: 'common', category: 'Supplements' },
  { name: 'Plant Protein Powder', calories_100g: 380, protein_100g: 75, carbs_100g: 9, fat_100g: 5, fiber_100g: 3, source: 'common', category: 'Supplements' },
]

export function searchCommonFoods(query: string): FoodItem[] {
  if (!query.trim()) return COMMON_FOODS.slice(0, 20)
  const q = query.toLowerCase()
  return COMMON_FOODS.filter(
    (f) =>
      f.name.toLowerCase().includes(q) ||
      f.category?.toLowerCase().includes(q)
  )
}

export const FOOD_CATEGORIES = [
  ...new Set(COMMON_FOODS.map((f) => f.category).filter(Boolean)),
] as string[]
