# ColdMailAI - AI Cold Email Research SaaS

Un SaaS completo para generar cold emails específicos con IA usando análisis de prospecto y respuesta automática.

## Características Principales

### 1. Research Assistant (Pagado - 1 crédito)
- Ingresa URL de prospecto + qué vendes
- Scraping automático con Cheerio
- Análisis profundo con Gemini 2.5 Flash
- Genera 3 ángulos específicos de email
- Crea 3 variantes de email + 2 follow-ups
- Botón de envío directo con Resend
- Exporta resultados como CSV

### 2. Response Assistant (Siempre Gratis)
- Analiza respuestas de prospectos
- Detecta sentimiento, objeciones, urgencia
- Genera 2 respuestas inteligentes
- Captura datos automáticamente para benchmarks
- Sin costo, ilimitado

### 3. Chrome Extension
- One-click analysis desde cualquier website
- Auto-captura de URL
- Especifica qué vendes en el popup
- Envía análisis directamente a dashboard
- Soporta múltiples sitios simultáneamente

### 4. Email Templates
- Crea y gestiona tus propios templates
- Comparte con otros usuarios
- Categorías: sales, support, follow-up
- Track de uso y performance

### 5. Benchmarks (después de 500+ respuestas)
- Datos comunitarios públicos y anónimos
- Mejores ángulos por categoría
- Objeciones más comunes
- Panel de insights

## Stack Tecnológico

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS, Chrome Extension (Manifest V3)
- **Backend**: Next.js API Routes, NextAuth.js, Supabase PostgreSQL
- **Base de datos**: Supabase PostgreSQL
- **IA**: Gemini 2.5 Flash - Análisis profundo de sitios
- **Web Scraping**: Cheerio (fast HTML parsing) + Playwright (JavaScript-heavy sites fallback)
- **Pagos**: Stripe - 3 planes (Starter, Pro, Unlimited)
- **Email**: Resend - Sending desde dominio verificado
- **Analytics**: Umami (self-hosted) + Vercel Analytics
- **Hosting**: Vercel - Deployment automático
- **Chrome Extension**: Content scripts + Background workers para análisis one-click

## Planes de Precios

| Plan | Precio | Créditos | Característica |
|------|--------|----------|-----------------|
| **Starter** | $9/mes | 10 créditos | Prueba el servicio |
| **Pro** | $29/mes | 25 créditos | Uso regular |
| **Unlimited** | $99/mes | Ilimitado | Power users |

- Créditos renovados el 1° de cada mes
- Response Assistant siempre es gratis
- Cancelación flexible en cualquier momento

## Instalación

### 1. Requisitos previos
- Node.js 18+
- pnpm (package manager recomendado)
- Cuentas (gratuitas/pagadas):
  - Supabase - Base de datos PostgreSQL
  - Google Cloud - Gemini 2.5 Flash API
  - Stripe - Payment processing
  - Resend - Email sending
  - Vercel - Deployment (opcional pero recomendado)

### 2. Clonar y setup

```bash
# Clonar repositorio
git clone https://github.com/victoor832/ExecOS
cd ExecOS

# Instalar dependencias
pnpm install

# Crear archivo .env.local
cp .env.local.example .env.local
```

### 3. Configurar variables de entorno

Editar `.env.local`:

```bash
# Supabase Database
DATABASE_URL=postgresql://user:password@host:port/database
DIRECT_URL=postgresql://user:password@host:port/database

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
RESEND_FROM_EMAIL=noreply@mail.readytorelease.online

# Analytics (opcional)
UMAMI_API_KEY=your-umami-key
NEXT_PUBLIC_ANALYTICS_ID=your-vercel-analytics-id
```

### 4. Configurar Base de Datos

```bash
# Ejecutar migraciones SQL
psql DATABASE_URL < schema.sql
psql DATABASE_URL < schema.templates.sql
psql DATABASE_URL < schema.stripe.sql
psql DATABASE_URL < schema.password_reset.sql
```

### 5. Ejecutar en desarrollo

```bash
# Instalar dependencias
pnpm install

# Ejecutar servidor de desarrollo
pnpm run dev

# Abrir en navegador
open http://localhost:3000
```

### 6. Instalar Chrome Extension

```
1. Ir a chrome://extensions/
2. Habilitar "Developer mode" (esquina superior derecha)
3. Click "Load unpacked"
4. Seleccionar carpeta: ./public/chrome-extension
5. ¡Listo! La extensión aparecerá en la barra de herramientas
```

## Estructura de Carpetas

```
ExecOS/
├── app/
│   ├── (protected)/              # Rutas protegidas por auth
│   │   ├── analytics/             # User analytics & insights
│   │   ├── dashboard/             # Main research results
│   │   ├── pricing/               # Plan selection
│   │   ├── research/              # Analysis interface
│   │   └── respond/               # Response analysis
│   ├── api/
│   │   ├── admin/                 # Admin utilities
│   │   ├── analyze/               # Main research endpoint
│   │   ├── auth/                  # NextAuth routes
│   │   ├── checkout/              # Stripe payment
│   │   ├── cron/                  # Scheduled jobs (monthly credit reset)
│   │   ├── generate-emails/       # Email generation
│   │   ├── respond/               # Response analysis
│   │   ├── send-email/            # Email sending (Resend)
│   │   ├── templates/             # Email templates CRUD
│   │   ├── user/                  # User endpoints
│   │   └── webhooks/              # Stripe & payment webhooks
│   ├── auth/                      # Login/signup pages
│   ├── client-layout.tsx          # Client-side layout
│   ├── layout.tsx                 # Root layout
│   ├── page.tsx                   # Landing page
│   └── error.tsx                  # Error boundary
├── lib/
│   ├── auth.ts                    # NextAuth configuration
│   ├── db.ts                      # Database queries (Supabase)
│   ├── error-handler.ts           # Custom error handling
│   ├── gemini.ts                  # Gemini AI integration
│   ├── scraper.ts                 # Web scraping: Cheerio (fast) + Playwright fallback (JS-heavy)
│   ├── stripe.ts                  # Stripe payment helpers
│   ├── utils.ts                   # Utility functions (CSV export)
│   └── validation.ts              # Zod schemas
├── public/
│   └── chrome-extension/          # Chrome Extension source
│       ├── manifest.json          # Manifest V3 config
│       ├── popup.html             # Extension popup UI
│       ├── popup.js               # Extension logic
│       ├── background.js          # Service worker
│       ├── content.js             # Content script
│       └── README.md              # Extension docs
├── types/
│   └── next-auth.d.ts             # NextAuth type definitions
├── styles/
│   └── globals.css                # Global styles
├── docs/                          # Documentation
├── scripts/                       # Testing & utility scripts
├── middleware.ts                  # Auth middleware
└── package.json
```

## Funcionalidades Principales

### ✅ Research Assistant
- **Input**: URL + Service description (via popup o formulario)
- **Process**: Scrape + Gemini AI analysis
- **Output**: 3 angles × 3 variants + 2 follow-ups (8 emails total)
- **Actions**: Copy, send via email, export as CSV

### ✅ Chrome Extension
- **One-click analysis** from any website
- **Auto-capture** of current URL
- **User input** for service/product (persisted in localStorage)
- **Session verification** via NextAuth cookies
- **Direct dashboard** integration

### ✅ Email Sending (Resend)
- **Recipients**: Specify email addresses
- **Rate Limiting**: 20 emails/hour per user
- **Branding**: Custom HTML templates
- **Tracking**: Email delivery status
- **Domain**: Verified domain for reliability

### ✅ Email Templates
- **CRUD Operations**: Create, read, update, delete
- **Categories**: sales, support, follow-up
- **Sharing**: Private or public templates
- **Performance Tracking**: Usage metrics

### ✅ CSV Export
- **Plans**: Pro ($19) and Unlimited ($99)
- **Data**: URL, Service, Research angles, Generated emails, Timestamps
- **Use Case**: Sales teams, data analysis, bulk imports
- **Access Control**: Plan-based permissions
- **Endpoint**: `POST /api/export/csv`

### ✅ Payment Processing (Stripe)
- **3 Plans**: Starter ($9), Pro ($29), Unlimited ($99)
- **Webhooks**: Automatic credit allocation on purchase
- **Cron Jobs**: Monthly credit reset at 1st UTC
- **Subscriptions**: Recurring payments

### ✅ Analytics
- **Umami**: Self-hosted event tracking
- **Vercel Analytics**: Core Web Vitals & performance
- **Events Tracked**: Research, responses, email sends, conversions

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

## Guía de Uso

### Para Usuarios

1. **Registrarse**: Sign up con email/password
2. **Recibir créditos**: Plan free o primer pago
3. **Research**: Paste URL y especifica qué vendes
4. **Generar emails**: Selecciona ángulo y recibes variantes
5. **Enviar o Copiar**: Resend integration o copy-paste
6. **Responder**: Usa Response Assistant (gratis)
7. **Exportar**: CSV export para tracking

### Para Desarrolladores

#### Build & Run
```bash
# Development
pnpm run dev

# Production build
pnpm build
pnpm start

# Run tests
bash scripts/test-automated.sh
```

#### Extension Development
```bash
# Files to watch:
# - public/chrome-extension/popup.js
# - public/chrome-extension/manifest.json
# - public/chrome-extension/background.js

# After changes:
# 1. Go to chrome://extensions/
# 2. Click reload button on ColdMailAI extension
```

## API Endpoints

### Research Analysis
```
POST /api/analyze
Content-Type: application/json

{
  "url": "https://example.com",
  "service": "Your service/product"
}

Response: { angles: [...], emails: [...] }
```

### Send Email (Resend)
```
POST /api/send-email
Content-Type: application/json

{
  "to": "prospect@example.com",
  "subject": "Subject line",
  "html": "<html>Email body</html>"
}

Response: { id: "email_id", status: "sent" }
```

### Response Analysis
```
POST /api/respond
Content-Type: application/json

{
  "originalEmail": "Your email...",
  "prospectResponse": "Their response...",
  "angleUsed": "recent_achievement"
}

Response: { responses: [...], analysis: {...} }
```

### Email Templates
```
GET /api/templates                    # List user's templates
POST /api/templates                   # Create new template
GET /api/templates/[id]               # Get specific template
PATCH /api/templates/[id]             # Update template
DELETE /api/templates/[id]            # Delete template
POST /api/templates/[id]/share        # Share template
GET /api/templates/shared             # List shared templates
```

### User Stats
```
GET /api/user/stats                   # User analytics
GET /api/user/history                 # Research history
```

### Admin
```
POST /api/admin/set-credits           # Set user credits (admin only)
```

## Database Schema

### Main Tables

**users**
```sql
- id (UUID PK)
- email (VARCHAR unique)
- password_hash (VARCHAR)
- subscription_plan (VARCHAR: 'starter', 'pro', 'unlimited')
- credits (INTEGER or NULL for unlimited)
- period_end (TIMESTAMP)
- stripe_customer_id (VARCHAR)
- stripe_subscription_id (VARCHAR)
- created_at, updated_at
```

**user_responses**
```sql
- id, user_id, angle_used
- objection_type, sentiment, urgency
- created_at
```

**email_templates**
```sql
- id, user_id, name, description
- category, subject_template, body_template
- variables (JSONB), is_public, is_shared
- usage_count, performance_score
- created_at, updated_at
```

**password_resets**
```sql
- id, user_id, token_hash
- expires_at, created_at
```

**stripe_events** (webhook logs)
```sql
- id, event_id, event_type, status
- data (JSONB), created_at
```

## Prompts de Gemini

### 1. Analyze Prospect (`lib/gemini.ts`)
Busca 3 ángulos específicos combinando:
- Recent announcements/achievements
- Hiring signals
- Technology stack changes
- Leadership changes
- Performance improvements
- Expansion signals

### 2. Generate Emails
Crea 3 variantes + 2 follow-ups personalizadas para un ángulo específico.

### 3. Handle Response
Analiza respuesta y sugiere 2 replies con:
- Sentiment analysis
- Objection handling
- Next steps recommendations

## Monitoreo & Debugging

### Logs Importantes
```bash
# API responses
/app/api/*/route.ts - console.log() output

# Database queries
lib/db.ts - SQL execution logs

# Authentication
lib/auth.ts - Session & JWT logs

# Payment webhooks
/app/api/webhooks/stripe - Event processing

# Extension errors
browser console - popup.js & background.js
```

### Testing Manual

```bash
# Test Research Endpoint
bash scripts/test-analyze-endpoint.js

# Test Email Sending
bash scripts/test-quick.sh

# Test Webhooks
bash scripts/test-webhook-simple.js

# Full Test Suite
bash scripts/test-automated.sh
```

## Performance Optimization

### Frontend
- ✅ Next.js 14 automatic optimization
- ✅ TailwindCSS JIT compilation
- ✅ Image optimization
- ✅ Code splitting per route

### Backend
- ✅ Connection pooling (Supabase)
- ✅ Database query optimization
- ✅ Rate limiting (20 emails/hour)
- ✅ Caching strategies

### Extension
- ✅ Lightweight popup (~50KB)
- ✅ Minimal permissions required
- ✅ Session verification via cookies
- ✅ LocalStorage for persistence

## Security Features

✅ NextAuth for authentication
✅ Password hashing (bcrypt)
✅ CORS protection
✅ Rate limiting on API endpoints
✅ Input validation with Zod
✅ SQL injection prevention (Supabase client)
✅ Secure environment variables
✅ Webhook signature verification (Stripe)
✅ HTTP-only cookies for sessions
✅ Content Security Policy headers

## Roadmap Futuro

- [ ] Gmail API integration
- [ ] Salesforce CRM sync
- [ ] LinkedIn automation
- [ ] A/B testing dashboard
- [ ] Team collaboration
- [ ] Advanced analytics
- [ ] API for external apps
- [ ] White-label solution

## Troubleshooting

### "Error de scraping"
- Verifica que la URL sea válida y pública
- Algunos sitios bloquean requests automáticos
- Intenta con otra URL

### "Insufficient credits"
- Compra créditos en la página de pricing
- O upgrade a plan Pro/Unlimited

### Extension no carga
- Verifica que esté habilitada en chrome://extensions/
- Reload: Click reload button
- Check console: Right-click extension → "Inspect popup"

### Email no envía
- Verifica que la dirección sea válida
- Check rate limiting (20/hora)
- Verifica que el dominio esté verificado en Resend

## Contribuir

Pull requests bienvenidos. Para cambios mayores, abre un issue primero.

## Licencia

MIT

## Soporte

- Email: support@coldmailai.com
- Docs: `/docs` folder
- Issues: GitHub issues
- Discord: [Coming soon]

## Estado del Proyecto

**Status**: ✅ PRODUCTION READY
**Last Updated**: December 7, 2025
**Build**: ✅ Passing
**Tests**: ✅ All passing
**Deployment**: ✅ Ready for production

### Latest Changes (Día 9-10)
- ✅ Fixed unlimited credits handling
- ✅ Fixed email sending domain
- ✅ Fixed Chrome Extension loading
- ✅ Added service input field for personalization
- ✅ Improved error handling throughout

### Current Features
- ✅ 4 major features implemented
- ✅ 3 critical production issues fixed
- ✅ Chrome Extension fully functional
- ✅ Email sending operational
- ✅ Payment processing working
- ✅ Analytics tracking active

````

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
