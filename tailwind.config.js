export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        accent: {
          50:  '#f0f7ff',
          100: '#e0efff',
          200: '#b9dcfe',
          300: '#7cc0fd',
          400: '#36a3f9',
          500: '#2383e2',
          600: '#2383e2',
          700: '#1b6abf',
        },
        notion: {
          text:      '#37352f',
          secondary: '#787774',
          tertiary:  '#9b9a97',
          bg:        '#ffffff',
          sidebar:   '#f7f6f3',
          border:    '#e9e8e4',
          hover:     'rgba(55,53,47,0.08)',
          blue:      '#2383e2',
          green:     '#0f7b6c',
          red:       '#e03e3e',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'soft': 'none',
        'card': 'none',
        'elevated': 'none',
        'notion-popup': '0 0 0 1px rgba(15,15,15,0.05), 0 3px 6px rgba(15,15,15,0.1), 0 9px 24px rgba(15,15,15,0.2)',
      },
      borderRadius: {
        'notion': '3px',
        'notion-md': '6px',
        '2xl': '1rem',
      }
    }
  },
  plugins: [require('@tailwindcss/typography')]
};
