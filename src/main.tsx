import { Devvit, useState, useAsync, useInterval, User } from '@devvit/public-api';
import './createPost.js';

type Player = {
  id: string;
  username: string;
  position: number;
  money: number;
  properties: string[];
  color?: string;
  skipTurn?: boolean;
};

type GameState = {
  players: Player[];
  properties: {
    id: number;
    type: "property" | "utility" | "chance" | "chest" | "tax" | "go" | "jail";
    name: string;
    price: number;
    rent: number[];
    owner: string | null;
  }[];
  currentPlayer: number;
  readyPlayers: string[];
  gameStarted: boolean;
};

const PLAYER_COLORS = ['#FF4500', '#0079D3', '#00B159', '#7193FF', '#FF4F64'];
const BOARD_SPACES: GameState['properties'] = [
  { id: 0, type: 'go', name: 'GO', price: 0, rent: [0], owner: null },
  { id: 1, type: 'property', name: 'r/funny', price: 60, rent: [2, 10, 30, 90, 160, 250], owner: null },
  { id: 2, type: 'chest', name: 'Community Chest', price: 0, rent: [0], owner: null },
  { id: 3, type: 'property', name: 'r/pics', price: 60, rent: [4, 20, 60, 180, 320, 450], owner: null },
  { id: 4, type: 'tax', name: 'Income Tax', price: 200, rent: [200], owner: null },
  { id: 5, type: 'property', name: 'r/gaming', price: 200, rent: [25, 50, 100, 200], owner: null },
  { id: 6, type: 'property', name: 'r/movies', price: 100, rent: [6, 30, 90, 270, 400, 550], owner: null },
  { id: 7, type: 'chance', name: 'Chance', price: 0, rent: [0], owner: null },
  { id: 8, type: 'property', name: 'r/music', price: 100, rent: [6, 30, 90, 270, 400, 550], owner: null },
  { id: 9, type: 'property', name: 'r/books', price: 120, rent: [8, 40, 100, 300, 450, 600], owner: null },
  { id: 10, type: 'jail', name: 'Jail', price: 0, rent: [0], owner: null }
];

Devvit.configure({
  redditAPI: true,
  redis: true,
});

Devvit.addCustomPostType({
  name: 'Reddit Monopoly',
  height: 'tall',
  render: (context) => {
    const [players, setPlayers] = useState<Player[]>([]);
    const [gameState, setGameState] = useState<GameState | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useInterval(async () => {
      try {
        if (!context.postId) return;

        const storedState = await context.redis.get(`game_${context.postId}`);
        if (storedState) {
          const parsedState = JSON.parse(storedState);
          setGameState(parsedState);
        } else {
          const newGameState = {
            players: [],
            properties: BOARD_SPACES,
            currentPlayer: 0,
            readyPlayers: [],
            gameStarted: false
          };
          await context.redis.set(`game_${context.postId}`, JSON.stringify(newGameState));
          setGameState(newGameState);
        }
      } finally {
        setIsLoading(false);
      }

      if (gameState?.gameStarted) {
        context.ui.webView.postMessage('monopolyBoard', {
          type: 'updateGameState',
          data: {
            currentPlayer: gameState.currentPlayer,
            players: gameState.players,
            properties: gameState.properties,
            currentUserId: (await context.reddit.getCurrentUser())?.id || ''
          }
        });
      }
    }, 1000).start();

    const handlePlayerReady = async (playerId: string) => {
      if (!gameState) return;
      const updatedState = {
        ...gameState,
        readyPlayers: [...gameState.readyPlayers, playerId]
      };
      if (updatedState.readyPlayers.length === updatedState.players.length && updatedState.players.length >= 2) {
        updatedState.gameStarted = true;
      }
      await context.redis.set(`game_${context.postId}`, JSON.stringify(updatedState));
      setGameState(updatedState);
    };

    const handleJoinGame = async (user: User | undefined) => {
      if (!gameState || gameState.players.length >= 5) return;
      if (gameState.players.find(p => p.username === user?.username)) return;

      const newPlayer: Player = {
        id: user?.id || '',
        username: user?.username || '',
        position: 0,
        money: 1500,
        properties: [],
        color: PLAYER_COLORS[gameState.players.length],
      };

      const updatedState = {
        ...gameState,
        players: [...gameState.players, newPlayer]
      };
      await context.redis.set(`game_${context.postId}`, JSON.stringify(updatedState));
      setGameState(updatedState);
    };
    const onMessage = async (msg: any) => {
      if (!gameState || !context.postId) return;
      const updatedState = { ...gameState };
      let turnChangeTimeout: number = 0;
      switch (msg.type) {
        case 'rollDice':
          const playerIndex = updatedState.players.findIndex(p => p.id === msg.data.playerId);
          if (playerIndex !== -1) {
            updatedState.players[playerIndex].position = msg.data.newPosition;
            await context.redis.set(`game_${context.postId}`, JSON.stringify(updatedState));
            setGameState(updatedState);

            turnChangeTimeout = setTimeout(async () => {
              updatedState.currentPlayer = (updatedState.currentPlayer + 1) % updatedState.players.length;
              await context.redis.set(`game_${context.postId}`, JSON.stringify(updatedState));
              setGameState(updatedState);
            }, 9500);
          }
          break;

          case 'buyProperty':
            if (turnChangeTimeout) {
              clearTimeout(turnChangeTimeout);
            }
            const buyerIndex = updatedState.players.findIndex(p => p.id === msg.data.playerId);
            if (buyerIndex !== -1) {
              const property = updatedState.properties[msg.data.propertyId];
              if (property && !property.owner) {
                // Create new player object with updated money
                updatedState.players[buyerIndex] = {
                  ...updatedState.players[buyerIndex],
                  money: updatedState.players[buyerIndex].money - property.price,
                  properties: [...updatedState.players[buyerIndex].properties, msg.data.propertyId.toString()]
                };
                
                // Update property owner
                updatedState.properties[msg.data.propertyId] = {
                  ...property,
                  owner: msg.data.playerId
                };
                
                // Advance turn
                updatedState.currentPlayer = (updatedState.currentPlayer + 1) % updatedState.players.length;
                
                // Save and broadcast new state
                await context.redis.set(`game_${context.postId}`, JSON.stringify(updatedState));
                setGameState(updatedState);
              }
            }
            break;
          


        case 'payRent':
          const payerIndex = updatedState.players.findIndex(p => p.id === msg.data.fromPlayerId);
          const ownerIndex = updatedState.players.findIndex(p => p.id === msg.data.toPlayerId);
          if (payerIndex !== -1 && ownerIndex !== -1) {
            updatedState.players[payerIndex].money -= msg.data.amount;
            updatedState.players[ownerIndex].money += msg.data.amount;
            await context.redis.set(`game_${context.postId}`, JSON.stringify(updatedState));
            setGameState(updatedState);
          }
          break;

        case 'payTax':
          const taxPayerIndex = updatedState.players.findIndex(p => p.id === msg.data.playerId);
          if (taxPayerIndex !== -1) {
            updatedState.players[taxPayerIndex].money -= msg.data.amount;
            await context.redis.set(`game_${context.postId}`, JSON.stringify(updatedState));
            setGameState(updatedState);
          }
          break;
      }
    };








    if (!context.postId || isLoading) {
      return <text>Loading...</text>;
    }

    return !gameState?.gameStarted ? (
      <vstack padding="large" alignment="center" gap="large">
        <text size="xxlarge" weight="bold" color="#cd272c">Reddit Monopoly Lobby</text>
        <vstack gap="medium" width="100%" alignment="center">
          <text size="large">Players ({gameState?.players.length || 0}/5)</text>
          {gameState?.players?.map((p) => (
            <hstack key={p.id} gap="medium" width="100%" alignment="center">
              <text color={p.color} weight="bold">{p.username}</text>
              <text>💰 {p.money}</text>
              {!gameState.readyPlayers.includes(p.id) && p.id === context.userId && (
                <button onPress={() => handlePlayerReady(p.id)}>Ready</button>
              )}
              {gameState.readyPlayers.includes(p.id) && (
                <text color="green">✓ Ready</text>
              )}
            </hstack>
          )) || null}
        </vstack>
        {(!gameState?.players.length || gameState.players.length < 5) && (
          <button onPress={async () => handleJoinGame(await context.reddit.getCurrentUser())}>
            Join Game
          </button>
        )}
        <text>Ready: {gameState?.readyPlayers.length || 0}/{gameState?.players.length || 0} players</text>
      </vstack>
    ) : (
      <vstack height="100%">
        <webview
          id="monopolyBoard"
          url="page.html"
          height={context.dimensions?.width ?? 600 < 600 ? 400 : 600}
          onMessage={onMessage}
        />
      </vstack>
    );
  },
});

export default Devvit;
