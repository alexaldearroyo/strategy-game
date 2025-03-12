// Constantes del juego
const BOARD_SIZE = 35;
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
  phase: 'SELECT', // SELECT, MOVE, ATTACK
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
  const player1Colony = Math.floor(Math.random() * 7);
  placeColony(player1Colony, 1);
  console.log('Colonia Jugador 1 colocada en: ' + player1Colony);

  // Colonia del jugador 2 (abajo)
  const player2Colony = BOARD_SIZE - 7 + Math.floor(Math.random() * 7);
  placeColony(player2Colony, 2);
  console.log('Colonia Jugador 2 colocada en: ' + player2Colony);
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

  // Mostrar interfaz de selección de colonia si hay más de una
  if (player.colonies.length > 1) {
    showColonySelectionInterface();
    return;
  }

  // Si solo hay una colonia, crear soldado allí automáticamente
  createSoldierInColony(player.colonies[0]);
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

  // Actualizar el contador total de soldados del jugador
  player.soldiers += 1;

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

  // Terminar el turno automáticamente después de un breve retraso
  setTimeout(() => {
    console.log('Terminando turno después de crear soldado');
    endTurn(gameState.currentPlayer);
  }, 100);
}

// Mostrar interfaz para seleccionar colonia
function showColonySelectionInterface() {
  // Eliminar interfaz anterior si existe
  const oldInterface = document.getElementById('colonySelectionInterface');
  if (oldInterface) {
    oldInterface.remove();
  }

  const player = gameState.players[gameState.currentPlayer];

  // Crear contenedor para la interfaz
  const selectionInterface = document.createElement('div');
  selectionInterface.id = 'colonySelectionInterface';
  selectionInterface.className = 'colony-selection-interface';

  // Título
  const title = document.createElement('h3');
  title.textContent = 'Selecciona una cofradía para crear tu soldado:';
  selectionInterface.appendChild(title);

  // Contenedor para las opciones
  const optionsContainer = document.createElement('div');
  optionsContainer.className = 'colony-options';

  // Crear botones para cada colonia
  player.colonies.forEach(colonyIndex => {
    const colony = gameState.board[colonyIndex];
    const colonyBtn = document.createElement('button');
    colonyBtn.className = 'colony-option';
    colonyBtn.innerHTML = `
      <span class="colony-index">Cofradía ${colonyIndex}</span>
      <span class="colony-element">${getElementSymbol(colony.element)}</span>
      <span class="colony-soldiers">🛡️ ${colony.soldiers}</span>
    `;

    // Resaltar la colonia cuando se hace hover sobre el botón
    colonyBtn.addEventListener('mouseover', () => {
      highlightColony(colonyIndex);
    });

    colonyBtn.addEventListener('mouseout', () => {
      clearHighlights();
    });

    // Seleccionar la colonia al hacer clic
    colonyBtn.addEventListener('click', () => {
      clearHighlights();
      createSoldierInColony(colonyIndex);
    });

    optionsContainer.appendChild(colonyBtn);
  });

  selectionInterface.appendChild(optionsContainer);

  // Botón para cancelar
  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'Cancelar';
  cancelBtn.className = 'cancel-button';
  cancelBtn.addEventListener('click', () => {
    selectionInterface.remove();
    clearHighlights();
  });

  selectionInterface.appendChild(cancelBtn);

  // Añadir la interfaz al contenedor del juego
  document.querySelector('.game-container').appendChild(selectionInterface);
}

// Función para resaltar una colonia
function highlightColony(colonyIndex) {
  clearHighlights();
  const cell = document.querySelector(`[data-index="${colonyIndex}"]`);
  if (cell) {
    cell.style.border = '3px solid green';
    cell.style.boxShadow = '0 0 15px rgba(0, 255, 0, 0.7)';
  }
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
    domCell.innerHTML = getElementSymbol(cell.element);
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
  const row = Math.floor(index / 7);
  const col = index % 7;

  for (let i = 0; i < BOARD_SIZE; i++) {
    const targetRow = Math.floor(i / 7);
    const targetCol = i % 7;

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

  const fromRow = Math.floor(from / 7);
  const fromCol = from % 7;
  const toRow = Math.floor(to / 7);
  const toCol = to % 7;

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

  // Actualizar las celdas en el DOM
  updateCellDOM(from);
  updateCellDOM(to);
  updateUI();

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
  const player1Colonies = gameState.players[1].colonies.length;
  const player2Colonies = gameState.players[2].colonies.length;

  if (player1Colonies === 0) {
    alert('¡Jugador 2 ha ganado!');
    resetGame();
  } else if (player2Colonies === 0) {
    alert('¡Jugador 1 ha ganado!');
    resetGame();
  }
}

// Reiniciar juego
function resetGame() {
  initGame();
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

    // Cambiar al siguiente jugador
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
    // Intentar crear un soldado primero si es posible
    if (canCreateSoldier()) {
      console.log('IA creando soldado');
      // Para la IA, seleccionar la colonia con más soldados para reforzarla
      const player = gameState.players[2];
      let bestColony = player.colonies[0];
      let maxSoldiers = gameState.board[bestColony].soldiers;

      player.colonies.forEach(colonyIndex => {
        const colony = gameState.board[colonyIndex];
        if (colony.soldiers > maxSoldiers) {
          maxSoldiers = colony.soldiers;
          bestColony = colonyIndex;
        }
      });

      console.log(`IA selecciona colonia ${bestColony} para crear soldado`);
      createSoldierInColony(bestColony);
      return; // La IA solo hace una acción por turno
    }

    // Luego intentar mover
    const aiMove = calculateAIMove();
    if (aiMove) {
      console.log(`IA moviendo de ${aiMove.from} a ${aiMove.to}`);
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
          });
        }
      }
    }
  });

  console.log(`IA encontró ${possibleMoves.length} movimientos posibles`);

  // Encontrar el mejor movimiento
  if (possibleMoves.length > 0) {
    possibleMoves.sort((a, b) => b.score - a.score);
    return possibleMoves[0];
  }

  return null;
}

// Evaluar la calidad de un movimiento
function evaluateMove(from, to) {
  const fromCell = gameState.board[from];
  const toCell = gameState.board[to];
  let score = 0;

  // Preferir atacar casillas enemigas
  if (toCell.owner === 1) {
    score += 100;
    // Bonus si podemos ganar el combate
    if (fromCell.soldiers > toCell.soldiers) {
      score += 50;
      // Bonus extra por capturar colonias
      if (toCell.isColony) {
        score += 200;
      }
    }
  }

  // Bonus por moverse a casillas del mismo elemento
  if (fromCell.element === toCell.element) {
    score += 30;
  }

  // Bonus por acercarse a las colonias enemigas
  gameState.players[1].colonies.forEach((colonyIndex) => {
    const distance = calculateDistance(to, colonyIndex);
    score += (10 - distance) * 5;
  });

  return score;
}

// Calcular distancia entre dos casillas
function calculateDistance(index1, index2) {
  const row1 = Math.floor(index1 / 7);
  const col1 = index1 % 7;
  const row2 = Math.floor(index2 / 7);
  const col2 = index2 % 7;

  return Math.abs(row1 - row2) + Math.abs(col1 - col2);
}

// Ejecutar movimiento de la IA
function executeAIMove(move) {
  // Simular selección visual para la IA
  const fromCell = document.querySelector(`[data-index="${move.from}"]`);
  if (fromCell) {
    fromCell.classList.add('valid-move');

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
