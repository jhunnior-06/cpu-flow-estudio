/* Selector accesible de modo claro/oscuro; independiente del simulador. */
(function(){
  'use strict';
  const KEY = 'cpu-flow-tema';
  function activar(modo) {
    const tema = modo === 'light' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', tema);
    const boton = document.getElementById('themeToggle');
    if (boton) {
      boton.setAttribute('aria-pressed', String(tema === 'dark'));
      boton.setAttribute('aria-label', tema === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro');
      boton.title = tema === 'dark' ? 'Activar modo claro' : 'Activar modo oscuro';
      const icono = boton.querySelector('.theme-toggle-icon');
      const etiqueta = boton.querySelector('.theme-toggle-label');
      if (icono) icono.textContent = tema === 'dark' ? '☀' : '☾';
      if (etiqueta) etiqueta.textContent = tema === 'dark' ? 'Modo claro' : 'Modo oscuro';
    }
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', tema === 'dark' ? '#0b1530' : '#f5f7fd');
  }
  function iniciar() {
    activar(document.documentElement.getAttribute('data-theme'));
    const boton = document.getElementById('themeToggle');
    if (!boton) return;
    boton.addEventListener('click', function(){
      const siguiente = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      activar(siguiente);
      try { localStorage.setItem(KEY, siguiente); } catch (e) { /* Navegador en modo privado */ }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})();