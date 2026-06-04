// Tailwind CSS 4 is wired via @tailwindcss/vite in vite.config.ts (faster than
// the PostCSS path). Tailwind 4's Oxide engine handles vendor prefixing
// internally, so autoprefixer is no longer needed. This file is kept as an
// empty PostCSS config so any future tooling that probes for PostCSS finds it
// and gets a no-op pipeline rather than an undefined-config error.
export default {
  plugins: {},
};
