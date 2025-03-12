// Constantes del juego
const BOARD_SIZE = 25;
const ELEMENTS = {
  FIRE: 'fire',
  EARTH: 'earth',
  AIR: 'air',
  WATER: 'water',
  ETHER: 'ether',
};

const INITIAL_ENERGY = 3;
const SOLDIER_COST = 2;
const INITIAL_SOLDIERS = 2;
const COLONY_CAPTURE_THRESHOLD = 4; // Soldados necesarios para conquistar una cofradía

// Variables globales
let gameMode = 'ai'; // Por defecto, jugar contra la IA

// Estado del juego
let gameState = {
  currentPlayer: 1,
  gameMode: 'ai',
  players: {
    1: {
      energy: INITIAL_ENERGY,
      soldiers: INITIAL_SOLDIERS,
      colonies: [],
      isAI: false,
    },
    2: {
      energy: INITIAL_ENERGY,
      soldiers: INITIAL_SOLDIERS,
      colonies: [],
      isAI: true,
    },
  },
  board: [],
  selectedCell: null,
  phase: 'SELECT', // SELECT, MOVE, ATTACK, COLONY_SELECTION
  actions: {
    movesLeft: 1,
    canCreateSoldier: true,
  },
};

// Inicialización del juego
function initGame() {
  console.log('Inicializando juego...');

  // Reiniciar estado del juego
  gameState = {
    currentPlayer: 1,
    gameMode: gameMode,
    players: {
      1: {
        energy: INITIAL_ENERGY,
        soldiers: INITIAL_SOLDIERS,
        colonies: [],
        isAI: false,
      },
      2: {
        energy: INITIAL_ENERGY,
        soldiers: INITIAL_SOLDIERS,
        colonies: [],
        isAI: gameMode === 'ai',
      },
    },
    board: [],
    selectedCell: null,
    phase: 'SELECT',
    actions: {
      movesLeft: 1,
      canCreateSoldier: true,
    },
  };

  createBoard();
  initializeBoardElements();
  placeInitialColonies();

  // No llamar a generateEnergy() aquí para evitar energía extra al inicio

  updateUI();
  updateActionButtons();

  console.log('Juego inicializado con éxito');
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
      </div>
    `;
    currentPlayerPanel.insertAdjacentHTML('beforeend', actionsHTML);

    const createSoldierBtn = document.getElementById('createSoldierBtn');
    if (createSoldierBtn) {
      createSoldierBtn.disabled = !canCreateSoldier();
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

  if (cell.owner) {
    domCell.classList.add(`player${cell.owner}`);

    if (cell.soldiers > 0) {
      const symbol = cell.isColony ? '🏰' : '⚔️';
      domCell.innerHTML = `
        ${symbol}
        <span class="soldier-count">${cell.soldiers}</span>
      `;
      console.log(
        `DOM actualizado celda ${index}: ${symbol} con ${cell.soldiers} soldados`,
      );
    } else {
      domCell.innerHTML = cell.isColony ? '🏰' : '';
    }
  } else {
    // Mostrar el valor de energía en lugar del símbolo del elemento
    const energyValue = getElementEnergyValue(cell.element);

    // Añadir clase según valor de energía
    domCell.classList.add(`energy-${energyValue}`);

    domCell.innerHTML = `<span class="energy-value">+${energyValue}⚡</span>`;
  }
}

// Manejar el clic en una celda
function handleCellClick(index) {
  const cell = gameState.board[index];
  console.log(
    `Clic en celda ${index}, propietario: ${cell.owner}, soldados: ${cell.soldiers}`,
  );

  // No permitir acciones si es el turno de la IA
  if (gameState.currentPlayer === 2 && gameState.players[2].isAI) {
    console.log('Es el turno de la IA, ignorando clic');
    return;
  }

  // Si estamos en modo de selección de cofradía
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
  const row = Math.floor(index / 5);
  const col = index % 5;

  for (let i = 0; i < BOARD_SIZE; i++) {
    const targetRow = Math.floor(i / 5);
    const targetCol = i % 5;

    if (Math.abs(targetRow - row) <= 1 && Math.abs(targetCol - col) <= 1) {
      const cell = document.querySelector(`[data-index="${i}"]`);
      if (cell) {
        cell.classList.add('valid-move');
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

  const fromRow = Math.floor(from / 5);
  const fromCol = from % 5;
  const toRow = Math.floor(to / 5);
  const toCol = to % 5;

  // Verificar que el movimiento sea a una casilla adyacente
  return (
    Math.abs(fromRow - toRow) <= 1 &&
    Math.abs(fromCol - toCol) <= 1 &&
    from !== to
  );
}

// Mover unidades (implementa el sistema de puntos según las reglas)
function moveUnits(from, to) {
  const fromCell = gameState.board[from];
  const toCell = gameState.board[to];

  console.log(
    `Moviendo de celda ${from} (${fromCell.soldiers} soldados) a celda ${to} (${toCell.soldiers} soldados)`,
  );

  if (toCell.owner !== gameState.currentPlayer) {
    // Combate
    console.log(
      `Combate: Atacante ${fromCell.soldiers} vs Defensor ${toCell.soldiers}`,
    );

    // Aplicar sistema de puntos según las reglas
    if (fromCell.soldiers > toCell.soldiers) {
      // Victoria
      const oldOwner = toCell.owner;
      toCell.owner = gameState.currentPlayer;

      // Generar energía por conquistar territorio (enemigo o neutral)
      generateEnergyFromConquest(to, oldOwner !== null);

      // Si es territorio neutral
      if (toCell.soldiers === 0) {
        toCell.soldiers = fromCell.soldiers;
      } else {
        // Sistema de puntos según las reglas
        if (fromCell.soldiers === 1 || fromCell.soldiers === 2) {
          toCell.soldiers = 1; // 1-2 ⚔️: 1 soldado
        } else if (fromCell.soldiers === 3) {
          toCell.soldiers = 2; // 3 ⚔️: 2 soldados
        } else if (fromCell.soldiers >= 4) {
          // 4+ ⚔️: 3 soldados o cofradía
          if (
            !toCell.isColony &&
            fromCell.soldiers >= COLONY_CAPTURE_THRESHOLD
          ) {
            toCell.isColony = true;
            toCell.soldiers = 3; // Cofradía con 3 soldados
            console.log(`¡Nueva cofradía establecida en celda ${to}!`);
            gameState.players[gameState.currentPlayer].colonies.push(to);
          } else {
            toCell.soldiers = 3;
          }
        }
      }

      fromCell.soldiers = 0;

      // Si es una colonia enemiga
      if (toCell.isColony) {
        const enemyPlayer = gameState.currentPlayer === 1 ? 2 : 1;
        const colonyIndex = gameState.players[enemyPlayer].colonies.indexOf(to);
        if (colonyIndex > -1) {
          gameState.players[enemyPlayer].colonies.splice(colonyIndex, 1);
          gameState.players[gameState.currentPlayer].colonies.push(to);
          console.log(`¡Colonia enemiga capturada en celda ${to}!`);
        }
        checkVictory();
      }
    } else {
      // Derrota o empate
      toCell.soldiers -= fromCell.soldiers;
      fromCell.soldiers = 0;
    }
  } else {
    // Movimiento amistoso
    toCell.soldiers += fromCell.soldiers;
    fromCell.soldiers = 0;
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
    [ELEMENTS.EARTH]: '🌍',
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

    // Ya no generamos energía automáticamente al final del turno

    // Verificar victoria antes de cambiar de jugador
    checkVictory();

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

    // Decisiones inteligentes según la fase del juego
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
