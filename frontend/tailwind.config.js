/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  safelist: [
    'bg-blue-50',
    'text-red-500',
    'text-4xl',
    'font-bold',
    'p-10',
    'text-center',
    'min-h-screen',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
