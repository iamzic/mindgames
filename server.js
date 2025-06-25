const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new socketIo.Server(server);

const PORT = process.env.PORT || 3000;

// Serve the frontend files
app.use(express.static('public')); // We'll create a 'public' folder for our frontend
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});


// --- GAME CONFIGURATION --- //
const IMAGE_SOURCES = [
    '/dinosaurs/dino1.png',
    '/dinosaurs/dino2.png',
    '/dinosaurs/dino3.png',
    '/dinosaurs/dino4.png',
    '/dinosaurs/dino5.png',
    '/dinosaurs/dino6.png',
    '/dinosaurs/dino7.png',
    '/dinosaurs/dino8.png'
];
const TOTAL_PAIRS = IMAGE_SOURCES.length;
// --- END GAME CONFIGURATION --- //


let rooms = {};

function createNewGame(roomId) {
    const cardImages = [...IMAGE_SOURCES, ...IMAGE_SOURCES];
    // Fisher-Yates shuffle algorithm for better randomness
    for (let i = cardImages.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [cardImages[i], cardImages[j]] = [cardImages[j], cardImages[i]];
    }

    return {
        id: roomId,
        players: {},
        board: cardImages,
        flipped: [],
        matched: [],
        turn: 1, // Player 1 starts
        scores: { 1: 0, 2: 0 },
        winner: null,
    };
}

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Find a room with one player or create a new one
    let roomId = Object.keys(rooms).find(id => Object.keys(rooms[id].players).length === 1);
    
    if (!roomId) {
        roomId = `room-${Date.now()}`;
        rooms[roomId] = createNewGame(roomId);
    }

    const game = rooms[roomId];
    const playerNumber = Object.keys(game.players).length + 1;
    
    game.players[socket.id] = playerNumber;
    socket.join(roomId);
    socket.emit('playerNumber', playerNumber);
    
    if (playerNumber === 1) {
        socket.emit('waiting', 'Waiting for another player...');
    } else {
        io.to(roomId).emit('gameStart', game.board);
        io.to(roomId).emit('gameState', game);
    }

    socket.on('flipCard', (cardId) => {
        const cardIndex = parseInt(cardId, 10);
        // Security check: ensure it's the correct player's turn
        if (game.players[socket.id] !== game.turn) return;
        // Security check: ensure the card is not already flipped or matched
        if (game.flipped.includes(cardIndex) || game.matched.includes(cardIndex)) return;
        
        game.flipped.push(cardIndex);
        io.to(roomId).emit('gameState', game);

        if (game.flipped.length === 2) {
            game.turn = 0; // Temporarily disable flipping
            setTimeout(() => {
                const [firstIndex, secondIndex] = game.flipped;
                const currentPlayer = game.players[socket.id];

                if (game.board[firstIndex] === game.board[secondIndex]) {
                    // It's a match!
                    game.matched.push(firstIndex, secondIndex);
                    game.scores[currentPlayer]++;
                    if (game.matched.length === game.board.length) {
                        // Game Over
                        game.winner = game.scores[1] > game.scores[2] ? 1 : (game.scores[2] > game.scores[1] ? 2 : 'draw');
                    }
                }
                
                game.flipped = [];
                game.turn = currentPlayer === 1 ? 2 : 1; // Switch turns
                io.to(roomId).emit('gameState', game);
            }, 1200);
        }
    });

    socket.on('resetGame', () => {
        if (game.winner) {
            rooms[roomId] = createNewGame(roomId);
            io.to(roomId).emit('gameStart', rooms[roomId].board);
            io.to(roomId).emit('gameState', rooms[roomId]);
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        // Find the room the player was in
        const playerRoomId = Object.keys(rooms).find(id => rooms[id].players[socket.id]);
        if (playerRoomId) {
            delete rooms[playerRoomId].players[socket.id];
            // If the room is now empty, delete it
            if(Object.keys(rooms[playerRoomId].players).length === 0) {
                delete rooms[playerRoomId];
            } else {
                // Notify the other player
                io.to(playerRoomId).emit('waiting', 'The other player has disconnected.');
            }
        }
    });
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});