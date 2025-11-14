## Orphta — UI, shaders and structure

This repo is a Next.js (App Router) + TypeScript + Tailwind + shadcn/ui project.

Key paths
- Components: `src/components/ui`
- Styles: `src/app/globals.css`
- App entry: `src/app/layout.tsx`, `src/app/page.tsx`

Installed deps
- `three` for WebGL shaders
- `@radix-ui/react-slot` and `class-variance-authority` for button variants
- `lucide-react` icons

Background shaders
- Global background is rendered once from `src/app/layout.tsx` using `src/components/ui/web-gl-shader.tsx` (loaded client‑side via `next/dynamic`).
- The Hero section adds an extra layer using `src/components/ui/shader-lines.tsx` with `mix-blend-screen` for brightness.

Glass surfaces
- The shared class `.glass-surface` lives in `src/app/globals.css` and is tuned for transparency so the rainbow passes through (uses `bg-black/15` + `backdrop-blur-xl`). Adjust this value to balance readability vs. visibility.

Getting started
```bash
pnpm i # or npm i / yarn
pnpm dev
```

shadcn/ui
- `components.json` is configured to use `src/components` and `src/app/globals.css`.
- New components will be placed in `src/components/ui` to keep a consistent import path like `@/components/ui/button`.

If you need to bootstrap from scratch
```bash
npx create-next-app@latest
pnpm add -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
pnpm add three @radix-ui/react-slot class-variance-authority lucide-react
npx shadcn@latest init
```
