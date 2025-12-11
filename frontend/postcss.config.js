// postcss.config.js
export default {
  plugins: {
    'tailwindcss/nesting': {}, // 适配 Tailwind 4.0 的配置
    tailwindcss: {},
    autoprefixer: {},
  },
};