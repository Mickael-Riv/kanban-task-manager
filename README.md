# Kanban Task Manager · Public Instance

 Live: https://kanbantaskmanagertool.netlify.app/

 A simple, fast Kanban task manager built with React, TypeScript, and Vite. Create boards, add columns, and manage tasks with drag-and-drop interactions. Designed to be lightweight and easy to run locally or deploy.

 ## Features
 - **Boards and Columns**
 - **Tasks with status and description**
 - **Drag-and-drop reordering**
 - **Create, edit, delete tasks**
 - **Responsive UI**

 ## Tech Stack
 - **React** + **TypeScript**
 - **Vite** for dev/build
 - **ESLint** for linting

 ## Getting Started
 - **Install**
   - npm install
 - **Run Dev**
   - npm run dev
 - **Build**
   - npm run build
 - **Preview**
   - npm run preview

 ## Scripts
 - npm run dev: Start the dev server
 - npm run build: Build for production
 - npm run preview: Preview the production build
 - npm run lint: Lint the codebase

 ## Folder Structure
 - src/: Application source code
 - src/components/: Reusable UI components
 - public/: Static assets

 ## Deployment
 - The app is static and can be deployed to any static host (e.g., Netlify, Vercel, GitHub Pages).
 - A public instance is available at the link above.

 ## License
 - MIT (or update to your license)

 ---
 ## Original Vite README (for reference)

# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
