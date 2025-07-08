// Use globally available io from socket.io script
let socket = null;
let gameState = {
    players: [],
    currentThinker: null,
    currentGuesser: null,
    questionsAsked: [],
    gamePhase: 'waiting',
    questionsLeft: 20
};
let playerId = null;
let playerName = null;

const elements = {
    questionsContainer: document.getElementById('questionsContainer'),
    inputSection: document.getElementById('inputSection'),
    gameStatus: document.getElementById('gameStatus'),
    roleIndicator: document.getElementById('roleIndicator'),
    playersList: document.getElementById('playersList'),
    playerCount: document.getElementById('playerCount'),
    waitingMessage: document.getElementById('waitingMessage')
};

function connectToServer() {
    socket = io();
    
    socket.on('connect', () => {
        console.log('Connected to server');
        
        // Auto-join game using TylerArcadePlayer system
        try {
            if (typeof TylerArcadePlayer !== 'undefined' && TylerArcadePlayer.autoJoinGame) {
                playerName = TylerArcadePlayer.autoJoinGame(socket, '20-questions');
            } else {
                console.error('TylerArcadePlayer not available, joining manually');
                playerName = 'Player' + Math.floor(Math.random() * 1000);
                socket.emit('joinGame', { name: playerName, roomId: '20-questions' });
            }
        } catch (error) {
            console.error('Error joining game:', error);
            playerName = 'Player' + Math.floor(Math.random() * 1000);
            socket.emit('joinGame', { name: playerName, roomId: '20-questions' });
        }
    });
    
    socket.on('playerAssigned', (data) => {
        playerId = data.playerData.playerId;
        playerName = data.playerData.playerName;
        if (data.playerData.gameState) {
            gameState = data.playerData.gameState;
        }
        updateGameDisplay();
    });

    socket.on('joinFailed', (data) => {
        alert(`Failed to join: ${data.reason}`);
    });
    
    socket.on('game-update', (data) => {
        gameState = data;
        updateGameDisplay();
    });
    
    socket.on('player-joined', (player) => {
        showMessage(`${player.name} joined the game!`, 'info');
    });
    
    socket.on('player-left', (playerId) => {
        showMessage('A player left the game', 'info');
    });
    
    socket.on('new-round', (data) => {
        showMessage(`New Round! ${data.thinker} is thinking, ${data.guesser} will guess`, 'info');
        updateGameDisplay();
    });
    
    socket.on('question-asked', (data) => {
        showMessage(`${data.askedBy} asked: "${data.question}"`, 'info');
        updateQuestionsDisplay();
    });
    
    socket.on('question-answered', (data) => {
        updateQuestionsDisplay();
    });
    
    socket.on('guess-result', (data) => {
        if (data.correct) {
            showMessage(`Correct! The answer was "${data.answer}"`, 'success');
        } else {
            showMessage(`Wrong guess: "${data.guess}"`, 'error');
        }
    });
    
    socket.on('game-over', (data) => {
        showMessage(`Game Over! The answer was "${data.answer}"`, 'info');
    });
    
    socket.on('game-full', () => {
        showMessage('Game is full! Please try again later.', 'error');
    });
}

function joinGame() {
    // This function kept for potential manual joins, but auto-join is primary
    if (!socket) {
        connectToServer();
    }
}

function updateGameDisplay() {
    updatePlayersDisplay();
    updateGameStatus();
    updateInputSection();
    updateQuestionsDisplay();
}

function updatePlayersDisplay() {
    // ✅ SAFE - Check Array before length and forEach
    const playerCount = (gameState.players && Array.isArray(gameState.players)) 
        ? gameState.players.length : 0;
    elements.playerCount.textContent = playerCount;
    elements.playersList.innerHTML = '';
    
    // ✅ SAFE - Defensive Array check before forEach
    if (gameState.players && Array.isArray(gameState.players)) {
        gameState.players.forEach(player => {
        const playerElement = document.createElement('div');
        playerElement.className = 'player-item';
        
        let roleIcon = '';
        if (player.name === gameState.currentThinker) {
            roleIcon = ' 🤔';
        } else if (player.name === gameState.currentGuesser) {
            roleIcon = ' ❓';
        }
        
        playerElement.innerHTML = `
            <span class="player-name">${player.name}${roleIcon}</span>
            <span class="player-score">${player.score}</span>
        `;
        elements.playersList.appendChild(playerElement);
        });
    }
}

function updateGameStatus() {
    elements.gameStatus.querySelector('.questions-left').textContent = 
        `Questions Left: ${gameState.questionsLeft}`;
    
    const roleIndicator = elements.roleIndicator;
    roleIndicator.innerHTML = '';
    
    if (gameState.gamePhase === 'waiting') {
        roleIndicator.innerHTML = '<div>Waiting for players...</div>';
    } else if (gameState.currentThinker && gameState.currentGuesser) {
        // ✅ SAFE - Check Array before find method
        const currentPlayer = (gameState.players && Array.isArray(gameState.players)) 
            ? gameState.players.find(p => p.id === playerId) : null;
        if (currentPlayer) {
            if (currentPlayer.name === gameState.currentThinker) {
                roleIndicator.innerHTML = '<div class="role-indicator role-thinker">You are the THINKER 🤔</div>';
            } else if (currentPlayer.name === gameState.currentGuesser) {
                roleIndicator.innerHTML = '<div class="role-indicator role-guesser">You are the GUESSER ❓</div>';
            } else {
                roleIndicator.innerHTML = '<div class="role-indicator">You are WATCHING 👀</div>';
            }
        }
    }
}

function updateInputSection() {
    elements.inputSection.innerHTML = '';
    
    if (gameState.gamePhase === 'waiting') {
        elements.inputSection.innerHTML = `
            <div id="waitingMessage" style="text-align: center; opacity: 0.7;">
                <h3>Waiting for players...</h3>
                <p>Need at least 2 players to start</p>
                ${(gameState.players && Array.isArray(gameState.players) && gameState.players.length >= 2) ? '<button class="btn" onclick="startGame()">START GAME</button>' : ''}
            </div>
        `;
    } else if (gameState.gamePhase === 'thinking') {
        // ✅ SAFE - Check Array before find method
        const currentPlayer = (gameState.players && Array.isArray(gameState.players)) 
            ? gameState.players.find(p => p.id === playerId) : null;
        if (currentPlayer && currentPlayer.name === gameState.currentThinker) {
            elements.inputSection.innerHTML = `
                <h3>Think of something!</h3>
                <p>Enter what you're thinking of (other players won't see this)</p>
                <div class="input-group">
                    <input type="text" id="secretInput" class="secret-input" placeholder="What are you thinking of?" maxlength="50">
                    <button class="btn" onclick="setSecretThing()">SET</button>
                </div>
                <p style="font-size: 0.9em; opacity: 0.7;">Suggestion: Try something like an animal, object, or place</p>
            `;
        } else {
            elements.inputSection.innerHTML = `
                <div style="text-align: center; opacity: 0.7;">
                    <h3>Waiting for ${gameState.currentThinker} to think of something...</h3>
                </div>
            `;
        }
    } else if (gameState.gamePhase === 'playing') {
        // ✅ SAFE - Check Array before find method
        const currentPlayer = (gameState.players && Array.isArray(gameState.players)) 
            ? gameState.players.find(p => p.id === playerId) : null;
        if (currentPlayer && currentPlayer.name === gameState.currentGuesser) {
            elements.inputSection.innerHTML = `
                <h3>Ask a yes/no question or make a guess!</h3>
                <div class="input-group">
                    <input type="text" id="questionInput" class="guess-input" placeholder="Ask a yes/no question..." maxlength="100">
                    <button class="btn" onclick="askQuestion()">ASK</button>
                </div>
                <div class="input-group">
                    <input type="text" id="guessInput" class="guess-input" placeholder="Or make your final guess..." maxlength="50">
                    <button class="btn btn-success" onclick="makeGuess()">GUESS</button>
                </div>
            `;
        } else if (currentPlayer && currentPlayer.name === gameState.currentThinker) {
            elements.inputSection.innerHTML = `
                <h3>Answer the question with Yes or No</h3>
                <div style="display: flex; gap: 10px; justify-content: center;">
                    <button class="btn btn-success" onclick="answerQuestion('Yes')">YES</button>
                    <button class="btn btn-danger" onclick="answerQuestion('No')">NO</button>
                </div>
            `;
        } else {
            elements.inputSection.innerHTML = `
                <div style="text-align: center; opacity: 0.7;">
                    <h3>Watch the game unfold!</h3>
                    <p>${gameState.currentGuesser} is asking questions</p>
                </div>
            `;
        }
    } else if (gameState.gamePhase === 'final-guess') {
        // ✅ SAFE - Check Array before find method
        const currentPlayer = (gameState.players && Array.isArray(gameState.players)) 
            ? gameState.players.find(p => p.id === playerId) : null;
        if (currentPlayer && currentPlayer.name === gameState.currentGuesser) {
            elements.inputSection.innerHTML = `
                <h3>Final Guess! No more questions left</h3>
                <div class="input-group">
                    <input type="text" id="finalGuessInput" class="guess-input" placeholder="What is it?" maxlength="50">
                    <button class="btn btn-success" onclick="makeFinalGuess()">FINAL GUESS</button>
                </div>
            `;
        } else {
            elements.inputSection.innerHTML = `
                <div style="text-align: center; opacity: 0.7;">
                    <h3>Final guess time!</h3>
                    <p>${gameState.currentGuesser} must make their final guess</p>
                </div>
            `;
        }
    }
}

function updateQuestionsDisplay() {
    if (gameState.questionsAsked.length === 0) {
        elements.questionsContainer.innerHTML = `
            <div style="text-align: center; opacity: 0.7; margin-top: 50px;">
                <h3>Questions will appear here</h3>
                <p>The guesser asks yes/no questions to figure out what the thinker is thinking of!</p>
            </div>
        `;
        return;
    }
    
    elements.questionsContainer.innerHTML = '';
    
    gameState.questionsAsked.forEach((qa, index) => {
        const questionElement = document.createElement('div');
        questionElement.className = 'question-item';
        
        const answerClass = qa.answer === 'Yes' ? 'yes' : qa.answer === 'No' ? 'no' : '';
        const answerText = qa.answer || 'Waiting for answer...';
        
        questionElement.innerHTML = `
            <div class="question">Q${index + 1}: ${qa.question}</div>
            <div class="answer ${answerClass}">${answerText}</div>
        `;
        
        elements.questionsContainer.appendChild(questionElement);
    });
    
    elements.questionsContainer.scrollTop = elements.questionsContainer.scrollHeight;
}

function startGame() {
    socket.emit('start-game');
    socket.emit('gameAction', { type: 'startGame' });
}

function setSecretThing() {
    const input = document.getElementById('secretInput');
    const thing = input.value.trim();
    
    if (thing.length < 2) {
        showMessage('Please enter something with at least 2 characters', 'error');
        return;
    }
    
    socket.emit('set-secret-thing', thing);
    socket.emit('gameAction', { type: 'setSecretThing', thing: thing });
    input.value = '';
}

function askQuestion() {
    const input = document.getElementById('questionInput');
    const question = input.value.trim();
    
    if (question.length < 3) {
        showMessage('Please ask a longer question', 'error');
        return;
    }
    
    socket.emit('ask-question', question);
    socket.emit('gameAction', { type: 'askQuestion', question: question });
    input.value = '';
}

function answerQuestion(answer) {
    socket.emit('answer-question', answer);
    socket.emit('gameAction', { type: 'answerQuestion', answer: answer });
}

function makeGuess() {
    const input = document.getElementById('guessInput');
    const guess = input.value.trim();
    
    if (guess.length < 2) {
        showMessage('Please enter a guess with at least 2 characters', 'error');
        return;
    }
    
    socket.emit('make-guess', guess);
    socket.emit('gameAction', { type: 'makeGuess', guess: guess });
    input.value = '';
}

function makeFinalGuess() {
    const input = document.getElementById('finalGuessInput');
    const guess = input.value.trim();
    
    if (guess.length < 2) {
        showMessage('Please enter a guess with at least 2 characters', 'error');
        return;
    }
    
    socket.emit('make-guess', guess);
    socket.emit('gameAction', { type: 'makeGuess', guess: guess });
    input.value = '';
}

function showMessage(text, type) {
    const message = document.createElement('div');
    message.className = `message ${type}`;
    message.textContent = text;
    document.body.appendChild(message);
    
    setTimeout(() => {
        message.remove();
    }, 3000);
}

// Auto-start the game connection when page loads
connectToServer();

// Handle Enter key in inputs
document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        const activeElement = document.activeElement;
        if (activeElement.id === 'secretInput') {
            setSecretThing();
        } else if (activeElement.id === 'questionInput') {
            askQuestion();
        } else if (activeElement.id === 'guessInput') {
            makeGuess();
        } else if (activeElement.id === 'finalGuessInput') {
            makeFinalGuess();
        }
    }
});

// Export functions to global scope for HTML onclick handlers
window.joinGame = joinGame;
window.startGame = startGame;
window.setSecretThing = setSecretThing;
window.askQuestion = askQuestion;
window.answerQuestion = answerQuestion;
window.makeGuess = makeGuess;
window.makeFinalGuess = makeFinalGuess;