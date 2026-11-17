(() => {
  'use strict';

  const DATOS = window.TELETEXTO || {
    programas: [], manifiesto: '', personas: { confirmados: [], candidatos: [] }, repositorio: null, rama: 'main',
  };
  const PROGRAMAS = DATOS.programas;
  const CONFIRMADOS = PROGRAMAS.filter((p) => p.estado === 'Confirmado');
  const CANDIDATOS = PROGRAMAS.filter((p) => p.estado === 'Candidato');
  const NOTICIAS = DATOS.noticias || [];
  const ROSTROS = DATOS.rostros || [];
  const DESTACADA = NOTICIAS.length ? NOTICIAS[Math.floor(Math.random() * NOTICIAS.length)] : null;
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
  const enlaceNoticia = (n) => `#/noticias/${n.slug}`;
  const enlaceRostro = (r) => `#/rostros/${r.slug}`;
  const programaPorSlug = (slug) => PROGRAMAS.find((p) => p.slug === slug);
  const rostroPorSlug = (slug) => ROSTROS.find((r) => r.slug === slug);

  const filaNoticia = (n) => `
    <a class="fila indice" href="${enlaceNoticia(n)}">
      <span class="titulo">${esc(n.titular)}</span><span class="puntos" aria-hidden="true"></span><span class="num">${n.pagina}</span>
    </a>`;

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
    const otras = NOTICIAS.filter((n) => n !== DESTACADA).sort(() => Math.random() - 0.5).slice(0, 3);
    const ultimaHora = DESTACADA ? `
      <h2 class="franja franja-rojo">ÚLTIMA HORA <span class="subpagina">${esc(DESTACADA.seccion.toUpperCase())}</span></h2>
      <a class="titular-portada" href="${enlaceNoticia(DESTACADA)}">${esc(DESTACADA.titular)}</a>
      <p class="entradilla">${DESTACADA.entradilla}</p>
      <p class="sigue"><a href="${enlaceNoticia(DESTACADA)}">Siga leyendo en la página ${DESTACADA.pagina} ▶</a></p>` : '';
    const masTitulares = otras.length
      ? `<h2 class="franja franja-amarillo">MÁS TITULARES</h2>${otras.map(filaNoticia).join('')}` : '';
    const todasLasNoticias = NOTICIAS.length
      ? `<a class="fila indice todas-noticias" href="#/noticias"><span class="titulo">▶ TODAS LAS NOTICIAS</span><span class="puntos" aria-hidden="true"></span><span class="num">300</span></a>` : '';

    const html = `
      ${banner('FACHATEXTO', 'rojo', { animado: true })}
      <p class="lema"><span class="amarillo">LA TELEVISIÓN PÚBLICA,</span> <span class="cian">PERO AL REVÉS</span></p>

      <h2 class="franja franja-azul">▶ AHORA EN ANTENA</h2>
      ${emitiendo.length ? emitiendo.map((p) => filaPrograma(p, ahora)).join('') : `<p class="relleno">${esc(azar(RELLENOS))}</p>`}
      <h2 class="franja franja-magenta">A CONTINUACIÓN</h2>
      ${siguen.map((p) => filaPrograma(p, ahora)).join('')}
      ${ultimaHora}
      ${masTitulares}
      ${todasLasNoticias}

      <h2 class="franja franja-verde">ÍNDICE</h2>
      ${filaIndice('MANIFIESTO', 'manifiesto', 101)}
      ${NOTICIAS.length ? filaIndice('NOTICIAS', 'noticias', 300) : ''}
      ${filaIndice('PARRILLA COMPLETA', 'parrilla', 200)}
      ${PROGRAMAS.length ? filaIndice('FICHAS DE PROGRAMAS', PROGRAMAS[0].slug, `${PROGRAMAS[0].pagina}-${PROGRAMAS[PROGRAMAS.length - 1].pagina}`) : ''}
      ${filaIndice('ROSTROS DE LA CADENA', 'rostros', 400)}
      ${filaIndice('SUBVENCIONÓMETRO', 'subvencionometro', 500)}
      ${filaIndice('BUSCADOR', 'buscador', 555)}
      ${filaIndice('AYUDA Y GUÍA DE PÁGINAS', 'ayuda', 199)}

      <h2 class="franja franja-cian">PREGUNTA DEL DÍA</h2>
      <p>${esc(pregunta)}</p>
      <p>RESPUESTA: <span class="oculto">${esc(respuesta)}</span> <span class="pista-revelar">(pulse ?)</span></p>`;

    return {
      titulo: 'Portada',
      html,
      fastext: [
        { texto: 'Noticias', destino: NOTICIAS.length ? 'noticias' : 'manifiesto' },
        { texto: 'Parrilla', destino: 'parrilla' },
        { texto: 'Manifiesto', destino: 'manifiesto' },
        { texto: 'Zapping', destino: PROGRAMAS.length ? azar(PROGRAMAS).slug : 'portada' },
      ],
    };
  }

  const fechaNoticia = (iso) => new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(`${iso}T12:00:00Z`)).toUpperCase();

  function noticias() {
    const secciones = [...new Set(NOTICIAS.map((n) => n.seccion))];
    return {
      titulo: 'Noticias',
      html: `
        ${banner('NOTICIAS', 'rojo')}
        <p class="cian">Información veraz, contrastada y deliberadamente desequilibrada.</p>
        ${secciones.map((s) => `
          <h2 class="franja franja-azul">${esc(s.toUpperCase())}</h2>
          ${NOTICIAS.filter((n) => n.seccion === s).map(filaNoticia).join('')}`).join('')
          || '<p class="relleno">Sin noticias. El Gobierno lo celebra.</p>'}`,
    };
  }

  function noticia(n) {
    const i = NOTICIAS.indexOf(n);
    const anterior = NOTICIAS[(i - 1 + NOTICIAS.length) % NOTICIAS.length];
    const siguiente = NOTICIAS[(i + 1) % NOTICIAS.length];
    return {
      titulo: n.titular,
      html: `
        <div class="franja franja-rojo cabecera-programa">
          <span>NOTICIAS ${n.pagina} · ${esc(n.seccion.toUpperCase())}</span>
          <span>${esc(fechaNoticia(n.fecha))}</span>
        </div>
        <h1 class="titular-noticia">${esc(n.titular)}</h1>
        <p class="descripcion entradilla">${n.entradilla}</p>
        <div class="cuerpo">${n.cuerpo}</div>
        ${n.firma ? `<p class="firma">${esc(n.firma)}</p>` : ''}
        <p class="tenue aviso-noticia">Noticia satírica. Cualquier parecido con la realidad es culpa de la realidad.</p>
        <nav class="pasos" aria-label="Otras noticias">
          <a href="${enlaceNoticia(anterior)}">◀ ${anterior.pagina}</a>
          <a href="#/noticias">NOTICIAS 300</a>
          <a href="${enlaceNoticia(siguiente)}">${siguiente.pagina} ▶</a>
        </nav>
        ${DATOS.repositorio ? `<p class="fuente">${enlaceGithub(`blob/${DATOS.rama}/${encodeURI(n.fuente)}`, '✎ Ver o mejorar esta noticia en GitHub')}</p>` : ''}`,
      fastext: [
        { texto: 'Noticias', destino: 'noticias' },
        { texto: `◀ ${anterior.pagina}`, destino: `noticias/${anterior.slug}` },
        { texto: `${siguiente.pagina} ▶`, destino: `noticias/${siguiente.slug}` },
        { texto: 'Otra', destino: `noticias/${azar(NOTICIAS).slug}` },
      ],
    };
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
      ...((p.rostros || []).length ? [['ROSTROS', p.rostros.map(rostroPorSlug).filter(Boolean)
        .map((r) => `<a href="${enlaceRostro(r)}">${esc(r.nombre)} ${r.pagina}</a>`).join('<br>')]] : []),
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
        ${DATOS.repositorio ? `<p class="fuente">${enlaceGithub(`blob/${DATOS.rama}/${encodeURI(p.fuente)}`, '✎ Ver o mejorar esta ficha en GitHub')}</p>` : ''}
        ${p.reemplaza ? `<dl class="datos reemplaza"><dt>REEMPLAZA A</dt><dd>${p.reemplaza}</dd></dl>` : ''}`,
      fastext: [
        { texto: 'Parrilla', destino: 'parrilla' },
        { texto: `◀ ${anterior.pagina}`, destino: anterior.slug },
        { texto: `${siguiente.pagina} ▶`, destino: siguiente.slug },
        { texto: 'Zapping', destino: azar(PROGRAMAS).slug },
      ],
    };
  }

  const filaRostro = (r) => `
    <div class="bloque-programa">
      <a class="fila indice" href="${enlaceRostro(r)}">
        <span class="titulo">${esc(r.nombre)}</span><span class="puntos" aria-hidden="true"></span><span class="num">${r.pagina}</span>
      </a>
      <p class="detalle detalle-rostro"><span class="cian">${esc(r.perfil)}</span> · ${r.programas.length
        ? r.programas.map(programaPorSlug).filter(Boolean).map((p) => esc(p.titulo)).join(', ')
        : 'Programa por concretar'}</p>
    </div>`;

  function rostros() {
    const plantilla = ROSTROS.filter((r) => r.estado === 'Confirmado');
    const recamara = ROSTROS.filter((r) => r.estado !== 'Confirmado');
    return {
      titulo: 'Rostros',
      html: `
        ${banner('ROSTROS', 'cian')}
        <h2 class="franja franja-verde">EN PLANTILLA</h2>
        ${plantilla.map(filaRostro).join('') || '<p>Plantilla vacía. Todos de baja por ansiedad.</p>'}
        <h2 class="franja franja-amarillo">EN LA RECÁMARA</h2>
        ${recamara.map(filaRostro).join('') || '<p>Nadie en la recámara. De momento.</p>'}`,
    };
  }

  function rostro(r) {
    const i = ROSTROS.indexOf(r);
    const anterior = ROSTROS[(i - 1 + ROSTROS.length) % ROSTROS.length];
    const siguiente = ROSTROS[(i + 1) % ROSTROS.length];
    const confirmado = r.estado === 'Confirmado';
    const imagen = r.imagen
      ? `<img src="${esc(encodeURI(r.imagen))}" alt="Imagen de ${esc(r.nombre)}" loading="lazy">`
      : cartaAjuste('FOTO PENDIENTE', `Se busca foto: ${r.imagenSugerida}`);
    const programas = r.programas.map(programaPorSlug).filter(Boolean);
    const datos = [
      ['PERFIL', esc(r.perfil)],
      ['ESTADO', confirmado ? '<span class="verde">EN PLANTILLA</span>' : '<span class="amarillo parpadeo">EN LA RECÁMARA</span>'],
      ['PROGRAMAS', programas.length
        ? programas.map((p) => `<a href="${enlacePrograma(p)}">${esc(p.titulo)} ${p.pagina}</a>`).join('<br>')
        : 'Por concretar'],
    ];
    return {
      titulo: r.nombre,
      html: `
        <div class="franja franja-${confirmado ? 'verde' : 'amarillo'} cabecera-programa">
          <span>ROSTRO ${r.pagina}</span>
        </div>
        <h1 class="doble">${esc(r.nombre)}</h1>
        <div class="ficha">
          <figure class="imagen-programa">${imagen}</figure>
          <dl class="datos">${datos.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>
        </div>
        <p class="descripcion">${r.descripcion}</p>
        ${r.cuerpo ? `<div class="cuerpo">${r.cuerpo}</div>` : ''}
        <nav class="pasos" aria-label="Otros rostros">
          <a href="${enlaceRostro(anterior)}">◀ ${anterior.pagina}</a>
          <a href="#/rostros">ROSTROS 400</a>
          <a href="${enlaceRostro(siguiente)}">${siguiente.pagina} ▶</a>
        </nav>
        ${DATOS.repositorio ? `<p class="fuente">${enlaceGithub(`blob/${DATOS.rama}/${encodeURI(r.fuente)}`, '✎ Ver o mejorar esta ficha en GitHub')}</p>` : ''}`,
      fastext: [
        { texto: 'Rostros', destino: 'rostros' },
        { texto: `◀ ${anterior.pagina}`, destino: `rostros/${anterior.slug}` },
        { texto: `${siguiente.pagina} ▶`, destino: `rostros/${siguiente.slug}` },
        { texto: programas.length ? 'Su programa' : 'Zapping', destino: programas.length ? programas[0].slug : `rostros/${azar(ROSTROS).slug}` },
      ],
    };
  }

  const VEREDICTOS = [
    ['CONCEDIDA', 'El formulario contenía la palabra «resiliencia».'],
    ['DENEGADA', 'Su proyecto no incluye ningún observatorio.'],
    ['CONCEDIDA', 'Corto sobre la memoria de su abuela. 4 minutos. 300.000 €.'],
    ['EN TRÁMITE', 'Vuelva en 2031 con el sello del sello.'],
    ['DENEGADA', 'Ha declarado beneficios. Eso aquí no se hace.'],
    ['CONCEDIDA', 'Se crea un observatorio para observar su subvención.'],
    ['EXTRAVIADA', 'Su expediente está en MEGAFACHADAS, esperando presupuesto.'],
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
    const rangoPaginas = (lista) => (lista.length > 1 ? `${lista[0].pagina}-${lista[lista.length - 1].pagina}` : String(lista.length ? lista[0].pagina : ''));
    const guia = [
      ['100', 'portada', 'Portada: qué se emite ahora, qué viene después y la noticia de última hora.'],
      ['101', 'manifiesto', 'Manifiesto: por qué existe esta parrilla.'],
      ['199', 'ayuda', 'Esta ayuda.'],
      ['200', 'parrilla', 'Parrilla completa, con la barra de 24 horas y el programa en antena marcado.'],
      ...(PROGRAMAS.length ? [[rangoPaginas(PROGRAMAS), PROGRAMAS[0].slug, 'Una página por programa: primero los confirmados, luego los candidatos.']] : []),
      ...(NOTICIAS.length ? [
        ['300', 'noticias', 'Noticias: índice por secciones.'],
        [rangoPaginas(NOTICIAS), `noticias/${NOTICIAS[0].slug}`, 'Una página por noticia, de la más reciente a la más antigua.'],
      ] : []),
      ['400', 'rostros', 'Rostros de la cadena: presentadores en plantilla y en la recámara.'],
      ...(ROSTROS.length ? [[rangoPaginas(ROSTROS), `rostros/${ROSTROS[0].slug}`, 'Una página por rostro, con foto y sus programas.']] : []),
      ['500', 'subvencionometro', 'Subvencionómetro: dinero público repartido en directo.'],
      ['555', 'buscador', 'Buscador: programas, noticias y presentadores según escribe.'],
    ];
    return {
      titulo: 'Ayuda',
      html: `
        ${banner('AYUDA', 'amarillo')}
        <h2 class="franja franja-verde">GUÍA DE PÁGINAS</h2>
        <dl class="datos guia">
          ${guia.map(([num, destino, texto]) => `<dt><a href="#/${esc(destino)}">${esc(num)}</a></dt><dd>${esc(texto)}</dd>`).join('')}
        </dl>
        <h2 class="franja franja-azul">CÓMO SE MANEJA ESTO</h2>
        <dl class="datos teclas">
          <dt>0-9</dt><dd>Teclee un número de página de tres cifras.</dd>
          <dt>← →</dt><dd>Página anterior / siguiente (P− / P+).</dd>
          <dt>R V A Z</dt><dd>Botones <span class="rojo">rojo</span>, <span class="verde">verde</span>, <span class="amarillo">amarillo</span> y <span class="azul-claro">azul</span>.</dd>
          <dt>?</dt><dd>Revelar respuestas ocultas.</dd>
          <dt>I</dt><dd>Volver al índice (100).</dd>
          <dt>M</dt><dd>Sonido de época (bips).</dd>
          <dt>C</dt><dd>Compartir la página: enlace o pantallazo.</dd>
        </dl>
        <p>También puede usar el mando a distancia o tocar directamente los enlaces de la pantalla.</p>
        <h2 class="franja franja-magenta">MAPA COMPLETO</h2>
        ${filaIndice('PORTADA', 'portada', 100)}
        ${filaIndice('MANIFIESTO', 'manifiesto', 101)}
        ${filaIndice('NOTICIAS', 'noticias', 300)}
        ${NOTICIAS.map(filaNoticia).join('')}
        ${filaIndice('PARRILLA', 'parrilla', 200)}
        ${PROGRAMAS.map((p) => filaIndice(p.titulo, p.slug, p.pagina)).join('')}
        ${filaIndice('ROSTROS', 'rostros', 400)}
        ${ROSTROS.map((r) => filaIndice(r.nombre, `rostros/${r.slug}`, r.pagina)).join('')}
        ${filaIndice('SUBVENCIONÓMETRO', 'subvencionometro', 500)}
        ${filaIndice('BUSCADOR', 'buscador', 555)}
        <p class="tenue">Se rumorea que existe un código secreto de los de antes. ↑↑↓↓…</p>`,
    };
  }

  /* ---------- Buscador (555) ---------- */

  const normalizar = (texto) => sinTildes(String(texto || '')).toLowerCase();
  const soloTexto = (html) => { const caja = document.createElement('div'); caja.innerHTML = html || ''; return caja.textContent; };
  let indiceBusqueda = null;

  function construirIndice() {
    const fijas = [
      [100, 'Portada', 'portada'], [101, 'Manifiesto', 'manifiesto'], [300, 'Noticias', 'noticias'],
      [199, 'Ayuda y guía de páginas', 'ayuda'], [200, 'Parrilla completa', 'parrilla'],
      [400, 'Rostros de la cadena', 'rostros'], [500, 'Subvencionómetro', 'subvencionometro'],
    ];
    return [
      ...fijas.map(([num, titulo, destino]) => ({ tipo: 'PÁG', num, titulo, detalle: 'Página del FACHATEXTO', destino, extra: '' })),
      ...PROGRAMAS.map((p) => ({
        tipo: 'PROG', num: p.pagina, titulo: p.titulo, destino: p.slug,
        detalle: `${p.horario} · ${p.tipo} · ${p.presentador || 'Presentador por concretar'}`,
        extra: `${p.tipo} ${p.presentador || ''}`,
      })),
      ...NOTICIAS.map((n) => ({
        tipo: 'NOTI', num: n.pagina, titulo: n.titular, destino: `noticias/${n.slug}`,
        detalle: `${n.seccion} · ${fechaNoticia(n.fecha)}`, extra: `${n.seccion} ${soloTexto(n.entradilla)}`,
      })),
      ...ROSTROS.map((r) => ({
        tipo: 'ROST', num: r.pagina, titulo: r.nombre, destino: `rostros/${r.slug}`,
        detalle: `${r.perfil} · ${r.estado === 'Confirmado' ? 'en plantilla' : 'en la recámara'}`,
        extra: `${r.perfil} ${soloTexto(r.descripcion)} ${r.programas.map((s) => (programaPorSlug(s) || {}).titulo || '').join(' ')}`,
      })),
    ].map((r) => ({ ...r, claveTitulo: normalizar(r.titulo), claveExtra: normalizar(r.extra) }));
  }

  function buscarEnIndice(consulta) {
    const palabras = normalizar(consulta).split(/\s+/).filter(Boolean);
    if (!palabras.length) return [];
    indiceBusqueda = indiceBusqueda || construirIndice();
    return indiceBusqueda
      .map((r) => {
        let puntos = 0;
        for (const palabra of palabras) {
          if (r.claveTitulo.startsWith(palabra)) puntos += 6;
          else if (new RegExp(`\\b${palabra.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).test(r.claveTitulo)) puntos += 4;
          else if (r.claveTitulo.includes(palabra)) puntos += 3;
          else if (r.claveExtra.includes(palabra)) puntos += 1;
          else return null;
        }
        return { ...r, puntos };
      })
      .filter(Boolean)
      .sort((a, b) => b.puntos - a.puntos || a.num - b.num);
  }

  function resaltar(texto, consulta) {
    const clave = normalizar(texto);
    if (clave.length !== texto.length) return esc(texto);
    const marcas = new Array(texto.length).fill(false);
    normalizar(consulta).split(/\s+/).filter(Boolean).forEach((palabra) => {
      let i = clave.indexOf(palabra);
      while (i !== -1) { marcas.fill(true, i, i + palabra.length); i = clave.indexOf(palabra, i + 1); }
    });
    return [...texto].map((c, i) => {
      const abre = marcas[i] && !marcas[i - 1] ? '<mark>' : '';
      const cierra = marcas[i] && !marcas[i + 1] ? '</mark>' : '';
      return `${abre}${esc(c)}${cierra}`;
    }).join('');
  }

  const SIN_RESULTADOS = [
    'SIN RESULTADOS. Puede que lo hayan resignificado.',
    'SIN RESULTADOS. El Ministerio de la Verdad lo ha retirado de la circulación.',
    'SIN RESULTADOS. Pruebe con algo que no esté en un cajón de Ferraz.',
  ];

  function buscador() {
    const html = `
      ${banner('BUSCADOR', 'verde')}
      <label class="buscador" for="busqueda">
        <span class="amarillo">BUSCAR ▶</span>
        <input id="busqueda" type="search" autocomplete="off" spellcheck="false" placeholder="programa, noticia o presentador" aria-describedby="busqueda-estado">
      </label>
      <p class="tenue" id="busqueda-estado">Escriba y los resultados aparecerán al momento. Intro abre el primero.</p>
      <div class="resultados" id="resultados"></div>`;
    const montar = () => {
      const campo = document.getElementById('busqueda');
      const estado = document.getElementById('busqueda-estado');
      const caja = document.getElementById('resultados');
      let resultados = [];
      const pintar = () => {
        campo.setAttribute('value', campo.value);
        resultados = buscarEnIndice(campo.value);
        if (!campo.value.trim()) {
          estado.textContent = 'Escriba y los resultados aparecerán al momento. Intro abre el primero.';
          caja.innerHTML = '';
          return;
        }
        estado.textContent = resultados.length
          ? `${resultados.length} RESULTADO${resultados.length === 1 ? '' : 'S'}`
          : azar(SIN_RESULTADOS);
        caja.innerHTML = resultados.slice(0, 30).map((r) => `
          <a class="fila indice resultado" href="#/${esc(r.destino)}">
            <span class="etiqueta etiqueta-${r.tipo === 'PÁG' ? 'pag' : r.tipo.toLowerCase()}">${r.tipo}</span>
            <span class="titulo">${resaltar(r.titulo, campo.value)}</span><span class="puntos" aria-hidden="true"></span><span class="num">${r.num}</span>
          </a>
          <p class="detalle detalle-resultado">${esc(r.detalle)}</p>`).join('');
      };
      const alPulsar = (evento) => {
        if (evento.key === 'Enter' && resultados.length) { evento.preventDefault(); irA(resultados[0].destino); }
      };
      campo.addEventListener('input', pintar);
      campo.addEventListener('keydown', alPulsar);
      setTimeout(() => campo.focus({ preventScroll: true }), 0);
      return () => { campo.removeEventListener('input', pintar); campo.removeEventListener('keydown', alPulsar); };
    };
    return { titulo: 'Buscador', html, montar };
  }

  function cambioDeBandera({ titulo, rotulo, color, aviso, clase, etiqueta, franjas, enCurso, hecho }) {
    const html = `
      ${banner(rotulo, color)}
      <p class="cian centrado">${esc(aviso)}</p>
      <div class="bandera ${clase} en-marcha" id="bandera" role="img" aria-label="${esc(etiqueta)}">${franjas}</div>
      <p class="estado-transicion">
        <span class="fase-curso">${esc(enCurso)}</span>
        <span class="fase-hecha">${esc(hecho)}</span>
      </p>
      <p class="centrado"><button type="button" class="boton-tt" id="rebobinar">◀◀ REBOBINAR</button></p>`;
    const montar = () => {
      const boton = document.getElementById('rebobinar');
      const reiniciar = () => {
        const bandera = document.getElementById('bandera');
        bandera.classList.remove('en-marcha');
        void bandera.offsetWidth;
        bandera.classList.add('en-marcha');
        ruido(180);
        pitido('cambio');
      };
      boton.addEventListener('click', reiniciar);
      return () => boton.removeEventListener('click', reiniciar);
    };
    return { titulo, html, montar };
  }

  const transicion = () => cambioDeBandera({
    titulo: 'Transición',
    rotulo: '1936-1978',
    color: 'magenta',
    aviso: 'EMISIÓN ESPECIAL DE MADRUGADA · NO AJUSTE SU TELEVISOR',
    clase: 'bandera-936',
    etiqueta: 'La bandera republicana se transforma en la bandera de España',
    franjas: '<span class="bandera-franja bf1"></span><span class="bandera-franja bf2"></span><span class="bandera-franja bf3"></span>',
    enCurso: 'TRANSICIÓN EN CURSO. NO CAMBIE DE CANAL…',
    hecho: 'TRANSICIÓN COMPLETADA. EL MORADO HA SIDO REASIGNADO A UN OBSERVATORIO.',
  });

  const articulo155 = () => cambioDeBandera({
    titulo: 'Artículo 155',
    rotulo: 'ART 155',
    color: 'amarillo',
    aviso: 'CONSTITUCIÓN ESPAÑOLA · ARTÍCULO 155 · APLICACIÓN INMEDIATA',
    clase: 'bandera-155',
    etiqueta: 'La estelada independentista se transforma en la bandera de España',
    franjas: Array.from({ length: 9 }, (_, i) => `<span class="bandera-franja bc${i + 1}"></span>`).join('')
      + '<span class="estelada-triangulo"><span class="estelada-estrella">★</span></span>',
    enCurso: 'APLICANDO EL 155. LA REPÚBLICA DURARÁ LO DE SIEMPRE: OCHO SEGUNDOS…',
    hecho: 'ARTÍCULO 155 APLICADO. EL PRÓFUGO SIGUE EN WATERLOO, LA BANDERA EN SU SITIO.',
  });

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
    { num: 155, alias: 'articulo-155', construir: articulo155, oculta: true },
    { num: 199, alias: 'ayuda', construir: ayuda },
    { num: 200, alias: 'parrilla', construir: parrilla },
    { num: 300, alias: 'noticias', construir: noticias },
    { num: 400, alias: 'rostros', construir: rostros },
    { num: 500, alias: 'subvencionometro', construir: subvencionometro },
    { num: 555, alias: 'buscador', construir: buscador },
    { num: 936, alias: 'transicion', construir: transicion, oculta: true },
  ];
  const SECUENCIA = [...FIJAS.filter((f) => !f.oculta).map((f) => f.num), ...PROGRAMAS.map((p) => p.pagina), ...NOTICIAS.map((n) => n.pagina), ...ROSTROS.map((r) => r.pagina)]
    .sort((a, b) => a - b);

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
    const nota = NOTICIAS.find((n) => n.pagina === numero || `noticias/${n.slug}` === texto);
    if (nota) return { num: nota.pagina, noticia: nota, clave: `noticias/${nota.slug}` };
    const cara = ROSTROS.find((r) => r.pagina === numero || `rostros/${r.slug}` === texto);
    if (cara) return { num: cara.pagina, rostro: cara, clave: `rostros/${cara.slug}` };
    return { num: numero, clave: texto };
  }

  function construir(destino) {
    if (destino.fija) return destino.fija.construir();
    if (destino.programa) return programa(destino.programa);
    if (destino.noticia) return noticia(destino.noticia);
    if (destino.rostro) return rostro(destino.rostro);
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
    menuCompartir.hidden = true;
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
    if (!destino.fija && !destino.programa && !destino.noticia && !destino.rostro) pitido('error');
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

  /* ---------- Compartir ---------- */

  const LIB_CAPTURA = 'https://cdn.jsdelivr.net/npm/modern-screenshot@4.7.0/+esm';
  const menuCompartir = $('#compartir');
  const estadoCompartir = $('#compartir-estado');
  let libCaptura = null;
  let focoPrevio = null;

  if (!navigator.share) $('#compartir-nativo').hidden = true;

  const urlActual = () => `${location.origin}${location.pathname}#/${actual ? actual.clave : 'portada'}`;
  const tituloActual = () => document.title;
  const nombreArchivo = () => `fachatexto-${(actual && actual.num) || 'xxx'}-${String((actual && actual.clave) || 'portada').replace(/[^a-z0-9]+/g, '-')}.png`;

  function informar(texto, error = false) {
    estadoCompartir.textContent = texto;
    estadoCompartir.classList.toggle('error', error);
  }

  function abrirCompartir() {
    if (!menuCompartir.hidden) { cerrarCompartir(); return; }
    focoPrevio = document.activeElement;
    $('#compartir-num').textContent = (actual && actual.num) || '???';
    informar('');
    menuCompartir.hidden = false;
    pitido('tecla');
    menuCompartir.querySelector('button:not([hidden])').focus();
  }

  function cerrarCompartir() {
    menuCompartir.hidden = true;
    if (focoPrevio && focoPrevio.focus) focoPrevio.focus({ preventScroll: true });
  }

  async function copiarTexto(texto) {
    try {
      await navigator.clipboard.writeText(texto);
    } catch (e) {
      const area = document.createElement('textarea');
      area.value = texto;
      area.setAttribute('readonly', '');
      area.style.cssText = 'position:fixed;left:-9999px';
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand('copy');
      area.remove();
      if (!ok) throw e;
    }
  }

  async function pantallazo() {
    libCaptura = libCaptura || import(LIB_CAPTURA);
    const { domToBlob } = await libCaptura;
    const limpiarIds = (nodo) => { nodo.removeAttribute('id'); nodo.querySelectorAll('[id]').forEach((n) => n.removeAttribute('id')); return nodo; };
    const caja = document.createElement('div');
    caja.className = 'captura';
    caja.setAttribute('aria-hidden', 'true');
    const pantalla = document.createElement('div');
    pantalla.className = 'pantalla';
    const pagina = limpiarIds(el.pagina.cloneNode(true));
    pagina.removeAttribute('tabindex');
    const pie = document.createElement('div');
    pie.className = 'captura-pie';
    pie.innerHTML = `<span>FACHATEXTO · PÁGINA ${esc((actual && actual.num) || '???')}</span><span>${esc(urlActual().replace(/^https?:\/\//, ''))}</span>`;
    pantalla.append(limpiarIds($('#cabecera').cloneNode(true)), pagina, pie);
    caja.appendChild(pantalla);
    document.body.appendChild(caja);
    try {
      await document.fonts.ready;
      return await domToBlob(pantalla, { scale: 2, type: 'image/png', backgroundColor: '#000' });
    } finally {
      caja.remove();
    }
  }

  function descargar(blob) {
    const enlace = document.createElement('a');
    enlace.href = URL.createObjectURL(blob);
    enlace.download = nombreArchivo();
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    setTimeout(() => URL.revokeObjectURL(enlace.href), 10000);
  }

  let compartiendo = false;
  async function compartir(opcion) {
    if (opcion === 'cerrar') { cerrarCompartir(); return; }
    if (compartiendo) return;
    compartiendo = true;
    pitido('tecla');
    try {
      if (opcion === 'enlace') {
        await copiarTexto(urlActual());
        informar('ENLACE COPIADO. PÉGUELO DONDE MÁS ESCUEZA.');
      } else if (opcion === 'nativo') {
        await navigator.share({ title: tituloActual(), url: urlActual() });
        informar('COMPARTIDO. LA FACHOSFERA LE SALUDA.');
      } else if (opcion === 'copiar-imagen') {
        informar('REVELANDO EL PANTALLAZO...');
        const imagen = pantallazo();
        try {
          if (!navigator.clipboard || !window.ClipboardItem) throw new Error('Portapapeles sin imágenes');
          await navigator.clipboard.write([new window.ClipboardItem({ 'image/png': imagen })]);
          informar('PANTALLAZO COPIADO AL PORTAPAPELES.');
        } catch (e) {
          descargar(await imagen);
          informar('SU NAVEGADOR NO DEJA COPIAR IMÁGENES: SE HA DESCARGADO.');
        }
      } else if (opcion === 'descargar') {
        informar('REVELANDO EL PANTALLAZO...');
        descargar(await pantallazo());
        informar('PANTALLAZO DESCARGADO.');
      }
      if (opcion !== 'nativo') pitido('premio');
    } catch (e) {
      if (e && e.name === 'AbortError') informar('');
      else { informar('ERROR: LA CENSURA HA INTERVENIDO. INTÉNTELO DE NUEVO.', true); pitido('error'); }
    } finally {
      compartiendo = false;
    }
  }

  menuCompartir.addEventListener('click', (evento) => {
    if (evento.target === menuCompartir) { cerrarCompartir(); return; }
    const boton = evento.target.closest('button[data-compartir]');
    if (boton) compartir(boton.dataset.compartir);
  });

  document.querySelector('.boton-compartir').addEventListener('click', abrirCompartir);

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
      case 'compartir': abrirCompartir(); break;
      default: break;
    }
  }

  document.addEventListener('keydown', (evento) => {
    if (evento.ctrlKey || evento.metaKey || evento.altKey) return;
    if (evento.target.closest && evento.target.closest('input, textarea, select')) return;
    const tecla = evento.key.toLowerCase();
    if (!menuCompartir.hidden) {
      const opciones = { 1: 'enlace', 2: 'nativo', 3: 'copiar-imagen', 4: 'descargar', 0: 'cerrar', escape: 'cerrar', c: 'cerrar' };
      if (opciones[tecla] && !(tecla === '2' && !navigator.share)) { evento.preventDefault(); compartir(opciones[tecla]); }
      return;
    }
    if (comprobarKonami(tecla)) return;
    if (/^\d$/.test(tecla)) { evento.preventDefault(); digito(tecla); return; }
    const color = TECLAS_COLOR.indexOf(tecla);
    if (color !== -1) { accion(`color-${color}`); return; }
    const mapa = { arrowleft: 'anterior', arrowright: 'siguiente', i: 'indice', '?': 'revelar', m: 'sonido', c: 'compartir' };
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
      ...(DESTACADA ? [`<a href="${enlaceNoticia(DESTACADA)}">ÚLTIMA HORA: ${esc(DESTACADA.titular)}</a>`] : []),
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
