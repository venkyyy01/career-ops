/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#0f0f13',
        surface: '#1a1a21',
        'surface-hover': '#242430',
        border: '#2a2a38',
      },
      fontFamily: {
        sans: ['Geist', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['Geist Mono', 'SF Mono', 'Monaco', 'monospace'],
      },
      animation: {
        'spin-slow': 'spin 1.5s linear infinite',
      },
    },
  },
  plugins: [],
};