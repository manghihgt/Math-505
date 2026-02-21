const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const PORT = 3001;

// Question Database (Arithmetic Sequences & Series)
const questions = [
    {
        question: "Find the next term: 2, 5, 8, 11, ...",
        options: ["13", "14", "15", "16"],
        answer: 1, // 14
        time: 30
    },
    {
        question: "Find the 10th term of: 3, 7, 11, 15, ...",
        options: ["35", "39", "43", "47"],
        answer: 1, // 3+ (9*4) = 39
        time: 30
    },
    {
        question: "Sum of first 5 terms: 2, 4, 6, 8, 10",
        options: ["20", "25", "30", "35"],
        answer: 2, // 30
        time: 30
    },
    {
        question: "Find the common difference: 10, 7, 4, 1, ...",
        options: ["3", "-3", "2", "-2"],
        answer: 1, // -3
        time: 30
    },
    {
        question: "If a1=5 and d=2, find a20",
        options: ["43", "45", "41", "39"],
        answer: 0, // 5 + 19*2 = 43
        time: 30
    },
    {
        question: "Identify the arithmetic sequence:",
        options: ["1, 2, 4, 8", "1, 3, 5, 7", "1, 1, 2, 3", "1, 4, 9, 16"],
        answer: 1, // 1, 3, 5, 7
        time: 30
    },
    {
        question: "Find n if an=25 for 5, 10, 15, ...",
        options: ["4", "5", "6", "7"],
        answer: 1, // 5
        time: 30
    },
    {
        question: "Sum of first 4 terms of 1, 3, 5, 7",
        options: ["15", "16", "17", "18"],
        answer: 1, // 16
        time: 30
    },
    {
        question: "Find a1 if a5=20 and d=3",
        options: ["5", "8", "11", "14"],
        answer: 1, // a1 + 12 = 20 => a1 = 8
        time: 30
    },
    {
        question: "What is the 100th term of 1, 2, 3, ...?",
        options: ["99", "100", "101", "102"],
        answer: 1, // 100
        time: 30
    }
];

let rooms = {};

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('create_room', () => {
        const roomId = Math.floor(1000 + Math.random() * 9000).toString();
        rooms[roomId] = {
            host: socket.id,
            players: [],
            currentQuestion: -1,
            gameState: 'lobby', // lobby, playing, results
            scores: {}
        };
        socket.join(roomId);
        socket.emit('room_created', roomId);
    });

    socket.on('join_room', ({ roomId, username }) => {
        if (rooms[roomId]) {
            const player = { id: socket.id, username, score: 0, lastAnswered: -1, lastTime: 0 };
            rooms[roomId].players.push(player);
            rooms[roomId].scores[socket.id] = 0;
            socket.join(roomId);
            io.to(roomId).emit('player_joined', rooms[roomId].players);
            socket.emit('join_success', { roomId, players: rooms[roomId].players });
        } else {
            socket.emit('join_error', 'ห้องไม่มีอยู่จริง');
        }
    });

    socket.on('start_game', (roomId) => {
        if (rooms[roomId] && rooms[roomId].host === socket.id) {
            rooms[roomId].gameState = 'playing';
            rooms[roomId].currentQuestion = 0;
            const q = questions[0];
            io.to(roomId).emit('next_question', { ...q, index: 0, total: questions.length });
        }
    });

    socket.on('submit_answer', ({ roomId, answerIndex, timeRemaining }) => {
        const room = rooms[roomId];
        if (room && room.gameState === 'playing') {
            const currentQ = questions[room.currentQuestion];
            const player = room.players.find(p => p.id === socket.id);
            
            if (player && player.lastAnswered !== room.currentQuestion) {
                player.lastAnswered = room.currentQuestion;
                if (answerIndex === currentQ.answer) {
                    const bonus = Math.floor((timeRemaining / 30) * 500);
                    const points = 1000 + bonus;
                    player.score += points;
                    room.scores[socket.id] = player.score;
                }
                
                // Check if everyone answered
                const answeredCount = room.players.filter(p => p.lastAnswered === room.currentQuestion).length;
                io.to(roomId).emit('player_answered_update', { answeredCount, totalPlayers: room.players.length });
                
                if (answeredCount === room.players.length) {
                    // All players answered, can optionally move to scoreboard
                    io.to(roomId).emit('all_answered');
                }
            }
        }
    });

    socket.on('next_question_request', (roomId) => {
        const room = rooms[roomId];
        if (room && room.host === socket.id) {
            room.currentQuestion++;
            if (room.currentQuestion < questions.length) {
                const q = questions[room.currentQuestion];
                io.to(roomId).emit('next_question', { ...q, index: room.currentQuestion, total: questions.length });
            } else {
                room.gameState = 'results';
                const sortedPlayers = [...room.players].sort((a, b) => b.score - a.score);
                io.to(roomId).emit('game_over', sortedPlayers);
            }
        }
    });

    socket.on('disconnect', () => {
        for (let roomId in rooms) {
            const room = rooms[roomId];
            const playerIndex = room.players.findIndex(p => p.id === socket.id);
            if (playerIndex !== -1) {
                room.players.splice(playerIndex, 1);
                delete room.scores[socket.id];
                io.to(roomId).emit('player_joined', room.players);
            }
            if (room.host === socket.id) {
                io.to(roomId).emit('host_disconnected');
                delete rooms[roomId];
            }
        }
    });
});

server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
