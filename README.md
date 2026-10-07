# ProyectosSyW 🐷

> Una Progressive Web App (PWA) moderna y colaborativa diseñada exclusivamente en pareja para gestionar metas de ahorro en tiempo real, con sincronización en la nube, efectos de sonido interactivos y una interfaz minimalista inspirada en la banca digital moderna.

---

## ✨ Características Principales

- **Multi-Usuario con Sesión Persistente:** Perfiles personalizados para ambos co-ahorradores con persistencia local (`localStorage`).
- **Gestión Dinámica de Metas:** Creación de múltiples objetivos de ahorro directamente desde la app (con barras de progreso automáticas).
- **Sincronización en Tiempo Real:** Impulsado por Firebase Firestore (`onSnapshot`), cualquier depósito o retiro se actualiza al instante en los dispositivos de ambos.
- **Alertas Auditivas y Visuales:** Reproducción automática de efectos de sonido (monedas/caja registradora) y notificaciones flotantes (*Toasts*) cuando tu pareja realiza un movimiento.
- **Experiencia Nativa (PWA):** Diseñada mobile-first con Tailwind CSS, optimizada para instalarse directamente en la pantalla de inicio de iOS y Android.

---

## 🛠️ Tecnologías Utilizadas

- **Frontend:** HTML5, Tailwind CSS, JavaScript (ES6 Modules).
- **Backend / Base de Datos:** Firebase Firestore (NoSQL en tiempo real).
- **Hosting:** GitHub Pages.
- **Audio & UI Effects:** Web Audio API, Custom Toasts & Pull-to-Refresh.

---

## 🚀 Estructura del Proyecto

```text
├── index.html       # Estructura principal, vistas y modales (Tailwind CSS)
├── style.css        # Estilos personalizados, animaciones y transiciones
└── app.js           # Lógica de la PWA, Firebase, sesiones y efectos en tiempo real
