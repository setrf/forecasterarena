import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ['IBM Plex Mono', 'Courier New', 'monospace'],
      },
      colors: {
        accent: {
          primary: '#FAC7C7',
          secondary: '#FFE5E5',
        },
      },
    },
  },
  plugins: [],
};
export default config;
