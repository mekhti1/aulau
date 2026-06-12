import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1E5A96',
          light: '#2F7ABF',
          dark: '#164170',
        },
        gov: {
          bg: '#F4F6F9',
          card: '#FFFFFF',
          border: '#DDE3EA',
          success: '#2E7D32',
          warning: '#F9A825',
          danger: '#C62828',
          text: '#1A1A1A',
          'text-secondary': '#6B7280',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
export default config;
