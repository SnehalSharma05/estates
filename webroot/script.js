// Updated script.js
class MonopolyGame {
  constructor() {
    this.currentPlayer = null;
    this.players = [];
    this.properties = [];
    this.currentUserId = null;
    this.turnTimerInterval = null;
    this.timerElement = document.querySelector('#turn-timer');
    this.setupElements();
    this.setupEventListeners();
    this.initializeBoard();
    this.setupAnimations();
  }

  initializeBoard() {
    const boardImage = document.querySelector('#board-image');
    this.boardSize = boardImage.offsetWidth;
    this.tileSize = this.boardSize / 11;
    this.updatePlayerPositions();
  }

  setupAnimations() {
    document.documentElement.style.setProperty('--board-size', `${this.boardSize}px`);
  }

  setupElements() {
    this.elements = {
      currentPlayer: document.querySelector('#current-player'),
      playerMoney: document.querySelector('#player-money'),
      rollDice: document.querySelector('#roll-dice'),
      diceResult: document.querySelector('#dice-result'),
      propertyActions: document.querySelector('#property-actions'),
      currentProperty: document.querySelector('#current-property'),
      propertyPrice: document.querySelector('#property-price'),
      propertyRent: document.querySelector('#property-rent'),
      buyProperty: document.querySelector('#buy-property'),
      startAuction: document.querySelector('#start-auction'),
      buildHouse: document.querySelector('#build-house'),
      auctionInfo: document.querySelector('#auction-info'),
      highestBid: document.querySelector('#highest-bid'),
      auctionTimer: document.querySelector('#auction-timer'),
      pucksContainer: document.querySelector('#pucks-container'),
      playerList: document.querySelector('#player-list'),
      turnTimer: document.querySelector('#turn-timer')
    };
  }

  setupEventListeners() {
    this.elements.rollDice.addEventListener('click', () => this.handleRollDice());
    this.elements.buyProperty.addEventListener('click', () => this.handleBuyProperty());
    this.elements.startAuction.addEventListener('click', () => this.handleStartAuction());
    this.elements.buildHouse.addEventListener('click', () => this.handleBuildHouse());
    window.addEventListener('message', (event) => this.handleMessage(event));
  }

  handleMessage(event) {
    if (event.data.type === 'devvit-message') {
      const gameMessage = event.data.data.message;
      if (gameMessage.type === 'updateGameState') {
        this.updateGameState(gameMessage.data);
      }
    }
  }
  updateGameState({ currentPlayer, players, properties, currentUserId }) {
    if (!players || !properties || currentPlayer === undefined) return;

    this.currentPlayer = players[currentPlayer];
    this.players = players;
    this.properties = properties;
    this.currentUserId = currentUserId;
    this.updateUI();
  }

  startTurnTimer() {
    if (this.turnTimerInterval) {
      clearTimeout(this.turnTimerInterval);
    }

    let timeLeft = 10; // 10 seconds for each turn
    this.elements.turnTimer.textContent = timeLeft;

    const countdown = () => {
      timeLeft--;
      this.elements.turnTimer.textContent = timeLeft;

      if (timeLeft <= 0) {
        // Notify parent about turn timeout
        this.handleTurnTimeout(this.currentPlayer.id);
      } else {
        this.turnTimerInterval = setTimeout(countdown, 1000);
      }
    };

    this.turnTimerInterval = setTimeout(countdown, 1000);
  }
  handleTurnTimeout(playerId) {
    console.log('Turn timeout for player', playerId);
    window.parent?.postMessage(
      {
        type: 'turnTimeout',
        data: {
          playerId: playerId
        }
      },
      '*'
    );
    // Logic to handle turn timeout
    clearTimeout(this.turnTimerInterval);
    this.elements.turnTimer.textContent = 10;
    const playerIndex = this.players.findIndex(p => p.id === playerId);
    if (playerIndex !== -1) {
      this.currentPlayer = (this.currentPlayer + 1) % this.players.length;
      this.elements.rollDice.disabled = false;
      this.elements.currentProperty.textContent = '';
      this.elements.propertyPrice.textContent = '0';
      this.elements.propertyRent.textContent = '0';
      this.elements.propertyActions.classList.add('hidden');
      this.updateUI();
    }
  }

  updateUI() {
    if (!this.currentPlayer) return;
    this.elements.currentPlayer.textContent = this.currentPlayer.username;
    this.elements.playerMoney.textContent = this.currentPlayer.money;

    const isCurrentPlayersTurn = this.currentPlayer.id === this.currentUserId;
    this.elements.rollDice.style.display = isCurrentPlayersTurn ? 'block' : 'none';

    this.updatePlayerList();
    this.updatePlayerPositions();
  }

  updatePlayerList() {
    if (!this.elements.playerList) return;
    this.elements.playerList.innerHTML = this.players
      .map((p) => `
        <div class="player-item" style="color: ${p.color}">
          <span class="player-name">${p.username}</span>
          <span class="player-money">💰 ${p.money}</span>
          ${p.properties.length ? `<span class="player-properties">🏠 ${p.properties.length}</span>` : ''}
        </div>
      `)
      .join('');
  }

  updatePlayerPositions() {
    if (!this.elements.pucksContainer) return;
    this.elements.pucksContainer.innerHTML = '';
    this.players.forEach((player, index) => {
      const puck = document.createElement('div');
      puck.className = 'player-puck';
      puck.id = `puck-${player.id}`;
      puck.style.backgroundColor = player.color;

      const position = this.calculatePuckPosition(player.position, index);
      puck.style.transform = `translate(${position.x}px, ${position.y}px)`;

      this.elements.pucksContainer.appendChild(puck);
    });
  }


  calculatePuckPosition(boardPosition, playerIndex) {
    const offset = playerIndex * 10;
    let x, y;

    if (boardPosition <= 10) {
      x = this.boardSize - boardPosition * this.tileSize - this.tileSize / 2 + offset;
      y = this.boardSize - this.tileSize / 2;
    } else if (boardPosition <= 20) {
      x = this.tileSize / 2;
      y = this.boardSize - (boardPosition - 10) * this.tileSize - this.tileSize / 2 + offset;
    } else if (boardPosition <= 30) {
      x = (boardPosition - 20) * this.tileSize + this.tileSize / 2 + offset;
      y = this.tileSize / 2;
    } else {
      x = this.boardSize - this.tileSize / 2;
      y = (boardPosition - 30) * this.tileSize + this.tileSize / 2 + offset;
    }

    return { x, y };
  }

  handleRollDice() {
    if (this.turnTimerInterval) clearInterval(this.turnTimerInterval);
    this.elements.rollDice.disabled = true;
    const diceResult = Math.floor(Math.random() * 12) + 1;
    this.elements.diceResult.textContent = `🎲 ${diceResult}`;

    const newPosition = (this.currentPlayer.position + diceResult) % this.properties.length;
    this.currentPlayer.position = newPosition;
    this.startTurnTimer();
    this.updateUI();
    this.handleLanding(newPosition);

    window.parent?.postMessage(
      {
        type: 'rollDice',
        data: {
          playerId: this.currentPlayer.id,
          newPosition: newPosition,
          propertyName: this.properties[newPosition]?.name,
        },
      },
      '*'
    );
  }

  handleBuyProperty() {
    const currentSpace = this.properties[this.currentPlayer.position];
    if (currentSpace && this.currentPlayer.money >= currentSpace.price) {
      this.elements.buyProperty.disabled = true; // Prevent double clicks
      window.parent?.postMessage(
        {
          type: 'buyProperty',
          data: {
            playerId: this.currentPlayer.id,
            playerName: this.currentPlayer.username,
            propertyId: this.currentPlayer.position,
            propertyName: currentSpace.name,
            price: currentSpace.price,
          },
        },
        '*'
      );
      clearTimeout(this.turnTimerInterval);
      setTimeout(() => this.handleTurnTimeout(this.currentPlayer.id), 2000);
    }

  }
  handleBuildHouse() {
    const currentSpace = this.properties[this.currentPlayer.position];
    if (currentSpace && currentSpace.owner === this.currentPlayer.id && currentSpace.type === 'property') {
      const buildCost = 100; // Example build cost
      if (this.currentPlayer.money >= buildCost) {
        this.currentPlayer.money -= buildCost;
        const highestRent = currentSpace.rent[currentSpace.rent.length - 1];
        currentSpace.rent.shift();
        currentSpace.rent.push(highestRent);
        window.parent?.postMessage(
          {
            type: 'buildHouse',
            data: {
              playerId: this.currentPlayer.id,
              propertyId: this.currentPlayer.position,
              buildCost: buildCost,
            },
          },
          '*'
        );
        this.updateUI();
      } else {
        alert('Not enough money to build a house.');
      }
    }
  }
  handleLanding(position) {
    const space = this.properties[position];
    if (!space) return;
    switch (space.type) {
      case 'property':
        this.handlePropertyLanding(space);
        break;
      case 'tax':
        this.handleTaxLanding(space);
        break;
      case 'chance':
        this.handleChanceLanding();
        break;
      case 'chest':
        this.handleChestLanding();
        break;
      case 'jail':
        this.handleJailLanding(space);
        break;
      case 'utility':
        this.handleUtilityLanding(space);
        break;
      case 'go':
        this.handleGoLanding();
        break;
      case 'jackpot':
        this.handleJackpotLanding();
        break;
      case 'move':
        this.handleMoveLanding();
        break;
    }
  }
  handleGoLanding() {
    this.currentPlayer.money += 200;
    window.parent?.postMessage(
      {
        type: 'go',
        data: {
          playerId: this.currentPlayer.id,
        },
      },
      '*'
    );
    setTimqout(() => this.handleTurnTimeout(this.currentPlayer.id), 2000);
    this.handleTurnTimeout(this.currentPlayer.id);
  }
  handleJailLanding(jailSpace) {
    if (jailSpace.name === 'Go To Jail') {
      this.currentPlayer.position = this.properties.find(space => space.name === 'Jail / Just Visiting').id;
      this.currentPlayer.skipTurn = true; // Example rule: player skips next turn
      this.updateUI();
    } else {
      // Just visiting, no action needed
    }
    setTimeout(() => this.handleTurnTimeout(this.currentPlayer.id), 2000);
  }
  handlePropertyLanding(property) {
    if (!property.owner) {
      this.showBuyOptions(property);
    } else if (property.owner !== this.currentPlayer.id) {
      this.handleRentPayment(property);
    } else {
      this.showBuildOptions(property);
    }
  }
  showBuildOptions(property) {
    this.elements.propertyActions.classList.remove('hidden');
    this.elements.currentProperty.textContent = property.name;
    this.elements.propertyPrice.textContent = property.price;
    this.elements.propertyRent.textContent = property.rent[0];

    this.elements.buyProperty.style.display = 'none';
    this.elements.startAuction.style.display = 'none';
    this.elements.buildHouse.style.display = 'block';
  }
  handleUtilityLanding(utility) {
    if (!utility.owner) {
      this.showBuyOptions(utility);
    } else if (utility.owner !== this.currentPlayer.id) {
      const diceResult = Math.floor(Math.random() * 12) + 1;
      const rent = diceResult * 4; // Example rent calculation
      this.handleRentPayment({ ...utility, rent: [rent] });
      window.parent?.postMessage(
        {
          type: 'utility',
          data: {
            fromPlayerId: this.currentPlayer.id,
            toPlayerId: utility.owner,
            amount: rent,
          },
        },
        '*'
      );
      this.handleTurnTimeout(this.currentPlayer.id);
    }
  }


  handleJackpotLanding() {
    this.currentPlayer.money += 500;
    window.parent?.postMessage(
      {
        type: 'jackpot',
        data: {
          playerId: this.currentPlayer.id,
        },
      },
      '*'
    );
    setTimeout(() => this.handleTurnTimeout(this.currentPlayer.id), 2000);
  }


  handleMoveLanding() {
    const newPosition = Math.floor(Math.random() * 39) + 1;
    this.currentPlayer.position = newPosition;
    window.parent?.postMessage(
      {
        type: 'move',
        data: {
          playerId: this.currentPlayer.id,
          newPosition: newPosition,
        },
      },
      '*'
    );
    this.updateUI();
    this.handleLanding(newPosition);
  }
  showBuyOptions(property) {
    this.elements.propertyActions.classList.remove('hidden');
    this.elements.currentProperty.textContent = property.name;
    this.elements.propertyPrice.textContent = property.price;
    this.elements.propertyRent.textContent = property.rent[0];

    const isOwner = property.owner === this.currentPlayer.id;
    const isPropertyOrUtility = property.type === 'property' || property.type === 'utility';

    this.elements.buyProperty.style.display = isPropertyOrUtility && !isOwner ? 'block' : 'none';
    this.elements.startAuction.style.display = isPropertyOrUtility && !isOwner ? 'block' : 'none';
    this.elements.buildHouse.style.display = isOwner && property.type === 'property' ? 'block' : 'none';
    this.elements.buyProperty.disabled = this.currentPlayer.money < property.price;
  }

  handleRentPayment(property) {
    this.currentPlayer.money -= property.rent[0];
    window.parent?.postMessage(
      {
        type: 'payRent',
        data: {
          fromPlayerId: this.currentPlayer.id,
          toPlayerId: property.owner,
          amount: property.rent[0],
        },
      },
      '*'
    );
    this.handleTurnTimeout(this.currentPlayer.id);
  }

  handleTaxLanding(space) {
    const taxAmount = space.rent[0];
    this.currentPlayer.money -= taxAmount;
    window.parent?.postMessage(
      {
        type: 'payTax',
        data: {
          playerId: this.currentPlayer.id,
          amount: taxAmount,
        },
      },
      '*'
    );
    setTimeout(() => this.handleTurnTimeout(this.currentPlayer.id), 2000);
  }

  handleChanceLanding() {
    const cards = [
      { text: 'Advance to GO', action: () => (this.currentPlayer.position = 0) },
      { text: 'Bank pays dividend of $50', action: () => (this.currentPlayer.money += 50) },
      { text: 'Pay poor tax of $15', action: () => (this.currentPlayer.money -= 15) },
    ];

    const card = cards[Math.floor(Math.random() * cards.length)];
    card.action();
    this.elements.currentProperty.textContent = card.text;
    setTimeout(() => this.handleLanding(this.currentPlayer.position), 2000);
  }

  handleChestLanding() {
    const cards = [
      { text: 'Bank error in your favor. Collect $200', action: () => (this.currentPlayer.money += 200) },
      { text: "Doctor's fee. Pay $50", action: () => (this.currentPlayer.money -= 50) },
      { text: 'Life insurance matures. Collect $100', action: () => (this.currentPlayer.money += 100) },
    ];

    const card = cards[Math.floor(Math.random() * cards.length)];
    card.action();
    this.elements.currentProperty.textContent = card.text;
    setTimeout(() => this.handleLanding(this.currentPlayer.position), 2000);
  }
}

new MonopolyGame();
