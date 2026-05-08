/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: '#111827',
        'surface-2': '#1f2937',
        'surface-3': '#374151',
      },
    },
  },
  plugins: [],
}
