/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        nx: {
          bg: '#080C14',        // Deepest charcoal background
          surface: '#0F1626',   // Surface cards
          card: '#151F34',      // Elevated cards
          border: '#1E2C4A',    // Borders
          primary: '#0066FF',   // Electric blue
          'primary-hover': '#257BFF',
          accent: '#8B5CF6',    // Purple accent
          glow: 'rgba(0, 102, 255, 0.25)',
          text: '#F1F5F9',
          muted: '#94A3B8',
          success: '#10B981',
          warning: '#F59E0B',
          danger: '#EF4444',
          unstable: '#F97316'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'glow-blue': '0 0 25px -5px rgba(0, 102, 255, 0.4)',
        'glow-purple': '0 0 25px -5px rgba(139, 92, 246, 0.4)',
      }
    },
  },
  plugins: [],
}
