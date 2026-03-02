# DGsales - AI Voice Agents 🎙️

**Agentes de voz en tiempo real con Retell AI**

Demo: https://g8gocho.github.io/DGsales (frontend solo)

---

## 🚀 DEPLOY EN VERCEL (5 MINUTOS)

### Paso 1: Obtener tu Secret API Key de Retell

1. Ve a https://dashboard.retellai.com/settings/api-keys
2. En la pestaña **"API Keys"** (NO "Public Keys"), verás tu **Secret Key**
3. Haz click en el ícono del ojo para revelarla
4. **Cópiala** (empieza con `key_...`)

### Paso 2: Deploy en Vercel

1. Ve a https://vercel.com y haz **Sign in con GitHub**
2. Click en **"Add New Project"**
3. Busca y selecciona **"g8gocho/DGsales"**
4. En **"Configure Project"** → **Environment Variables**:
   - **Name**: `RETELL_API_KEY`
   - **Value**: *[Pega aquí tu Secret Key de Retell]*
5. Click **"Deploy"**
6. Espera 1-2 minutos
7. **¡LISTO!** Copia la URL (ej: `dgsales-xxx.vercel.app`)

---

## ✅ Cómo probar la voz

1. Abre tu URL de Vercel
2. Haz click en **"🎙️ Llamar ahora"** en cualquier agente
3. **Permite el acceso al micrófono**
4. Habla: *"Hola, quiero información sobre productos luxury"*
5. El agente te responderá con voz en tiempo real

---

## 📁 Estructura del proyecto

```
DGsales/
├── index.html          # Frontend con widget de voz
├── api/
│   └── create-call.js  # Backend serverless para Vercel
├── package.json        # Dependencias (retell-sdk)
├── vercel.json         # Config de Vercel
└── README.md           # Este archivo
```

---

## 🤖 Agentes disponibles

1. **Conversation Flow Agent** - Soporte general
2. **Healthcare Check-In** - Asistente de citas médicas
3. **Patient Screening** - Verificación de identidad

---

## 🔧 Tech Stack

- **Frontend**: HTML5 + JavaScript vanilla
- **Backend**: Vercel Serverless Functions
- **SDK**: Retell AI Web SDK (`retell-client-js-sdk`)
- **Hosting**: Vercel (con voz) + GitHub Pages (solo UI)

---

## ⚠️ Importante

- **GitHub Pages** (`g8gocho.github.io/DGsales`) solo muestra el UI
- **La voz SOLO funciona en Vercel** con la API Key configurada
- No expongas tu Secret Key en el código (usa env vars)

---

## 📞 Soporte

Si algo no funciona:
1. Verifica que la env var `RETELL_API_KEY` esté configurada en Vercel
2. Revisa los logs en Vercel Dashboard → Tu proyecto → Deployments → Logs
3. Asegúrate de permitir el micrófono en el navegador

---

**Powered by Retell AI** | Made with ❤️ by g8gocho
