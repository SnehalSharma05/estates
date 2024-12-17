class MonopolyGame {
  constructor() {
    this.currentPlayer = null;
    this.players = [];
    this.properties = [];
    this.currentUserId = null;
    this.turnTimerInterval = null;
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
    window.addEventListener('message', (event) => this.handleMessage(event));
  }

  handleTaxLanding(space) {
    const taxAmount = space.rent[0];
    window.parent?.postMessage({
      type: 'payTax',
      data: {
        playerId: this.currentPlayer.id,
        amount: taxAmount
      }
    }, '*');
    this.elements.currentProperty.textContent = `Paid ${taxAmount} in tax`;
    // update player money
    this.currentPlayer.money -= taxAmount;
  }

  handleChanceLanding() {
    const cards = [
      { text: "Advance to GO", action: () => this.currentPlayer.position = 0 },
      { text: "Bank pays dividend of $50", action: () => this.currentPlayer.money += 50 },
      { text: "Pay poor tax of $15", action: () => this.currentPlayer.money -= 15 }
    ];
    const card = cards[Math.floor(Math.random() * cards.length)];
    card.action();
    this.elements.currentProperty.textContent = card.text;
  }

  handleChestLanding() {
    const cards = [
      { text: "Bank error in your favor. Collect $200", action: () => this.currentPlayer.money += 200 },
      { text: "Doctor's fee. Pay $50", action: () => this.currentPlayer.money -= 50 },
      { text: "Life insurance matures. Collect $100", action: () => this.currentPlayer.money += 100 }
    ];
    const card = cards[Math.floor(Math.random() * cards.length)];
    card.action();
    this.elements.currentProperty.textContent = card.text;
  }
  showBuyOptions(property) {
    console.log('showbuyoptions:', property);
    this.elements.propertyActions.classList.remove('hidden');
    this.elements.currentProperty.textContent = property.name;
    this.elements.propertyPrice.textContent = property.price;
    this.elements.propertyRent.textContent = property.rent[0];

    const canBuy = this.currentPlayer.money >= property.price;
    this.elements.buyProperty.disabled = !canBuy;
    this.elements.startAuction.disabled = !canBuy;
  }

  handleJailLanding() {
    this.currentPlayer.position = 10;
    this.elements.currentProperty.textContent = "Just Visiting";
  }
  startTurnTimer(startTime) {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    let timeLeft = Math.max(10 - elapsed, 0);
    if (this.turnTimerInterval) {
      clearInterval(this.turnTimerInterval);
    }
    this.turnTimerInterval = setInterval(() => {
      if (timeLeft <= 0) {
        clearInterval(this.turnTimerInterval);
        this.elements.turnTimer.textContent = '10';
        return;
      }
      this.elements.turnTimer.textContent = timeLeft;
      timeLeft--;
    }, 1000);
  }
  handleRollDice() {
    this.elements.rollDice.disabled = true;
    const diceResult = Math.floor(Math.random() * 12) + 1;
    this.elements.diceResult.innerHTML = `🎲 ${diceResult}`;
    this.startTurnTimer(Date.now());
    const newPosition = (this.currentPlayer.position + diceResult) % this.properties.length;

    this.currentPlayer.position = newPosition;
    this.updatePlayerPositions();
    this.updatePropertyInfo();
    console.log('handlediceroll:', newPosition);
    this.handleLanding(newPosition);
    window.parent?.postMessage({
      type: 'rollDice',
      data: {
        playerId: this.currentPlayer.id,
        newPosition: newPosition,
        propertyName: this.elements.currentProperty.textContent
      }
    }, '*');
  }



  handleLanding(position) {
    const space = this.properties[position];
    console.log('handlelanding:', space);
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
        this.handleJailLanding();
        break;
    }
    this.updateUI();
  }

  handlePropertyLanding(property) {
    console.log('handlepropertylanding:', property);
    if (!property.owner) {
      this.showBuyOptions(property);
    } else if (property.owner !== this.currentPlayer.id) {
      this.handleRentPayment(property);
    }
  }

  handleBuyProperty() {
    const currentSpace = this.properties[this.currentPlayer.position];
    if (this.currentPlayer.money >= currentSpace.price) {
      if (this.turnTimerInterval) {
        clearInterval(this.turnTimerInterval);
      }
      this.elements.turnTimer.textContent = '10';
      // Update local player money immediately
      this.currentPlayer.money -= currentSpace.price;
      this.updateUI(); // Refresh the display
      
      window.parent?.postMessage({
        type: 'buyProperty',
        data: {
          playerId: this.currentPlayer.id,
          propertyId: this.currentPlayer.position,
          price: currentSpace.price
        }
      }, '*');
    }
  }
  

  handleRentPayment(property) {
    const rentAmount = property.rent[0]; // Basic rent for now
    window.parent?.postMessage({
      type: 'payRent',
      data: {
        fromPlayerId: this.currentPlayer.id,
        toPlayerId: property.owner,
        amount: rentAmount
      }
    }, '*');
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
    this.currentPlayer = players[currentPlayer];
    this.players = players;
    this.properties = properties;
    this.currentUserId = currentUserId;

    this.updateUI();
  }

  updateUI() {
    this.elements.currentPlayer.textContent = this.currentPlayer.username;
    this.elements.playerMoney.textContent = this.currentPlayer.money;

    // Only show action buttons if it's the current player's turn
    const isCurrentPlayersTurn = this.currentPlayer.id === this.currentUserId;
    this.elements.rollDice.style.display = isCurrentPlayersTurn ? 'block' : 'none';
    this.elements.propertyActions.style.display = isCurrentPlayersTurn ? 'block' : 'none';

    this.updatePlayerList();
    this.updatePlayerPositions();
  }


  updatePlayerList() {
    if (!this.elements.playerList) return;
    this.elements.playerList.innerHTML = this.players.map(p => `
      <div class="player-item" style="color: ${p.color}">
        <span class="player-name">${p.username}</span>
        <span class="player-money">💰 ${p.money}</span>
        ${p.properties.length ? `<span class="player-properties">🏠 ${p.properties.length}</span>` : ''}
      </div>
    `).join('');
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
      x = this.boardSize - (boardPosition * this.tileSize) - (this.tileSize / 2) + offset;
      y = this.boardSize - (this.tileSize / 2);
    } else if (boardPosition <= 20) {
      x = this.tileSize / 2;
      y = this.boardSize - ((boardPosition - 10) * this.tileSize) - (this.tileSize / 2) + offset;
    } else if (boardPosition <= 30) {
      x = ((boardPosition - 20) * this.tileSize) + (this.tileSize / 2) + offset;
      y = this.tileSize / 2;
    } else {
      x = this.boardSize - (this.tileSize / 2);
      y = ((boardPosition - 30) * this.tileSize) + (this.tileSize / 2) + offset;
    }

    return { x, y };
  }

  updatePropertyInfo() {
    const currentSpace = this.properties[this.currentPlayer.position];
    console.log('updatepropinfo:', currentSpace);
    this.elements.currentProperty.textContent = currentSpace.name;

    if (currentSpace.type === 'property') {
      this.elements.propertyActions.classList.remove('hidden');
      this.elements.propertyPrice.textContent = currentSpace.price;
      this.elements.propertyRent.textContent = currentSpace.rent[0];

      const canBuy = !currentSpace.owner && this.currentPlayer.id === this.currentUserId;
      this.elements.buyProperty.classList.toggle('hidden', !canBuy);
      this.elements.startAuction.classList.toggle('hidden', !canBuy);
    } else {
      this.elements.propertyActions.classList.add('hidden');
    }
  }
}

new MonopolyGame();
