/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: "#09090b",
          panel: "rgba(20, 20, 23, 0.7)",
          border: "rgba(63, 63, 70, 0.4)",
          accent: "#3b82f6",
        }
      },
      boxShadow: {
        'glow-good': '0 0 16px rgba(16, 185, 129, 0.4)',
        'glow-warn': '0 0 16px rgba(245, 158, 11, 0.4)',
        'glow-bad': '0 0 16px rgba(239, 68, 68, 0.4)',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.6s infinite linear',
      },
    },
  },
  plugins: [],
}
