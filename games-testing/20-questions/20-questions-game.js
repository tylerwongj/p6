import { BaseGame } from '@tyler-arcade/multiplayer';

export class TwentyQuestionsGame extends BaseGame {
    constructor() {
        super();
        this.name = '20-questions';
        this.description = 'Guess the secret thing in 20 questions or less!';
        this.maxPlayers = 8;
        this.spectators = [];
        
        // Override default Array players with Map for this game
        this.players = new Map();
        
        this.currentGuesser = null;
        this.currentThinker = null;
        this.secretThing = '';
        this.questionsAsked = [];
        this.gamePhase = 'waiting'; // waiting, thinking, playing, gameOver
        
        this.things = [
            'elephant', 'pizza', 'rainbow', 'computer', 'ocean', 'guitar', 'bicycle', 'mountain',
            'butterfly', 'telephone', 'camera', 'book', 'airplane', 'tree', 'clock', 'mirror',
            'sandwich', 'pencil', 'flower', 'moon', 'doorknob', 'pillow', 'hammer', 'shoe'
        ];
    }

    handlePlayerJoin(socketId, playerName, roomId, socket) {
        if (roomId !== '20-questions') {
            return {
                success: false,
                reason: 'Wrong room - this is 20 Questions'
            };
        }

        if (this.players.size >= this.maxPlayers) {
            return {
                success: false,
                reason: 'Game is full'
            };
        }

        const player = {
            id: socketId,
            name: playerName || `Player${Math.floor(Math.random() * 1000)}`,
            score: 0
        };

        this.players.set(socketId, player);
        console.log(`${player.name} joined 20 Questions`);

        this.broadcast('player-joined', player);
        this.broadcast('game-update', this.getGameStateForClient());

        if (this.players.size >= 2 && this.gamePhase === 'waiting') {
            this.startNewRound();
        }

        return {
            success: true,
            playerData: { playerId: socketId, playerName: player.name }
        };
    }

    handlePlayerLeave(socketId, player, socket) {
        this.players.delete(socketId);
        
        if (socketId === this.currentGuesser || socketId === this.currentThinker) {
            if (this.players.size >= 2) {
                this.startNewRound();
            } else {
                this.gamePhase = 'waiting';
            }
        }
        
        this.broadcast('player-left', socketId);
        this.broadcast('game-update', this.getGameStateForClient());
    }

    handlePlayerInput(socketId, input, socket) {
        // This game uses custom events for input
    }

    handleCustomEvent(socketId, eventName, args, socket) {
        console.log(`🎮 20Q Game: Handling custom event '${eventName}' from ${socketId} with args:`, args);
        
        switch (eventName) {
            case 'gameAction':
                this.handleGameAction(socketId, args, socket);
                break;
            case 'start-game':
                if (this.players.size >= 2) {
                    this.startNewRound();
                }
                break;
            case 'set-secret-thing':
                if (socketId === this.currentThinker && this.gamePhase === 'thinking') {
                    this.secretThing = args;
                    this.gamePhase = 'playing';
                    this.broadcast('game-update', this.getGameStateForClient());
                }
                break;
            case 'ask-question':
                if (socketId === this.currentGuesser && this.gamePhase === 'playing' && this.questionsAsked.length < 20) {
                    this.questionsAsked.push({
                        question: args,
                        answer: null,
                        askedBy: this.players.get(socketId).name
                    });
                    this.broadcast('question-asked', { 
                        question: args, 
                        askedBy: this.players.get(socketId).name 
                    });
                }
                break;
            case 'answer-question':
                if (socketId === this.currentThinker && this.gamePhase === 'playing') {
                    const lastQuestion = this.questionsAsked[this.questionsAsked.length - 1];
                    if (lastQuestion && lastQuestion.answer === null) {
                        lastQuestion.answer = args;
                        this.broadcast('question-answered', { 
                            question: lastQuestion.question, 
                            answer: args 
                        });
                        
                        if (this.questionsAsked.length >= 20) {
                            this.gamePhase = 'final-guess';
                        }
                        this.broadcast('game-update', this.getGameStateForClient());
                    }
                }
                break;
            case 'make-guess':
                if (socketId === this.currentGuesser && (this.gamePhase === 'playing' || this.gamePhase === 'final-guess')) {
                    const correct = args.toLowerCase().trim() === this.secretThing.toLowerCase().trim();
                    
                    if (correct) {
                        this.players.get(socketId).score += 1;
                        this.broadcast('guess-result', { 
                            correct: true, 
                            guess: args, 
                            answer: this.secretThing 
                        });
                        setTimeout(() => this.startNewRound(), 3000);
                    } else {
                        this.broadcast('guess-result', { correct: false, guess: args });
                        if (this.gamePhase === 'final-guess') {
                            this.broadcast('game-over', { answer: this.secretThing });
                            setTimeout(() => this.startNewRound(), 5000);
                        }
                    }
                }
                break;
        }
    }

    handleGameAction(socketId, action, socket) {
        switch (action.type) {
            case 'startGame':
                if (this.players.size >= 2) {
                    this.startNewRound();
                }
                break;
            case 'setSecretThing':
                if (socketId === this.currentThinker && this.gamePhase === 'thinking') {
                    this.secretThing = action.thing;
                    this.gamePhase = 'playing';
                    this.broadcast('game-update', this.getGameStateForClient());
                }
                break;
            case 'askQuestion':
                if (socketId === this.currentGuesser && this.gamePhase === 'playing' && this.questionsAsked.length < 20) {
                    this.questionsAsked.push({
                        question: action.question,
                        answer: null,
                        askedBy: this.players.get(socketId).name
                    });
                    this.broadcast('question-asked', { 
                        question: action.question, 
                        askedBy: this.players.get(socketId).name 
                    });
                }
                break;
            case 'answerQuestion':
                if (socketId === this.currentThinker && this.gamePhase === 'playing') {
                    const lastQuestion = this.questionsAsked[this.questionsAsked.length - 1];
                    if (lastQuestion && lastQuestion.answer === null) {
                        lastQuestion.answer = action.answer;
                        this.broadcast('question-answered', { 
                            question: lastQuestion.question, 
                            answer: action.answer 
                        });
                        
                        if (this.questionsAsked.length >= 20) {
                            this.gamePhase = 'final-guess';
                        }
                        this.broadcast('game-update', this.getGameStateForClient());
                    }
                }
                break;
            case 'makeGuess':
                if (socketId === this.currentGuesser && (this.gamePhase === 'playing' || this.gamePhase === 'final-guess')) {
                    const correct = action.guess.toLowerCase().trim() === this.secretThing.toLowerCase().trim();
                    
                    if (correct) {
                        this.players.get(socketId).score += 1;
                        this.broadcast('guess-result', { 
                            correct: true, 
                            guess: action.guess, 
                            answer: this.secretThing 
                        });
                        setTimeout(() => this.startNewRound(), 3000);
                    } else {
                        this.broadcast('guess-result', { correct: false, guess: action.guess });
                        if (this.gamePhase === 'final-guess') {
                            this.broadcast('game-over', { answer: this.secretThing });
                            setTimeout(() => this.startNewRound(), 5000);
                        }
                    }
                }
                break;
        }
    }

    startNewRound() {
        const playerIds = Array.from(this.players.keys());
        
        const randomThinker = playerIds[Math.floor(Math.random() * playerIds.length)];
        let randomGuesser = playerIds[Math.floor(Math.random() * playerIds.length)];
        
        while (randomGuesser === randomThinker && playerIds.length > 1) {
            randomGuesser = playerIds[Math.floor(Math.random() * playerIds.length)];
        }
        
        this.currentThinker = randomThinker;
        this.currentGuesser = randomGuesser;
        this.secretThing = '';
        this.questionsAsked = [];
        this.gamePhase = 'thinking';
        
        const suggestedThing = this.things[Math.floor(Math.random() * this.things.length)];
        
        this.broadcast('new-round', {
            thinker: this.players.get(randomThinker).name,
            guesser: this.players.get(randomGuesser).name,
            suggestedThing
        });
        
        this.broadcast('game-update', this.getGameStateForClient());
    }

    getGameStateForClient() {
        return {
            players: Array.from(this.players.values()),
            currentThinker: this.currentThinker ? this.players.get(this.currentThinker)?.name : null,
            currentGuesser: this.currentGuesser ? this.players.get(this.currentGuesser)?.name : null,
            questionsAsked: this.questionsAsked,
            gamePhase: this.gamePhase,
            questionsLeft: 20 - this.questionsAsked.length
        };
    }
}