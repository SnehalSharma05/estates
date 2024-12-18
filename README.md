## Estates: A Reddit-Themed Property Trading Game

This document outlines the structure and features of Redditopoly, a board game inspired by Monopoly, with a Reddit twist.  It leverages Redis for state management, offers a web interface via webview, and integrates with the Reddit API for user interaction.

### Game Structure

* **Players:** 2-5 players
* **Board:**  Reddit-themed properties (subreddits, popular memes, etc.) and spaces (e.g., r/all, r/AskReddit, r/memes,  "Get a Ban Hammer" (Go To Jail), "Mod Abuse" (Chance), etc.)
* **State Management:** Redis
* **Interface:** Webview

### Key Features

* **Property Trading:** Players can trade properties with each other.
* **Auction Mechanism:**  Unsold properties and foreclosed properties are auctioned. Bidding occurs via Reddit comments.
* **Turn-based Gameplay:**  Players take turns rolling dice, moving, buying properties, paying rent, etc.
* **Persistent State:** Game state is saved in Redis, allowing players to resume games across sessions.
* **Reddit Comment Integration:** Used for auction bidding and potentially other interactions (e.g., chat).


### Main Classes/Components

* **Game:** Manages the overall game state, including the board, players, and turn order.
* **Player:** Represents a player in the game, tracks their money, properties, and position.
* **Board:** Represents the game board, including properties and special spaces.
* **Property:**  Represents a single property (subreddit/meme) on the board, including its price, rent, and owner.
* **Auction:**  Manages the auction process, including bids, timer, and winner determination.
* **Dice:**  Handles dice rolling.
* **RedisManager:**  Handles interaction with Redis for saving and loading game state.
* **RedditAPIWrapper:** Handles interaction with the Reddit API for user authentication, comment retrieval, and posting.
* **WebviewInterface:** Handles UI rendering and user interaction via a webview.


### Game Flow

1. **Game Initialization:**  Players join the game via the webview. The game state is initialized in Redis.
2. **Turn Cycle:** Players take turns in a defined order.
3. **Roll Dice:** The current player rolls the dice.
4. **Move:** The player's piece moves according to the dice roll.
5. **Action:** Based on the space landed on, the player performs an action (buy property, pay rent, draw a card, etc.).
6. **End Turn:** The player ends their turn.  The next player's turn begins.
7. **Game End:** The game ends when all but one player is bankrupt.


### Key Systems

#### Property Management

* **Buy/Sell Properties:** Players can buy unowned properties they land on. They can also sell properties to other players through direct negotiation.
* **Collect Rent:** When a player lands on another player's property, they must pay rent.
* **Build Houses:**  (Optional) Players may be able to build houses/hotels on their properties to increase rent.


#### Auction System

* **Bid via Comments:** Players place bids by commenting on a designated Reddit post. The comment's body contains the bid amount.
* **30-Second Timer:**  Auctions have a 30-second timer.  The highest bid at the end of the timer wins.
* **Minimum Bid Requirements:**  Each bid must be higher than the previous bid by a minimum amount.


#### Turn Management

* **10-Second Turn Timer:** Each player has 10 seconds to complete their turn.
* **Automatic Turn Progression:** If a player doesn't complete their turn within the time limit, their turn is automatically skipped.
* **Skip Turn Penalties:** (Optional) Players may incur a penalty for skipping turns.


### Integration Points

* **Reddit API:**  Used for user authentication, retrieving comments (for auction bids), and potentially posting game updates.
* **Redis:**  Used for persistent storage of game state.
* **Webview:** Used for rendering the game UI and handling user interaction.
* **Comment Parsing:** Used to extract bid amounts from Reddit comments during auctions.
