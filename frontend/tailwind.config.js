/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        surface: {
          canvas: 'var(--surface-canvas)',
          base: 'var(--surface-base)',
          elevated: 'var(--surface-elevated)',
          subtle: 'var(--surface-subtle)',
          inset: 'var(--surface-inset)',
        },
        line: {
          subtle: 'var(--border-subtle)',
          DEFAULT: 'var(--border-default)',
          strong: 'var(--border-strong)',
        },
        ink: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
        },
        accent: {
          DEFAULT: 'var(--accent-primary)',
          hover: 'var(--accent-hover)',
          fg: 'var(--accent-fg)',
          subtle: 'var(--accent-subtle)',
        },
        dsa: {
          DEFAULT: 'var(--dsa-primary)',
          hover: 'var(--dsa-hover)',
          fg: 'var(--dsa-fg)',
          subtle: 'var(--dsa-subtle)',
        },
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        modal: 'var(--shadow-modal)',
        popover: 'var(--shadow-popover)',
      },
    },
  },
  plugins: [],
};
