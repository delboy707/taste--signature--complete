// ===== CAMERA INTEGRATION FOR PWA =====
// Native camera access for capturing product photos on mobile

class CameraCapture {
    constructor() {
        this.stream = null;
        this.videoElement = null;
        this.canvasElement = null;
        this.isActive = false;
    }

    /**
     * Check if camera is supported
     */
    isSupported() {
        return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    }

    /**
     * Request camera permission and start camera
     */
    async startCamera(videoElement) {
        if (!this.isSupported()) {
            throw new Error('Camera not supported on this device');
        }

        try {
            // Request camera access with high-quality settings
            const constraints = {
                video: {
                    facingMode: 'environment', // Prefer back camera on mobile
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                },
                audio: false
            };

            this.stream = await navigator.mediaDevices.getUserMedia(constraints);
            this.videoElement = videoElement;
            this.videoElement.srcObject = this.stream;
            this.isActive = true;

            console.log('✅ Camera started successfully');
            return true;

        } catch (error) {
            console.error('❌ Camera access denied:', error);
            throw new Error('Camera access denied. Please allow camera permissions.');
        }
    }

    /**
     * Stop camera and release resources
     */
    stopCamera() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }

        if (this.videoElement) {
            this.videoElement.srcObject = null;
        }

        this.isActive = false;
        console.log('🛑 Camera stopped');
    }

    /**
     * Capture photo from camera
     */
    capturePhoto() {
        if (!this.isActive || !this.videoElement) {
            throw new Error('Camera is not active');
        }

        // Create canvas if not exists
        if (!this.canvasElement) {
            this.canvasElement = document.createElement('canvas');
        }

        // Set canvas dimensions to match video
        this.canvasElement.width = this.videoElement.videoWidth;
        this.canvasElement.height = this.videoElement.videoHeight;

        // Draw current video frame to canvas
        const context = this.canvasElement.getContext('2d');
        context.drawImage(this.videoElement, 0, 0);

        // Convert to data URL (JPEG with 90% quality)
        const dataUrl = this.canvasElement.toDataURL('image/jpeg', 0.9);

        console.log('📸 Photo captured');
        return dataUrl;
    }

    /**
     * Capture photo and return as Blob for uploading
     */
    async capturePhotoAsBlob() {
        if (!this.isActive || !this.videoElement) {
            throw new Error('Camera is not active');
        }

        // Create canvas if not exists
        if (!this.canvasElement) {
            this.canvasElement = document.createElement('canvas');
        }

        // Set canvas dimensions to match video
        this.canvasElement.width = this.videoElement.videoWidth;
        this.canvasElement.height = this.videoElement.videoHeight;

        // Draw current video frame to canvas
        const context = this.canvasElement.getContext('2d');
        context.drawImage(this.videoElement, 0, 0);

        // Convert to Blob
        return new Promise((resolve, reject) => {
            this.canvasElement.toBlob((blob) => {
                if (blob) {
                    resolve(blob);
                } else {
                    reject(new Error('Failed to create photo blob'));
                }
            }, 'image/jpeg', 0.9);
        });
    }

    /**
     * Switch between front and back camera (mobile)
     */
    async switchCamera() {
        const currentMode = this.stream.getVideoTracks()[0].getSettings().facingMode;
        const newMode = currentMode === 'user' ? 'environment' : 'user';

        this.stopCamera();

        const constraints = {
            video: {
                facingMode: newMode,
                width: { ideal: 1920 },
                height: { ideal: 1080 }
            },
            audio: false
        };

        this.stream = await navigator.mediaDevices.getUserMedia(constraints);
        this.videoElement.srcObject = this.stream;
        this.isActive = true;

        console.log(`📷 Switched to ${newMode === 'user' ? 'front' : 'back'} camera`);
    }
}

// ===== CAMERA UI MODAL =====

/**
 * Show camera capture modal
 */
async function showCameraModal(onCapture) {
    const camera = new CameraCapture();

    // Create modal HTML
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
        <div class="modal-content camera-modal">
            <div class="camera-modal-header">
                <h3>📸 Capture Product Photo</h3>
                <button class="btn-close-camera" aria-label="Close camera">&times;</button>
            </div>
            <div class="camera-preview-container">
                <video id="camera-preview" autoplay playsinline></video>
                <div class="camera-overlay">
                    <div class="camera-guide"></div>
                </div>
            </div>
            <div class="camera-controls">
                <button class="btn btn-secondary" id="btn-switch-camera" title="Switch camera">
                    🔄 Flip
                </button>
                <button class="btn btn-primary btn-lg" id="btn-capture-photo">
                    📸 Capture
                </button>
                <button class="btn btn-secondary" id="btn-cancel-camera">
                    Cancel
                </button>
            </div>
            <div class="camera-tip">
                💡 <em>Position your product in the frame and tap Capture</em>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    const videoElement = document.getElementById('camera-preview');
    const captureBtn = document.getElementById('btn-capture-photo');
    const switchBtn = document.getElementById('btn-switch-camera');
    const cancelBtn = document.getElementById('btn-cancel-camera');
    const closeBtn = modal.querySelector('.btn-close-camera');

    // Start camera
    try {
        await camera.startCamera(videoElement);
    } catch (error) {
        alert(`❌ ${error.message}\n\nPlease allow camera access in your browser settings.`);
        modal.remove();
        return;
    }

    // Capture photo
    captureBtn.addEventListener('click', async () => {
        try {
            const photoData = camera.capturePhoto();
            camera.stopCamera();
            modal.remove();

            if (onCapture) {
                onCapture(photoData);
            }
        } catch (error) {
            alert(`Error capturing photo: ${error.message}`);
        }
    });

    // Switch camera (front/back)
    switchBtn.addEventListener('click', async () => {
        try {
            await camera.switchCamera();
        } catch (error) {
            console.error('Failed to switch camera:', error);
        }
    });

    // Cancel and close
    const closeCamera = () => {
        camera.stopCamera();
        modal.remove();
    };

    cancelBtn.addEventListener('click', closeCamera);
    closeBtn.addEventListener('click', closeCamera);

    // Close on escape key
    const escapeHandler = (e) => {
        if (e.key === 'Escape') {
            closeCamera();
            document.removeEventListener('keydown', escapeHandler);
        }
    };
    document.addEventListener('keydown', escapeHandler);
}

/**
 * Alternative: Use file picker with camera option (fallback)
 */
function showPhotoPicker(onCapture) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment'; // Prefer camera on mobile

    input.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                if (onCapture) {
                    onCapture(event.target.result);
                }
            };
            reader.readAsDataURL(file);
        }
    });

    input.click();
}

/**
 * Smart camera launcher - uses native camera or file picker
 */
async function launchCamera(onCapture) {
    const camera = new CameraCapture();

    if (camera.isSupported() && window.innerWidth <= 768) {
        // Use full camera modal on mobile
        await showCameraModal(onCapture);
    } else {
        // Use file picker on desktop or if camera not supported
        showPhotoPicker(onCapture);
    }
}

// Export to global
if (typeof window !== 'undefined') {
    window.CameraCapture = CameraCapture;
    window.showCameraModal = showCameraModal;
    window.launchCamera = launchCamera;
}
