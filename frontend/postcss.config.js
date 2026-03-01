module.exports = {
  plugins: {
    'postcss-nesting': {}, // Must be before tailwindcss to handle nested CSS
    tailwindcss: {},
    autoprefixer: {},
  },
};

