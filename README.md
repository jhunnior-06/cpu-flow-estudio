# CPU Flow Estudio

Simulador web de planificación de CPU para estudiar **Sistemas Operativos**. Aplicación independiente de la página `cpu-flow.app`, con interfaz y código propios. Funciona directamente en el navegador, en español y sin iniciar sesión.

## Funcionalidades

- **14 algoritmos:** FCFS, SJF, SRTF, Round Robin, prioridades (con/sin apropiación), HRRN, LJF, LRTF, colas multinivel, MLFQ, lotería, EDF y RMS.
- Tabla editable para hasta **20 procesos**, con llegada, ráfaga, prioridad, cola, bloqueos de entrada/salida, período y plazo, según el algoritmo.
- Diagrama de Gantt coloreado automáticamente al editar números; ejecución **paso a paso**, botón de reproducción y tabla de decisiones.
- Tiempos de espera, retorno, respuesta, cambios de contexto, utilización de CPU y rendimiento; comparación entre algoritmos.
- Ejemplos precargados, guía de fórmulas, preguntas de práctica, historial local, exportaciones CSV/JSON e impresión en PDF A4 horizontal.

## Instalar y ejecutar

1. Clona el repositorio o descarga este proyecto completo.
2. Abre `index.html` en tu navegador **o** utiliza el servidor local:

```bash
npm run dev
```

3. En el navegador, entra a `http://localhost:3000`.

No se necesita instalar dependencias ni configurar claves de API.

## Publicar con Vercel

1. En [Vercel](https://vercel.com/new), importa tu repositorio `jhunnior-06/cpu-flow-estudio`.
2. Selecciona framework **Other** y directorio raíz `./`.
3. Deja el comando de build vacío y publica con **Deploy**. Vercel servirá los archivos estáticos.

## Uso para estudiar

1. Elige un algoritmo y escribe los tiempos de llegada, ráfaga y demás campos necesarios. Las **celdas azules** son datos de entrada.
2. La ejecución, el Gantt y las tablas se recalculan cuando editas los valores. Puedes pulsar «Simular y explicar todo» para forzar el recálculo.
3. Reproduce los pasos, analiza la cola de listos y revisa cada decisión.
4. Abre «Comparador», revisa la teoría o practica con el mini cuestionario.
5. Guarda tus simulaciones en el navegador o expórtalas.

### Convenciones académicas

- En prioridades, el **número menor es prioridad más alta**.
- Los empates se resuelven por llegada a READY, tiempo de llegada y orden de la tabla.
- Los cálculos de espera restan el tiempo de E/S bloqueada.
- Round Robin coloca el proceso cuyo quantum termina **después de incorporar las nuevas llegadas** al inicio del siguiente instante.
- Para EDF/RMS, cada proceso se considera una tarea periódica que genera instancias hasta el horizonte indicado.
- La simulación asume una CPU; no incluye costo temporal por cambios de contexto.
- El algoritmo de lotería utiliza semilla fija reproducible, ideal para enseñar.

## Pruebas

```bash
npm test
```

## Estructura del proyecto

```text
cpu-flow-estudio/
├── index.html          # Interfaz
├── styles.css          # Diseño adaptable y estilos de impresión
├── app.js              # Formularios, visualizaciones y eventos
├── scheduler.js        # Motor de planificación y métricas
├── test/
│   └── scheduler.test.cjs
├── server.cjs          # Servidor de desarrollo opcional
├── favicon.svg
├── vercel.json
└── package.json
```

## Subir el proyecto a tu repositorio de GitHub

El repositorio de destino es **[jhunnior-06/cpu-flow-estudio](https://github.com/jhunnior-06/cpu-flow-estudio)** y la rama es `main`.

En Windows, abre una terminal en la carpeta donde quieres trabajar y ejecuta:

```powershell
git clone https://github.com/jhunnior-06/cpu-flow-estudio.git
cd cpu-flow-estudio
```

Después copia **todos los archivos de este paquete** (incluida la carpeta `.github`) a la carpeta clonada y ejecuta:

```powershell
git add .
git commit -m "Agregar simulador interactivo de planificación de CPU"
git push origin main
```

Si GitHub solicita autenticación, utiliza el inicio de sesión de Git Credential Manager. **No pegues contraseñas ni claves personales en el código.** Las actualizaciones posteriores deben utilizar mensajes de commit en español, por ejemplo: `Corregir cálculos de Round Robin` o `Mejorar la guía de estudio`.

Al conectar el repositorio a Vercel, cada nuevo push a la rama `main` podrá publicar los cambios automáticamente.