import { firebaseConfig } from './firebase-config.js';

// --- INITIALIZATION ---
// Force true live initialization using the provided credentials
const app = firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// --- DOM ELEMENTS ---
const views = {
    landing: document.getElementById('landing-view'),
    host: document.getElementById('host-view'),
    player: document.getElementById('player-view'),
};
const hostBtn = document.getElementById('host-btn');
const joinBtn = document.getElementById('join-btn');
const joinModal = document.getElementById('join-modal');
const closeJoinModalBtn = document.getElementById('close-join-modal');
const roomCodeInput = document.getElementById('room-code-input');
const playerNameInput = document.getElementById('player-name-input');
const submitJoinBtn = document.getElementById('submit-join-btn');
const joinErrorMsg = document.getElementById('join-error-msg');

// Host view elements
const hostLobbySetup = document.getElementById('host-lobby-setup');
let currentTeamCount = 4;
const teamNamesContainer = document.getElementById('team-names-container');
const hostDashboard = document.getElementById('host-dashboard');
const openLobbyBtn = document.getElementById('open-lobby-btn');
const roomCodeDisplay = document.getElementById('room-code-display');
const copyRoomCodeBtn = document.getElementById('copy-room-code-btn');
const qrCodeBtn = document.getElementById('qr-code-btn');
const qrCodeModal = document.getElementById('qr-code-modal');
const closeQrModalBtn = document.getElementById('close-qr-modal');
const qrCodeImg = document.getElementById('qr-code-img');
const qrJoinLink = document.getElementById('qr-join-link');
const liveStats = document.getElementById('live-stats');
const armBuzzersBtn = document.getElementById('arm-buzzers-btn');
const clearQueueBtn = document.getElementById('clear-queue-btn');
const nextQuestionBtn = document.getElementById('next-question-btn');
const questionCounter = document.getElementById('question-counter');
const refreshRosterBtn = document.getElementById('refresh-roster-btn');
const closeRoomBtn = document.getElementById('close-room-btn');
const teamRosterContainer = document.getElementById('team-roster-container');
const emptyQueueMsg = document.getElementById('empty-queue-message');
const buzzTable = document.getElementById('buzz-table');
const buzzTableBody = document.getElementById('buzz-table-body');
const buzzCountDisplay = document.getElementById('buzz-count-display');

// Player view elements
const playerJoinSteps = document.getElementById('player-join-steps');
const playerTeamSelection = document.getElementById('player-team-selection');
const playerTeamList = document.getElementById('player-team-list');
const playerBuzzerScreen = document.getElementById('player-buzzer-screen');
const playerInfoDisplay = document.getElementById('player-info-display');
const playerRoomInfo = document.getElementById('player-room-info');
const leaveRoomBtn = document.getElementById('leave-room-btn');
const buzzerButton = document.getElementById('buzzer-button');
const buzzerLabel = document.getElementById('buzzer-label');
const buzzerTeamLetter = document.getElementById('buzzer-team-letter');
const buzzerRank = document.getElementById('buzzer-rank');
const miniQueuePreview = document.getElementById('mini-queue-preview');

// --- CONSTANTS & STATE ---
const PALETTE = [
    { color: "#00F5FF", emoji: "🔵" }, 
    { color: "#FF2D87", emoji: "🩷" }, 
    { color: "#FFD93D", emoji: "🟡" }, 
    { color: "#00E676", emoji: "💚" }, 
    { color: "#FF6B35", emoji: "🟠" }, 
    { color: "#B14EFF", emoji: "🟣" }, 
    { color: "#00BFA5", emoji: "✳️" }, 
    { color: "#FF4444", emoji: "🔴" }, 
];

let currentRoom = null;
let currentUser = { id: null, type: null, name: null };
let buzzesListener = null;
let playersListener = null;
let statusListener = null;

// --- WEB AUDIO API FOR SOUNDS ---
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

function playSound(type) {
    if (!audioContext) return;
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.01);

    if (type === 'buzz_first') {
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime); 
    } else if (type === 'buzz_other') {
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(440.00, audioContext.currentTime); 
    } else if (type === 'player_buzz') {
        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(300, audioContext.currentTime);
    }

    oscillator.start(audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.00001, audioContext.currentTime + 0.2);
    oscillator.stop(audioContext.currentTime + 0.2);
}

// --- UTILITY FUNCTIONS ---
const generateId = (length = 6) => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; 
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

const showView = (viewName) => {
    Object.values(views).forEach(v => v.classList.remove('active'));
    views[viewName].classList.add('active');
};

const getUserId = () => {
    let userId = localStorage.getItem('quizbuzz_userId');
    if (!userId) {
        userId = `user_${generateId(10)}`;
        localStorage.setItem('quizbuzz_userId', userId);
    }
    return userId;
};

// --- VIEW ROUTING & INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    currentUser.id = getUserId();
    
    const urlParams = new URLSearchParams(window.location.search);
    const roomFromUrl = urlParams.get('room');
    if (roomFromUrl) {
        roomCodeInput.value = roomFromUrl.toUpperCase();
        joinModal.classList.add('active');
    }

    const session = JSON.parse(localStorage.getItem('quizbuzz_session'));
    if (session && session.roomCode) {
        if (session.type === 'host') {
            resumeHostSession(session.roomCode);
        } else if (session.type === 'player') {
            resumePlayerSession(session.roomCode, session.playerId);
        }
    } else {
        showView('landing');
    }
});

// --- LANDING VIEW LOGIC ---
hostBtn.addEventListener('click', () => {
    showView('host');
    setupHostLobby();
});

joinBtn.addEventListener('click', () => joinModal.classList.add('active'));
closeJoinModalBtn.addEventListener('click', () => joinModal.classList.remove('active'));
window.addEventListener('click', (e) => {
    if (e.target === joinModal) joinModal.classList.remove('active');
    if (e.target === qrCodeModal) qrCodeModal.classList.remove('active');
});

// --- HOST LOGIC ---
function setupHostLobby() {
    hostLobbySetup.classList.remove('hidden');
    hostDashboard.classList.add('hidden');
    
    const generateTeamNameInputs = (count) => {
        teamNamesContainer.innerHTML = '';
        for (let i = 0; i < count; i++) {
            const teamLetter = String.fromCharCode(65 + i); 
            const row = document.createElement('div');
            row.className = 'team-input-row';
            row.innerHTML = `
                <div class="team-number" style="background-color: ${PALETTE[i].color};">${i + 1}</div>
                <div class="team-input-wrapper">
                    <span class="team-emoji">${PALETTE[i].emoji}</span>
                    <input type="text" id="team-name-input-${teamLetter}" value="Team ${teamLetter}" maxlength="20" placeholder="Enter team name...">
                </div>
            `;
            teamNamesContainer.appendChild(row);
        }
    };

    const countBtns = document.querySelectorAll('.count-btn');
    countBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            countBtns.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentTeamCount = parseInt(e.target.dataset.count, 10);
            generateTeamNameInputs(currentTeamCount);
        });
    });

    generateTeamNameInputs(currentTeamCount);
}

openLobbyBtn.addEventListener('click', async () => {
    const roomCode = generateId(6);
    currentRoom = roomCode;

    const selectedTeams = {};
    const teamCount = currentTeamCount;
    for (let i = 0; i < teamCount; i++) {
        const teamLetter = String.fromCharCode(65 + i);
        const teamNameInput = document.getElementById(`team-name-input-${teamLetter}`);
        const teamName = teamNameInput.value.trim() || `Team ${teamLetter}`;
        
        selectedTeams[teamLetter] = {
            name: teamName,
            color: PALETTE[i].color,
            emoji: PALETTE[i].emoji,
            enabled: true
        };
    }

    const roomData = {
        createdAt: firebase.database.ServerValue.TIMESTAMP,
        hostId: currentUser.id,
        status: 'lobby', 
        questionNumber: 1,
        teams: selectedTeams,
        players: {},
        buzzes: {},
    };

    try {
        await db.ref(`rooms/${roomCode}`).set(roomData);
        localStorage.setItem('quizbuzz_session', JSON.stringify({ roomCode, type: 'host' }));
        startHostDashboard(roomCode);
    } catch (error) {
        console.error("Error creating room:", error);
        alert(`Could not create room: ${error.message}. Verify network status and that your Firebase Realtime Database rules match setup requirements.`);
    }
});

function startHostDashboard(roomCode) {
    currentRoom = roomCode;
    hostLobbySetup.classList.add('hidden');
    hostDashboard.classList.remove('hidden');
    showView('host');

    roomCodeDisplay.textContent = roomCode;
    questionCounter.textContent = 'Q1';

    listenForPlayers(roomCode);
    listenForBuzzes(roomCode);
    
    const statusRef = db.ref(`rooms/${roomCode}/status`);
    if (statusListener) statusRef.off('value', statusListener);
    statusListener = statusRef.on('value', snapshot => {
        updateArmButton(snapshot.val());
    });

    const questionRef = db.ref(`rooms/${roomCode}/questionNumber`);
    questionRef.on('value', snapshot => {
        questionCounter.textContent = `Q${snapshot.val() || 1}`;
    });
}

async function resumeHostSession(roomCode) {
    try {
        const roomRef = db.ref(`rooms/${roomCode}`);
        const snapshot = await roomRef.once('value');
        if (snapshot.exists() && snapshot.val().hostId === currentUser.id) {
            startHostDashboard(roomCode);
        } else {
            localStorage.removeItem('quizbuzz_session');
            showView('landing');
        }
    } catch(e) {
        localStorage.removeItem('quizbuzz_session');
        showView('landing');
    }
}

function listenForPlayers(roomCode) {
    const playersRef = db.ref(`rooms/${roomCode}/players`);
    if (playersListener) playersRef.off('value', playersListener);
    
    playersListener = playersRef.on('value', async (snapshot) => {
        const players = snapshot.val() || {};
        const roomSnapshot = await db.ref(`rooms/${roomCode}/teams`).once('value');
        const teams = roomSnapshot.val() || {};
        
        updateTeamRoster(players, teams);
        updateLiveStats(players, teams);
    });
}

function updateTeamRoster(players, teams) {
    teamRosterContainer.innerHTML = '';
    const playersByTeam = {};

    Object.values(players).forEach(p => {
        if (!playersByTeam[p.team]) playersByTeam[p.team] = [];
        playersByTeam[p.team].push(p.name);
    });

    Object.keys(teams).sort().forEach(teamId => {
        const team = teams[teamId];
        if (!team.enabled) return;
        const card = document.createElement('div');
        card.className = 'team-roster-card';
        card.style.borderColor = team.color;

        const teamPlayers = playersByTeam[teamId] || [];

        card.innerHTML = `
            <h3>
                <span>${team.emoji} ${team.name}</span>
                <span class="player-count-badge">${teamPlayers.length}</span>
            </h3>
            <ul class="player-list">
                ${teamPlayers.length > 0 
                    ? teamPlayers.map(name => `<li>${name}</li>`).join('') 
                    : '<li>Waiting for players...</li>'
                }
            </ul>
        `;
        teamRosterContainer.appendChild(card);
    });
}

function updateLiveStats(players, teams) {
    const playerCount = Object.keys(players).length;
    const teamCount = Object.keys(teams).length;
    liveStats.innerHTML = `👥 ${playerCount} player${playerCount !== 1 ? 's' : ''} • ${teamCount} team${teamCount !== 1 ? 's' : ''}`;
}

function listenForBuzzes(roomCode) {
    const buzzesRef = db.ref(`rooms/${roomCode}/buzzes`);
    if (buzzesListener) buzzesRef.off('value', buzzesListener);

    buzzesListener = buzzesRef.on('value', async (snapshot) => {
        const buzzes = snapshot.val() || {};
        const buzzList = Object.values(buzzes).sort((a, b) => a.timestamp - b.timestamp);
        const previousBuzzCount = buzzTableBody.rows.length;

        if (buzzList.length === 0) {
            buzzTable.classList.add('hidden');
            emptyQueueMsg.classList.remove('hidden');
            buzzCountDisplay.textContent = '';
            buzzTableBody.innerHTML = ''; 
            return;
        }

        emptyQueueMsg.classList.add('hidden');
        buzzTable.classList.remove('hidden');
        buzzCountDisplay.textContent = `${buzzList.length} Buzzes`;

        if (buzzList.length > previousBuzzCount) {
            if (previousBuzzCount === 0) { 
                playSound('buzz_first');
                confetti({ particleCount: 150, spread: 60, origin: { y: 0.6 } });
            } else {
                playSound('buzz_other');
            }
        }

        const teamsSnapshot = await db.ref(`rooms/${roomCode}/teams`).once('value');
        const teams = teamsSnapshot.val();
        if (!teams) return; 

        renderBuzzQueue(buzzList, teams);
    });
}

function renderBuzzQueue(buzzList, teams) {
    buzzTableBody.innerHTML = '';
    const firstTimestamp = buzzList[0].timestamp;

    buzzList.forEach((buzz, index) => {
        const row = document.createElement('tr');
        const timeDiff = buzz.timestamp - firstTimestamp;
        const teamInfo = teams[buzz.team] || { emoji: '❓', name: 'Unknown' }; 

        row.innerHTML = `
            <td class="buzz-rank">${index + 1}</td>
            <td class="buzz-player">${buzz.playerName}</td>
            <td class="buzz-team" style="color: ${buzz.teamColor};">${teamInfo.emoji} ${teamInfo.name}</td>
            <td class="buzz-time">${index === 0 ? '—' : `+${timeDiff} ms`}</td>
        `;
        
        if (buzz.marked) {
            row.classList.add(`marked-${buzz.marked}`);
        }

        row.addEventListener('click', () => markBuzz(buzz.buzzId, buzz.marked));
        buzzTableBody.appendChild(row);
    });
}

function markBuzz(buzzId, currentMark) {
    const roomRef = db.ref(`rooms/${currentRoom}/buzzes/${buzzId}/marked`);
    let nextMark = null;
    if (currentMark === null) nextMark = 'correct';
    else if (currentMark === 'correct') nextMark = 'wrong';
    else if (currentMark === 'wrong') nextMark = null;
    roomRef.set(nextMark);
}

// Host Controls
armBuzzersBtn.addEventListener('click', async () => {
    const statusRef = db.ref(`rooms/${currentRoom}/status`);
    const currentStatus = (await statusRef.once('value')).val();
    const newStatus = (currentStatus === 'armed') ? 'disarmed' : 'armed';
    statusRef.set(newStatus);
});

function updateArmButton(status) {
    if (status === 'armed') {
        armBuzzersBtn.textContent = '🟢 BUZZERS ARMED';
        armBuzzersBtn.className = 'btn btn-green';
    } else {
        armBuzzersBtn.textContent = '⚪ ARM BUZZERS';
        armBuzzersBtn.className = 'btn btn-gray';
    }
}

clearQueueBtn.addEventListener('click', () => {
    db.ref(`rooms/${currentRoom}/buzzes`).remove();
    db.ref(`rooms/${currentRoom}/status`).set('disarmed');
});

nextQuestionBtn.addEventListener('click', () => {
    db.ref(`rooms/${currentRoom}/buzzes`).remove();
    db.ref(`rooms/${currentRoom}/status`).set('disarmed');
    db.ref(`rooms/${currentRoom}/questionNumber`).transaction(count => (count || 1) + 1);
});

copyRoomCodeBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(currentRoom).then(() => {
        copyRoomCodeBtn.textContent = '✅';
        setTimeout(() => copyRoomCodeBtn.textContent = '📋', 2000);
    });
});

refreshRosterBtn.addEventListener('click', async () => {
    refreshRosterBtn.style.transform = 'rotate(180deg)';
    refreshRosterBtn.style.transition = 'transform 0.3s ease';
    setTimeout(() => refreshRosterBtn.style.transform = '', 300);
    
    // Re-fetch players explicitly and update roster
    const playersSnapshot = await db.ref(`rooms/${currentRoom}/players`).once('value');
    const teamsSnapshot = await db.ref(`rooms/${currentRoom}/teams`).once('value');
    updateTeamRoster(playersSnapshot.val() || {}, teamsSnapshot.val() || {});
    updateLiveStats(playersSnapshot.val() || {}, teamsSnapshot.val() || {});
});

closeRoomBtn.addEventListener('click', async () => {
    if (confirm("Are you sure you want to close this room? All players will be disconnected and the room will be deleted.")) {
        try {
            await db.ref(`rooms/${currentRoom}`).remove();
        } catch (e) {
            console.error("Error closing room", e);
        }
        localStorage.removeItem('quizbuzz_session');
        window.location.reload();
    }
});

qrCodeBtn.addEventListener('click', () => {
    const joinUrl = `${window.location.origin}${window.location.pathname}?room=${currentRoom}`;
    qrJoinLink.textContent = joinUrl;
    QRCode.toCanvas(qrCodeImg, joinUrl, { width: 256 }, (error) => {
        if (error) console.error(error);
        qrCodeModal.classList.add('active');
    });
});
closeQrModalBtn.addEventListener('click', () => qrCodeModal.classList.remove('active'));

// --- PLAYER LOGIC ---
submitJoinBtn.addEventListener('click', async () => {
    const roomCode = roomCodeInput.value.toUpperCase();
    const playerName = playerNameInput.value.trim();

    if (!roomCode || !playerName) {
        joinErrorMsg.textContent = 'Room code and name are required.';
        return;
    }

    joinErrorMsg.textContent = '';
    submitJoinBtn.disabled = true;
    submitJoinBtn.textContent = 'Joining...';

    try {
        const roomRef = db.ref(`rooms/${roomCode}`);
        const snapshot = await roomRef.once('value');

        if (!snapshot.exists()) {
            joinErrorMsg.textContent = 'Room not found.';
            submitJoinBtn.disabled = false;
            submitJoinBtn.textContent = "Let's Go!";
            return;
        }
        
        currentUser.name = playerName;
        currentRoom = roomCode;
        
        joinModal.classList.remove('active');
        showView('player');
        playerJoinSteps.classList.remove('hidden');
        playerBuzzerScreen.classList.add('hidden');
        playerTeamSelection.classList.remove('hidden');

        const teams = snapshot.val().teams || {};
        const players = snapshot.val().players || {};
        renderTeamSelection(teams, players);
    } catch(err) {
        joinErrorMsg.textContent = 'Connection error. Please try again.';
    } finally {
        submitJoinBtn.disabled = false;
        submitJoinBtn.textContent = "Let's Go!";
    }
});

function renderTeamSelection(teams, players) {
    playerTeamList.innerHTML = '';
    const playersByTeam = {};
    Object.values(players).forEach(p => {
        if (!playersByTeam[p.team]) playersByTeam[p.team] = [];
        playersByTeam[p.team].push(p.name);
    });

    Object.keys(teams).forEach(teamId => {
        const team = teams[teamId];
        const card = document.createElement('div');
        card.className = 'team-join-card';
        card.style.borderColor = team.color;
        card.dataset.teamId = teamId;

        const teamPlayers = playersByTeam[teamId] || [];

        card.innerHTML = `
            <div class="team-card-header" style="color: ${team.color};">${team.name}</div>
            <div class="team-card-members">
                <span>${teamPlayers.length} member${teamPlayers.length !== 1 ? 's' : ''}</span>
                <ul>${teamPlayers.slice(0, 3).map(n => `<li>${n}</li>`).join('')}</ul>
            </div>
        `;
        card.addEventListener('click', () => selectTeam(teamId));
        playerTeamList.appendChild(card);
    });
}

async function selectTeam(teamId) {
    const playerId = currentUser.id;
    const playerData = {
        name: currentUser.name,
        team: teamId,
        joinedAt: firebase.database.ServerValue.TIMESTAMP
    };

    try {
        await db.ref(`rooms/${currentRoom}/players/${playerId}`).set(playerData);
        localStorage.setItem('quizbuzz_session', JSON.stringify({ roomCode: currentRoom, type: 'player', playerId }));
        startPlayerBuzzerScreen(currentRoom, playerId, teamId);
    } catch (error) {
        console.error("Error joining team:", error);
        alert("Could not join team. Please try again.");
    }
}

async function resumePlayerSession(roomCode, playerId) {
    try {
        const playerRef = db.ref(`rooms/${roomCode}/players/${playerId}`);
        const snapshot = await playerRef.once('value');
        if (snapshot.exists()) {
            const playerData = snapshot.val();
            currentUser.id = playerId;
            currentUser.name = playerData.name;
            currentRoom = roomCode;
            startPlayerBuzzerScreen(roomCode, playerId, playerData.team);
        } else {
            localStorage.removeItem('quizbuzz_session');
            showView('landing');
        }
    } catch(e) {
        localStorage.removeItem('quizbuzz_session');
        showView('landing');
    }
}

async function startPlayerBuzzerScreen(roomCode, playerId, teamId) {
    playerJoinSteps.classList.add('hidden');
    playerBuzzerScreen.classList.remove('hidden');
    showView('player');
    const teamSnapshot = await db.ref(`rooms/${roomCode}/teams/${teamId}`).once('value');
    const team = teamSnapshot.val();
    if (!team) {
        alert("Error: Your team could not be found. You may need to rejoin.");
        leaveRoomBtn.click();
        return;
    }
    playerInfoDisplay.innerHTML = `You are <b>${currentUser.name}</b> on <b style="color:${team.color};">${team.name}</b>`;
    playerRoomInfo.textContent = `Room: ${roomCode}`;
    
    document.body.style.setProperty('--team-color-tint', `${team.color}26`); 
    buzzerButton.style.backgroundColor = team.color;
    buzzerButton.style.borderColor = team.color;
    buzzerButton.style.boxShadow = `0 0 30px ${team.color}`;
    buzzerTeamLetter.textContent = teamId;

    const statusRef = db.ref(`rooms/${roomCode}/status`);
    if (statusListener) statusRef.off('value', statusListener);
    statusListener = statusRef.on('value', snapshot => {
        updateBuzzerState(snapshot.val(), roomCode, playerId);
    });

    const buzzesRef = db.ref(`rooms/${roomCode}/buzzes`);
    if (buzzesListener) buzzesRef.off('value', buzzesListener);
    buzzesListener = buzzesRef.on('value', snapshot => {
        const buzzes = snapshot.val() || {};
        const buzzList = Object.values(buzzes).sort((a, b) => a.timestamp - b.timestamp);
        const myBuzzIndex = buzzList.findIndex(b => b.playerId === playerId);

        updateMiniQueue(buzzList.slice(0, 3));

        if (myBuzzIndex !== -1) {
            buzzerButton.classList.add('buzzed');
            buzzerLabel.textContent = "YOU BUZZED!";
            buzzerRank.textContent = `#${myBuzzIndex + 1}`;
            buzzerTeamLetter.classList.add('hidden');
            buzzerRank.classList.remove('hidden');
        } else {
            buzzerButton.classList.remove('buzzed');
            buzzerRank.classList.add('hidden');
            buzzerTeamLetter.classList.remove('hidden');
        }
    });
}

function updateBuzzerState(status, roomCode, playerId) {
    buzzerButton.classList.remove('armed', 'disarmed', 'buzzed');
    buzzerRank.classList.add('hidden');
    buzzerTeamLetter.classList.remove('hidden');

    if (status === 'armed') {
        buzzerButton.classList.add('armed');
        buzzerLabel.textContent = 'TAP TO BUZZ';
        buzzerButton.disabled = false;
    } else {
        buzzerButton.classList.add('disarmed');
        buzzerLabel.textContent = 'Waiting for host...';
        buzzerButton.disabled = true;
    }
}

function updateMiniQueue(topBuzzes) {
    if (topBuzzes.length === 0) {
        miniQueuePreview.innerHTML = 'Queue is empty';
        return;
    }
    miniQueuePreview.innerHTML = topBuzzes.map((buzz, index) => 
        `<div><b>#${index + 1}</b> ${buzz.playerName} (${buzz.team})</div>`
    ).join('');
}

buzzerButton.addEventListener('click', async () => {
    if (buzzerButton.disabled) return;

    buzzerButton.disabled = true;
    playSound('player_buzz');
    if (navigator.vibrate) navigator.vibrate(150);

    const playerSnapshot = await db.ref(`rooms/${currentRoom}/players/${currentUser.id}`).once('value');
    const player = playerSnapshot.val();
    if (!player) return; 

    const teamSnapshot = await db.ref(`rooms/${currentRoom}/teams/${player.team}`).once('value');
    const team = teamSnapshot.val();
    if (!team) return; 

    const buzzData = {
        playerId: currentUser.id,
        playerName: currentUser.name,
        team: player.team,
        teamColor: team.color, 
        timestamp: firebase.database.ServerValue.TIMESTAMP
    };
    
    const buzzesRef = db.ref(`rooms/${currentRoom}/buzzes`);
    
    const snapshot = await buzzesRef.orderByChild('playerId').equalTo(currentUser.id).once('value');
    if (snapshot.exists()) return; 

    const newBuzzRef = buzzesRef.push();
    await newBuzzRef.set({ ...buzzData, buzzId: newBuzzRef.key });
});

leaveRoomBtn.addEventListener('click', () => {
    if (confirm("Are you sure you want to leave the room?")) {
        if (statusListener) db.ref(`rooms/${currentRoom}/status`).off('value', statusListener);
        if (buzzesListener) db.ref(`rooms/${currentRoom}/buzzes`).off('value', buzzesListener);
        localStorage.removeItem('quizbuzz_session');
        window.location.reload();
    }
});

// Keyboard shortcuts for host
document.addEventListener('keydown', (e) => {
    if (views.host.classList.contains('active') && hostDashboard.classList.contains('hidden') === false) {
        if (e.code === 'Space') {
            e.preventDefault();
            armBuzzersBtn.click();
        } else if (e.code === 'KeyC') {
            clearQueueBtn.click();
        } else if (e.code === 'KeyN') {
            nextQuestionBtn.click();
        }
    }
});
