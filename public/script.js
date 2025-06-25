// --- IMAGE CUSTOMIZATION SECTION --- //
// Add URLs to your images here. You need 8 images for a 16-card game.
// Use simple, child-friendly images.
const imageSources = [
    'https://free-images.com/or/4b7e/dinosaur_theropod_dino.jpg',
    'https://free-images.com/or/4b7e/dinosaur_triceratops_dino.jpg',
    'https://free-images.com/or/4b7e/dinosaur_stegosaurus_dino.jpg',
    'https://free-images.com/or/4b7e/dinosaur_brachiosaurus_dino.jpg',
    'https://free-images.com/or/4b7e/dinosaur_pterodactyl_dino.jpg',
    'https://free-images.com/or/4b7e/dinosaur_ankylosaurus_dino.jpg',
    'https://free-images.com/or/4b7e/dinosaur_spinosaurus_dino.jpg',
    'https://free-images.com/or/4b7e/dinosaur_velociraptor_dino.jpg'
];
// --- END IMAGE CUSTOMIZATION --- //

const socket = io();

const gameBoard = document.getElementById('game-board');
const statusText = document.getElementById('status-text');
const scoreText = document.getElementById('score-text');
const resetButton = document.getElementById('reset-button');

let canFlip = false;
let playerNumber = 0;

function createBoard(board) {
    gameBoard.innerHTML = ''; // Clear previous board
    board.forEach((image, index) => {
        const card = document.createElement('div');
        card.classList.add('card');
        card.dataset.id = index;

        card.innerHTML = `
            <div class="card-face card-front">
                <img src="${image}" alt="Card Image">
            </div>
            <div class="card-face card-back">?</div>
        `;
        
        card.addEventListener('click', () => handleCardClick(card));
        gameBoard.appendChild(card);
    });
}

function handleCardClick(card) {
    if (canFlip && !card.classList.contains('flipped') && !card.classList.contains('matched')) {
        const cardId = card.dataset.id;
        socket.emit('flipCard', cardId);
    }
}

resetButton.addEventListener('click', () => {
    socket.emit('resetGame');
});

// ---- SOCKET.IO EVENT LISTENERS ----

socket.on('playerNumber', num => {
    playerNumber = num;
});

socket.on('gameState', (state) => {
    // Update whose turn it is
    canFlip = (state.turn === playerNumber);
    statusText.textContent = canFlip ? "It's your turn!" : `Waiting for Player ${state.turn}...`;
    if (state.winner) {
        statusText.textContent = state.winner === playerNumber ? "You Win!" : "You Lose!";
        resetButton.style.display = 'block';
    } else {
        resetButton.style.display = 'none';
    }

    // Update scores
    scoreText.textContent = `Player 1: ${state.scores[1]} - Player 2: ${state.scores[2]}`;

    // Update card states
    const cards = document.querySelectorAll('.card');
    cards.forEach((card, index) => {
        if (state.flipped.includes(index)) {
            card.classList.add('flipped');
        } else {
            card.classList.remove('flipped');
        }

        if (state.matched.includes(index)) {
            card.classList.add('matched');
        } else {
            card.classList.remove('matched');
        }
    });
});

socket.on('gameStart', (board) => {
    createBoard(board);
    resetButton.style.display = 'none';
});

socket.on('waiting', (message) => {
    statusText.textContent = message;
});

// Preload images for better performance
function preloadImages() {
    let cardImages = [...imageSources, ...imageSources];
    cardImages.forEach(src => {
        const img = new Image();
        img.src = src;
    });
}

preloadImages();