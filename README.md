# PostMagic ✨

Micro-SaaS para transformar cualquier texto en contenido viral para X, LinkedIn y TikTok. Dark mode, diseño estilo Linear/Vercel, powered by Claude AI.

## Stack

- **Next.js 15** (App Router)
- **Tailwind CSS** + **shadcn/ui**
- **Anthropic Claude** (claude-sonnet-4)
- **TypeScript**

## Instalación

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
cp .env.local.example .env.local
# Edita .env.local y añade tu ANTHROPIC_API_KEY

# 3. Instalar componentes shadcn/ui
npx shadcn-ui@latest init
npx shadcn-ui@latest add button textarea badge card

# 4. Iniciar en desarrollo
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## Estructura

```
postmagic/
├── app/
│   ├── api/
│   │   └── generate/
│   │       └── route.ts      ← API route (llama a Claude)
│   ├── globals.css           ← Estilos globales + fuentes
│   ├── layout.tsx            ← Root layout
│   └── page.tsx              ← Página principal (UI completa)
├── .env.local.example
├── package.json
└── tailwind.config.ts
```

## Obtener API Key de Anthropic

1. Ve a [console.anthropic.com](https://console.anthropic.com)
2. Crea una cuenta o inicia sesión
3. En **API Keys**, crea una nueva key
4. Pégala en tu `.env.local`

## Deploy en Vercel

```bash
# Instala Vercel CLI
npm i -g vercel

# Deploy
vercel --prod

# Configura la variable de entorno en el dashboard de Vercel:
# ANTHROPIC_API_KEY = tu-api-key
```

## Personalización

Para cambiar los prompts de cada formato, edita el objeto `CONTENT_CONFIG` en `app/page.tsx`:

```typescript
const CONTENT_CONFIG = {
  x: {
    prompt: "Tu prompt personalizado para hilos de X..."
  },
  linkedin: {
    prompt: "Tu prompt para LinkedIn..."
  },
  tiktok: {
    prompt: "Tu prompt para TikTok..."
  }
}
```

---

Construido con ❤️ usando Next.js + Claude AI
