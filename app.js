// State
let currentTab = 'home';
let mediaRecorder;
let audioChunks = [];
let isRecording = false;
let audioContext;
let analyser;
let source;
let animationId;
let startTime;
let timerInterval;

// DOM Elements
const canvas = document.getElementById('visualizer');
const canvasCtx = canvas.getContext('2d');
const recStatus = document.getElementById('rec-status');
const timerDisplay = document.getElementById('timer');
const btnRecord = document.getElementById('btn-record');
const btnStop = document.getElementById('btn-stop');
const btnPlay = document.getElementById('btn-play');
const audioPlayback = document.getElementById('audio-playback');
const micSelect = document.getElementById('mic-select');

// Resize canvas
function resizeCanvas() {
    canvas.width = canvas.parentElement.offsetWidth;
    canvas.height = canvas.parentElement.offsetHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Navigation
function switchTab(tabId) {
    // Hide all sections
    document.querySelectorAll('section').forEach(s => s.classList.remove('active-section'));
    document.querySelectorAll('.nav-links li').forEach(l => l.classList.remove('active'));

    // Show target
    document.getElementById(tabId).classList.add('active-section');
    
    // Highlight nav
    const navItem = Array.from(document.querySelectorAll('.nav-links li')).find(li => li.getAttribute('onclick').includes(tabId));
    if (navItem) navItem.classList.add('active');

    currentTab = tabId;
    
    if (tabId === 'studio') {
        initAudioContext();
        resizeCanvas();
    }
}

// Authentication Mock
function login(provider) {
    alert(`Authenticating with ${provider}... Success! Welcome to First Sound Pro.`);
}

// Audio Engine
async function initAudioContext() {
    if (!navigator.mediaDevices) {
        alert("Audio input not supported on this device.");
        return;
    }

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        // Populate inputs (Mocking multiple inputs if possible, usually just Default)
        navigator.mediaDevices.enumerateDevices().then(devices => {
            micSelect.innerHTML = '';
            devices.filter(d => d.kind === 'audioinput').forEach(device => {
                const option = document.createElement('option');
                option.value = device.deviceId;
                option.text = device.label || `Microphone ${micSelect.length + 1}`;
                micSelect.appendChild(option);
            });
        });

        // Setup Audio Context for Visualizer
        if(!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            analyser = audioContext.createAnalyser();
            source = audioContext.createMediaStreamSource(stream);
            source.connect(analyser);
            analyser.fftSize = 256;
            drawVisualizer();
        }

    } catch (err) {
        console.error("Error accessing mic:", err);
        recStatus.innerText = "MIC ERROR";
        recStatus.style.color = "red";
    }
}

function drawVisualizer() {
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
        animationId = requestAnimationFrame(draw);
        analyser.getByteFrequencyData(dataArray);

        canvasCtx.fillStyle = '#000';
        canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

        const barWidth = (canvas.width / bufferLength) * 2.5;
        let barHeight;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
            barHeight = dataArray[i] / 1.5; // Scale down

            // Gradient Color
            const r = 0;
            const g = 255; 
            const b = 163; // Primary Green
            
            // Dynamic color based on height
            const gradient = canvasCtx.createLinearGradient(0, canvas.height, 0, 0);
            gradient.addColorStop(0, '#7000ff');
            gradient.addColorStop(1, '#00ffa3');
            
            canvasCtx.fillStyle = gradient; 
            canvasCtx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

            x += barWidth + 1;
        }
    };

    draw();
}

// Recording Logic
function toggleRecording() {
    if (!isRecording) {
        startRecording();
    }
}

async function startRecording() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    audioChunks = [];

    mediaRecorder.ondataavailable = event => {
        audioChunks.push(event.data);
    };

    mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        const audioUrl = URL.createObjectURL(audioBlob);
        audioPlayback.src = audioUrl;
        document.getElementById('download-zone').style.display = 'block';
    };

    mediaRecorder.start();
    isRecording = true;
    
    // UI Updates
    recStatus.innerText = "RECORDING";
    recStatus.classList.add('recording');
    btnRecord.disabled = true;
    btnStop.disabled = false;
    btnPlay.disabled = true;

    // Timer
    startTime = Date.now();
    timerInterval = setInterval(() => {
        const delta = Date.now() - startTime;
        const totalSeconds = Math.floor(delta / 1000);
        const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
        const seconds = (totalSeconds % 60).toString().padStart(2, '0');
        const ms = Math.floor((delta % 1000) / 10).toString().padStart(2, '0');
        timerDisplay.innerText = `${minutes}:${seconds}:${ms}`;
    }, 50);
}

function stopPlayback() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
        isRecording = false;
        
        // UI Updates
        recStatus.innerText = "FINISHED";
        recStatus.classList.remove('recording');
        btnRecord.disabled = false;
        btnStop.disabled = true;
        btnPlay.disabled = false;
        
        clearInterval(timerInterval);
    }
}

function playPlayback() {
    audioPlayback.play();
}

// Initial Setup
switchTab('home');
