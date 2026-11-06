import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-opensans)', 'Open Sans', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        heading: ['var(--font-montserrat)', 'Montserrat', 'sans-serif'],
        title: ['var(--font-montserrat)', 'Montserrat', 'sans-serif'],
        serif: ['var(--font-montserrat)', 'Montserrat', 'sans-serif'],
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        // Warm culinary terracotta brand accent
        brand: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
        },
        // Restrained warm neutrals
        warm: {
          50: '#FAF9F6',
          100: '#F5F4F0',
          200: '#EAE8E2',
          300: '#DCD9D0',
          400: '#A9A59A',
          500: '#7B776D',
          600: '#5A564D',
          700: '#3F3C35',
          800: '#2A2823',
          900: '#1A1916',
        },
      },
      boxShadow: {
        'subtle': '0 1px 2px 0 rgba(0, 0, 0, 0.04)',
        'card': '0 2px 8px -2px rgba(28, 25, 23, 0.06), 0 1px 3px 0 rgba(28, 25, 23, 0.04)',
        'float': '0 10px 25px -5px rgba(28, 25, 23, 0.12), 0 8px 10px -6px rgba(28, 25, 23, 0.08)',
      },
    },
  },
  plugins: [],
};
export default config;
