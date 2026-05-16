// pose.js - Handles MediaPipe Pose tracking and posture evaluation

const videoElement = document.getElementsByClassName('input_video')[0];
const canvasElement = document.getElementsByClassName('output_canvas')[0];
const canvasCtx = canvasElement.getContext('2d');
const cameraLoading = document.getElementById('camera-loading');

let poseActive = false;
let landmarksData = null;

// Posture State
let baselineY = null;     // The "good" Y position of the nose
let currentPosture = 'UNKNOWN'; // 'GOOD' or 'SLOUCHING'

// Configuration
const SLOUCH_THRESHOLD = 0.05; // Y-axis difference to trigger slouching

function onResults(results) {
  if (!poseActive) {
    poseActive = true;
    cameraLoading.classList.add('hidden');
  }

  landmarksData = results.poseLandmarks;

  // Draw landmarks
  canvasCtx.save();
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

  if (results.poseLandmarks) {
    drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS,
                   {color: '#00FF00', lineWidth: 4});
    drawLandmarks(canvasCtx, results.poseLandmarks,
                  {color: '#FF0000', lineWidth: 2});

    analyzePosture(results.poseLandmarks);
  }
  canvasCtx.restore();
}

function analyzePosture(landmarks) {
  // Use nose (landmark 0) to track vertical drop
  const nose = landmarks[0];

  if (baselineY === null) {
    return; // Not calibrated
  }

  // If Y increases, the head is dropping down (slouching)
  const dropDistance = nose.y - baselineY;

  if (dropDistance > SLOUCH_THRESHOLD) {
    setPostureStatus('SLOUCHING');
  } else {
    setPostureStatus('GOOD');
  }
}

function setPostureStatus(status) {
  if (currentPosture === status) return;
  currentPosture = status;

  const statusIndicator = document.getElementById('posture-status-indicator');
  const statusText = document.getElementById('posture-status-text');

  if (status === 'GOOD') {
    statusIndicator.className = 'w-6 h-6 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.8)]';
    statusText.textContent = 'Good Posture';
    statusText.className = 'text-lg font-semibold text-green-400';
    if (window.game) window.game.onGoodPosture();
  } else if (status === 'SLOUCHING') {
    statusIndicator.className = 'w-6 h-6 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)] animate-pulse';
    statusText.textContent = 'Slouching Detected!';
    statusText.className = 'text-lg font-semibold text-red-400';
    if (window.game) window.game.onSlouch();
  } else {
    statusIndicator.className = 'w-6 h-6 rounded-full bg-gray-500';
    statusText.textContent = 'Calibrating...';
    statusText.className = 'text-lg font-semibold text-gray-400';
  }
}

function calibrate() {
  if (!landmarksData) {
    alert("Pose not detected yet. Please make sure you are in frame.");
    return;
  }
  // Set baseline using the nose's current Y position
  baselineY = landmarksData[0].y;
  setPostureStatus('GOOD');
  console.log("Calibrated baseline Y:", baselineY);
}

// Initialize MediaPipe Pose
const pose = new Pose({locateFile: (file) => {
  return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
}});
pose.setOptions({
  modelComplexity: 1,
  smoothLandmarks: true,
  enableSegmentation: false,
  smoothSegmentation: false,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5
});
pose.onResults(onResults);

// Initialize Camera
const camera = new Camera(videoElement, {
  onFrame: async () => {
    // Set canvas dimensions to match video to avoid distortion
    canvasElement.width = videoElement.videoWidth;
    canvasElement.height = videoElement.videoHeight;
    await pose.send({image: videoElement});
  },
  width: 640,
  height: 480
});

// Setup calibrate button
document.getElementById('calibrate-btn').addEventListener('click', calibrate);

// Start camera
camera.start();

// Export for game logic if needed
window.poseTracker = {
  getCurrentPosture: () => currentPosture,
  getLandmarks: () => landmarksData
};
