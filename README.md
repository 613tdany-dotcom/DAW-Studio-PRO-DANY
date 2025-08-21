# 🎹 DAW Studio PRO — DANY

¡Bienvenido a DAW Studio PRO! Esta es una aplicación de Estación de Trabajo de Audio Digital (DAW) completamente funcional que opera directamente en tu navegador, sin necesidad de instalación ni conexión a internet. Está construida sobre la API de Web Audio para un rendimiento eficiente y de baja latencia.

## 🚀 Características principales
* **100% Local**: Todas las funciones, incluyendo la reproducción, la edición y la exportación, se ejecutan en tu dispositivo.
* **Pistas de Audio**: Carga y reproduce archivos de audio para mezclar.
* **Pistas de Instrumento**: Crea música con un sintetizador simple integrado, con formas de onda seleccionables (senoidal, cuadrada, triangular, de sierra) y un secuenciador de 8 pasos.
* **Efectos (FX)**: Añade profundidad a tus pistas con un Ecualizador (EQ), Delay (eco) y Reverb (reverberación).
* **Grabación de Micrófono**: Graba audio en vivo directamente en una pista (requiere un servidor web local o HTTPS).
* **Exportación a WAV**: Exporta tu mezcla final como un archivo de audio WAV.
* **Metrónomo y Loop**: Controles de transporte esenciales para mantenerte en el tiempo.

## 📦 Uso y Despliegue

### 🌐 Despliegue en la Web
Para subir la plataforma a un sitio web, simplemente aloja el archivo `index.html` y las carpetas `css` y `js` en tu servidor.

### 💻 Uso local (con grabación)
Si planeas usar la función de grabación de micrófono, los navegadores modernos requieren que el archivo se abra a través de un servidor local. Puedes iniciarlo fácilmente con un comando en tu terminal:

1.  Navega hasta la carpeta que contiene el archivo `index.html`.
2.  Ejecuta el siguiente comando (si tienes Python instalado):
    ```bash
    python -m http.server 8000
    ```
3.  Abre tu navegador y ve a `http://localhost:8000/index.html`.

## 🛠️ Estructura y Notas técnicas
El proyecto está construido de forma modular, con archivos separados para una mejor organización y facilidad de mantenimiento:
* **`index.html`**: Estructura principal de la página.
* **`css/main.css`**: Estilos de diseño, paleta de colores y layout.
* **`js/app.js`**: El corazón de la aplicación, importa todos los módulos y maneja la inicialización.
* **`js/audio-engine.js`**: Lógica central del Web Audio API, control de reproducción, metrónomo, etc.
* **`js/track-manager.js`**: Lógica para la creación, modificación y eliminación de pistas.
* **`js/ui-renderer.js`**: Funciones para generar y actualizar dinámicamente la interfaz de usuario.
* **`js/utils.js`**: Funciones de ayuda generales (conversión, exportación, etc.).

---

## 📄 Licencia

Este proyecto es de código abierto y está disponible bajo la Licencia MIT.

---

## 💖 Créditos
Creado por DANY.

"Jesús le dijo: Yo soy el camino, y la verdad, y la vida; nadie viene al Padre, sino por mí." Juan 14:6