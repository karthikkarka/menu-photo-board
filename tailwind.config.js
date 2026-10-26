/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fdf4f3',
          100: '#fbe8e7',
          500: '#e14d3b',
          600: '#c73a2a',
          700: '#a32b1d',
          900: '#2c1810',
        }
      }
    },
  },
  plugins: [],
}
