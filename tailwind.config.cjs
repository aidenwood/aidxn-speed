/** @type {import('tailwindcss').Config} */

// To use the shared Aidxn preset, install @aidxn/ui:
//   npm install aidenwood/aidxn-ui
// Then uncomment the preset line below.

// const aidxnPreset = require('@aidxn/ui/tailwind-preset');

const colors = require('tailwindcss/colors');

module.exports = {
  // presets: [aidxnPreset],
  darkMode: 'class',
  content: [
    './src/**/*.{astro,html,js,jsx,ts,tsx}',
    // './node_modules/@aidxn/ui/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    colors: {
      current: 'currentColor',
      transparent: 'transparent',
      white: '#ffffff',
      black: colors.black,
      primary: colors.violet,
      violet: colors.violet,
      green: colors.green,
      cyan: colors.cyan,
      neutral: colors.neutral,
      gray: colors.gray,
      red: colors.red,
      orange: colors.orange,
      yellow: colors.yellow,
      blue: colors.blue,
      indigo: colors.indigo,
      pink: colors.pink,
    },
    fontFamily: {
      sans: ['Inter', 'sans-serif'],
    },
    screens: {
      xs: '442px',
      sm: '668px',
      md: '968px',
      lg: '1280px',
      xl: '1680px',
      '2xl': '1986px',
    },
    fontSize: {
      xs: ['0.75rem', '1rem'],
      sm: ['0.875rem', '1.25rem'],
      base: ['1rem', '1.75rem'],
      lg: ['1.125rem', '2rem'],
      xl: ['1.25rem', '2.125rem'],
      '2xl': ['1.5rem', '2rem'],
      '3xl': ['1.875rem', '2.375rem'],
      '4xl': ['2.5rem', '3.25rem'],
      '5xl': ['3.5rem', '4.25rem'],
      '6xl': ['4.25rem', '5.25rem'],
      '7xl': ['4.75rem', '5.75rem'],
    },
  },
};
