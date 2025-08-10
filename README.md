# Interactive Square Finder – React + Vite

This project implements an **interactive algorithm visualization** for detecting squares in a set of points, complete with live Java code walkthrough and rotation-matrix math explanations. Built using **React** and **Vite** for a fast, modern development experience.

## 🚀 Features

* **Interactive board**: Step through point pairs and watch the algorithm in action.
* **Live math panel**: Shows vector and rotation calculations for the current pair.
* **Java code walkthrough**: Highlights each relevant line of code with math annotations.
* **React + Vite**: Ultra-fast development server with Hot Module Replacement (HMR).
* **ESLint rules** for clean, consistent code.

## 📦 Installation

```bash
# 1. Create the project using Vite
npm create vite@latest interactive-square-finder --template react

# 2. Enter the project folder
cd interactive-square-finder

# 3. Install dependencies
npm install
```

## ▶️ Running the Project

```bash
npm run dev
```

Open the local URL shown in your terminal (e.g., `http://localhost:5173`).

## 📂 Project Structure

```
interactive-square-finder/
│
├── public/                                  # Static assets
├── src/
│   ├── App.jsx                               # Main React component
│   ├── interactive_square_finder_live_demo_java_walkthrough.jsx  # Visualization logic
│   ├── main.jsx                              # App entry point
│   └── index.css                             # Global styles
│
├── package.json
└── vite.config.js
```

> 💡 To use this demo: Replace the contents of `src/App.jsx` with your `interactive_square_finder_live_demo_java_walkthrough.jsx` file, or import it into `App.jsx`.

## ⚙️ Framework & Plugins

Two official Vite React plugins are available:

* **[@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react)** – Uses **Babel** for Fast Refresh.
* **[@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc)** – Uses **SWC** for faster builds.

## 📜 ESLint

Run lint checks to ensure code consistency:

```bash
npm run lint
```

## 📖 Learn More

* [Vite Documentation](https://vitejs.dev/)
* [React Documentation](https://react.dev/)
* [ESLint Documentation](https://eslint.org/)

---

With this setup, you can explore the **Interactive Square Finder** and fully understand the geometry, math, and code involved in detecting squares.
