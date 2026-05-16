// pose.js - Handles MediaPipe Pose tracking and posture evaluation

const videoElement = document.getElementsByClassName('input_video')[0];
const canvasElement = document.getElementsByClassName('output_canvas')[0];
const canvasCtx = canvasElement.getContext('2d');
const cameraLoading = document.getElementById('camera-loading');

let poseActive = false;
let landmarksData = null;

// Posture State
let baselineNeckRatio = null; // The "good" ratio of neck length to shoulder width
let currentPosture = 'UNKNOWN'; // 'GOOD' or 'SLOUCHING'

// Configuration
// When slouching, the neck length decreases relative to shoulder width.
// We trigger slouching if the ratio drops by this threshold.
const SLOUCH_THRESHOLD = 0.15;

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

function calculateNeckRatio(landmarks) {
  const nose = landmarks[0];
  const leftShoulder = landmarks[11];
  const rightShoulder = landmarks[12];

  // Calculate the midpoint of the shoulders
  const shoulderMidY = (leftShoulder.y + rightShoulder.y) / 2;
  const shoulderMidX = (leftShoulder.x + rightShoulder.x) / 2;

  // Calculate shoulder width (approximate scale of the person in the frame)
  // Distance formula: sqrt((x2 - x1)^2 + (y2 - y1)^2)
  const shoulderWidth = Math.sqrt(Math.pow(leftShoulder.x - rightShoulder.x, 2) + Math.pow(leftShoulder.y - rightShoulder.y, 2));

  // Prevent division by zero if shoulders are not tracked well
  if (shoulderWidth < 0.01) return 0;

  // Calculate vertical distance from nose to shoulder midpoint (Neck length)
  // Since Y increases downwards, shoulder Y > nose Y normally.
  const neckLength = shoulderMidY - nose.y;

  // Normalize the neck length by shoulder width to be invariant to distance from camera
  return neckLength / shoulderWidth;
}

function analyzePosture(landmarks) {
  if (baselineNeckRatio === null) {
    return; // Not calibrated
  }

  const currentRatio = calculateNeckRatio(landmarks);

  // When a person slouches, their head drops closer to their shoulders,
  // making the neck length smaller, thus decreasing the currentRatio.
  // We compare the baseline to the current ratio.
  const ratioDrop = baselineNeckRatio - currentRatio;

  if (ratioDrop > SLOUCH_THRESHOLD) {
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
  if (!landmarksData || !landmarksData[0] || !landmarksData[11] || !landmarksData[12]) {
    alert("Pose not fully detected yet. Please make sure your face and shoulders are in frame.");
    return;
  }
  // Set baseline using the invariant neck-to-shoulder ratio
  baselineNeckRatio = calculateNeckRatio(landmarksData);
  setPostureStatus('GOOD');
  console.log("Calibrated baseline neck ratio:", baselineNeckRatio);
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
  getLandmarks: () => landmarksData,
  stopCamera: () => {
    if (camera) {
      camera.stop();
    }
    if (videoElement && videoElement.srcObject) {
      videoElement.srcObject.getTracks().forEach(track => track.stop());
      videoElement.srcObject = null;
    }
    // Clear the canvas
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    poseActive = false;
  },
  startCamera: () => {
    // Reset baseline
    baselineNeckRatio = null;
    setPostureStatus('UNKNOWN');

    // Show loading
    cameraLoading.classList.remove('hidden');

    // Restart camera instance
    if (camera) {
      camera.start();
    }
  }
};
