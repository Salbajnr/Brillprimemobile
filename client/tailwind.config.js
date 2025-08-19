
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'brill-primary': '#4682b4',
        'brill-secondary': '#0b1a51',
        'brill-active': '#010e42',
        'brill-text': '#131313',
        'brill-text-light': '#6b7280',
        'brill-white': '#ffffff',
      },
    },
  },
  plugins: [],
}
