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
    type: "property" | "utility" | "chance" | "chest" | "tax" | "go" | "jail" | "jackpot" | "move";
    name: string;
    price: number;
    rent: number[];
    owner: string | null;
    group?: string;
  }[];
  currentPlayer: number;
  readyPlayers: string[];
  gameStarted: boolean;
};

const PLAYER_COLORS = ['#FF4500', '#0079D3', '#00B159', '#7193FF', '#FF4F64'];
const BOARD_SPACES: GameState['properties'] = [
  { id: 0, type: 'go', name: 'GO', price: 0, rent: [0], owner: null },
  { id: 1, type: 'property', name: 'r/EarthPorn', price: 60, rent: [2, 10, 30, 90, 160, 250], owner: null, group: 'Brown' },
  { id: 2, type: 'chest', name: 'Community Chest', price: 0, rent: [0], owner: null },
  { id: 3, type: 'property', name: 'r/food', price: 60, rent: [4, 20, 60, 180, 320, 450], owner: null, group: 'Brown' },
  { id: 4, type: 'tax', name: 'Income Tax', price: 200, rent: [200], owner: null },
  { id: 5, type: 'move', name: 'Move', price: 0, rent: [0], owner: null }, // Move to r/aww 
  { id: 6, type: 'property', name: 'r/mildlyinteresting', price: 100, rent: [6, 30, 90, 270, 400, 550], owner: null, group: 'Light Blue' },
  { id: 7, type: 'chance', name: 'Chance', price: 0, rent: [0], owner: null },
  { id: 8, type: 'property', name: 'r/nottheonion', price: 100, rent: [6, 30, 90, 270, 400, 550], owner: null, group: 'Light Blue' },
  { id: 9, type: 'property', name: 'r/books', price: 120, rent: [8, 40, 100, 300, 450, 600], owner: null, group: 'Light Blue' },
  { id: 10, type: 'jail', name: 'Jail / Just Visiting', price: 0, rent: [0], owner: null },
  { id: 11, type: 'property', name: 'r/DIY', price: 140, rent: [10, 50, 150, 450, 625, 750], owner: null, group: 'Pink' },
  { id: 12, type: 'utility', name: 'u/AutoModerator', price: 150, rent: [4], owner: null }, // Example rent calculation, adapt as needed
  { id: 13, type: 'property', name: 'r/askscience', price: 140, rent: [10, 50, 150, 450, 625, 750], owner: null, group: 'Pink' },
  { id: 14, type: 'property', name: 'r/videos', price: 160, rent: [12, 60, 180, 500, 700, 900], owner: null, group: 'Pink' },
  { id: 15, type: 'move', name: 'Move', price: 0, rent: [0], owner: null }, //Placeholder move, adjust target as needed
  { id: 16, type: 'property', name: 'r/space', price: 180, rent: [14, 70, 200, 550, 750, 950], owner: null, group: 'Orange' },
  { id: 17, type: 'chest', name: 'Community Chest', price: 0, rent: [0], owner: null },
  { id: 18, type: 'property', name: 'r/Jokes', price: 180, rent: [14, 70, 200, 550, 750, 950], owner: null, group: 'Orange' },
  { id: 19, type: 'property', name: 'r/pics', price: 200, rent: [16, 80, 220, 600, 800, 1000], owner: null, group: 'Orange' },
  { id: 20, type: 'jackpot', name: 'Jackpot', price: 0, rent: [0], owner: null }, // Special rule space,  adapt as needed
  { id: 21, type: 'property', name: 'r/Showerthoughts', price: 220, rent: [18, 90, 250, 700, 875, 1050], owner: null, group: 'Red' },
  { id: 22, type: 'chance', name: 'Chance', price: 0, rent: [0], owner: null },
  { id: 23, type: 'property', name: 'r/science', price: 220, rent: [18, 90, 250, 700, 875, 1050], owner: null, group: 'Red' },
  { id: 24, type: 'property', name: 'r/movies', price: 240, rent: [20, 100, 300, 750, 925, 1100], owner: null, group: 'Red' },
  { id: 25, type: 'move', name: 'Move', price: 0, rent: [0], owner: null },  // Placeholder, adjust as needed
  { id: 26, type: 'property', name: 'r/memes', price: 260, rent: [22, 110, 330, 800, 975, 1150], owner: null, group: 'Yellow' },
  { id: 27, type: 'property', name: 'r/music', price: 260, rent: [22, 110, 330, 800, 975, 1150], owner: null, group: 'Yellow' },
  { id: 28, type: 'utility', name: 'u/RemindMeBot', price: 150, rent: [4], owner: null }, // Example rent calculation, adapt as needed
  { id: 29, type: 'property', name: 'r/aww', price: 280, rent: [24, 120, 360, 850, 1025, 1200], owner: null, group: 'Yellow' },
  { id: 30, type: 'jail', name: 'Go To Jail', price: 0, rent: [0], owner: null },
  { id: 31, type: 'property', name: 'r/todayilearned', price: 300, rent: [26, 130, 390, 900, 1100, 1275], owner: null, group: 'Green' },
  { id: 32, type: 'property', name: 'r/worldnews', price: 300, rent: [26, 130, 390, 900, 1100, 1275], owner: null, group: 'Green' },
  { id: 33, type: 'chest', name: 'Community Chest', price: 0, rent: [0], owner: null },
  { id: 34, type: 'property', name: 'r/gaming', price: 320, rent: [28, 150, 450, 1000, 1200, 1400], owner: null, group: 'Green' },
  { id: 35, type: 'move', name: 'Move', price: 0, rent: [0], owner: null }, //Placeholder move, adjust as needed
  { id: 36, type: 'chance', name: 'Chance', price: 0, rent: [0], owner: null },
  { id: 37, type: 'property', name: 'r/AskReddit', price: 350, rent: [35, 175, 500, 1100, 1300, 1500], owner: null, group: 'Dark Blue' },
  { id: 38, type: 'tax', name: 'Luxury Tax', price: 75, rent: [75], owner: null },
  { id: 39, type: 'property', name: 'r/funny', price: 400, rent: [50, 200, 600, 1400, 1700, 2000], owner: null, group: 'Dark Blue' },
];

Devvit.configure({
  redditAPI: true,
  redis: true,
});

Devvit.addCustomPostType({
  name: 'Reddit estates',
  height: 'tall',
  render: (context) => {
    const [players, setPlayers] = useState<Player[]>([]);
    const [gameState, setGameState] = useState<GameState | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [timer, setTimer] = useState(10);
    const [turnTimer, setTurnTimer] = useState<NodeJS.Timeout | null>(null);

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
        context.ui.webView.postMessage('estatesBoard', {
          type: 'updateGameState',
          data: {
            currentPlayer: gameState.currentPlayer,
            players: gameState.players,
            properties: gameState.properties,
            currentUserId: (await context.reddit.getCurrentUser())?.id || '',
            timer: timer
          }
        });
      }
    }, 1000).start();
    // Add a comment handler that parses comments for auction bids
    Devvit.addTrigger({
      event: 'CommentCreate',
      async onEvent(event, context) {
        // Ensure we have a postId to work with
        if (!context.postId) return;

        const comment = event.comment;
        if (!comment) return;
        const auctionCommentMatch = comment.body.match(/🏠 Auction started for (.*?)!\n/);

        if (!auctionCommentMatch) return;

        const propertyName = auctionCommentMatch[1];
        const bidMatch = comment.body.match(/^#(\d+)$/);

        if (bidMatch) {
          const bidAmount = parseInt(bidMatch[1], 10);
          let bidder: User | undefined;
          try {
            bidder = await context.reddit.getUserById(comment.author);
          } catch (error) {
            console.error('Error fetching user:', error);
            return;
          }

          // Check if bidder is undefined before using
          if (!bidder) {
            return;
          }

          try {
            // Check if the auction comment is a direct child of the original auction start comment
            const parentComment = await context.reddit.getCommentById(comment.parentId);

            if (!parentComment.body.includes(`🏠 Auction started for ${propertyName}!`)) {
              return; // Not a valid auction bid
            }

            // Validate bid
            await context.reddit.submitComment({
              id: comment.parentId,
              text: `@${bidder.username} bid $${bidAmount}! 
    Current highest bid will be tracked in replies to this comment.`
            });
          } catch (error) {
            console.error('Auction bid processing error:', error);
          }
        }
      }
    });
    const syncGameState = async (updatedState: GameState) => {
      if (!context.postId) return;
      await context.redis.set(`game_${context.postId}`, JSON.stringify(updatedState));
      setGameState(updatedState);
    };

    const handleTurnTimer = async (callback: () => void) => {
      if (turnTimer) clearTimeout(turnTimer);
      setTimer(10);

      const countdown = () => {
        setTimer((prev) => {
          if (prev <= 1) {
            callback();
            return 0;
          }
          const newTimer = prev - 1;
          setTurnTimer(setTimeout(countdown, 1000));
          return newTimer;
        });
      };

      setTurnTimer(setTimeout(countdown, 1000));
    };


    const handlePlayerReady = async (playerId: string) => {
      if (!gameState) return;
      const updatedState = {
        ...gameState,
        readyPlayers: [...gameState.readyPlayers, playerId]
      };
      if (updatedState.readyPlayers.length === updatedState.players.length && updatedState.players.length >= 2) {
        updatedState.gameStarted = true;
      }
      await syncGameState(updatedState);
    };

    const handleJoinGame = async (user: User | undefined) => {
      if (!gameState || gameState.players.length >= 5) return;
      if (gameState.players.find(p => p.username === user?.username)) return;

      const newPlayer: Player = {
        id: user?.id || '',
        username: user?.username || '',
        position: 0,
        money: 1000,
        properties: [],
        color: PLAYER_COLORS[gameState.players.length],
      };

      const updatedState = {
        ...gameState,
        players: [...gameState.players, newPlayer]
      };
      await syncGameState(updatedState);
    };

    const onMessage = async (msg: any) => {
      if (!gameState || !context.postId) return;
      const updatedState = { ...gameState };

      switch (msg.type) {
        case 'rollDice': {
          const playerIndex = updatedState.players.findIndex(p => p.id === msg.data.playerId);
          if (playerIndex !== -1) {
            updatedState.players[playerIndex].position = msg.data.newPosition;
            await syncGameState(updatedState);
          }
          break;
        }

        case 'buyProperty': {
          const buyerIndex = updatedState.players.findIndex(p => p.id === msg.data.playerId);
          const property = updatedState.properties[msg.data.propertyId];
          if (buyerIndex !== -1 && property && !property.owner) {
            updatedState.players[buyerIndex].money -= property.price;
            updatedState.players[buyerIndex].properties.push(property.id.toString());
            property.owner = msg.data.playerId;
            // updatedState.currentPlayer = (updatedState.currentPlayer + 1) % updatedState.players.length;
            await syncGameState(updatedState);

            await context.reddit.submitComment({
              text: `u/${msg.data.playerName} bought ${msg.data.propertyName} for $${msg.data.price}.`,
              id: context.postId
            });
          }
          break;
        }
        case 'buildHouse': {
          const playerIndex = updatedState.players.findIndex(p => p.id === msg.data.playerId);
          const property = updatedState.properties[msg.data.propertyId];
          if (playerIndex !== -1 && property && property.owner === msg.data.playerId) {
            updatedState.players[playerIndex].money -= msg.data.buildCost;

            // Move the rent to the next element in the rent array
            const highestRent = property.rent[property.rent.length - 1];
            property.rent.shift();
            property.rent.push(highestRent);

            // updatedState.currentPlayer = (updatedState.currentPlayer + 1) % updatedState.players.length;
            await syncGameState(updatedState);
          }
          break;
        }

        case 'payRent': {
          const payerIndex = updatedState.players.findIndex(p => p.id === msg.data.fromPlayerId);
          const ownerIndex = updatedState.players.findIndex(p => p.id === msg.data.toPlayerId);
          if (payerIndex !== -1 && ownerIndex !== -1) {
            updatedState.players[payerIndex].money -= msg.data.amount;
            updatedState.players[ownerIndex].money += msg.data.amount;
            // updatedState.currentPlayer = (updatedState.currentPlayer + 1) % updatedState.players.length;
            await syncGameState(updatedState);
          }
          break;
        }

        case 'payTax': {
          const taxPayerIndex = updatedState.players.findIndex(p => p.id === msg.data.playerId);
          if (taxPayerIndex !== -1) {
            updatedState.players[taxPayerIndex].money -= msg.data.amount;
            // updatedState.currentPlayer = (updatedState.currentPlayer + 1) % updatedState.players.length;
            await syncGameState(updatedState);
          }
          break;
        }

        case 'utility': {
          const payerIndex = updatedState.players.findIndex(p => p.id === msg.data.fromPlayerId);
          const ownerIndex = updatedState.players.findIndex(p => p.id === msg.data.toPlayerId);
          if (payerIndex !== -1 && ownerIndex !== -1) {
            updatedState.players[payerIndex].money -= msg.data.amount;
            updatedState.players[ownerIndex].money += msg.data.amount;
            // updatedState.currentPlayer = (updatedState.currentPlayer + 1) % updatedState.players.length;
            await syncGameState(updatedState);
          }
          break;
        }

        case 'go': {
          const playerIndex = updatedState.players.findIndex(p => p.id === msg.data.playerId);
          if (playerIndex !== -1) {
            updatedState.players[playerIndex].money += 200;
            // updatedState.currentPlayer = (updatedState.currentPlayer + 1) % updatedState.players.length;
            await syncGameState(updatedState);
          }
          break;
        }

        case 'jackpot': {
          const playerIndex = updatedState.players.findIndex(p => p.id === msg.data.playerId);
          if (playerIndex !== -1) {
            updatedState.players[playerIndex].money += 500;
            // updatedState.currentPlayer = (updatedState.currentPlayer + 1) % updatedState.players.length;
            await syncGameState(updatedState);
          }
          break;
        }

        case 'move': {
          const playerIndex = updatedState.players.findIndex(p => p.id === msg.data.playerId);
          const targetSpace = updatedState.properties.find(space => space.name === 'r/aww'); // Example target space
          if (playerIndex !== -1 && targetSpace) {
            updatedState.players[playerIndex].position = targetSpace.id;
            handleTurnTimer(() => {
              // updatedState.currentPlayer = (updatedState.currentPlayer + 1) % updatedState.players.length;
              syncGameState(updatedState);
            });
            await syncGameState(updatedState);
          }
          break;
        }
        case 'startAuction': {
          await context.reddit.submitComment({
            text: `🏠 Auction started for ${msg.data.propertyName}! 
        Players, bid by commenting #amount in a reply to this comment. 
        Starting price: $${msg.data.propertyPrice}
        Auction closes in 10 seconds!
        
        How to bid:
        - Reply to this comment with #[your bid amount]
        - Highest bid wins the property
        - Bid must be higher than previous bids
        - Only players in the game can bid`,
            id: context.postId
          });
          break;
        }
        case 'auctionSale': {
          const buyerIndex = updatedState.players.findIndex(p => p.id === msg.data.playerId);
          const property = updatedState.properties[msg.data.propertyId];

          if (buyerIndex !== -1 && property) {
            updatedState.players[buyerIndex].money -= msg.data.price;
            updatedState.players[buyerIndex].properties.push(property.id.toString());
            property.owner = msg.data.playerId;

            await context.reddit.submitComment({
              text: `🔨 Auction won! u/${msg.data.playerName} bought ${msg.data.propertyName} for $${msg.data.price}.`,
              id: context.postId
            });

            await syncGameState(updatedState);
          }
          break;
        }
        case 'turnTimeout': {
          const playerIndex = updatedState.players.findIndex(p => p.id === msg.data.playerId);
          if (playerIndex !== -1) {
            updatedState.currentPlayer = (updatedState.currentPlayer + 1) % updatedState.players.length;
            await syncGameState(updatedState);
          }
          break;
        }
      }
    };

    if (!context.postId || isLoading) {
      return <text>Loading...</text>;
    }

    return !gameState?.gameStarted ? (
      <vstack padding="large" alignment="center" gap="large">
        <text size="xxlarge" weight="bold" color="#cd272c">Reddit estates Lobby</text>
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
          id="estatesBoard"
          url="page.html"
          height={context.dimensions?.width ?? 600 < 600 ? 400 : 600}
          onMessage={onMessage}
        />
      </vstack>
    );
  },
});

export default Devvit;
