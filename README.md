# Frontend - Vite + React + TypeScript

A modern frontend project built with Vite, React, and TypeScript.

## Features

- Vite for fast development and optimized builds
- React 18 with functional components and hooks
- TypeScript for type safety
- React Router for client-side routing
- Framer Motion for animations
- Axios for API calls
- Lucide React for icons

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

```bash
npm install
```

### Development

Start the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### Build

Create a production build:

```bash
npm run build
```

### Preview

Preview the production build locally:

```bash
npm run preview
```

## Project Structure

```
frontend/
├── src/
│   ├── main.tsx          # Application entry point
│   ├── App.tsx           # Main App component
│   ├── App.css           # App styles
│   └── index.css         # Global styles
├── index.html            # HTML entry point
├── vite.config.ts        # Vite configuration
├── tsconfig.json         # TypeScript configuration
├── package.json          # Dependencies and scripts
└── README.md             # This file
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## Dependencies

- **react** (^18.2.0) - UI library
- **react-dom** (^18.2.0) - React DOM renderer
- **react-router-dom** (^6.20.0) - Client-side routing
- **axios** (^1.6.0) - HTTP client
- **framer-motion** (^11.0.0) - Animation library
- **lucide-react** (^0.344.0) - Icon library

## License

MIT
