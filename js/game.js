// Constantes del juego
const BOARD_SIZE = 25;
const ELEMENTS = {
  FIRE: 'fire',
  EARTH: 'earth',
  AIR: 'air',
  WATER: 'water',
  ETHER: 'ether',
};

// Habilidades elementales
const ELEMENT_ABILITIES = {
  [ELEMENTS.FIRE]: {
    name: 'Ataque Ardiente',
    description: '+1 al poder de ataque',
    combat_bonus: 1,
  },
  [ELEMENTS.WATER]: {
    name: 'Fluidez',
    description: 'Movimiento diagonal adicional',
    extra_movement: true,
  },
  [ELEMENTS.EARTH]: {
    name: 'Escudo Térreo',
    description: '-1 al daño recibido',
    defense_bonus: 1,
  },
  [ELEMENTS.AIR]: {
    name: 'Salto Aéreo',
    description: 'Puede saltar sobre un territorio (2 casillas)',
    jump_movement: true,
  },
  [ELEMENTS.ETHER]: {
    name: 'Manifestación',
    description: 'Crear soldado extra cada 3 turnos',
    special_recruit: true,
  },
};

// Mejoras para cofradías
const COLONY_UPGRADES = {
  WALLS: {
    name: 'Murallas',
    description: '+2 a la defensa de la cofradía',
    cost: 3,
    defense_bonus: 2,
    icon: '🧱'
  },
  BARRACKS: {
    name: 'Cuartel',
    description: 'Crear soldados cuesta -1 de energía',
    cost: 4,
    recruitment_discount: 1,
    icon: '⚔️'
  },
  WATCHTOWER: {
    name: 'Torre de vigilancia',
    description: 'Revela movimientos enemigos en un radio de 2 casillas',
    cost: 3,
    vision_range: 2,
    icon: '🗼'
  },
  ALTAR: {
    name: 'Altar elemental',
    description: 'Multiplica por 2 el beneficio del elemento',
    cost: 5,
    element_multiplier: 2,
    icon: '🔮'
  }
};

const INITIAL_ENERGY = 3;
const SOLDIER_COST = 2;
const INITIAL_SOLDIERS = 2;
const COLONY_CAPTURE_THRESHOLD = 4; // Soldados necesarios para conquistar una cofradía
const COLONY_COST = 4; // Energia necesaria para crear una cofradía

// Variables globales
let gameMode = 'ai'; // Por defecto, jugar contra la IA
let currentEvent = null; // Evento aleatorio actual
let eventTurnsRemaining = 0; // Turnos restantes del evento actual
let nextEventTurn = 5; // Turno para el próximo evento

// Define eventos aleatorios
const RANDOM_EVENTS = {
  ELEMENTAL_STORM: {
    name: 'Tormenta Elemental',
    description: 'Algunos territorios cambian de elemento',
    duration: 1, // Un solo turno
    apply: function() {
      // Cambiar el elemento de 3-5 territorios aleatorios
      const numChanges = 3 + Math.floor(Math.random() * 3);
      const elements = Object.values(ELEMENTS);

      for (let i = 0; i < numChanges; i++) {
        const randomIndex = Math.floor(Math.random() * BOARD_SIZE);
        const cell = gameState.board[randomIndex];
        const oldElement = cell.element;

        // Asignar un nuevo elemento aleatorio diferente al actual
        let newElement = oldElement;
        while (newElement === oldElement) {
          newElement = elements[Math.floor(Math.random() * elements.length)];
        }

        cell.element = newElement;
        updateCellAppearance(randomIndex);

        console.log(`Evento: Celda ${randomIndex} cambió de ${oldElement} a ${newElement}`);
      }

      logEvent(`¡Tormenta Elemental! ${numChanges} territorios han cambiado su elemento`, 'event');
    }
  },
  REINFORCEMENTS: {
    name: 'Refuerzos Inesperados',
    description: 'Aparecen soldados adicionales en territorios aleatorios',
    duration: 1,
    apply: function() {
      // Generar soldados en 1-2 territorios aleatorios para cada jugador
      const players = [1, 2];

      players.forEach(player => {
        // Obtener todos los territorios del jugador con soldados
        const playerTerritories = [];
        gameState.board.forEach((cell, index) => {
          if (cell.owner === player && cell.soldiers > 0) {
            playerTerritories.push(index);
          }
        });

        if (playerTerritories.length > 0) {
          // Determinar cuántos territorios reciben refuerzos
          const numTerritories = Math.min(
            1 + Math.floor(Math.random() * 2),
            playerTerritories.length
          );

          // Mezclar los territorios y seleccionar algunos
          shuffleArray(playerTerritories);
          const selectedTerritories = playerTerritories.slice(0, numTerritories);

          // Añadir soldados a los territorios seleccionados
          selectedTerritories.forEach(index => {
            const reinforcements = 1 + Math.floor(Math.random() * 2); // 1-2 soldados
            gameState.board[index].soldiers += reinforcements;

            console.log(`Evento: Jugador ${player} recibe ${reinforcements} soldados en celda ${index}`);
            updateCellAppearance(index);
          });

          logEvent(`¡Refuerzos para Jugador ${player}! ${numTerritories} territorios reciben soldados adicionales`, 'event');
        }
      });

      // Recalcular los totales de soldados
      recalculateTotalSoldiers();
    }
  },
  COSMIC_ENERGY: {
    name: 'Energía Cósmica',
    description: 'Todos los jugadores ganan energía extra',
    duration: 1,
    apply: function() {
      // Ambos jugadores reciben 2-4 de energía extra
      const players = [1, 2];

      players.forEach(player => {
        const energyBonus = 2 + Math.floor(Math.random() * 3); // 2-4 energía
        gameState.players[player].energy += energyBonus;

        console.log(`Evento: Jugador ${player} recibe ${energyBonus} de energía extra`);
      });

      logEvent('¡Energía Cósmica! Ambos jugadores reciben energía adicional', 'event');
      updateUI();
    }
  },
  DIMENSIONAL_PORTAL: {
    name: 'Portal Dimensional',
    description: 'Se crea un pasaje entre dos puntos del mapa',
    duration: 3, // Dura 3 turnos
    apply: function() {
      // Seleccionar dos puntos distantes del mapa
      let point1 = Math.floor(Math.random() * BOARD_SIZE);
      let point2 = Math.floor(Math.random() * BOARD_SIZE);

      // Asegurarse que los puntos estén separados
      while (calculateDistance(point1, point2) < 3) {
        point2 = Math.floor(Math.random() * BOARD_SIZE);
      }

      // Guardar los puntos del portal
      gameState.portalPoints = [point1, point2];

      // Marcar visualmente los portales
      const cell1 = document.querySelector(`[data-index="${point1}"]`);
      const cell2 = document.querySelector(`[data-index="${point2}"]`);

      if (cell1 && cell2) {
        cell1.classList.add('portal');
        cell2.classList.add('portal');

        // Añadir indicador visual
        const portal1 = document.createElement('div');
        portal1.className = 'portal-indicator';
        portal1.innerHTML = '🌀';
        cell1.appendChild(portal1);

        const portal2 = document.createElement('div');
        portal2.className = 'portal-indicator';
        portal2.innerHTML = '🌀';
        cell2.appendChild(portal2);
      }

      console.log(`Evento: Portal dimensional creado entre celdas ${point1} y ${point2}`);
      logEvent('¡Portal Dimensional! Ahora puedes viajar instantáneamente entre dos puntos del mapa', 'event');
    },
    end: function() {
      // Eliminar el portal cuando termina el evento
      if (gameState.portalPoints) {
        const [point1, point2] = gameState.portalPoints;

        // Eliminar marcas visuales
        const cell1 = document.querySelector(`[data-index="${point1}"]`);
        const cell2 = document.querySelector(`[data-index="${point2}"]`);

        if (cell1 && cell2) {
          cell1.classList.remove('portal');
          cell2.classList.remove('portal');

          // Quitar indicadores visuales
          const portal1 = cell1.querySelector('.portal-indicator');
          const portal2 = cell2.querySelector('.portal-indicator');

          if (portal1) portal1.remove();
          if (portal2) portal2.remove();
        }

        // Eliminar la referencia
        gameState.portalPoints = null;
      }

      logEvent('El Portal Dimensional se ha cerrado', 'event');
    }
  }
};

// Función auxiliar para mezclar un array (algoritmo de Fisher-Yates)
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// Aplicar evento aleatorio
function triggerRandomEvent() {
  // Si ya hay un evento activo, no generar uno nuevo
  if (currentEvent && eventTurnsRemaining > 0) {
    return;
  }

  // Seleccionar un evento aleatorio
  const eventKeys = Object.keys(RANDOM_EVENTS);
  const randomEventKey = eventKeys[Math.floor(Math.random() * eventKeys.length)];
  const event = RANDOM_EVENTS[randomEventKey];

  console.log(`Desencadenando evento aleatorio: ${event.name}`);

  // Establecer el evento actual y su duración
  currentEvent = randomEventKey;
  eventTurnsRemaining = event.duration;

  // Mostrar notificación del evento
  showEventNotification(event.name, event.description);

  // Aplicar efectos del evento
  event.apply();
}

// Mostrar notificación del evento
function showEventNotification(name, description) {
  // Crear elemento de notificación
  const notification = document.createElement('div');
  notification.className = 'event-notification';
  notification.innerHTML = `
    <h3>${name}</h3>
    <p>${description}</p>
    <button onclick="this.parentNode.remove()">OK</button>
  `;

  // Añadir a la interfaz
  document.body.appendChild(notification);

  // Reproducir sonido de evento (si está disponible)
  const eventSound = document.getElementById('eventSound');
  if (eventSound) {
    eventSound.play().catch(e => console.log('Error al reproducir sonido:', e));
  }

  // Eliminar automáticamente después de unos segundos
  setTimeout(() => {
    if (notification.parentNode) {
      notification.classList.add('fade-out');
      setTimeout(() => {
        if (notification.parentNode) {
          notification.remove();
        }
      }, 1000);
    }
  }, 5000);
}

// Manejar evento de portal dimensional
function handlePortalTravel(from, to) {
  // Verificar si hay un portal activo y si las celdas están en portales
  if (!gameState.portalPoints || !gameState.portalPoints.includes(from)) {
    return false;
  }

  // Determinar el destino del portal
  const [point1, point2] = gameState.portalPoints;
  const destination = from === point1 ? point2 : point1;

  // Verificar si el destino es el mismo que el seleccionado
  if (destination !== to) {
    return false;
  }

  console.log(`Viaje por portal: ${from} -> ${to}`);
  logEvent('¡Unidades viajan a través del Portal Dimensional!', 'event');

  return true;
}

// Inicialización del juego
function initGame() {
  console.log('Inicializando juego...');

  // Reiniciar variables globales
  currentEvent = null;
  eventTurnsRemaining = 0;
  nextEventTurn = 5 + Math.floor(Math.random() * 6); // Evento entre turnos 5-10

  // Reiniciar estado del juego
  gameState = {
    currentPlayer: 1,
    gameMode: gameMode,
    turn: 1,
    players: {
      1: {
        energy: INITIAL_ENERGY,
        soldiers: INITIAL_SOLDIERS,
        colonies: [],
        isAI: false,
        elementalCharges: {},
        lastSpecialRecruitTurn: 0,
      },
      2: {
        energy: INITIAL_ENERGY,
        soldiers: INITIAL_SOLDIERS,
        colonies: [],
        isAI: gameMode === 'ai',
        elementalCharges: {},
        lastSpecialRecruitTurn: 0,
      },
    },
    board: [],
    selectedCell: null,
    phase: 'SELECT',
    actions: {
      movesLeft: 1,
      canCreateSoldier: true,
    },
    eventLog: [],
    portalPoints: null,
  };

  createBoard();
  initializeBoardElements();
  placeInitialColonies();
  createEventLogContainer();

  // No llamar a generateEnergy() aquí para evitar energía extra al inicio

  updateUI();
  updateActionButtons();

  console.log('Juego inicializado con éxito');
}

// Crear el contenedor para el log de eventos
function createEventLogContainer() {
  // Verificar si ya existe
  let logContainer = document.getElementById('eventLog');

  if (!logContainer) {
    logContainer = document.createElement('div');
    logContainer.id = 'eventLog';
    logContainer.className = 'event-log';

    // Título del log
    const title = document.createElement('h3');
    title.textContent = 'Registro de Eventos';
    logContainer.appendChild(title);

    // Añadir al contenedor del juego
    const gameContainer = document.querySelector('.game-container');
    if (gameContainer) {
      gameContainer.appendChild(logContainer);
    } else {
      document.body.appendChild(logContainer);
    }
  }
}

// Crear el tablero
function createBoard() {
  const gameBoard = document.getElementById('gameBoard');
  gameBoard.innerHTML = ''; // Limpiar el tablero existente

  for (let i = 0; i < BOARD_SIZE; i++) {
    const cell = document.createElement('div');
    cell.className = 'cell';
    cell.dataset.index = i;
    cell.addEventListener('click', () => handleCellClick(i));
    gameBoard.appendChild(cell);

    // Inicializar estado de la celda
    gameState.board[i] = {
      element: null,
      owner: null,
      soldiers: 0,
      isColony: false,
    };
  }
  console.log('Tablero creado con ' + BOARD_SIZE + ' celdas');
}

// Inicializar elementos en el tablero
function initializeBoardElements() {
  const elements = Object.values(ELEMENTS);
  gameState.board.forEach((cell, index) => {
    const randomElement = elements[Math.floor(Math.random() * elements.length)];
    cell.element = randomElement;
    updateCellAppearance(index);
  });
}

// Colocar colonias iniciales
function placeInitialColonies() {
  console.log('Colocando colonias iniciales...');

  // Colonia del jugador 1 (arriba)
  const player1Colony = Math.floor(Math.random() * 5);
  placeColony(player1Colony, 1);
  console.log('Colonia Jugador 1 colocada en: ' + player1Colony);

  // Colonia del jugador 2 (abajo)
  const player2Colony = BOARD_SIZE - 5 + Math.floor(Math.random() * 5);
  placeColony(player2Colony, 2);
  console.log('Colonia Jugador 2 colocada en: ' + player2Colony);

  // Recalcular el número total de soldados para cada jugador
  recalculateTotalSoldiers();
}

// Colocar una colonia
function placeColony(index, player) {
  console.log(
    'Colocando colonia para jugador ' + player + ' en celda ' + index,
  );

  const cell = gameState.board[index];
  cell.owner = player;
  cell.isColony = true;
  cell.soldiers = INITIAL_SOLDIERS;
  gameState.players[player].colonies.push(index);

  // Asegurarnos de que la celda se actualice visualmente
  const domCell = document.querySelector(`[data-index="${index}"]`);
  if (domCell) {
    domCell.innerHTML = `
      🏰
      <span class="soldier-count">${INITIAL_SOLDIERS}</span>
    `;
    domCell.classList.add(`player${player}`);
    console.log('Celda de colonia actualizada visualmente');
  } else {
    console.error('Error: No se encontró la celda DOM para la colonia');
  }

  updateCellAppearance(index);
}

// Actualizar botones de acción
function updateActionButtons() {
  // Eliminar botones anteriores si existen
  const oldActionsDiv = document.getElementById('playerActions');
  if (oldActionsDiv) {
    oldActionsDiv.remove();
  }

  // Seleccionar el panel del jugador actual
  const currentPlayerPanel = document.querySelector(
    `.player-panel:nth-child(${gameState.currentPlayer})`,
  );

  if (currentPlayerPanel) {
    const actionsHTML = `
      <div id="playerActions" class="actions">
        <button onclick="createSoldier()" id="createSoldierBtn">Crear Soldado (${SOLDIER_COST}⚡)</button>
        <button onclick="startColonyCreation()" id="createColonyBtn">Crear Cofradía (${COLONY_COST}⚡)</button>
        <button onclick="startColonyUpgrade()" id="upgradeColonyBtn">Mejorar Cofradía</button>
      </div>
    `;
    currentPlayerPanel.insertAdjacentHTML('beforeend', actionsHTML);

    const createSoldierBtn = document.getElementById('createSoldierBtn');
    if (createSoldierBtn) {
      createSoldierBtn.disabled = !canCreateSoldier();
    }

    const createColonyBtn = document.getElementById('createColonyBtn');
    if (createColonyBtn) {
      createColonyBtn.disabled = !canCreateColony();
    }

    const upgradeColonyBtn = document.getElementById('upgradeColonyBtn');
    if (upgradeColonyBtn) {
      upgradeColonyBtn.disabled = !canUpgradeColony();
    }
  }
}

// Verificar si se puede crear un soldado
function canCreateSoldier() {
  const player = gameState.players[gameState.currentPlayer];
  return (
    player.energy >= SOLDIER_COST &&
    player.colonies.length > 0 &&
    gameState.actions.canCreateSoldier
  );
}

// Verificar si se puede crear una cofradía
function canCreateColony() {
  const player = gameState.players[gameState.currentPlayer];
  // Comprobar si el jugador tiene suficiente energía y al menos un territorio controlado con soldados
  return (
    player.energy >= COLONY_COST &&
    gameState.phase === 'SELECT' &&
    gameState.actions.canCreateSoldier // Usar el mismo indicador que para crear soldados (1 acción por turno)
  );
}

// Crear un soldado
function createSoldier() {
  if (!canCreateSoldier()) {
    console.log('No se puede crear soldado');
    return;
  }

  const player = gameState.players[gameState.currentPlayer];
  console.log('Creando soldado para jugador:', gameState.currentPlayer);

  // Verificar si el jugador tiene al menos una colonia
  if (player.colonies.length === 0) {
    alert('¡No tienes colonias para crear soldados!');
    return;
  }

  // Si solo hay una colonia, crear soldado allí automáticamente
  if (player.colonies.length === 1) {
    createSoldierInColony(player.colonies[0]);
    return;
  }

  // Si hay más de una colonia, activar el modo de selección de cofradía
  gameState.phase = 'COLONY_SELECTION';

  // Mostrar mensaje de instrucciones
  const messageDiv = document.createElement('div');
  messageDiv.id = 'colonySelectionMessage';
  messageDiv.className = 'game-message';
  messageDiv.innerHTML = 'Selecciona una cofradía para crear el soldado <button id="cancelColonySelection">Cancelar</button>';
  document.querySelector('.game-container').appendChild(messageDiv);

  // Agregar evento al botón de cancelar
  document.getElementById('cancelColonySelection').addEventListener('click', () => {
    cancelColonySelection();
  });

  // Resaltar todas las colonias del jugador
  highlightPlayerColonies();
}

// Función para crear soldado en una colonia específica
function createSoldierInColony(colonyIndex) {
  const player = gameState.players[gameState.currentPlayer];

  // Restar energía
  player.energy -= SOLDIER_COST;

  // Incrementar soldados en la colonia
  gameState.board[colonyIndex].soldiers += 1;
  console.log(
    'Nuevos soldados en colonia:',
    gameState.board[colonyIndex].soldiers,
  );

  // Actualizar el contador total de soldados
  recalculateTotalSoldiers();

  // Actualizar explícitamente la celda en el DOM
  updateCellDOM(colonyIndex);

  // Actualizar la interfaz
  updateUI();

  // Deshabilitar la creación de más soldados este turno
  gameState.actions.canCreateSoldier = false;

  // Ocultar la interfaz de selección si estaba abierta
  const selectionInterface = document.getElementById('colonySelectionInterface');
  if (selectionInterface) {
    selectionInterface.remove();
  }

  // Eliminar resaltados de colonias y mensajes si existen
  clearColonyHighlights();
  const messageDiv = document.getElementById('colonySelectionMessage');
  if (messageDiv) {
    messageDiv.remove();
  }

  // Terminar el turno automáticamente después de un breve retraso
  setTimeout(() => {
    console.log('Terminando turno después de crear soldado');
    endTurn(gameState.currentPlayer);
  }, 100);
}

// Función para actualizar directamente el DOM de una celda
function updateCellDOM(index) {
  const cell = gameState.board[index];
  const domCell = document.querySelector(`[data-index="${index}"]`);

  if (!domCell) {
    console.error('No se encontró la celda en el DOM:', index);
    return;
  }

  // Asegurarse de que la celda tenga la clase correcta del jugador
  domCell.className = 'cell';
  domCell.classList.add(`element-${cell.element}`);

  // Añadir tooltip con información sobre el elemento
  const elementAbility = ELEMENT_ABILITIES[cell.element];
  const tooltipHTML = `
    <div class="tooltip">
      <strong>${getElementName(cell.element)}</strong>: ${elementAbility.description}
    </div>
  `;

  // Si una unidad está utilizando activamente la habilidad elemental, marcarla
  if (cell.isUsingElementalAbility) {
    domCell.setAttribute('data-using-elemental-ability', 'true');
  } else {
    domCell.removeAttribute('data-using-elemental-ability');
  }

  // Obtener el símbolo del elemento para mostrarlo en todas las celdas
  const elementSymbol = getElementSymbol(cell.element);
  let elementTitle = `${elementAbility.name}: ${elementAbility.description}`;

  // Si está usando activamente la habilidad, destacarlo en el tooltip
  if (cell.isUsingElementalAbility) {
    elementTitle = `¡${elementAbility.name} ACTIVO! ${elementAbility.description}`;
  }

  const elementIndicator = `<span class="element-symbol ${cell.isUsingElementalAbility ? 'active' : ''}" title="${elementTitle}">${elementSymbol}</span>`;

  if (cell.owner) {
    domCell.classList.add(`player${cell.owner}`);

    if (cell.soldiers > 0) {
      // Determinar el símbolo base
      const symbol = cell.isColony ? '🏰' : '⚔️';

      // Crear el contenido HTML de la celda
      let cellContent = `
        ${tooltipHTML}
        ${elementIndicator}
        ${symbol}
        <span class="soldier-count">${cell.soldiers}</span>
      `;

      // Añadir indicador de veteranía si corresponde
      if (cell.veterancy && cell.veterancy > 0) {
        const stars = '★'.repeat(cell.veterancy);
        cellContent += `<span class="veteran-indicator" title="Nivel ${cell.veterancy}: +${cell.veterancy} en combate">${stars}</span>`;
      }

      // Añadir indicadores de mejoras de cofradía
      if (cell.isColony && cell.upgrades) {
        let upgradeIcons = '';
        for (const upgradeKey in cell.upgrades) {
          if (cell.upgrades[upgradeKey]) {
            upgradeIcons += `<span class="upgrade-indicator" title="${COLONY_UPGRADES[upgradeKey].name}: ${COLONY_UPGRADES[upgradeKey].description}">${COLONY_UPGRADES[upgradeKey].icon}</span>`;
          }
        }
        if (upgradeIcons) {
          cellContent += `<div class="upgrades-container">${upgradeIcons}</div>`;
        }
      }

      domCell.innerHTML = cellContent;
    } else {
      domCell.innerHTML = `${tooltipHTML}${elementIndicator}${cell.isColony ? '🏰' : ''}`;
    }
  } else {
    // Mostrar el valor de energía y el símbolo del elemento
    const energyValue = getElementEnergyValue(cell.element);

    // Añadir clase según valor de energía
    domCell.classList.add(`energy-${energyValue}`);

    domCell.innerHTML = `
      ${tooltipHTML}
      ${elementIndicator}
      <span class="energy-value">+${energyValue}⚡</span>
    `;
  }
}

// Manejar el clic en una celda
function handleCellClick(index) {
  const cell = gameState.board[index];
  console.log(
    `Clic en celda ${index}, propietario: ${cell.owner}, soldados: ${cell.soldiers}, es cofradía: ${cell.isColony}`,
  );

  // No permitir acciones si es el turno de la IA
  if (gameState.currentPlayer === 2 && gameState.players[2].isAI) {
    console.log('Es el turno de la IA, ignorando clic');
    return;
  }

  // Si estamos en modo de selección de cofradía para crear soldado
  if (gameState.phase === 'COLONY_SELECTION') {
    // Verificar si la celda es una colonia del jugador actual
    if (cell.owner === gameState.currentPlayer && cell.isColony) {
      createSoldierInColony(index);
      clearColonyHighlights();
      gameState.phase = 'SELECT';

      // Eliminar mensaje de selección
      const messageDiv = document.getElementById('colonySelectionMessage');
      if (messageDiv) {
        messageDiv.remove();
      }
    } else {
      console.log('Selecciona una de tus cofradías para crear el soldado');
    }
    return;
  }

  // Si estamos en modo de creación de cofradía
  if (gameState.phase === 'COLONY_CREATION') {
    // Verificar si es un territorio propio con soldados (no cofradía)
    if (cell.owner === gameState.currentPlayer && cell.soldiers > 0 && !cell.isColony) {
      createColonyAtLocation(index);
    } else {
      console.log('Selecciona un territorio propio con soldados para crear la cofradía');
    }
    return;
  }

  // Si estamos en modo de mejora de cofradía
  if (gameState.phase === 'UPGRADE_SELECTION') {
    // Verificar si la celda es una colonia del jugador actual
    if (cell.owner === gameState.currentPlayer && cell.isColony) {
      showUpgradeOptions(index);
    } else {
      console.log('Selecciona una de tus cofradías para mejorarla');
    }
    return;
  }

  if (gameState.selectedCell === null) {
    // Seleccionar una unidad propia
    if (cell.owner === gameState.currentPlayer && cell.soldiers > 0) {
      gameState.selectedCell = index;
      highlightCell(index);
      highlightValidMoves(index);
      console.log(`Celda ${index} seleccionada, mostrando movimientos válidos`);
    } else {
      console.log(
        'Celda no válida para selección: no es tuya o no tiene soldados',
      );
    }
  } else {
    // Mover o atacar
    if (isValidMove(gameState.selectedCell, index)) {
      console.log(`Moviendo de ${gameState.selectedCell} a ${index}`);
      moveUnits(gameState.selectedCell, index);
      // Terminar el turno automáticamente después de mover
      setTimeout(() => endTurn(gameState.currentPlayer), 100);
    } else {
      console.log('Movimiento no válido');
    }
    clearHighlights();
    gameState.selectedCell = null;
  }
}

// Resaltar movimientos válidos
function highlightValidMoves(index) {
  const cell = gameState.board[index];
  const row = Math.floor(index / 5);
  const col = index % 5;

  // Determinar el rango de movimiento basado en elementos
  let maxRange = 1; // Movimiento normal

  // Elemento de aire permite saltos de hasta 2 casillas
  if (cell.element === ELEMENTS.AIR) {
    maxRange = 2;
  }

  for (let i = 0; i < BOARD_SIZE; i++) {
    const targetRow = Math.floor(i / 5);
    const targetCol = i % 5;

    // Calcular la distancia Manhattan (horizontal + vertical)
    const distance = Math.abs(targetRow - row) + Math.abs(targetCol - col);

    // Verificar si el movimiento está dentro del rango permitido
    if (distance <= maxRange && i !== index) {
      const cellElement = document.querySelector(`[data-index="${i}"]`);
      if (cellElement) {
        cellElement.classList.add('valid-move');

        // Añadir clase especial para movimientos de salto aéreo
        if (distance === 2 && cell.element === ELEMENTS.AIR) {
          cellElement.classList.add('air-jump-move');
        }
      }
    }
  }
}

// Limpiar resaltados
function clearHighlights() {
  document.querySelectorAll('.cell').forEach((cell) => {
    cell.classList.remove('valid-move');
    cell.style.border = '';
  });
}

// Verificar si un movimiento es válido
function isValidMove(from, to) {
  if (gameState.actions.movesLeft <= 0) return false;

  // Comprobar movimiento a través de portal dimensional
  if (currentEvent === 'DIMENSIONAL_PORTAL' && gameState.portalPoints) {
    if (gameState.portalPoints.includes(from) && gameState.portalPoints.includes(to)) {
      return true; // Permitir viaje a través del portal
    }
  }

  const fromCell = gameState.board[from];
  const fromRow = Math.floor(from / 5);
  const fromCol = from % 5;
  const toRow = Math.floor(to / 5);
  const toCol = to % 5;

  // Calcular distancia Manhattan
  const distance = Math.abs(fromRow - toRow) + Math.abs(fromCol - toCol);

  // Movimiento normal (adyacente)
  if (distance <= 1 && from !== to) {
    return true;
  }

  // Movimiento especial para el elemento Aire (salto de 2 casillas)
  if (fromCell.element === ELEMENTS.AIR && distance === 2) {
    return true;
  }

  return false;
}

// Mover unidades con soporte para portales dimensionales
function moveUnits(from, to) {
  // Limpiar marcadores previos de uso de habilidad elemental
  clearElementalAbilityMarkers();

  const fromCell = gameState.board[from];
  const toCell = gameState.board[to];

  console.log(
    `Moviendo de celda ${from} (${fromCell.soldiers} soldados) a celda ${to} (${toCell.soldiers} soldados)`,
  );

  // Comprobar si es un viaje a través de portal dimensional
  const isPortalTravel = handlePortalTravel(from, to);
  if (isPortalTravel) {
    logEvent(`¡Soldados viajan a través del Portal Dimensional!`, 'ability');
  }

  // Comprobar si este es un movimiento especial (salto aéreo)
  const isAirJump = checkAirJumpMovement(from, to);
  if (isAirJump) {
    logEvent(`¡Soldados de ${fromCell.owner === 1 ? 'Jugador 1' : 'Jugador 2'} realizan un salto aéreo!`, 'ability');
  }

  if (toCell.owner !== gameState.currentPlayer) {
    // Combate
    console.log(
      `Combate: Atacante ${fromCell.soldiers} vs Defensor ${toCell.soldiers}`,
    );

    // Aplicar bonificaciones elementales para el combate
    let attackerBonus = getElementalCombatBonus(from);
    let defenderBonus = getElementalDefenseBonus(to);

    // Calcular fuerza de combate efectiva
    let effectiveAttackerStrength = fromCell.soldiers + attackerBonus;
    let effectiveDefenderStrength = toCell.soldiers + defenderBonus;

    // Añadir bonificaciones por mejoras de colonia
    if (toCell.isColony && toCell.upgrades && toCell.upgrades.WALLS) {
      effectiveDefenderStrength += COLONY_UPGRADES.WALLS.defense_bonus;
      console.log(`¡Las murallas de la colonia otorgan +${COLONY_UPGRADES.WALLS.defense_bonus} de defensa!`);
    }

    // Aplicar sistema de puntos según las reglas
    if (effectiveAttackerStrength > effectiveDefenderStrength) {
      // Victoria
      const oldOwner = toCell.owner;
      toCell.owner = gameState.currentPlayer;

      // Registrar el evento de conquista
      logEvent(`¡${gameState.currentPlayer === 1 ? 'Jugador 1' : 'Jugador 2'} conquista un territorio con ${fromCell.soldiers} soldados!`, 'conquest');

      // Generar energía por conquistar territorio (enemigo o neutral)
      generateEnergyFromConquest(to, oldOwner !== null);

      // Si es territorio neutral
      if (toCell.soldiers === 0) {
        toCell.soldiers = fromCell.soldiers;
      } else {
        // Sistema de puntos según las reglas, ahora considerando bonificaciones
        let survivingSoldiers = calculateSurvivingSoldiers(effectiveAttackerStrength, effectiveDefenderStrength);

        // Veteranía: los soldados que sobreviven combates ganan experiencia
        if (fromCell.veterancy) {
          if (!toCell.veterancy) toCell.veterancy = 0;
          toCell.veterancy = Math.min(3, fromCell.veterancy + 1); // Nivel máximo 3
          logEvent(`¡Soldados alcanzan nivel de veteranía ${toCell.veterancy}!`, 'veteran');
        } else {
          toCell.veterancy = 1; // Primer nivel de veteranía
        }

        toCell.soldiers = survivingSoldiers;
      }

      fromCell.soldiers = 0;
      fromCell.veterancy = 0; // Reiniciar veteranía en casilla de origen

      // Si es una colonia enemiga
      if (toCell.isColony) {
        const enemyPlayer = gameState.currentPlayer === 1 ? 2 : 1;
        const colonyIndex = gameState.players[enemyPlayer].colonies.indexOf(to);
        if (colonyIndex > -1) {
          gameState.players[enemyPlayer].colonies.splice(colonyIndex, 1);
          gameState.players[gameState.currentPlayer].colonies.push(to);
          console.log(`¡Colonia enemiga capturada en celda ${to}!`);
          logEvent(`¡${gameState.currentPlayer === 1 ? 'Jugador 1' : 'Jugador 2'} captura una cofradía enemiga!`, 'colony_capture');
        }
        checkVictory();
      }
    } else {
      // Derrota o empate
      // Calcular daño recibido, aplicando bonificación defensiva
      let damageToDefender = Math.max(0, effectiveAttackerStrength - defenderBonus);
      toCell.soldiers -= damageToDefender;

      // Si los defensores sobreviven, ganan veteranía
      if (toCell.soldiers > 0) {
        if (!toCell.veterancy) toCell.veterancy = 0;
        toCell.veterancy = Math.min(3, toCell.veterancy + 1);
        logEvent(`¡Defensores resisten el ataque y alcanzan nivel de veteranía ${toCell.veterancy}!`, 'veteran');
      }

      fromCell.soldiers = 0;
      fromCell.veterancy = 0; // Reiniciar veteranía en casilla de origen
    }
  } else {
    // Movimiento amistoso
    // Transferir soldados y conservar el nivel de veteranía más alto
    toCell.soldiers += fromCell.soldiers;

    // Gestionar veteranía al combinar unidades
    if (fromCell.veterancy || toCell.veterancy) {
      const maxVeterancy = Math.max(fromCell.veterancy || 0, toCell.veterancy || 0);
      if (maxVeterancy > 0) {
        toCell.veterancy = maxVeterancy;
      }
    }

    fromCell.soldiers = 0;
    fromCell.veterancy = 0; // Reiniciar veteranía en casilla de origen
  }

  // Recalcular el número total de soldados para cada jugador
  recalculateTotalSoldiers();

  // Actualizar las celdas en el DOM
  updateCellDOM(from);
  updateCellDOM(to);
  updateUI();

  // Verificar si el jugador se quedó sin soldados después del movimiento
  checkVictory();

  console.log(
    `Después del movimiento: Celda ${from} (${fromCell.soldiers} soldados), Celda ${to} (${toCell.soldiers} soldados)`,
  );
}

// Verificar si se puede hacer un salto aéreo (elemento Aire)
function checkAirJumpMovement(from, to) {
  const fromCell = gameState.board[from];
  const fromRow = Math.floor(from / 5);
  const fromCol = from % 5;
  const toRow = Math.floor(to / 5);
  const toCol = to % 5;

  // Verificar si el movimiento es un salto aéreo (distancia de 2 casillas)
  const distance = Math.abs(fromRow - toRow) + Math.abs(fromCol - toCol);

  // Si el elemento es aire y la distancia es exactamente 2, es un salto aéreo
  const isAirJump = fromCell.element === ELEMENTS.AIR && distance === 2;

  if (isAirJump) {
    // Marcar que está usando la habilidad elemental
    fromCell.isUsingElementalAbility = true;
  }

  return isAirJump;
}

// Calcular bonificación de combate basada en elemento
function getElementalCombatBonus(cellIndex) {
  const cell = gameState.board[cellIndex];
  let bonus = 0;

  // Bonificación de ataque para el fuego
  if (cell.element === ELEMENTS.FIRE) {
    bonus += ELEMENT_ABILITIES[ELEMENTS.FIRE].combat_bonus;
    // Marcar que está usando la habilidad elemental
    cell.isUsingElementalAbility = true;

    // Registrar el uso de la habilidad
    logEvent(`¡Unidad de Fuego usa Ataque Ardiente! +${ELEMENT_ABILITIES[ELEMENTS.FIRE].combat_bonus} al ataque`, 'ability');
  }

  // Bonificación por veteranía
  if (cell.veterancy) {
    bonus += cell.veterancy;
  }

  // Multiplicadores de mejoras de altar elemental
  if (cell.isColony && cell.upgrades && cell.upgrades.ALTAR && cell.element === ELEMENTS.FIRE) {
    bonus += ELEMENT_ABILITIES[ELEMENTS.FIRE].combat_bonus; // Doble bonificación
    logEvent(`¡Altar Elemental duplica el poder de Fuego! +${ELEMENT_ABILITIES[ELEMENTS.FIRE].combat_bonus} adicional`, 'upgrade');
  }

  return bonus;
}

// Calcular bonificación defensiva basada en elemento
function getElementalDefenseBonus(cellIndex) {
  const cell = gameState.board[cellIndex];
  let bonus = 0;

  // Bonificación defensiva para la tierra
  if (cell.element === ELEMENTS.EARTH) {
    bonus += ELEMENT_ABILITIES[ELEMENTS.EARTH].defense_bonus;
    // Marcar que está usando la habilidad elemental
    cell.isUsingElementalAbility = true;

    // Registrar el uso de la habilidad
    logEvent(`¡Unidad de Tierra usa Escudo Térreo! -${ELEMENT_ABILITIES[ELEMENTS.EARTH].defense_bonus} al daño recibido`, 'ability');
  }

  // Bonificación por veteranía
  if (cell.veterancy) {
    bonus += cell.veterancy;
  }

  // Bonificación por mejora de murallas
  if (cell.isColony && cell.upgrades && cell.upgrades.WALLS) {
    bonus += COLONY_UPGRADES.WALLS.defense_bonus;
    logEvent(`¡Las murallas de la cofradía brindan +${COLONY_UPGRADES.WALLS.defense_bonus} de defensa!`, 'upgrade');
  }

  // Multiplicadores de mejoras de altar elemental
  if (cell.isColony && cell.upgrades && cell.upgrades.ALTAR && cell.element === ELEMENTS.EARTH) {
    bonus += ELEMENT_ABILITIES[ELEMENTS.EARTH].defense_bonus; // Doble bonificación
    logEvent(`¡Altar Elemental duplica el poder de Tierra! +${ELEMENT_ABILITIES[ELEMENTS.EARTH].defense_bonus} adicional a la defensa`, 'upgrade');
  }

  return bonus;
}

// Calcular soldados supervivientes después de un combate
function calculateSurvivingSoldiers(attackerStrength, defenderStrength) {
  // Método básico basado en las reglas originales pero con consideración de fuerzas efectivas
  if (attackerStrength === 1 || attackerStrength === 2) {
    return 1; // 1-2 ⚔️: 1 soldado
  } else if (attackerStrength === 3) {
    return 2; // 3 ⚔️: 2 soldados
  } else if (attackerStrength >= 4) {
    return 3; // 4+ ⚔️: 3 soldados
  }
  return 0;
}

// Registrar eventos importantes en el juego
function logEvent(message, type) {
  const event = {
    turn: gameState.turn,
    message: message,
    type: type,
    timestamp: new Date().toLocaleTimeString()
  };

  gameState.eventLog.unshift(event); // Añadir al principio para que los más recientes estén primero

  // Mantener el registro a un tamaño manejable
  if (gameState.eventLog.length > 10) {
    gameState.eventLog.pop();
  }

  // Actualizar la UI si existe un elemento para el log de eventos
  updateEventLog();
}

// Actualizar el registro de eventos en la UI
function updateEventLog() {
  const logContainer = document.getElementById('eventLog');
  if (!logContainer) return;

  logContainer.innerHTML = '';

  gameState.eventLog.forEach(event => {
    const eventElement = document.createElement('div');
    eventElement.className = `event-entry event-${event.type}`;
    eventElement.innerHTML = `<span class="event-turn">Turno ${event.turn}</span> ${event.message}`;
    logContainer.appendChild(eventElement);
  });
}

// Actualizar la apariencia de una celda
function updateCellAppearance(index) {
  updateCellDOM(index);
}

// Verificar victoria
function checkVictory() {
  const player1 = gameState.players[1];
  const player2 = gameState.players[2];

  const player1Colonies = player1.colonies.length;
  const player2Colonies = player2.colonies.length;

  // Verificar si un jugador se quedó sin colonias (condición original)
  if (player1Colonies === 0) {
    alert('¡Jugador 2 ha ganado! (Jugador 1 se quedó sin colonias)');
    resetGame();
    return;
  } else if (player2Colonies === 0) {
    alert('¡Jugador 1 ha ganado! (Jugador 2 se quedó sin colonias)');
    resetGame();
    return;
  }

  // Nueva condición: verificar si un jugador se quedó sin soldados
  const player1Soldiers = player1.soldiers;
  const player2Soldiers = player2.soldiers;

  if (player1Soldiers === 0 && player1.energy < SOLDIER_COST) {
    alert('¡Jugador 2 ha ganado! (Jugador 1 se quedó sin soldados y sin energía suficiente para crear más)');
    resetGame();
    return;
  } else if (player2Soldiers === 0 && player2.energy < SOLDIER_COST) {
    alert('¡Jugador 1 ha ganado! (Jugador 2 se quedó sin soldados y sin energía suficiente para crear más)');
    resetGame();
    return;
  }
}

// Reiniciar juego
function resetGame() {
  initGame();
}

// Obtener valor de energía para un elemento
function getElementEnergyValue(element) {
  const values = {
    [ELEMENTS.FIRE]: 2, // 1 base + 1 adicional
    [ELEMENTS.WATER]: 2, // 1 base + 1 adicional
    [ELEMENTS.ETHER]: 2, // 1 base + 1 adicional
    [ELEMENTS.EARTH]: 1, // 1 base
    [ELEMENTS.AIR]: 1,   // 1 base
  };
  return values[element] || 1;
}

// Obtener símbolo para un elemento
function getElementSymbol(element) {
  const symbols = {
    [ELEMENTS.FIRE]: '🔥',
    [ELEMENTS.EARTH]: '🪨',  // Cambiado de 🌍 a 🪨 (roca)
    [ELEMENTS.AIR]: '💨',
    [ELEMENTS.WATER]: '💧',
    [ELEMENTS.ETHER]: '✨',
  };
  return symbols[element] || '';
}

// Resaltar celda seleccionada
function highlightCell(index) {
  const cell = document.querySelector(`[data-index="${index}"]`);
  if (cell) {
    cell.style.border = '3px solid yellow';
  }
}

// Terminar turno
function endTurn(player) {
  if (player === gameState.currentPlayer) {
    console.log(`Terminando turno del jugador ${player}`);

    // Incrementar contador de turnos
    gameState.turn++;
    console.log(`Turno ${gameState.turn}`);

    // Verificar victoria antes de cambiar de jugador
    checkVictory();

    // Gestionar eventos aleatorios
    if (currentEvent && eventTurnsRemaining > 0) {
      // Decrementar duración del evento actual
      eventTurnsRemaining--;
      console.log(`Evento "${RANDOM_EVENTS[currentEvent].name}" continúa. Turnos restantes: ${eventTurnsRemaining}`);

      // Si el evento ha terminado, ejecutar su función de finalización
      if (eventTurnsRemaining === 0) {
        if (RANDOM_EVENTS[currentEvent].end) {
          RANDOM_EVENTS[currentEvent].end();
        }
        currentEvent = null;
        console.log('El evento ha terminado');
      }
    } else if (gameState.turn >= nextEventTurn) {
      // Tiempo para un nuevo evento
      triggerRandomEvent();

      // Establecer el próximo turno para un evento (5-10 turnos después)
      nextEventTurn = gameState.turn + 5 + Math.floor(Math.random() * 6);
      console.log(`Próximo evento programado para el turno ${nextEventTurn}`);
    }

    // Manejar habilidad especial del éter (crear soldado cada 3 turnos)
    handleEtherAbility();

    // Si el juego continúa, cambiar al siguiente jugador
    const nextPlayer = player === 1 ? 2 : 1;
    gameState.currentPlayer = nextPlayer;

    resetTurnState();
    updateUI();
    updateActionButtons();

    if (gameState.gameMode === 'ai' && gameState.currentPlayer === 2) {
      console.log('Iniciando turno de la IA');
      setTimeout(aiTurn, 1000);
    }
  }
}

// Resetear estado del turno
function resetTurnState() {
  gameState.actions = {
    movesLeft: 1,
    canCreateSoldier: true,
  };
  gameState.selectedCell = null;
  clearHighlights();
}

// Generar energía
function generateEnergy(player) {
  const playerState = gameState.players[player];

  // Energía base por turno (más baja que antes para balancear)
  playerState.energy += 1;
  console.log(`Jugador ${player} recibe 1 de energía base`);

  // Contador para seguimiento
  let bonusEnergy = 0;

  // Energía por territorios según su elemento
  gameState.board.forEach((cell, index) => {
    if (cell.owner === player) {
      // Bonus por elemento
      switch(cell.element) {
        case ELEMENTS.FIRE:
          playerState.energy += 1; // El fuego genera más energía
          bonusEnergy += 1;
          console.log(`Celda ${index} (Fuego) genera +1 de energía`);
          break;
        case ELEMENTS.WATER:
          if (cell.isColony) {
            playerState.energy += 1; // El agua genera energía en colonias
            bonusEnergy += 1;
            console.log(`Colonia ${index} (Agua) genera +1 de energía`);
          }
          break;
        case ELEMENTS.ETHER:
          if (cell.soldiers > 2) {
            playerState.energy += 2; // El éter genera más energía con grandes ejércitos
            bonusEnergy += 2;
            console.log(`Celda ${index} (Éter) con ${cell.soldiers} soldados genera +2 de energía`);
          }
          break;
      }
    }
  });

  console.log(`Jugador ${player} generó ${bonusEnergy} de energía adicional y ahora tiene ${playerState.energy} en total`);
}

// Actualizar interfaz
function updateUI() {
  document.getElementById('player1Energy').textContent =
    gameState.players[1].energy;
  document.getElementById('player1Soldiers').textContent =
    gameState.players[1].soldiers;
  document.getElementById('player2Energy').textContent =
    gameState.players[2].energy;
  document.getElementById('player2Soldiers').textContent =
    gameState.players[2].soldiers;
}

// Función para iniciar el juego desde la pantalla de inicio
function startGame() {
  document.getElementById('startScreen').style.display = 'none';
  document.getElementById('gameContainer').style.display = 'block';
  initGame();
}

// Iniciar el juego cuando se carga la página
window.addEventListener('load', initGame);

// Función para el turno de la IA
function aiTurn() {
  if (!gameState.players[2].isAI || gameState.currentPlayer !== 2) return;

  console.log('Ejecutando turno de la IA');

  setTimeout(() => {
    const player2 = gameState.players[2];
    const player1 = gameState.players[1];

    // Análisis estratégico avanzado del estado del juego
    const totalPlayer1Soldiers = player1.soldiers;
    const totalPlayer2Soldiers = player2.soldiers;
    const soldierDifference = totalPlayer2Soldiers - totalPlayer1Soldiers;

    // Comparativa de colonias
    const player1Colonies = player1.colonies.length;
    const player2Colonies = player2.colonies.length;

    // Análisis de amenazas
    let immediateThreats = 0;
    player2.colonies.forEach(colonyIndex => {
      player1.colonies.forEach(enemyColonyIndex => {
        if (calculateDistance(colonyIndex, enemyColonyIndex) <= 2) {
          immediateThreats++;
        }
      });
    });

    // Evaluación de terreno controlado
    let valuableTerritoryCount = 0;
    let highValueTerrainNearby = 0;
    gameState.board.forEach((cell, index) => {
      if (cell.owner === 2) {
        // Valorar terrenos con alto valor energético
        if (getElementEnergyValue(cell.element) >= 2) {
          valuableTerritoryCount++;
        }
      } else if (cell.owner === null) {
        // Detectar terrenos valiosos no conquistados cerca de las colonias
        player2.colonies.forEach(colonyIndex => {
          if (calculateDistance(colonyIndex, index) <= 2 && getElementEnergyValue(cell.element) >= 2) {
            highValueTerrainNearby++;
          }
        });
      }
    });

    // Determinar fase del juego
    let gamePhase = "early";
    if (player1Colonies + player2Colonies >= 6) {
      gamePhase = "mid";
    }
    if (player1Colonies + player2Colonies >= 10 || player1.soldiers + player2.soldiers >= 20) {
      gamePhase = "late";
    }

    console.log(`IA - Fase del juego: ${gamePhase}`);
    console.log(`IA - Amenazas inmediatas: ${immediateThreats}`);
    console.log(`IA - Ventaja en soldados: ${soldierDifference}`);
    console.log(`IA - Colonias: ${player2Colonies} vs ${player1Colonies} del jugador`);

    // Determinar si estamos en desventaja crítica
    const isCriticalDisadvantage = soldierDifference < -3 && player2Colonies <= player1Colonies;

    // Determinar si hay oportunidad de expansión segura
    const isExpansionSafe = highValueTerrainNearby > 0 && immediateThreats === 0;

    // Determinar si hay exceso de energía acumulada
    const hasExcessEnergy = player2.energy >= SOLDIER_COST * 2;

    // Verificar si deberíamos crear una cofradía
    const shouldCreateColony = player2.energy >= COLONY_COST && (
      // Crear más cofradías en fase temprana para expandirse
      (gamePhase === "early" && player2Colonies < 3) ||
      // En fase media, crear cofradías si tenemos ventaja y poca presión
      (gamePhase === "mid" && !isCriticalDisadvantage && immediateThreats === 0 && player2Colonies < player1Colonies + 1) ||
      // En fase tardía, crear cofradías en posiciones estratégicas si tenemos mucha energía
      (gamePhase === "late" && player2.energy >= COLONY_COST * 1.5 && player2Colonies < 4)
    );

    // Si debemos crear una cofradía, buscar la mejor ubicación
    if (shouldCreateColony && canCreateColony()) {
      console.log("IA decide crear una nueva cofradía");

      let bestColonyLocation = -1;
      let bestColonyScore = -Infinity;

      // Evaluar cada territorio propio como posible ubicación para una cofradía
      gameState.board.forEach((cell, index) => {
        if (cell.owner === 2 && cell.soldiers > 0 && !cell.isColony) {
          let locationScore = 0;

          // 1. Valorar por elemento (preferir elementos que generen más energía)
          const energyValue = getElementEnergyValue(cell.element);
          locationScore += energyValue * 40;

          // 2. Valorar por distancia a colonias enemigas (preferir ubicaciones seguras)
          let minDistanceToEnemyColony = Infinity;
          player1.colonies.forEach(enemyColonyIndex => {
            const distance = calculateDistance(index, enemyColonyIndex);
            minDistanceToEnemyColony = Math.min(minDistanceToEnemyColony, distance);
          });

          // En fase temprana, preferir ubicaciones lejos del enemigo
          if (gamePhase === "early") {
            locationScore += Math.min(minDistanceToEnemyColony * 20, 100);
          } else {
            // En fases más avanzadas, distancia óptima depende de la agresividad
            const optimalDistance = (soldierDifference > 0) ? 2 : 3; // Más cerca si somos más fuertes
            locationScore += (Math.abs(minDistanceToEnemyColony - optimalDistance) * -15); // Penalizar desviación
          }

          // 3. Valorar por número de soldados (preferir territorios con más soldados)
          locationScore += cell.soldiers * 10;

          // 4. Valorar por distancia a otras cofradías propias (cubrir más territorio)
          let minDistanceToOwnColony = Infinity;
          player2.colonies.forEach(ownColonyIndex => {
            const distance = calculateDistance(index, ownColonyIndex);
            minDistanceToOwnColony = Math.min(minDistanceToOwnColony, distance);
          });

          // Preferir una distancia óptima a nuestras propias colonias (ni muy cerca ni muy lejos)
          const optimalOwnDistance = 2;
          locationScore -= Math.abs(minDistanceToOwnColony - optimalOwnDistance) * 25;

          // 5. Valorar ubicación estratégica en el mapa
          const row = Math.floor(index / 5);
          const col = index % 5;

          // Centro del mapa es valioso estratégicamente
          const distanceToCenter = Math.abs(row - 2) + Math.abs(col - 2);
          if (distanceToCenter <= 1) {
            locationScore += 50;
          }

          console.log(`IA evaluando ubicación ${index} para cofradía: ${locationScore.toFixed(1)} puntos (elemento: ${cell.element}, soldados: ${cell.soldiers})`);

          if (locationScore > bestColonyScore) {
            bestColonyScore = locationScore;
            bestColonyLocation = index;
          }
        }
      });

      if (bestColonyLocation !== -1) {
        console.log(`IA creará cofradía en ubicación ${bestColonyLocation} (puntuación: ${bestColonyScore})`);
        createColonyAtLocation(bestColonyLocation);
        return;
      }
    }

    // Decisiones sobre creación de soldados
    let shouldCreateSoldier = false;

    // Lógica de creación de soldados según fase del juego
    if (gamePhase === "early") {
      // Fase temprana: priorizar expansión y economía
      shouldCreateSoldier = player2.energy >= SOLDIER_COST && (
        player2.soldiers < 5 ||
        hasExcessEnergy ||
        isExpansionSafe
      );
    } else if (gamePhase === "mid") {
      // Fase media: balancear expansión y ataque
      shouldCreateSoldier = player2.energy >= SOLDIER_COST && (
        isCriticalDisadvantage ||
        (player2.soldiers < player1.soldiers + 2) ||
        hasExcessEnergy
      );
    } else {
      // Fase tardía: priorizar ataque y defender colonias
      shouldCreateSoldier = player2.energy >= SOLDIER_COST && (
        isCriticalDisadvantage ||
        immediateThreats > 0 ||
        player2.soldiers < 8
      );
    }

    console.log(`IA decide ${shouldCreateSoldier ? "crear soldado" : "mover unidades"} en fase ${gamePhase}`);

    // Verificar oportunidades de ataque de alto valor
    let criticalAttack = false;
    let bestAttackFrom = -1;
    let bestAttackTo = -1;
    let bestAttackScore = 0;

    // Buscar oportunidades de ataque críticas (como capturar última colonia enemiga)
    if (player1Colonies === 1 && !shouldCreateSoldier) {
      player2.colonies.forEach(colonyIndex => {
        const colony = gameState.board[colonyIndex];
        // Si tenemos suficientes soldados para un ataque decisivo
        if (colony.soldiers >= 4) {
          player1.colonies.forEach(enemyColonyIndex => {
            const enemyColony = gameState.board[enemyColonyIndex];
            const distance = calculateDistance(colonyIndex, enemyColonyIndex);
            // Si está a distancia de ataque y podemos ganar
            if (distance <= 1 && colony.soldiers > enemyColony.soldiers) {
              criticalAttack = true;
              bestAttackFrom = colonyIndex;
              bestAttackTo = enemyColonyIndex;
              bestAttackScore = 1000; // Prioridad máxima
              console.log(`IA: ¡Detectada oportunidad de victoria! Atacando última colonia enemiga`);
            }
          });
        }
      });
    }

    // Decidir acción basada en la estrategia
    if (canCreateSoldier() && shouldCreateSoldier && !criticalAttack) {
      // Estrategia avanzada para selección de colonias
      let bestColony = player2.colonies[0];
      let bestScore = -Infinity;

      player2.colonies.forEach(colonyIndex => {
        const colony = gameState.board[colonyIndex];
        let colonyScore = 0;

        // 1. Valor base por soldados actuales
        colonyScore += colony.soldiers * 2;

        // 2. Valor por elemento de la colonia
        const energyValue = getElementEnergyValue(colony.element);
        colonyScore += energyValue * 15;

        // 3. Factor estratégico según fase del juego
        if (gamePhase === "early") {
          // Priorizar colonias alejadas del enemigo para expansión
          let minDistanceToEnemy = Infinity;
          player1.colonies.forEach(enemyColonyIndex => {
            const distance = calculateDistance(colonyIndex, enemyColonyIndex);
            minDistanceToEnemy = Math.min(minDistanceToEnemy, distance);
          });
          // Preferir colonias que no estén demasiado cerca del enemigo al principio
          colonyScore += Math.min(minDistanceToEnemy * 10, 60);
        } else if (gamePhase === "mid") {
          // En fase media, valorar colonias en posición para expansión o ataque
          // Buscar territorios neutrales valiosos cercanos
          let nearbyValuableTerritories = 0;
          gameState.board.forEach((cell, index) => {
            if (cell.owner === null && calculateDistance(colonyIndex, index) <= 1) {
              nearbyValuableTerritories += getElementEnergyValue(cell.element);
            }
          });
          colonyScore += nearbyValuableTerritories * 20;
        } else {
          // En fase tardía, priorizar colonias cercanas al enemigo para ataque
          let offensiveValue = 0;
          player1.colonies.forEach(enemyColonyIndex => {
            const distance = calculateDistance(colonyIndex, enemyColonyIndex);
            if (distance <= 2) {
              offensiveValue += (3 - distance) * 30;
            }
          });
          colonyScore += offensiveValue;
        }

        // 4. Defensa de colonias bajo amenaza
        let underThreat = false;
        player1.colonies.forEach(enemyColonyIndex => {
          const enemyColony = gameState.board[enemyColonyIndex];
          const distance = calculateDistance(colonyIndex, enemyColonyIndex);
          if (distance <= 1 && enemyColony.soldiers >= colony.soldiers) {
            underThreat = true;
            // Amenaza directa: prioridad alta
            colonyScore += 100;
          } else if (distance <= 2 && enemyColony.soldiers > colony.soldiers) {
            // Amenaza cercana: prioridad media
            colonyScore += 50;
          }
        });

        // 5. Factores adicionales
        // Evitar crear demasiados soldados en una sola colonia (distribución)
        if (colony.soldiers > 4 && !underThreat) {
          colonyScore -= (colony.soldiers - 4) * 15;
        }

        // Bonus para colonias en terrenos valiosos
        if (colony.element === ELEMENTS.FIRE || colony.element === ELEMENTS.WATER) {
          colonyScore += 25;
        }

        // Bonus para colonias aisladas que necesitan defensa
        let isIsolated = true;
        player2.colonies.forEach(otherColonyIndex => {
          if (otherColonyIndex !== colonyIndex && calculateDistance(colonyIndex, otherColonyIndex) <= 2) {
            isIsolated = false;
          }
        });
        if (isIsolated) {
          colonyScore += 40;
        }

        console.log(`Colonia ${colonyIndex}: Puntuación ${colonyScore} (${colony.soldiers} soldados, elemento ${colony.element})`);

        // Actualizar la mejor colonia
        if (colonyScore > bestScore) {
          bestScore = colonyScore;
          bestColony = colonyIndex;
        }
      });

      console.log(`IA selecciona colonia ${bestColony} para crear soldado (puntuación: ${bestScore})`);
      createSoldierInColony(bestColony);
      return;
    }

    // Si hay un ataque crítico identificado, ejecutarlo con prioridad
    if (criticalAttack) {
      console.log(`¡IA ejecutando ataque crítico! De ${bestAttackFrom} a ${bestAttackTo}`);
      gameState.selectedCell = bestAttackFrom;
      highlightCell(bestAttackFrom);
      setTimeout(() => {
        moveUnits(bestAttackFrom, bestAttackTo);
        setTimeout(() => endTurn(2), 500);
      }, 500);
      return;
    }

    // Si llegamos aquí, calculamos el mejor movimiento normal
    const aiMove = calculateAIMove();
    if (aiMove) {
      console.log(`IA moviendo de ${aiMove.from} a ${aiMove.to} (puntuación: ${aiMove.score})`);
      executeAIMove(aiMove);
    } else {
      console.log('IA no puede mover, terminando turno');
      endTurn(2);
    }
  }, 1000);
}

// Calcular mejor movimiento para la IA
function calculateAIMove() {
  console.log('Calculando mejor movimiento para la IA');
  const possibleMoves = [];

  // Recolectar todas las casillas con unidades de la IA
  gameState.board.forEach((cell, index) => {
    if (cell.owner === 2 && cell.soldiers > 0) {
      // Buscar movimientos válidos para esta unidad
      for (let i = 0; i < BOARD_SIZE; i++) {
        if (isValidMove(index, i)) {
          const targetCell = gameState.board[i];
          let score = evaluateMove(index, i);
          possibleMoves.push({
            from: index,
            to: i,
            score: score,
            fromSoldiers: cell.soldiers,
            toOwner: targetCell.owner,
            toSoldiers: targetCell.soldiers
          });
        }
      }
    }
  });

  console.log(`IA encontró ${possibleMoves.length} movimientos posibles`);

  // Encontrar el mejor movimiento
  if (possibleMoves.length > 0) {
    possibleMoves.sort((a, b) => b.score - a.score);

    // Mostrar los 3 mejores movimientos considerados
    console.log("Mejores movimientos considerados:");
    for (let i = 0; i < Math.min(3, possibleMoves.length); i++) {
      const move = possibleMoves[i];
      let typeText = "Desconocido";

      if (move.toOwner === 1) {
        typeText = "ATAQUE";
      } else if (move.toOwner === null) {
        typeText = "CONQUISTA";
      } else {
        typeText = "REFUERZO";
      }

      console.log(`${i+1}. ${typeText}: ${move.from}(${move.fromSoldiers}) -> ${move.to}(${move.toSoldiers}) | Puntuación: ${move.score}`);
    }

    return possibleMoves[0];
  }

  return null;
}

// Evaluar la calidad de un movimiento
function evaluateMove(from, to) {
  const fromCell = gameState.board[from];
  const toCell = gameState.board[to];
  let score = 0;
  const player2 = gameState.players[2];
  const player1 = gameState.players[1];

  // Determinar fase del juego para ajustar estrategias
  let gamePhase = "early";
  if (player1.colonies.length + player2.colonies.length >= 6) {
    gamePhase = "mid";
  }
  if (player1.colonies.length + player2.colonies.length >= 10 || player1.soldiers + player2.soldiers >= 20) {
    gamePhase = "late";
  }

  // Análisis del estado actual de la IA
  const isCurrentlyStronger = player2.soldiers > player1.soldiers + 2;
  const hasMoreColonies = player2.colonies.length > player1.colonies.length;
  const hasEnoughEnergy = player2.energy >= SOLDIER_COST * 2;

  // Factor de agresividad basado en ventaja actual
  let aggressivenessFactor = 1.0;
  if (isCurrentlyStronger && hasMoreColonies) {
    aggressivenessFactor = 1.5; // Más agresivo cuando va ganando
  } else if (player2.soldiers < player1.soldiers - 2) {
    aggressivenessFactor = 0.7; // Más cauto cuando va perdiendo
  }

  // ANÁLISIS GENERAL DEL MOVIMIENTO

  // Evitar dejar una colonia sin defensa
  if (gameState.board[from].isColony && fromCell.soldiers === gameState.board[from].soldiers) {
    score -= 200; // Penalizar fuertemente
    console.log(`[IA] ⚠️ Evitar dejar colonia ${from} sin defensa: -200 puntos`);
  }

  // Evitar mover unidades individuales que pueden morir fácilmente
  if (fromCell.soldiers === 1 && toCell.owner === 1 && toCell.soldiers > 0) {
    score -= 120;
    console.log(`[IA] ⚠️ Evitar sacrificar una unidad solitaria: -120 puntos`);
  }

  // MOVIMIENTOS A TERRITORIO NEUTRAL
  if (toCell.owner === null) {
    // Valor base por expansión
    score += 50;

    // Valor por energía del territorio
    const energyValue = getElementEnergyValue(toCell.element);
    score += energyValue * 30;
    console.log(`[IA] Valor de expansión a territorio neutral (${energyValue}⚡): +${50 + energyValue * 30} puntos`);

    // Bonus para establecer nuevas colonias en terrenos valiosos
    if (fromCell.soldiers >= COLONY_CAPTURE_THRESHOLD && !toCell.isColony) {
      // Base para todas las nuevas colonias potenciales
      score += 100;

      // Bonus por energía generada
      score += energyValue * 40;

      // Analizar la posición estratégica para la nueva colonia

      // 1. Distancia a colonias enemigas (mejor si está lejos en fase temprana)
      let minDistanceToEnemyColony = Infinity;
      player1.colonies.forEach(enemyColonyIndex => {
        const distance = calculateDistance(to, enemyColonyIndex);
        minDistanceToEnemyColony = Math.min(minDistanceToEnemyColony, distance);
      });

      if (gamePhase === "early" || gamePhase === "mid") {
        // En fase temprana y media, valorar estar lejos del enemigo para expansión segura
        score += Math.min(minDistanceToEnemyColony * 15, 60);
        console.log(`[IA] Colonia alejada del enemigo (distancia ${minDistanceToEnemyColony}): +${Math.min(minDistanceToEnemyColony * 15, 60)} puntos`);
      } else {
        // En fase tardía, las colonias cercanas al enemigo pueden ser útiles para el ataque
        if (minDistanceToEnemyColony <= 2 && isCurrentlyStronger) {
          score += 80;
          console.log(`[IA] Colonia ofensiva cerca del enemigo: +80 puntos`);
        }
      }

      // 2. Conexión con colonias existentes (distancia a colonias propias)
      let minDistanceToOwnColony = Infinity;
      player2.colonies.forEach(ownColonyIndex => {
        if (ownColonyIndex !== from) { // Excluir la colonia de origen
          const distance = calculateDistance(to, ownColonyIndex);
          minDistanceToOwnColony = Math.min(minDistanceToOwnColony, distance);
        }
      });

      // Valorar estar cerca de colonias propias para defensa mutua
      if (minDistanceToOwnColony <= 3) {
        score += (4 - minDistanceToOwnColony) * 25;
        console.log(`[IA] Colonia cercana a aliados (distancia ${minDistanceToOwnColony}): +${(4 - minDistanceToOwnColony) * 25} puntos`);
      }

      // 3. Control de áreas estratégicas
      // Valorar posiciones que dan control de zonas amplias del mapa
      const row = Math.floor(to / 5);
      const col = to % 5;

      // Centro del mapa es valioso estratégicamente
      const distanceToCenter = Math.abs(row - 2) + Math.abs(col - 2);
      if (distanceToCenter <= 1) {
        score += 70;
        console.log(`[IA] Posición central estratégica: +70 puntos`);
      }

      // Esquinas también pueden ser defensivamente valiosas
      const isCorner = (row === 0 || row === 4) && (col === 0 || col === 4);
      if (isCorner) {
        score += 40;
        console.log(`[IA] Posición defensiva en esquina: +40 puntos`);
      }
    }

    // Analizar la posición para expansión territorial normal
    // Territorio cerca de colonias enemigas es valioso para presionar
    if (gamePhase !== "early") {
      player1.colonies.forEach(enemyColonyIndex => {
        const distance = calculateDistance(to, enemyColonyIndex);
        if (distance <= 2) {
          score += (3 - distance) * 20 * aggressivenessFactor;
          console.log(`[IA] Territorio cerca de colonia enemiga: +${(3 - distance) * 20 * aggressivenessFactor} puntos`);
        }
      });
    }
  }

  // MOVIMIENTOS A TERRITORIO ENEMIGO (ATAQUE)
  if (toCell.owner === 1) {
    // Valor base de ataque
    score += 80;

    // Evaluar relación de fuerzas
    const strengthRatio = fromCell.soldiers / Math.max(1, toCell.soldiers);

    // Bonificar ataques con ventaja clara
    if (strengthRatio > 1) {
      score += 100 * (strengthRatio - 1);
      console.log(`[IA] Ventaja en combate (${strengthRatio.toFixed(1)}x): +${100 * (strengthRatio - 1)} puntos`);

      // Ataque a colonias enemigas (alta prioridad)
      if (toCell.isColony) {
        score += 300;
        console.log(`[IA] Ataque a colonia enemiga: +300 puntos`);

        // Bonus masivo si esta es la última colonia enemiga
        if (player1.colonies.length === 1) {
          score += 500;
          console.log(`[IA] ¡ATAQUE DECISIVO A ÚLTIMA COLONIA ENEMIGA!: +500 puntos`);
        }
      }

      // Análisis del impacto estratégico de la conquista

      // 1. Valor del elemento del territorio
      const energyValue = getElementEnergyValue(toCell.element);
      score += energyValue * 30;

      // 2. Posición estratégica
      // Territorio que conecta nuestras colonias
      let connectsColonies = false;
      if (player2.colonies.length >= 2) {
        for (let i = 0; i < player2.colonies.length; i++) {
          for (let j = i + 1; j < player2.colonies.length; j++) {
            const colony1 = player2.colonies[i];
            const colony2 = player2.colonies[j];

            // Verificar si el territorio está en una línea entre dos colonias
            const distance1 = calculateDistance(to, colony1);
            const distance2 = calculateDistance(to, colony2);
            const directDistance = calculateDistance(colony1, colony2);

            if (distance1 + distance2 <= directDistance + 1) {
              connectsColonies = true;
              break;
            }
          }
          if (connectsColonies) break;
        }
      }

      if (connectsColonies) {
        score += 80;
        console.log(`[IA] Territorio que conecta colonias propias: +80 puntos`);
      }

      // 3. Impacto en la seguridad de nuestras colonias
      player2.colonies.forEach(ownColonyIndex => {
        // Atacar territorios enemigos que amenazan nuestras colonias
        const distanceToColony = calculateDistance(to, ownColonyIndex);
        if (distanceToColony <= 2) {
          score += (3 - distanceToColony) * 30;
          console.log(`[IA] Eliminar amenaza cercana a colonia propia: +${(3 - distanceToColony) * 30} puntos`);
        }
      });
    } else {
      // Penalizar ataques suicidas
      score -= 200 * (1 - strengthRatio);
      console.log(`[IA] Ataque desfavorable (${strengthRatio.toFixed(1)}x): -${200 * (1 - strengthRatio)} puntos`);
    }
  }

  // MOVIMIENTOS A TERRITORIO PROPIO (REFUERZO)
  if (toCell.owner === 2) {
    // Valor base bajo para movimientos a territorio propio
    score += 20;

    // Reforzar colonias propias es valioso
    if (toCell.isColony) {
      // Mayor valor para reforzar colonias bajo amenaza
      let colonyUnderThreat = false;
      let threatLevel = 0;

      player1.colonies.forEach(enemyColonyIndex => {
        const enemyColony = gameState.board[enemyColonyIndex];
        const distance = calculateDistance(to, enemyColonyIndex);

        if (distance <= 2) {
          colonyUnderThreat = true;
          // Calcular nivel de amenaza basado en distancia y fuerza enemiga
          const threatFactor = (3 - distance) * enemyColony.soldiers;
          threatLevel = Math.max(threatLevel, threatFactor);
        }
      });

      if (colonyUnderThreat) {
        const defensiveValue = 50 + threatLevel * 10;
        score += defensiveValue;
        console.log(`[IA] Reforzar colonia bajo amenaza (nivel ${threatLevel}): +${defensiveValue} puntos`);
      } else if (toCell.soldiers < 3) {
        // Reforzar colonias con pocos soldados aunque no estén amenazadas
        score += 60;
        console.log(`[IA] Reforzar colonia con defensa débil: +60 puntos`);
      } else {
        // Menos valor a reforzar colonias ya fuertes sin amenaza
        score += 30;
        console.log(`[IA] Reforzar colonia segura: +30 puntos`);
      }
    } else {
      // Reforzar territorios normales tiene menos valor
      // Pero puede ser útil para preparar fuerzas para ataques futuros

      // Verificar si está cerca de territorio enemigo para ataque futuro
      let nearEnemyTerritory = false;
      gameState.board.forEach((cell, index) => {
        if (cell.owner === 1 && calculateDistance(to, index) <= 1) {
          nearEnemyTerritory = true;
        }
      });

      if (nearEnemyTerritory) {
        score += 50;
        console.log(`[IA] Posicionar fuerzas cerca de territorio enemigo: +50 puntos`);
      }

      // Consolidar fuerzas en terrenos valiosos
      const energyValue = getElementEnergyValue(toCell.element);
      if (energyValue >= 2) {
        score += 30;
        console.log(`[IA] Consolidar fuerzas en terreno valioso: +30 puntos`);
      }
    }

    // Mover unidades de colonias a territorios adjacentes puede ser útil
    // para liberar la colonia para crear nuevos soldados
    if (gameState.board[from].isColony && !toCell.isColony && player2.energy >= SOLDIER_COST) {
      score += 40;
      console.log(`[IA] Liberar colonia para crear soldados: +40 puntos`);
    }
  }

  // CONSIDERACIONES TÁCTICAS ADICIONALES

  // Ajustar valor según la fase del juego
  if (gamePhase === "early") {
    // Fase temprana: favorecer expansión
    if (toCell.owner === null) {
      score *= 1.2;
    }
  } else if (gamePhase === "late") {
    // Fase tardía: favorecer ataques directos
    if (toCell.owner === 1) {
      score *= 1.3;
    }
  }

  // Movimientos que resultan en combinación de ejércitos grandes
  if (toCell.owner === 2 && fromCell.soldiers + toCell.soldiers >= 5) {
    score += 30;
    console.log(`[IA] Crear fuerza de ataque importante: +30 puntos`);
  }

  // Evitar mover unidades que ya están en posición estratégica
  if (fromCell.owner === 2 && !gameState.board[from].isColony) {
    // Verificar si la unidad ya está en posición para atacar
    let alreadyInAttackPosition = false;
    gameState.board.forEach((cell, index) => {
      if (cell.owner === 1 && calculateDistance(from, index) <= 1) {
        alreadyInAttackPosition = true;
      }
    });

    if (alreadyInAttackPosition && toCell.owner !== 1) {
      score -= 40;
      console.log(`[IA] Abandonar posición de ataque: -40 puntos`);
    }
  }

  // Aplicar factor de agresividad general
  score *= aggressivenessFactor;

  console.log(`[IA] Evaluación final movimiento ${from} → ${to}: ${score.toFixed(1)} puntos (x${aggressivenessFactor} agresividad)`);
  return score;
}

// Calcular distancia entre dos casillas
function calculateDistance(index1, index2) {
  const row1 = Math.floor(index1 / 5);
  const col1 = index1 % 5;
  const row2 = Math.floor(index2 / 5);
  const col2 = index2 % 5;

  return Math.abs(row1 - row2) + Math.abs(col1 - col2);
}

// Ejecutar movimiento de la IA
function executeAIMove(move) {
  console.log(`Ejecutando movimiento IA: ${move.from} -> ${move.to} (Puntuación: ${move.score})`);
  const fromCell = gameState.board[move.from];
  const toCell = gameState.board[move.to];

  // Mostrar detalles del movimiento
  if (toCell.owner === 1) {
    console.log(`IA ATACA: ${fromCell.soldiers} soldados vs ${toCell.soldiers} soldados enemigos`);
    if (fromCell.soldiers > toCell.soldiers) {
      console.log(`Predicción: Victoria probable para la IA`);
    } else {
      console.log(`Predicción: Derrota probable para la IA (movimiento desesperado)`);
    }
  } else if (toCell.owner === null) {
    console.log(`IA CONQUISTA: Territorio neutral (${getElementEnergyValue(toCell.element)}⚡)`);
  } else {
    console.log(`IA REAGRUPA: Movimiento de refuerzo`);
  }

  // Simular selección visual para la IA
  const fromCellDOM = document.querySelector(`[data-index="${move.from}"]`);
  if (fromCellDOM) {
    fromCellDOM.classList.add('valid-move');

    setTimeout(() => {
      // Realizar el movimiento después de un breve delay
      moveUnits(move.from, move.to);
      clearHighlights();

      // Terminar el turno de la IA
      setTimeout(() => endTurn(2), 500);
    }, 500);
  } else {
    moveUnits(move.from, move.to);
    setTimeout(() => endTurn(2), 500);
  }
}

// Función para seleccionar el modo de juego
function selectGameMode(mode) {
  gameMode = mode;
  document.getElementById('aiMode').classList.toggle('selected', mode === 'ai');
  document
    .getElementById('humanMode')
    .classList.toggle('selected', mode === 'human');
}

// Generar energía por conquista de territorio
function generateEnergyFromConquest(territoryIndex, isEnemy) {
  const player = gameState.currentPlayer;
  const playerState = gameState.players[player];
  const territory = gameState.board[territoryIndex];
  let energyGained = 0;

  // Energía base por conquista
  energyGained += 1;

  // Bonus según el elemento del territorio
  switch(territory.element) {
    case ELEMENTS.FIRE:
      if (isEnemy) {
        energyGained += 2; // Fuego enemigo da más energía
        console.log(`¡Territorio enemigo de fuego conquistado! +2 energía adicional`);
      } else {
        energyGained += 1; // Fuego neutral da energía
        console.log(`¡Territorio neutral de fuego ocupado! +1 energía adicional`);
      }
      break;
    case ELEMENTS.WATER:
      if (territory.isColony) {
        energyGained += isEnemy ? 3 : 2; // Colonia de agua da más energía
        console.log(`¡${isEnemy ? 'Colonia enemiga' : 'Territorio neutral'} de agua ${isEnemy ? 'conquistada' : 'ocupado'}! +${isEnemy ? 3 : 2} energía adicional`);
      } else {
        energyGained += 1;
        console.log(`¡Territorio ${isEnemy ? 'enemigo' : 'neutral'} de agua ${isEnemy ? 'conquistado' : 'ocupado'}! +1 energía adicional`);
      }
      break;
    case ELEMENTS.ETHER:
      energyGained += isEnemy ? 2 : 1; // Éter da energía
      console.log(`¡Territorio ${isEnemy ? 'enemigo' : 'neutral'} de éter ${isEnemy ? 'conquistado' : 'ocupado'}! +${isEnemy ? 2 : 1} energía adicional`);
      break;
    case ELEMENTS.EARTH:
      if (territory.isColony) {
        energyGained += isEnemy ? 2 : 1; // Colonias de tierra dan energía
        console.log(`¡${isEnemy ? 'Colonia enemiga' : 'Territorio neutral'} de tierra ${isEnemy ? 'conquistada' : 'ocupado'}! +${isEnemy ? 2 : 1} energía adicional`);
      } else if (isEnemy) {
        energyGained += 1; // Tierra enemiga también da energía
        console.log(`¡Territorio enemigo de tierra conquistado! +1 energía adicional`);
      }
      break;
    case ELEMENTS.AIR:
      if (isEnemy) {
        energyGained += 1; // Aire enemigo da energía
        console.log(`¡Territorio enemigo de aire conquistado! +1 energía adicional`);
      }
      break;
  }

  // Bonus adicional por conquistar colonia enemiga
  if (territory.isColony && isEnemy) {
    energyGained += 2;
    console.log(`¡Bonus de conquista de colonia enemiga! +2 energía adicional`);
  }

  // Añadir la energía al jugador
  playerState.energy += energyGained;

  // Mensaje en consola
  console.log(`Jugador ${player} gana ${energyGained} de energía por ${isEnemy ? 'conquistar' : 'ocupar'} territorio en ${territoryIndex}`);
  console.log(`Jugador ${player} ahora tiene ${playerState.energy} energía total`);

  // Animación o efecto visual para mostrar la energía ganada
  const cellElement = document.querySelector(`[data-index="${territoryIndex}"]`);
  if (cellElement) {
    const energyIndicator = document.createElement("div");
    energyIndicator.className = "energy-gain";
    energyIndicator.textContent = `+${energyGained}⚡`;
    cellElement.appendChild(energyIndicator);

    // Eliminar el indicador después de un tiempo
    setTimeout(() => {
      if (energyIndicator.parentNode === cellElement) {
        cellElement.removeChild(energyIndicator);
      }
    }, 2000);
  }

  return energyGained;
}

// Función para resaltar todas las colonias del jugador actual
function highlightPlayerColonies() {
  const player = gameState.currentPlayer;
  const playerColonies = gameState.players[player].colonies;

  // Resaltar cada colonia del jugador
  playerColonies.forEach(colonyIndex => {
    const cell = document.querySelector(`[data-index="${colonyIndex}"]`);
    if (cell) {
      cell.classList.add('selectable-colony');

      // Añadir indicador visual
      const indicador = document.createElement('div');
      indicador.className = 'colony-indicator';
      indicador.innerHTML = '⬇️';
      cell.appendChild(indicador);
    }
  });
}

// Función para cancelar la selección de cofradía
function cancelColonySelection() {
  // Revertir al estado normal
  gameState.phase = 'SELECT';

  // Eliminar resaltados
  clearColonyHighlights();

  // Eliminar mensaje
  const messageDiv = document.getElementById('colonySelectionMessage');
  if (messageDiv) {
    messageDiv.remove();
  }
}

// Función para limpiar los resaltados de cofradías
function clearColonyHighlights() {
  // Quitar clase de todas las celdas resaltadas
  document.querySelectorAll('.selectable-colony').forEach(cell => {
    cell.classList.remove('selectable-colony');
  });

  // Quitar indicadores visuales
  document.querySelectorAll('.colony-indicator').forEach(indicador => {
    indicador.remove();
  });
}

// Recalcular soldados totales
function recalculateTotalSoldiers() {
  // Reiniciar contadores
  gameState.players[1].soldiers = 0;
  gameState.players[2].soldiers = 0;

  // Sumar todos los soldados en el tablero para cada jugador
  gameState.board.forEach(cell => {
    if (cell.owner && cell.soldiers > 0) {
      gameState.players[cell.owner].soldiers += cell.soldiers;
    }
  });

  console.log(`Recálculo de soldados - Jugador 1: ${gameState.players[1].soldiers}, Jugador 2: ${gameState.players[2].soldiers}`);
}

// Iniciar el proceso de creación de una cofradía
function startColonyCreation() {
  if (!canCreateColony()) {
    console.log('No se puede crear cofradía');
    return;
  }

  // Cambiar a modo de selección de ubicación para la nueva cofradía
  gameState.phase = 'COLONY_CREATION';

  // Mostrar mensaje de instrucciones
  const messageDiv = document.createElement('div');
  messageDiv.id = 'colonyCreationMessage';
  messageDiv.className = 'game-message';
  messageDiv.innerHTML = 'Selecciona un territorio propio para crear una cofradía <button id="cancelColonyCreation">Cancelar</button>';
  document.querySelector('.game-container').appendChild(messageDiv);

  // Agregar evento al botón de cancelar
  document.getElementById('cancelColonyCreation').addEventListener('click', () => {
    cancelColonyCreation();
  });

  // Resaltar todos los territorios propios donde se puede crear una cofradía
  highlightValidColonyLocations();
}

// Cancelar la creación de una cofradía
function cancelColonyCreation() {
  // Revertir al estado normal
  gameState.phase = 'SELECT';

  // Eliminar resaltados
  clearColonyCreationHighlights();

  // Eliminar mensaje
  const messageDiv = document.getElementById('colonyCreationMessage');
  if (messageDiv) {
    messageDiv.remove();
  }
}

// Resaltar territorios válidos para crear cofradías
function highlightValidColonyLocations() {
  const player = gameState.currentPlayer;

  // Buscar territorios propios que tengan al menos un soldado y no sean ya cofradías
  gameState.board.forEach((cell, index) => {
    if (cell.owner === player && cell.soldiers > 0 && !cell.isColony) {
      const cellElement = document.querySelector(`[data-index="${index}"]`);
      if (cellElement) {
        cellElement.classList.add('selectable-colony-location');

        // Añadir indicador visual
        const indicador = document.createElement('div');
        indicador.className = 'colony-indicator';
        indicador.innerHTML = '🏰';
        cellElement.appendChild(indicador);
      }
    }
  });
}

// Limpiar resaltados de creación de cofradías
function clearColonyCreationHighlights() {
  // Quitar clase de todas las celdas resaltadas
  document.querySelectorAll('.selectable-colony-location').forEach(cell => {
    cell.classList.remove('selectable-colony-location');
  });

  // Quitar indicadores visuales
  document.querySelectorAll('.colony-indicator').forEach(indicador => {
    indicador.remove();
  });
}

// Crear cofradía en la ubicación seleccionada
function createColonyAtLocation(index) {
  const player = gameState.players[gameState.currentPlayer];
  const cell = gameState.board[index];

  // Verificar que sea un territorio válido
  if (cell.owner !== gameState.currentPlayer || cell.soldiers <= 0 || cell.isColony) {
    console.log('Ubicación no válida para crear cofradía');
    return;
  }

  // Restar energía
  player.energy -= COLONY_COST;

  // Convertir el territorio en cofradía
  cell.isColony = true;

  // Añadir a la lista de colonias del jugador
  player.colonies.push(index);

  console.log(`Cofradía creada en celda ${index} por el jugador ${gameState.currentPlayer}`);

  // Actualizar la celda en el DOM
  updateCellDOM(index);

  // Actualizar la interfaz
  updateUI();

  // Limpiar resaltados y mensajes
  clearColonyCreationHighlights();
  const messageDiv = document.getElementById('colonyCreationMessage');
  if (messageDiv) {
    messageDiv.remove();
  }

  // Cambiar fase de juego
  gameState.phase = 'SELECT';

  // Deshabilitar la creación de más estructuras este turno
  gameState.actions.canCreateSoldier = false;

  // Terminar el turno automáticamente después de un breve retraso
  setTimeout(() => {
    console.log('Terminando turno después de crear cofradía');
    endTurn(gameState.currentPlayer);
  }, 100);
}

// Iniciar proceso para mejorar una cofradía
function startColonyUpgrade() {
  if (!canUpgradeColony()) {
    console.log('No se puede mejorar cofradía');
    return;
  }

  // Cambiar a modo de selección de cofradía para mejorar
  gameState.phase = 'UPGRADE_SELECTION';

  // Mostrar mensaje de instrucciones
  const messageDiv = document.createElement('div');
  messageDiv.id = 'colonyUpgradeMessage';
  messageDiv.className = 'game-message';
  messageDiv.innerHTML = 'Selecciona una cofradía para mejorar <button id="cancelUpgrade">Cancelar</button>';
  document.querySelector('.game-container').appendChild(messageDiv);

  // Agregar evento al botón de cancelar
  document.getElementById('cancelUpgrade').addEventListener('click', () => {
    cancelColonyUpgrade();
  });

  // Resaltar todas las colonias del jugador que se pueden mejorar
  highlightUpgradeableColonies();
}

// Verificar si se puede mejorar una cofradía
function canUpgradeColony() {
  const player = gameState.players[gameState.currentPlayer];
  // Comprobar si el jugador tiene suficiente energía para al menos la mejora más barata
  const minUpgradeCost = Math.min(...Object.values(COLONY_UPGRADES).map(upgrade => upgrade.cost));

  return (
    player.energy >= minUpgradeCost &&
    player.colonies.length > 0 &&
    gameState.phase === 'SELECT' &&
    gameState.actions.canCreateSoldier // Usar el mismo indicador que para crear soldados (1 acción por turno)
  );
}

// Resaltar colonias que se pueden mejorar
function highlightUpgradeableColonies() {
  const player = gameState.currentPlayer;
  const playerColonies = gameState.players[player].colonies;

  // Resaltar cada colonia del jugador
  playerColonies.forEach(colonyIndex => {
    const cell = document.querySelector(`[data-index="${colonyIndex}"]`);
    if (cell) {
      cell.classList.add('upgradeable-colony');

      // Añadir indicador visual
      const indicador = document.createElement('div');
      indicador.className = 'upgrade-indicator-ui';
      indicador.innerHTML = '⬆️';
      cell.appendChild(indicador);
    }
  });
}

// Cancelar la mejora de una cofradía
function cancelColonyUpgrade() {
  // Revertir al estado normal
  gameState.phase = 'SELECT';

  // Eliminar resaltados
  clearUpgradeHighlights();

  // Eliminar mensaje
  const messageDiv = document.getElementById('colonyUpgradeMessage');
  if (messageDiv) {
    messageDiv.remove();
  }

  // Eliminar interfaz de selección de mejora si existe
  const upgradeInterface = document.getElementById('upgradeSelectionInterface');
  if (upgradeInterface) {
    upgradeInterface.remove();
  }
}

// Limpiar resaltados de mejora
function clearUpgradeHighlights() {
  // Quitar clase de todas las celdas resaltadas
  document.querySelectorAll('.upgradeable-colony').forEach(cell => {
    cell.classList.remove('upgradeable-colony');
  });

  // Quitar indicadores visuales
  document.querySelectorAll('.upgrade-indicator-ui').forEach(indicador => {
    indicador.remove();
  });
}

// Mostrar opciones de mejora para una colonia seleccionada
function showUpgradeOptions(colonyIndex) {
  // Eliminar interfaz anterior si existe
  const oldInterface = document.getElementById('upgradeSelectionInterface');
  if (oldInterface) {
    oldInterface.remove();
  }

  const colony = gameState.board[colonyIndex];
  const playerEnergy = gameState.players[gameState.currentPlayer].energy;

  // Crear interfaz de selección de mejora
  const upgradeInterface = document.createElement('div');
  upgradeInterface.id = 'upgradeSelectionInterface';
  upgradeInterface.className = 'upgrade-interface';

  // Título de la interfaz
  upgradeInterface.innerHTML = `<h3>Mejorar Cofradía (${playerEnergy}⚡)</h3>`;

  // Generar lista de mejoras disponibles
  Object.keys(COLONY_UPGRADES).forEach(upgradeKey => {
    const upgrade = COLONY_UPGRADES[upgradeKey];
    const isUpgraded = colony.upgrades && colony.upgrades[upgradeKey];
    const canAfford = playerEnergy >= upgrade.cost;

    const upgradeButton = document.createElement('button');
    upgradeButton.className = `upgrade-option ${isUpgraded ? 'already-upgraded' : ''} ${!canAfford ? 'cannot-afford' : ''}`;
    upgradeButton.disabled = isUpgraded || !canAfford;
    upgradeButton.innerHTML = `
      <span class="upgrade-icon">${upgrade.icon}</span>
      <span class="upgrade-name">${upgrade.name}</span>
      <span class="upgrade-cost">${upgrade.cost}⚡</span>
      <span class="upgrade-description">${upgrade.description}</span>
    `;

    // Añadir evento solo si no está mejorada y se puede permitir
    if (!isUpgraded && canAfford) {
      upgradeButton.addEventListener('click', () => {
        upgradeColony(colonyIndex, upgradeKey);
      });
    }

    upgradeInterface.appendChild(upgradeButton);
  });

  // Botón para cancelar
  const cancelButton = document.createElement('button');
  cancelButton.className = 'cancel-upgrade';
  cancelButton.textContent = 'Cancelar';
  cancelButton.addEventListener('click', () => {
    upgradeInterface.remove();
    cancelColonyUpgrade();
  });

  upgradeInterface.appendChild(cancelButton);

  // Añadir la interfaz al contenedor del juego
  document.querySelector('.game-container').appendChild(upgradeInterface);
}

// Aplicar mejora a una cofradía
function upgradeColony(colonyIndex, upgradeKey) {
  const player = gameState.players[gameState.currentPlayer];
  const colony = gameState.board[colonyIndex];
  const upgrade = COLONY_UPGRADES[upgradeKey];

  // Verificar si se puede aplicar la mejora
  if (player.energy < upgrade.cost) {
    console.log('No hay suficiente energía para esta mejora');
    return;
  }

  // Inicializar estructura de mejoras si no existe
  if (!colony.upgrades) {
    colony.upgrades = {};
  }

  // Aplicar la mejora
  colony.upgrades[upgradeKey] = true;

  // Restar el costo
  player.energy -= upgrade.cost;

  console.log(`Cofradía en ${colonyIndex} mejorada con ${upgrade.name}`);
  logEvent(`¡${gameState.currentPlayer === 1 ? 'Jugador 1' : 'Jugador 2'} mejora una cofradía con ${upgrade.name}!`, 'upgrade');

  // Actualizar la UI
  updateCellDOM(colonyIndex);
  updateUI();

  // Cerrar la interfaz de mejora
  const upgradeInterface = document.getElementById('upgradeSelectionInterface');
  if (upgradeInterface) {
    upgradeInterface.remove();
  }

  // Limpiar resaltados y mensajes
  clearUpgradeHighlights();
  const messageDiv = document.getElementById('colonyUpgradeMessage');
  if (messageDiv) {
    messageDiv.remove();
  }

  // Cambiar fase de juego
  gameState.phase = 'SELECT';

  // Deshabilitar más acciones este turno
  gameState.actions.canCreateSoldier = false;

  // Terminar el turno automáticamente después de un breve retraso
  setTimeout(() => {
    console.log('Terminando turno después de mejorar cofradía');
    endTurn(gameState.currentPlayer);
  }, 100);
}

// Manejar habilidad especial del éter (crear soldado cada 3 turnos)
function handleEtherAbility() {
  const player = gameState.currentPlayer;
  const playerState = gameState.players[player];

  // Verificar si ha pasado el tiempo necesario desde la última vez
  if (gameState.turn - playerState.lastSpecialRecruitTurn >= 3) {
    // Buscar colonias del jugador en terreno de éter
    const etherColonies = [];

    playerState.colonies.forEach(colonyIndex => {
      const colony = gameState.board[colonyIndex];
      if (colony.element === ELEMENTS.ETHER) {
        etherColonies.push(colonyIndex);
      }
    });

    if (etherColonies.length > 0) {
      // Seleccionar una colonia aleatoria si hay varias
      const selectedColony = etherColonies[Math.floor(Math.random() * etherColonies.length)];
      const colony = gameState.board[selectedColony];

      // Añadir un soldado gratis
      colony.soldiers += 1;

      // Marcar que está usando la habilidad elemental
      colony.isUsingElementalAbility = true;

      // Multiplicador de altar elemental
      let bonusSoldiers = 0;
      if (colony.upgrades && colony.upgrades.ALTAR) {
        bonusSoldiers = 1; // Soldado adicional con el altar
        colony.soldiers += bonusSoldiers;
        logEvent(`¡Altar Elemental duplica el efecto de Manifestación! +1 soldado adicional`, 'upgrade');
      }

      // Actualizar el contador de soldados
      recalculateTotalSoldiers();

      // Actualizar la celda
      updateCellDOM(selectedColony);

      // Registrar el evento
      console.log(`Habilidad de Éter: Jugador ${player} recibe ${1 + bonusSoldiers} soldado(s) gratis en celda ${selectedColony}`);
      logEvent(`¡Manifestación de Éter! Jugador ${player} recibe ${1 + bonusSoldiers} soldado(s) gratis en una cofradía`, 'ability');

      // Actualizar el último turno de reclutamiento especial
      playerState.lastSpecialRecruitTurn = gameState.turn;

      // Programar limpieza del estado de habilidad activa
      setTimeout(() => {
        colony.isUsingElementalAbility = false;
        updateCellDOM(selectedColony);
      }, 3000);
    }
  }
}

// Limpiar todos los marcadores de uso de habilidad elemental
function clearElementalAbilityMarkers() {
  gameState.board.forEach((cell, index) => {
    if (cell.isUsingElementalAbility) {
      cell.isUsingElementalAbility = false;
      updateCellDOM(index);
    }
  });
}

// Obtener nombre del elemento
function getElementName(element) {
  const names = {
    [ELEMENTS.FIRE]: 'Fuego',
    [ELEMENTS.EARTH]: 'Tierra',
    [ELEMENTS.AIR]: 'Aire',
    [ELEMENTS.WATER]: 'Agua',
    [ELEMENTS.ETHER]: 'Éter',
  };
  return names[element] || 'Desconocido';
}

// Realizar un combate entre dos celdas
function combat(attackerIndex, defenderIndex) {
  const attacker = gameState.board[attackerIndex];
  const defender = gameState.board[defenderIndex];

  // No permitir atacar si no hay soldados
  if (attacker.soldiers <= 0) {
    console.log("No hay soldados para atacar");
    return false;
  }

  // No permitir atacar celdas aliadas
  if (attacker.owner === defender.owner) {
    console.log("No puedes atacar a tus propias unidades");
    return false;
  }

  // Calcular bonificaciones de ataque y defensa
  const attackerBonus = getElementalCombatBonus(attackerIndex);
  const defenderBonus = getElementalDefenseBonus(defenderIndex);

  // Atacantes que quedan vivos
  const initialAttackers = attacker.soldiers;
  const initialDefenders = defender.soldiers;

  // Poder de ataque y defensa total
  const attackPower = attacker.soldiers + attackerBonus;
  const defensePower = defender.soldiers + defenderBonus;

  // Mensajes de bonificación
  if (attackerBonus > 0) {
    console.log(`Atacante recibe +${attackerBonus} de bonificación (${attacker.element === ELEMENTS.FIRE ? 'Fuego' : 'Veteranía'})`);
  }

  if (defenderBonus > 0) {
    console.log(`Defensor recibe +${defenderBonus} de bonificación (${defender.element === ELEMENTS.EARTH ? 'Tierra' : 'Veteranía/Murallas'})`);
  }

  // Cálculo de daño
  const attackerLosses = Math.min(
    attacker.soldiers,
    Math.floor(defensePower / 2)
  );

  const defenderLosses = Math.min(
    defender.soldiers,
    Math.floor(attackPower / 2)
  );

  // Aplicar las pérdidas
  attacker.soldiers -= attackerLosses;
  defender.soldiers -= defenderLosses;

  // Manejar captura de colonia
  let colonyCapture = false;
  if (defender.soldiers <= 0 && defender.isColony) {
    colonyCapture = true;
    // La colonia mantiene sus mejoras al ser capturada
    const upgrades = defender.upgrades;

    // Transferir la propiedad al atacante
    defender.owner = attacker.owner;
    defender.soldiers = Math.floor(attacker.soldiers / 2);
    attacker.soldiers = Math.ceil(attacker.soldiers / 2);

    // Mantener mejoras y elemento al capturar
    defender.upgrades = upgrades;

    // Añadir la colonia capturada al jugador actual
    const playerState = gameState.players[attacker.owner];
    if (!playerState.colonies.includes(defenderIndex)) {
      playerState.colonies.push(defenderIndex);
    }

    // Eliminar la colonia del oponente
    const opponentIndex = attacker.owner === 1 ? 2 : 1;
    const opponentState = gameState.players[opponentIndex];
    opponentState.colonies = opponentState.colonies.filter(c => c !== defenderIndex);

    // Registrar el evento de captura
    console.log(`Jugador ${attacker.owner} ha capturado la colonia en celda ${defenderIndex}`);
    logEvent(`¡${attacker.owner === 1 ? 'Jugador 1' : 'Jugador 2'} ha capturado una cofradía enemiga!`, 'capture');

    // Reproducir sonido de captura
    playSound('eventSound');
  } else if (defender.soldiers <= 0) {
    // Si no es colonia y no quedan defensores, el atacante ocupa la celda
    const remainingAttackers = Math.floor(attacker.soldiers / 2);
    defender.owner = attacker.owner;
    defender.soldiers = remainingAttackers;
    attacker.soldiers = Math.ceil(attacker.soldiers / 2);
  }

  // Crear informe de combate para mostrar
  const combatReport = {
    attacker: {
      index: attackerIndex,
      initial: initialAttackers,
      losses: attackerLosses,
      remaining: attacker.soldiers,
      bonus: attackerBonus,
      element: attacker.element
    },
    defender: {
      index: defenderIndex,
      initial: initialDefenders,
      losses: defenderLosses,
      remaining: defender.soldiers,
      bonus: defenderBonus,
      element: defender.element
    },
    colonyCapture: colonyCapture
  };

  // Mostrar informe de combate
  displayCombatResult(combatReport);

  // Aplicar efectos de veteranía para las unidades sobrevivientes
  if (attacker.soldiers > 0 && !attacker.veterancy) {
    attacker.veterancy = 1;
    logEvent(`¡Las unidades sobrevivientes del atacante se han vuelto veteranas!`, 'veteran');
  }

  if (defender.soldiers > 0 && defender.owner === gameState.currentPlayer && !defender.veterancy) {
    defender.veterancy = 1;
    logEvent(`¡Las unidades sobrevivientes del defensor se han vuelto veteranas!`, 'veteran');
  }

  // Actualizar el DOM
  updateCellDOM(attackerIndex);
  updateCellDOM(defenderIndex);

  // Recalcular el total de soldados
  recalculateTotalSoldiers();

  // Verificar condiciones de victoria/derrota
  checkVictoryConditions();

  // Programar la limpieza de los marcadores de habilidad elemental después de 3 segundos
  setTimeout(() => {
    clearElementalAbilityMarkers();
  }, 3000);

  return true;
}

// Mostrar el resultado del combate
function displayCombatResult(report) {
  const attackerElement = getElementName(report.attacker.element);
  const defenderElement = getElementName(report.defender.element);

  // Crear un mensaje detallado para el registro de eventos
  let message = `Combate: `;

  // Información del atacante
  message += `Atacante (${attackerElement}${report.attacker.bonus > 0 ? ` +${report.attacker.bonus}` : ''}) - `;
  message += `Inicial: ${report.attacker.initial}, Perdidos: ${report.attacker.losses}, Restantes: ${report.attacker.remaining} | `;

  // Información del defensor
  message += `Defensor (${defenderElement}${report.defender.bonus > 0 ? ` +${report.defender.bonus}` : ''}) - `;
  message += `Inicial: ${report.defender.initial}, Perdidos: ${report.defender.losses}, Restantes: ${report.defender.remaining}`;

  // Añadir mensaje de captura si aplica
  if (report.colonyCapture) {
    message += ` | ¡Cofradía capturada!`;
  }

  // Registrar el evento detallado
  logEvent(message, 'combat');

  // Mostrar una notificación visual del combate
  showCombatNotification(report);
}

// Mostrar una notificación visual del resultado del combate
function showCombatNotification(report) {
  // Crear un elemento para la notificación
  const notification = document.createElement('div');
  notification.className = 'combat-notification';

  // Iconos para los elementos
  const attackerElementIcon = getElementIcon(report.attacker.element);
  const defenderElementIcon = getElementIcon(report.defender.element);

  // Construir el contenido HTML
  notification.innerHTML = `
    <div class="combat-header">¡Combate!</div>
    <div class="combat-sides">
      <div class="combat-side attacker">
        <div class="element-icon ${attackerElementIcon}">${attackerElementIcon.charAt(0)}</div>
        <div class="combat-stats">
          <div>Inicial: ${report.attacker.initial}</div>
          <div>Pérdidas: ${report.attacker.losses}</div>
          <div>Restantes: ${report.attacker.remaining}</div>
          ${report.attacker.bonus > 0 ? `<div class="combat-bonus">+${report.attacker.bonus} 🔥</div>` : ''}
        </div>
      </div>
      <div class="combat-vs">VS</div>
      <div class="combat-side defender">
        <div class="element-icon ${defenderElementIcon}">${defenderElementIcon.charAt(0)}</div>
        <div class="combat-stats">
          <div>Inicial: ${report.defender.initial}</div>
          <div>Pérdidas: ${report.defender.losses}</div>
          <div>Restantes: ${report.defender.remaining}</div>
          ${report.defender.bonus > 0 ? `<div class="combat-bonus">+${report.defender.bonus} 🛡️</div>` : ''}
        </div>
      </div>
    </div>
    ${report.colonyCapture ? '<div class="combat-capture">¡Cofradía capturada!</div>' : ''}
  `;

  // Añadir la notificación al DOM
  document.body.appendChild(notification);

  // Eliminar la notificación después de unos segundos
  setTimeout(() => {
    notification.classList.add('fade-out');
    setTimeout(() => {
      notification.remove();
    }, 1000);
  }, 4000);
}

// Reproducir un sonido
function playSound(soundId) {
  const sound = document.getElementById(soundId);
  if (sound) {
    sound.currentTime = 0;
    sound.play().catch(error => {
      console.log('Error al reproducir sonido:', error);
    });
  }
}

// Obtener la clase CSS para el icono de un elemento
function getElementIcon(elementId) {
  switch(elementId) {
    case ELEMENTS.FIRE: return 'fire-element';
    case ELEMENTS.EARTH: return 'earth-element';
    case ELEMENTS.AIR: return 'air-element';
    case ELEMENTS.WATER: return 'water-element';
    case ELEMENTS.ETHER: return 'ether-element';
    default: return 'normal-element';
  }
}
