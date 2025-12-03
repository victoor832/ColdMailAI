# ColdMailAI - AI Cold Email Research SaaS

Un SaaS completo para generar cold emails específicos con IA usando análisis de prospecto y respuesta automática.

## Características

### 1. Research Assistant (Pagado - 1 crédito)
- Ingresa URL de prospecto + descripción de servicio
- Scraping con Cheerio (sin costo)
- Análisis con Gemini 2.0 Flash
- Genera 3 ángulos específicos de email
- Crea 3 variantes de email + 2 follow-ups
- Listo para enviar

### 2. Response Assistant (Siempre Gratis)
- Analiza respuestas de prospectos
- Detecta sentimiento, objeciones, urgencia
- Genera 2 respuestas inteligentes
- Captura datos automáticamente para benchmarks
- Sin costo, ilimitado

### 3. Benchmarks (después de 500+ respuestas globales)
- Datos comunitarios públicos y anónimos
- Mejores ángulos por categoría
- Objeciones más comunes
- Panel de insights

## Stack Tecnológico (100% Gratuito Hasta Escalar)

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, NextAuth.js
- **Base de datos**: libSQL (Turso) - 3GB gratis
- **IA**: Gemini 2.0 Flash - 1M tokens/mes FREE
- **Web Scraping**: Cheerio (local, gratis)
- **Pagos**: Stripe (modo test gratis)
- **Email**: Resend (100 emails/día gratis)
- **Hosting**: Vercel (tier hobby gratis)

## Instalación

### 1. Requisitos previos
- Node.js 18+
- npm o yarn
- Cuentas (gratuitas):
  - Turso (libSQL)
  - Google Cloud (Gemini API)
  - Stripe (test mode)
  - Resend

### 2. Clonar y setup

```bash
# Clonar repositorio
git clone <repo-url>
cd coldmailai

# Instalar dependencias
pnpm install

# Crear archivo .env.local (ver abajo)
cp .env.local.example .env.local
```

### 3. Configurar variables de entorno

Editar `.env.local`:

```bash
# Turso Database
DATABASE_URL=libsql://your-db-name.turso.io
DATABASE_AUTH_TOKEN=your-auth-token

# Gemini AI
GEMINI_API_KEY=your-gemini-api-key

# NextAuth
NEXTAUTH_SECRET=openssl rand -base64 32
NEXTAUTH_URL=http://localhost:3000

# Stripe (Test Mode)
STRIPE_PUBLIC_KEY=pk_test_xxxxx
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# Resend Email
RESEND_API_KEY=your-resend-api-key
```

### 4. Obtener credenciales

#### Turso (libSQL)
1. Ir a https://turso.tech (gratis)
2. Crear cuenta y base de datos
3. Copiar DATABASE_URL y AUTH_TOKEN

#### Gemini API
1. Ir a https://ai.google.dev
2. Crear proyecto en Google Cloud Console
3. Habilitar API de Gemini
4. Crear clave API

#### Stripe (Modo Test)
1. Ir a https://stripe.com
2. Crear cuenta (gratis)
3. Ir a Dashboard → API Keys
4. Copiar test keys

#### Resend
1. Ir a https://resend.com
2. Crear cuenta (100 emails/día gratis)
3. Copiar API key

### 5. Ejecutar desarrollo

```bash
pnpm run dev
```

Abrir http://localhost:3000

## Planes de Precios

- **Starter**: $9 → 10 créditos
- **Pro**: $19 → 25 créditos
- **Unlimited**: $29/mes → créditos ilimitados
- **Lifetime**: $39 (primeros 100) → ilimitado de por vida

Response Assistant siempre es gratis.

## Estructura de Carpetas

```
coldmailai/
├── app/
│   ├── (protected)/          # Rutas protegidas por auth
│   │   ├── research/
│   │   ├── respond/
│   │   ├── dashboard/
│   │   └── pricing/
│   ├── auth/                 # Auth pages
│   ├── api/                  # API routes
│   ├── layout.tsx
│   └── page.tsx              # Landing page
├── lib/
│   ├── db.ts                 # Database queries
│   ├── gemini.ts             # Gemini prompts & calls
│   ├── auth.ts               # NextAuth config
│   ├── stripe.ts             # Stripe helpers
│   ├── scraper.ts            # Web scraping
│   └── utils.ts              # Utility functions
├── components/
│   └── ui/                   # Componentes reutilizables
├── styles/
│   └── globals.css
├── middleware.ts             # Auth middleware
└── package.json
```

## Uso

### Para Usuarios

1. **Registrarse**: Sign up con email/password
2. **Recibir 3 créditos gratis**
3. **Investigar**: Paste URL y descripción del servicio
4. **Generar emails**: Selecciona ángulo y genera variantes
5. **Copiar y enviar**: Copy-paste directamente a tu inbox
6. **Responder**: Usa Response Assistant gratuitamente para respuestas

### API Endpoints

#### Research
```
POST /api/analyze
Content-Type: application/json

{
  "url": "https://example.com",
  "service": "Your service description"
}
```

#### Generate Emails
```
POST /api/generate-emails
Content-Type: application/json

{
  "url": "https://example.com",
  "angle": {
    "hook": "...",
    "evidence": "...",
    "type": "..."
  }
}
```

#### Respond
```
POST /api/respond
Content-Type: application/json

{
  "originalEmail": "...",
  "prospectResponse": "...",
  "angleUsed": "recent_achievement"
}
```

#### Get Stats
```
GET /api/user/stats
```

#### Get Benchmarks
```
GET /api/benchmarks
```

## Base de Datos

### Tablas

**users**
- id, email, password_hash
- magic_token, magic_token_expires
- credits, plan
- stripe_customer_id, stripe_subscription_id

**user_responses**
- id, user_id, angle_used
- objection_type, sentiment, urgency

**global_responses** (para benchmarks)
- id, angle_used, objection_type
- sentiment, urgency

**purchases**
- id, user_id, plan, amount
- stripe_session_id, stripe_payment_intent_id, status

## Prompts Gemini Utilizados

### 1. Analyze Prospect
Busca 3 ángulos específicos basados en contenido real de la URL.

### 2. Generate Emails
Crea 3 variantes de email + 2 follow-ups para un ángulo específico.

### 3. Handle Response
Analiza respuesta del prospecto y sugiere 2 replies.

## Próximos Pasos Recomendados

1. **Customizar branding**: Cambiar colores, logos, copy
2. **Agregar más prompts**: Experimentar con diferentes estilos
3. **Mejorar scraping**: Agregar JavaScript rendering
4. **Analytics**: Trackear métricas de engagement
5. **Integraciones**: Conectar con Gmail, Salesforce, etc.

## Troubleshooting

### "Error de scraping"
- Verifica que la URL sea válida y pública
- Algunos sitios pueden bloquear requests
- Intenta con otra URL

### "Insufficient credits"
- Compra créditos en la página de precios
- Los nuevos usuarios reciben 3 gratis

### "API key no válida"
- Verifica que esté en .env.local
- No compartir keys públicamente
- Regenerar si es necesario

### "Error de Base de Datos"
- Verificar DATABASE_URL es correcto
- Verificar que Turso esté online
- Revisar AUTH_TOKEN

## Deployment (Vercel)

```bash
# Push a GitHub
git push origin main

# Conectar a Vercel
vercel --prod

# Configurar env vars en Vercel dashboard
# Seleccionar las mismas variables del .env.local
```

## Support

Para preguntas o issues:
- GitHub Issues
- Email: support@coldmailai.com

## Licencia

Propietaria. Código generado para uso personal/comercial.

## Roadmap

- [ ] Integración con Gmail API
- [ ] Templates de email personalizados
- [ ] A/B testing de ángulos
- [ ] Seguimiento de entregas
- [ ] CRM integration
- [ ] AI-powered follow-up automation
- [ ] Análisis de competencia
- [ ] Exportar a CSV/PDF

---

**Desenvolvido con ❤️ por Copilot para ColdMailAI**
