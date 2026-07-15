/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./js/**/*.js",
    "../index.html",
    "../js/**/*.js"
  ],
  theme: {
    extend: {
      colors: {
        'accent': {
          primary: 'var(--accent-primary)',
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#e67e26', // Kaasi Primary Orange
          600: '#d16a1b',
          700: '#bd5812',
          800: '#9a3412',
          900: '#7c2d12',
          950: '#431407',
        }
      }
    },
  },
  plugins: [],
}
