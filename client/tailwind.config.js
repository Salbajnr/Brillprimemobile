/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brill: {
          primary: '#4682b4',
          secondary: '#0b1a51',
          active: '#010e42',
          text: '#131313',
          'text-light': '#6b7280',
          white: '#ffffff'
        }
      }
    },
  },
  plugins: [],
}