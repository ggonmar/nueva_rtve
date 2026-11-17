(() => {
  'use strict';

  const DATOS = window.TELETEXTO || {
    programas: [], manifiesto: '', personas: { confirmados: [], candidatos: [] }, repositorio: null, rama: 'main',
  };
  const PROGRAMAS = DATOS.programas;
  const CONFIRMADOS = PROGRAMAS.filter((p) => p.estado === 'Confirmado');
  const CANDIDATOS = PROGRAMAS.filter((p) => p.estado === 'Candidato');
  const MOVIMIENTO_REDUCIDO = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const COLORES = ['rojo', 'verde', 'amarillo', 'azul'];
  const TECLAS_COLOR = ['r', 'v', 'a', 'z'];

  const $ = (selector) => document.querySelector(selector);
  const esc = (texto) => String(texto).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[c]);
  const azar = (lista) => lista[Math.floor(Math.random() * lista.length)];
  const sinTildes = (texto) => texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  const el = {
    pantalla: $('#pantalla'),
    pagina: $('#pagina'),
    entrada: $('#cab-entrada'),
    nombre: $('#cab-nombre'),
    num: $('#cab-num'),
    fecha: $('#cab-fecha'),
    hora: $('#cab-hora'),
    fastext: $('#fastext'),
    pista: $('#rotulo-pista'),
    ruido: $('#ruido'),
    aviso: $('#aviso'),
    sonido: $('#boton-sonido'),
  };

  /* ---------- Mosaico teletexto (fuente de 3x5 píxeles) ---------- */

  const FUENTE = {
    A: ['.X.', 'X.X', 'XXX', 'X.X', 'X.X'], B: ['XX.', 'X.X', 'XX.', 'X.X', 'XX.'],
    C: ['XXX', 'X..', 'X..', 'X..', 'XXX'], D: ['XX.', 'X.X', 'X.X', 'X.X', 'XX.'],
    E: ['XXX', 'X..', 'XX.', 'X..', 'XXX'], F: ['XXX', 'X..', 'XX.', 'X..', 'X..'],
    G: ['XXX', 'X..', 'X.X', 'X.X', 'XXX'], H: ['X.X', 'X.X', 'XXX', 'X.X', 'X.X'],
    I: ['XXX', '.X.', '.X.', '.X.', 'XXX'], J: ['..X', '..X', '..X', 'X.X', 'XXX'],
    K: ['X.X', 'X.X', 'XX.', 'X.X', 'X.X'], L: ['X..', 'X..', 'X..', 'X..', 'XXX'],
    M: ['X.X', 'XXX', 'XXX', 'X.X', 'X.X'], N: ['XXX', 'X.X', 'X.X', 'X.X', 'X.X'],
    O: ['XXX', 'X.X', 'X.X', 'X.X', 'XXX'], P: ['XXX', 'X.X', 'XXX', 'X..', 'X..'],
    Q: ['XXX', 'X.X', 'X.X', 'XXX', '..X'], R: ['XX.', 'X.X', 'XX.', 'X.X', 'X.X'],
    S: ['XXX', 'X..', 'XXX', '..X', 'XXX'], T: ['XXX', '.X.', '.X.', '.X.', '.X.'],
    U: ['X.X', 'X.X', 'X.X', 'X.X', 'XXX'], V: ['X.X', 'X.X', 'X.X', 'X.X', '.X.'],
    W: ['X.X', 'X.X', 'XXX', 'XXX', 'X.X'], X: ['X.X', 'X.X', '.X.', 'X.X', 'X.X'],
    Y: ['X.X', 'X.X', '.X.', '.X.', '.X.'], Z: ['XXX', '..X', '.X.', 'X..', 'XXX'],
    0: ['XXX', 'X.X', 'X.X', 'X.X', 'XXX'], 1: ['.X.', 'XX.', '.X.', '.X.', 'XXX'],
    2: ['XXX', '..X', 'XXX', 'X..', 'XXX'], 3: ['XXX', '..X', '.XX', '..X', 'XXX'],
    4: ['X.X', 'X.X', 'XXX', '..X', '..X'], 5: ['XXX', 'X..', 'XXX', '..X', 'XXX'],
    6: ['XXX', 'X..', 'XXX', 'X.X', 'XXX'], 7: ['XXX', '..X', '.X.', '.X.', '.X.'],
    8: ['XXX', 'X.X', 'XXX', 'X.X', 'XXX'], 9: ['XXX', 'X.X', 'XXX', '..X', 'XXX'],
    '-': ['...', '...', 'XXX', '...', '...'], '!': ['.X.', '.X.', '.X.', '...', '.X.'],
    '?': ['XXX', '..X', '.X.', '...', '.X.'], ' ': ['...', '...', '...', '...', '...'],
  };

  function mosaico(texto, { animado = false } = {}) {
    const letras = [...sinTildes(texto).toUpperCase()].map((c) => FUENTE[c] || FUENTE['?']);
    const ancho = letras.length * 4 - 1;
    const rects = [];
    letras.forEach((letra, i) => {
      letra.forEach((fila, y) => {
        [...fila].forEach((pixel, x) => {
          if (pixel !== 'X') return;
          const retardo = animado && !MOVIMIENTO_REDUCIDO ? ` style="animation-delay:${Math.floor(Math.random() * 700)}ms"` : '';
          rects.push(`<rect x="${i * 4 + x}" y="${y * 1.25}" width="1.02" height="1.27"${retardo}/>`);
        });
      });
    });
    return `<svg class="mosaico${animado ? ' animado' : ''}" viewBox="0 0 ${ancho} 6.25" preserveAspectRatio="xMinYMid meet" shape-rendering="crispEdges" aria-hidden="true">${rects.join('')}</svg>`;
  }

  const banner = (texto, color = 'rojo', opciones = {}) => `
    <div class="banner banner-${color}">${mosaico(texto, opciones)}<h1 class="sr">${esc(texto)}</h1></div>`;

  /* ---------- Hora de Madrid y emisión ---------- */

  const formatoHora = new Intl.DateTimeFormat('es-ES', {
    timeZone: 'Europe/Madrid', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  });
  const formatoFecha = new Intl.DateTimeFormat('es-ES', {
    timeZone: 'Europe/Madrid', weekday: 'short', day: '2-digit', month: 'short',
  });

  function partesHora() {
    const partes = Object.fromEntries(formatoHora.formatToParts(new Date()).map((p) => [p.type, p.value]));
    return { h: Number(partes.hour), m: Number(partes.minute), texto: `${partes.hour}:${partes.minute}:${partes.second}` };
  }

  const minutosAhora = () => { const { h, m } = partesHora(); return h * 60 + m; };
  const aMinutos = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
  const rango = (p) => p.horario.split('-').map(aMinutos);

  function enEmision(p, ahora) {
    const [inicio, fin] = rango(p);
    return inicio < fin ? ahora >= inicio && ahora < fin : ahora >= inicio || ahora < fin;
  }

  function proximos(ahora, cantidad) {
    return CONFIRMADOS
      .filter((p) => !enEmision(p, ahora))
      .sort((a, b) => ((rango(a)[0] - ahora + 1440) % 1440) - ((rango(b)[0] - ahora + 1440) % 1440))
      .slice(0, cantidad);
  }

  const RELLENOS = [
    'CARTA DE AJUSTE (patrocinada)',
    'HIMNO EN BUCLE, VERSIÓN EXTENDIDA',
    'MOSCA DE LA CADENA EN PRIMER PLANO',
    'REPOSICIÓN DE LA CARTA DE AJUSTE',
  ];

  /* ---------- Sonido ---------- */

  let audio = null;
  let sonidoActivo = false;
  try { sonidoActivo = localStorage.getItem('fachatexto-sonido') === '1'; } catch (e) { /* sin almacenamiento */ }

  function pitido(tipo = 'tecla') {
    if (!sonidoActivo) return;
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      const osc = audio.createOscillator();
      const gan = audio.createGain();
      const frecuencias = { tecla: 880, cambio: 523, error: 110, premio: 1320 };
      osc.type = 'square';
      osc.frequency.value = frecuencias[tipo] || 660;
      gan.gain.setValueAtTime(0.035, audio.currentTime);
      gan.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + (tipo === 'error' ? 0.4 : 0.09));
      osc.connect(gan).connect(audio.destination);
      osc.start();
      osc.stop(audio.currentTime + 0.42);
    } catch (e) { /* el navegador no quiere ruido */ }
  }

  function alternarSonido() {
    sonidoActivo = !sonidoActivo;
    try { localStorage.setItem('fachatexto-sonido', sonidoActivo ? '1' : '0'); } catch (e) { /* nada */ }
    pintarBotonSonido();
    avisar(sonidoActivo ? 'SONIDO ACTIVADO. BIP.' : 'SONIDO DESACTIVADO');
    pitido('premio');
  }

  function pintarBotonSonido() {
    el.sonido.textContent = sonidoActivo ? '🔊' : '🔇';
    el.sonido.setAttribute('aria-label', sonidoActivo ? 'Desactivar sonido' : 'Activar sonido');
  }

  /* ---------- Efectos ---------- */

  function prepararRuido() {
    try {
      const lienzo = document.createElement('canvas');
      lienzo.width = 120;
      lienzo.height = 90;
      const ctx = lienzo.getContext('2d');
      const imagen = ctx.createImageData(lienzo.width, lienzo.height);
      for (let i = 0; i < imagen.data.length; i += 4) {
        const v = Math.random() * 255;
        imagen.data[i] = imagen.data[i + 1] = imagen.data[i + 2] = v;
        imagen.data[i + 3] = 255;
      }
      ctx.putImageData(imagen, 0, 0);
      el.ruido.style.backgroundImage = `url(${lienzo.toDataURL()})`;
    } catch (e) { /* sin lienzo, sin nieve */ }
  }

  function ruido(duracion = 260) {
    if (MOVIMIENTO_REDUCIDO) return;
    el.ruido.classList.add('activo');
    setTimeout(() => el.ruido.classList.remove('activo'), duracion);
  }

  let temporizadorAviso;
  function avisar(texto) {
    el.aviso.textContent = texto;
    el.aviso.classList.add('visible');
    clearTimeout(temporizadorAviso);
    temporizadorAviso = setTimeout(() => el.aviso.classList.remove('visible'), 2600);
  }

  /* ---------- Piezas reutilizables ---------- */

  const enlacePrograma = (p) => `#/${p.slug}`;

  function filaPrograma(p, ahora) {
    const directo = p.estado === 'Confirmado' && enEmision(p, ahora);
    return `
      <a class="fila${directo ? ' en-antena' : ''}" href="${enlacePrograma(p)}">
        ${directo ? '<span class="marcador parpadeo" aria-label="En antena">▶</span>' : ''}<span class="hora">${esc(p.horario)}</span>
        <span class="titulo">${esc(p.titulo)}</span>
        <span class="puntos" aria-hidden="true"></span>
        <span class="num">${p.pagina}</span>
      </a>`;
  }

  const filaIndice = (texto, destino, num) => `
    <a class="fila indice" href="#/${destino}">
      <span class="titulo">${esc(texto)}</span><span class="puntos" aria-hidden="true"></span><span class="num">${num}</span>
    </a>`;

  const cartaAjuste = (texto, detalle = '') => `
    <div class="carta-ajuste" role="img" aria-label="${esc(texto)}">
      <div class="barras" aria-hidden="true"><span></span><span></span><span></span><span></span><span></span><span></span><span></span></div>
      <div class="carta-texto"><strong>${esc(texto)}</strong>${detalle ? `<small>${esc(detalle)}</small>` : ''}</div>
    </div>`;

  const enlaceGithub = (ruta, texto) => (DATOS.repositorio
    ? `<a href="https://github.com/${DATOS.repositorio}/${ruta}" target="_blank" rel="noopener noreferrer">${texto}</a>`
    : '');

  /* ---------- Páginas ---------- */

  const TITULARES_EXTRA = [
    'El Observatorio de Observatorios abre una investigación sobre sí mismo.',
    'La carta de ajuste supera en audiencia a tres tertulias de la competencia.',
    'Un contribuyente es avistado en libertad. Los expertos piden prudencia.',
    'Se agota el presupuesto anual para pancartas en el primer trimestre.',
  ];

  const PREGUNTAS = [
    ['¿Cuántos observatorios caben en una subvención?', 'Todos. Y sobra para un chiringuito.'],
    ['¿Qué hace RTVE de 2:00 a 6:00?', 'Enseñar euskera, galego i català. Despierto o no.'],
    ['¿Quién paga todo esto?', 'Usted. Pulse 500 para ver cuánto.'],
    ['¿Cuántos tertulianos hacen falta para cambiar una bombilla?', 'Ninguno: discuten si la luz es un relato.'],
  ];

  function portada() {
    const ahora = minutosAhora();
    const emitiendo = CONFIRMADOS.filter((p) => enEmision(p, ahora));
    const siguen = proximos(ahora, 3);
    const [pregunta, respuesta] = azar(PREGUNTAS);
    const titulares = [
      ...CONFIRMADOS.map((p) => ({ titulo: p.titulo, texto: p.descripcion, href: enlacePrograma(p), num: p.pagina })),
      ...TITULARES_EXTRA.map((t) => ({ titulo: 'ÚLTIMA HORA', texto: esc(t), href: '#/500', num: 500 })),
    ].sort(() => Math.random() - 0.5).slice(0, 6);

    const html = `
      ${banner('FACHATEXTO', 'rojo', { animado: true })}
      <p class="lema"><span class="amarillo">LA TELEVISIÓN PÚBLICA,</span> <span class="cian">PERO AL REVÉS</span></p>

      <h2 class="franja franja-azul">▶ AHORA EN ANTENA</h2>
      ${emitiendo.length ? emitiendo.map((p) => filaPrograma(p, ahora)).join('') : `<p class="relleno">${esc(azar(RELLENOS))}</p>`}
      <h2 class="franja franja-magenta">A CONTINUACIÓN</h2>
      ${siguen.map((p) => filaPrograma(p, ahora)).join('')}

      <h2 class="franja franja-rojo">ÚLTIMA HORA <span class="subpagina" id="subpagina">1/${titulares.length}</span></h2>
      <div class="titular" id="titular"></div>

      <h2 class="franja franja-verde">ÍNDICE</h2>
      ${filaIndice('MANIFIESTO', 'manifiesto', 101)}
      ${filaIndice('PARRILLA COMPLETA', 'parrilla', 200)}
      ${PROGRAMAS.length ? filaIndice('FICHAS DE PROGRAMAS', PROGRAMAS[0].slug, `${PROGRAMAS[0].pagina}-${PROGRAMAS[PROGRAMAS.length - 1].pagina}`) : ''}
      ${filaIndice('ROSTROS DE LA CADENA', 'rostros', 400)}
      ${filaIndice('SUBVENCIONÓMETRO', 'subvencionometro', 500)}
      ${filaIndice('AYUDA Y TECLAS', 'ayuda', 199)}

      <h2 class="franja franja-cian">PREGUNTA DEL DÍA</h2>
      <p>${esc(pregunta)}</p>
      <p>RESPUESTA: <span class="oculto">${esc(respuesta)}</span> <span class="pista-revelar">(pulse ?)</span></p>`;

    const montar = () => {
      let i = 0;
      const mostrarTitular = () => {
        const t = titulares[i % titulares.length];
        const caja = document.getElementById('titular');
        if (!caja) return;
        caja.innerHTML = `<a href="${t.href}"><span class="amarillo">${esc(t.titulo.toUpperCase())}</span> <span class="num">${t.num}</span></a><p>${t.texto}</p>`;
        document.getElementById('subpagina').textContent = `${(i % titulares.length) + 1}/${titulares.length}`;
        i += 1;
      };
      mostrarTitular();
      const intervalo = setInterval(mostrarTitular, 6000);
      return () => clearInterval(intervalo);
    };
    return { titulo: 'Portada', html, montar };
  }

  function manifiesto() {
    return {
      titulo: 'Manifiesto',
      html: `
        ${banner('MANIFIESTO', 'magenta')}
        <div class="cuerpo manifiesto">${DATOS.manifiesto}</div>
        <h2 class="franja franja-verde">¿TIENE UNA IDEA PEOR?</h2>
        <p>Estamos abiertos a nuevas propuestas. ${enlaceGithub('issues', 'Envíe la suya por GitHub') || 'Mándela por GitHub.'}
        Se valorarán por orden de llegada y grado de escándalo.</p>`,
    };
  }

  function parrilla() {
    const ahora = minutosAhora();
    const horaActual = Math.floor(ahora / 60);
    const celdas = Array.from({ length: 24 }, (_, h) => {
      const cubierta = CONFIRMADOS.some((p) => enEmision(p, h * 60) || enEmision(p, h * 60 + 30));
      return `<span class="celda ${cubierta ? 'llena' : 'vacia'}${h === horaActual ? ' actual' : ''}" title="${String(h).padStart(2, '0')}:00">${cubierta ? '█' : '░'}</span>`;
    }).join('');
    return {
      titulo: 'Parrilla',
      html: `
        ${banner('PARRILLA', 'azul')}
        <p class="cian">Programación del día (hora peninsular). Los huecos se rellenan con carta de ajuste.</p>
        <div class="linea-tiempo" aria-label="Ocupación de la parrilla por horas">
          <div class="celdas">${celdas}</div>
          <div class="marcas" aria-hidden="true"><span>00</span><span>06</span><span>12</span><span>18</span><span>23</span></div>
        </div>
        <h2 class="franja franja-verde">CONFIRMADOS</h2>
        ${CONFIRMADOS.map((p) => filaConDetalle(p, ahora)).join('') || '<p>Nada confirmado. Sospechoso.</p>'}
        <h2 class="franja franja-amarillo">CANDIDATOS · EN PRUEBAS</h2>
        <p class="tenue">Alternativas para esas franjas, no emisiones simultáneas.</p>
        ${CANDIDATOS.map((p) => filaConDetalle(p, ahora)).join('') || '<p>Sin candidatos. De momento.</p>'}`,
    };
  }

  const filaConDetalle = (p, ahora) => `
    <div class="bloque-programa">
      ${filaPrograma(p, ahora)}
      <p class="detalle"><span class="cian">${esc(p.tipo)}</span> · ${esc(p.presentador || 'Presentador por concretar')}</p>
    </div>`;

  function programa(p) {
    const i = PROGRAMAS.indexOf(p);
    const anterior = PROGRAMAS[(i - 1 + PROGRAMAS.length) % PROGRAMAS.length];
    const siguiente = PROGRAMAS[(i + 1) % PROGRAMAS.length];
    const confirmado = p.estado === 'Confirmado';
    const directo = confirmado && enEmision(p, minutosAhora());
    const imagen = p.imagen
      ? `<img src="${esc(encodeURI(p.imagen))}" alt="Imagen de ${esc(p.titulo)}" loading="lazy">`
      : cartaAjuste('IMAGEN PENDIENTE', `Se busca foto: ${p.imagenSugerida}`);
    const datos = [
      ['HORARIO', esc(p.horario)],
      ['TIPO', esc(p.tipo)],
      ['PRESENTA', esc(p.presentador || 'Por concretar')],
      ['ESTADO', confirmado ? '<span class="verde">CONFIRMADO</span>' : '<span class="amarillo parpadeo">CANDIDATO</span>'],
      ...p.extras.map((e) => [esc(e.campo.toUpperCase()), e.valor]),
    ];
    return {
      titulo: p.titulo,
      html: `
        <div class="franja franja-${confirmado ? 'verde' : 'amarillo'} cabecera-programa">
          <span>PROGRAMA ${p.pagina}</span>
          ${directo ? '<span class="en-directo parpadeo">● EN ANTENA</span>' : ''}
        </div>
        <h1 class="doble">${esc(p.titulo)}</h1>
        <div class="ficha">
          <figure class="imagen-programa">${imagen}</figure>
          <dl class="datos">${datos.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>
        </div>
        <p class="descripcion">${p.descripcion}</p>
        ${p.cuerpo
          ? `<div class="cuerpo">${p.cuerpo}</div>`
          : '<p class="relleno">Contenido en desarrollo. El guionista sigue esperando la subvención.</p>'}
        <nav class="pasos" aria-label="Otros programas">
          <a href="${enlacePrograma(anterior)}">◀ ${anterior.pagina}</a>
          <a href="#/parrilla">PARRILLA 200</a>
          <a href="${enlacePrograma(siguiente)}">${siguiente.pagina} ▶</a>
        </nav>
        ${DATOS.repositorio ? `<p class="fuente">${enlaceGithub(`blob/${DATOS.rama}/${encodeURI(p.fuente)}`, '✎ Ver o mejorar esta ficha en GitHub')}</p>` : ''}`,
      fastext: [
        { texto: 'Parrilla', destino: 'parrilla' },
        { texto: `◀ ${anterior.pagina}`, destino: anterior.slug },
        { texto: `${siguiente.pagina} ▶`, destino: siguiente.slug },
        { texto: 'Zapping', destino: azar(PROGRAMAS).slug },
      ],
    };
  }

  function rostros() {
    const lista = (personas) => personas.map((p) => `
      <div class="rostro">
        <p><span class="amarillo">${esc(p.nombre)}</span> <span class="cian">· ${esc(p.perfil)}</span></p>
        <p class="detalle">${p.notas}</p>
      </div>`).join('');
    return {
      titulo: 'Rostros',
      html: `
        ${banner('ROSTROS', 'cian')}
        <h2 class="franja franja-verde">EN PLANTILLA</h2>
        ${lista(DATOS.personas.confirmados)}
        <h2 class="franja franja-amarillo">EN LA RECÁMARA</h2>
        ${lista(DATOS.personas.candidatos)}`,
    };
  }

  const VEREDICTOS = [
    ['CONCEDIDA', 'El formulario contenía la palabra «resiliencia».'],
    ['DENEGADA', 'Su proyecto no incluye ningún observatorio.'],
    ['CONCEDIDA', 'Corto sobre la memoria de su abuela. 4 minutos. 300.000 €.'],
    ['EN TRÁMITE', 'Vuelva en 2031 con el sello del sello.'],
    ['DENEGADA', 'Ha declarado beneficios. Eso aquí no se hace.'],
    ['CONCEDIDA', 'Se crea un observatorio para observar su subvención.'],
    ['EXTRAVIADA', 'Su expediente está en Megainfraestructuras, esperando presupuesto.'],
  ];

  function subvencionometro() {
    const html = `
      ${banner('PASTA', 'verde')}
      <h2 class="franja franja-rojo">SUBVENCIONÓMETRO EN DIRECTO</h2>
      <p>Dinero público repartido desde que abrió esta página:</p>
      <p class="contador" id="contador">0 €</p>
      <p class="tenue">Tarifa estimada por el Observatorio del Observatorio: entre 1.000 y 9.000 € por segundo. Cifra ficticia; la de verdad es peor.</p>
      <p>Observatorios inaugurados: <span class="amarillo" id="observatorios">0</span></p>
      <button type="button" class="boton-tt" id="pedir">▶ PEDIR SUBVENCIÓN</button>
      <div class="veredicto" id="veredicto" aria-live="polite"></div>`;
    const montar = () => {
      let euros = 0;
      let observatorios = 0;
      const formato = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 });
      const contador = document.getElementById('contador');
      const obs = document.getElementById('observatorios');
      const tic = setInterval(() => {
        euros += 100 + Math.random() * 800;
        contador.textContent = `${formato.format(euros)} €`;
      }, 100);
      const tac = setInterval(() => { observatorios += 1; obs.textContent = observatorios; }, 7000);
      document.getElementById('pedir').addEventListener('click', () => {
        const [estado, motivo] = azar(VEREDICTOS);
        const concedida = estado === 'CONCEDIDA';
        pitido(concedida ? 'premio' : 'error');
        document.getElementById('veredicto').innerHTML = `
          <p class="${concedida ? 'verde' : 'rojo'} doble parpadeo-corto">${estado}</p><p>${esc(motivo)}</p>`;
      });
      return () => { clearInterval(tic); clearInterval(tac); };
    };
    return { titulo: 'Subvencionómetro', html, montar };
  }

  function ayuda() {
    return {
      titulo: 'Ayuda',
      html: `
        ${banner('AYUDA', 'amarillo')}
        <h2 class="franja franja-azul">CÓMO SE MANEJA ESTO</h2>
        <dl class="datos teclas">
          <dt>0-9</dt><dd>Teclee un número de página de tres cifras.</dd>
          <dt>← →</dt><dd>Página anterior / siguiente (P− / P+).</dd>
          <dt>R V A Z</dt><dd>Botones <span class="rojo">rojo</span>, <span class="verde">verde</span>, <span class="amarillo">amarillo</span> y <span class="azul-claro">azul</span>.</dd>
          <dt>?</dt><dd>Revelar respuestas ocultas.</dd>
          <dt>I</dt><dd>Volver al índice (100).</dd>
          <dt>M</dt><dd>Sonido de época (bips).</dd>
        </dl>
        <p>También puede usar el mando a distancia o tocar directamente los enlaces de la pantalla.</p>
        <h2 class="franja franja-magenta">MAPA DE PÁGINAS</h2>
        ${filaIndice('PORTADA', 'portada', 100)}
        ${filaIndice('MANIFIESTO', 'manifiesto', 101)}
        ${filaIndice('PARRILLA', 'parrilla', 200)}
        ${PROGRAMAS.map((p) => filaIndice(p.titulo, p.slug, p.pagina)).join('')}
        ${filaIndice('ROSTROS', 'rostros', 400)}
        ${filaIndice('SUBVENCIONÓMETRO', 'subvencionometro', 500)}
        <p class="tenue">Se rumorea que existe un código secreto de los de antes. ↑↑↓↓…</p>`,
    };
  }

  const EXCUSAS = [
    'Ha sido retirada por el Observatorio de la Neutralidad Informativa.',
    'Está en proceso de resignificación.',
    'Sus redactores están en huelga en solidaridad con otra huelga.',
    'Pendiente de subvención. Vuelva en la próxima legislatura.',
    'Ha sido trasladada a una cuneta. Búsquela en Cunetas o Pesetas.',
    'Nunca existió. Si la recuerda, revise su memoria democrática.',
  ];

  const PAGINAS_ESPECIALES = {
    888: 'Subtítulos no disponibles: el traductor está dando clase en Malas Lenguas.',
    666: 'Página reservada para la tertulia de los lunes.',
    112: 'Para emergencias, llame a Santaolalla. Bueno, mejor no.',
  };

  function error(num) {
    return {
      titulo: 'Página no encontrada',
      html: `
        ${banner('ERROR', 'rojo')}
        <p class="doble amarillo">PÁGINA ${esc(num ?? '???')}</p>
        <p class="parpadeo-lento">NO DISPONIBLE</p>
        <p>${esc(PAGINAS_ESPECIALES[num] || azar(EXCUSAS))}</p>
        ${cartaAjuste('DISCULPEN LAS MOLESTIAS', 'Mientras tanto, disfrute de la carta de ajuste')}`,
    };
  }

  /* ---------- Navegación ---------- */

  const FIJAS = [
    { num: 100, alias: 'portada', construir: portada },
    { num: 101, alias: 'manifiesto', construir: manifiesto },
    { num: 199, alias: 'ayuda', construir: ayuda },
    { num: 200, alias: 'parrilla', construir: parrilla },
    { num: 400, alias: 'rostros', construir: rostros },
    { num: 500, alias: 'subvencionometro', construir: subvencionometro },
  ];
  const SECUENCIA = [...FIJAS.map((f) => f.num), ...PROGRAMAS.map((p) => p.pagina)].sort((a, b) => a - b);

  function resolver(clave) {
    let texto = '';
    try { texto = decodeURIComponent(String(clave || '')); } catch (e) { texto = String(clave || ''); }
    texto = texto.replace(/^#?\/?/, '').trim().toLowerCase();
    if (!texto) return { num: 100, fija: FIJAS[0], clave: 'portada' };
    const numero = /^\d{3}$/.test(texto) ? Number(texto) : null;
    const fija = FIJAS.find((f) => f.num === numero || f.alias === texto);
    if (fija) return { num: fija.num, fija, clave: fija.alias };
    const prog = PROGRAMAS.find((p) => p.pagina === numero || p.slug === texto);
    if (prog) return { num: prog.pagina, programa: prog, clave: prog.slug };
    return { num: numero, clave: texto };
  }

  function construir(destino) {
    if (destino.fija) return destino.fija.construir();
    if (destino.programa) return programa(destino.programa);
    return error(destino.num);
  }

  const FASTEXT_POR_DEFECTO = () => [
    { texto: 'Portada', destino: 'portada' },
    { texto: 'Parrilla', destino: 'parrilla' },
    { texto: 'Manifiesto', destino: 'manifiesto' },
    { texto: 'Zapping', destino: PROGRAMAS.length ? azar(PROGRAMAS).slug : 'portada' },
  ];

  let actual = null;
  let limpiar = null;
  let fastextActual = [];
  let navegacion = 0;

  function irA(clave) {
    const destino = resolver(clave);
    const hash = `#/${destino.clave}`;
    if (location.hash === hash) mostrar(destino);
    else location.hash = hash;
  }

  function buscar(num) {
    if (MOVIMIENTO_REDUCIDO || !actual) return Promise.resolve();
    el.num.classList.add('buscando');
    return new Promise((resolve) => {
      let n = actual.num || 100;
      const objetivo = num || 999;
      const paso = Math.max(1, Math.ceil(Math.abs(objetivo - n) / 9));
      const intervalo = setInterval(() => {
        n = n < objetivo ? Math.min(objetivo, n + paso) : Math.max(objetivo, n - paso);
        el.num.textContent = n;
        if (n === objetivo) {
          clearInterval(intervalo);
          el.num.classList.remove('buscando');
          resolve();
        }
      }, 45);
    });
  }

  async function mostrar(destino) {
    const turno = ++navegacion;
    pitido('cambio');
    await buscar(destino.num);
    if (turno !== navegacion) return;

    if (limpiar) { limpiar(); limpiar = null; }
    document.body.classList.remove('revelar');
    ruido();
    const vista = construir(destino);
    el.pagina.innerHTML = vista.html;
    el.pagina.scrollTop = 0;
    el.num.textContent = destino.num ?? '???';
    el.entrada.textContent = `P${destino.num ?? '???'}`;
    document.title = `${destino.num ?? '???'} · ${vista.titulo} · FACHATEXTO`;
    pintarFastext(vista.fastext || FASTEXT_POR_DEFECTO());
    actual = destino;
    limpiar = vista.montar ? vista.montar() : null;
    if (!destino.fija && !destino.programa) pitido('error');
    el.pagina.focus({ preventScroll: true });
  }

  function pintarFastext(lista) {
    fastextActual = lista;
    el.fastext.innerHTML = lista.map((f, i) => `
      <a class="ft ft-${COLORES[i]}" href="#/${esc(f.destino)}" title="Tecla ${TECLAS_COLOR[i].toUpperCase()}">${esc(f.texto)}</a>`).join('');
  }

  function desplazar(sentido) {
    const num = actual && actual.num;
    let i = SECUENCIA.indexOf(num);
    if (i === -1) {
      const mayor = SECUENCIA.findIndex((n) => n > (num || 0));
      i = (mayor === -1 ? SECUENCIA.length : mayor) - (sentido > 0 ? 1 : 0);
    }
    const siguiente = SECUENCIA[(i + sentido + SECUENCIA.length) % SECUENCIA.length];
    irA(String(siguiente));
  }

  /* ---------- Entrada de números ---------- */

  let tecleado = '';
  let temporizadorTecleo;
  function digito(d) {
    pitido('tecla');
    tecleado += d;
    el.entrada.textContent = `P${tecleado.padEnd(3, '-')}`;
    el.entrada.classList.add('tecleando');
    clearTimeout(temporizadorTecleo);
    if (tecleado.length === 3) {
      const destino = tecleado;
      tecleado = '';
      el.entrada.classList.remove('tecleando');
      irA(destino);
      return;
    }
    temporizadorTecleo = setTimeout(() => {
      tecleado = '';
      el.entrada.classList.remove('tecleando');
      el.entrada.textContent = `P${(actual && actual.num) || 100}`;
    }, 4000);
  }

  /* ---------- Código secreto: modo NO-DO ---------- */

  const KONAMI = ['arrowup', 'arrowup', 'arrowdown', 'arrowdown', 'arrowleft', 'arrowright', 'arrowleft', 'arrowright', 'b', 'a'];
  let progresoKonami = 0;
  function comprobarKonami(tecla) {
    progresoKonami = tecla === KONAMI[progresoKonami] ? progresoKonami + 1 : (tecla === KONAMI[0] ? 1 : 0);
    if (progresoKonami < KONAMI.length) return false;
    progresoKonami = 0;
    const activo = document.body.classList.toggle('no-do');
    el.nombre.textContent = activo ? 'NO-DO' : 'FACHATEXTO';
    avisar(activo ? 'MODO NO-DO ACTIVADO. CAMBIE DE SIGLO.' : 'VUELTA AL SIGLO XXI');
    pitido('premio');
    return true;
  }

  /* ---------- Acciones del mando y teclado ---------- */

  function accion(nombre) {
    if (nombre.startsWith('color-')) {
      const f = fastextActual[Number(nombre.slice(6))];
      pitido('tecla');
      if (f) irA(f.destino);
      return;
    }
    switch (nombre) {
      case 'anterior': desplazar(-1); break;
      case 'siguiente': desplazar(1); break;
      case 'indice': irA('portada'); break;
      case 'revelar':
        pitido('tecla');
        document.body.classList.toggle('revelar');
        break;
      case 'sonido': alternarSonido(); break;
      default: break;
    }
  }

  document.addEventListener('keydown', (evento) => {
    if (evento.ctrlKey || evento.metaKey || evento.altKey) return;
    if (evento.target.closest && evento.target.closest('input, textarea, select')) return;
    const tecla = evento.key.toLowerCase();
    if (comprobarKonami(tecla)) return;
    if (/^\d$/.test(tecla)) { evento.preventDefault(); digito(tecla); return; }
    const color = TECLAS_COLOR.indexOf(tecla);
    if (color !== -1) { accion(`color-${color}`); return; }
    const mapa = { arrowleft: 'anterior', arrowright: 'siguiente', i: 'indice', '?': 'revelar', m: 'sonido' };
    if (mapa[tecla]) { evento.preventDefault(); accion(mapa[tecla]); }
  });

  document.getElementById('mando').addEventListener('click', (evento) => {
    const boton = evento.target.closest('button');
    if (!boton) return;
    if (boton.dataset.tecla) digito(boton.dataset.tecla);
    else if (boton.dataset.accion) accion(boton.dataset.accion);
  });

  /* ---------- Reloj y rótulo ---------- */

  function actualizarReloj() {
    el.hora.textContent = partesHora().texto;
    el.fecha.textContent = sinTildes(formatoFecha.format(new Date())).replace(/[.,]/g, '').toUpperCase();
  }

  let rotuloAnterior = '';
  function actualizarRotulo() {
    const ahora = minutosAhora();
    const emitiendo = CONFIRMADOS.filter((p) => enEmision(p, ahora));
    const piezas = [
      ...(emitiendo.length
        ? emitiendo.map((p) => `<a href="${enlacePrograma(p)}">AHORA ▶ ${esc(p.titulo.toUpperCase())}</a> <span class="cian">${esc(p.horario)}</span>`)
        : [`AHORA ▶ ${esc(azar(RELLENOS))}`]),
      ...proximos(ahora, 4).map((p) => `<a href="${enlacePrograma(p)}">${esc(p.horario.slice(0, 5))} ${esc(p.titulo)}</a>`),
      'PULSE 200 PARA LA PARRILLA COMPLETA',
      'PULSE 101 PARA EL MANIFIESTO',
    ];
    const contenido = piezas.map((p) => `<span class="pieza">${p}</span>`).join('<span class="sep">★</span>');
    if (contenido === rotuloAnterior) return;
    rotuloAnterior = contenido;
    el.pista.innerHTML = `<span class="tramo">${contenido}<span class="sep">★</span></span><span class="tramo" aria-hidden="true">${contenido}<span class="sep">★</span></span>`;
  }

  /* ---------- Arranque ---------- */

  pintarBotonSonido();
  prepararRuido();
  actualizarReloj();
  actualizarRotulo();
  setInterval(actualizarReloj, 1000);
  setInterval(actualizarRotulo, 30000);
  window.addEventListener('hashchange', () => mostrar(resolver(location.hash)));
  mostrar(resolver(location.hash));
  setTimeout(() => el.pantalla.classList.remove('encendiendo'), 900);
})();
