// ===== VIDEO PLAYER INTEGRATION =====
// Explanatory video integration for Taste Signature

class VideoPlayer {
    constructor() {
        // Video URL - Update this after recording your video
        // Supports YouTube, Vimeo, or direct video files
        this.videoUrl = null; // Set to your video URL when ready
        this.videoType = null; // 'youtube', 'vimeo', or 'direct'
    }

    /**
     * Set video URL (can be YouTube, Vimeo, or direct file)
     */
    setVideo(url) {
        this.videoUrl = url;
        this.videoType = this.detectVideoType(url);
        console.log(`✅ Video set: ${this.videoType}`);
    }

    /**
     * Detect video type from URL
     */
    detectVideoType(url) {
        if (!url) return null;

        if (url.includes('youtube.com') || url.includes('youtu.be')) {
            return 'youtube';
        } else if (url.includes('vimeo.com')) {
            return 'vimeo';
        } else if (url.match(/\.(mp4|webm|ogg)$/i)) {
            return 'direct';
        }

        return 'unknown';
    }

    /**
     * Extract video ID from YouTube URL
     */
    getYouTubeId(url) {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    }

    /**
     * Extract video ID from Vimeo URL
     */
    getVimeoId(url) {
        const regExp = /vimeo.*\/(\d+)/i;
        const match = url.match(regExp);
        return match ? match[1] : null;
    }

    /**
     * Generate embed HTML for video
     */
    generateEmbed() {
        if (!this.videoUrl) {
            return this.generatePlaceholder();
        }

        switch (this.videoType) {
            case 'youtube':
                const youtubeId = this.getYouTubeId(this.videoUrl);
                if (!youtubeId) return this.generatePlaceholder();
                return `
                    <iframe
                        src="https://www.youtube.com/embed/${youtubeId}?rel=0"
                        frameborder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowfullscreen
                        loading="lazy">
                    </iframe>
                `;

            case 'vimeo':
                const vimeoId = this.getVimeoId(this.videoUrl);
                if (!vimeoId) return this.generatePlaceholder();
                return `
                    <iframe
                        src="https://player.vimeo.com/video/${vimeoId}"
                        frameborder="0"
                        allow="autoplay; fullscreen; picture-in-picture"
                        allowfullscreen
                        loading="lazy">
                    </iframe>
                `;

            case 'direct':
                return `
                    <video controls preload="metadata">
                        <source src="${this.videoUrl}" type="video/mp4">
                        Your browser does not support the video tag.
                    </video>
                `;

            default:
                return this.generatePlaceholder();
        }
    }

    /**
     * Generate placeholder when no video is set
     */
    generatePlaceholder() {
        return `
            <div class="video-placeholder">
                <div class="video-placeholder-icon">🎬</div>
                <div class="video-placeholder-text">Welcome Video Coming Soon!</div>
                <p style="margin-top: 10px; font-size: 0.9rem; opacity: 0.8;">
                    A video guide will be available here shortly
                </p>
            </div>
        `;
    }

    /**
     * Render video section on a page
     */
    renderOnPage(containerId, title = '📹 Getting Started Video') {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`Container ${containerId} not found`);
            return;
        }

        const videoSection = document.createElement('div');
        videoSection.className = 'video-section';
        videoSection.innerHTML = `
            <h3>${title}</h3>
            <div class="video-container">
                ${this.generateEmbed()}
            </div>
            ${this.videoUrl ? '' : '<p style="margin-top: 15px; color: #666; font-size: 0.9rem;"><em>💡 This video will show you how to get the most out of Taste Signature</em></p>'}
        `;

        container.appendChild(videoSection);
        console.log('✅ Video section rendered');
    }

    /**
     * Update existing video section
     */
    updateVideo(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const videoContainer = container.querySelector('.video-container');
        if (videoContainer) {
            videoContainer.innerHTML = this.generateEmbed();
            console.log('✅ Video updated');
        }
    }
}

// ===== VIDEO CONFIGURATION =====
// Easy way to set your video URL

const TasteSignatureVideo = {
    // UPDATE THIS URL AFTER RECORDING YOUR VIDEO
    // Examples:
    // - YouTube: 'https://www.youtube.com/watch?v=YOUR_VIDEO_ID'
    // - Vimeo: 'https://vimeo.com/YOUR_VIDEO_ID'
    // - Direct file: 'https://yourdomain.com/video.mp4'

    url: null, // <-- Set your video URL here when ready

    // Alternative: Set URL programmatically
    setUrl(url) {
        this.url = url;
        window.tasteVideoPlayer = new VideoPlayer();
        window.tasteVideoPlayer.setVideo(url);

        // Update video if already rendered
        if (document.getElementById('welcome-video-container')) {
            window.tasteVideoPlayer.updateVideo('welcome-video-container');
        }

        console.log('✅ Video URL updated:', url);
    }
};

// Initialize video player globally
if (typeof window !== 'undefined') {
    window.VideoPlayer = VideoPlayer;
    window.TasteSignatureVideo = TasteSignatureVideo;

    // Create global instance
    window.tasteVideoPlayer = new VideoPlayer();
    if (TasteSignatureVideo.url) {
        window.tasteVideoPlayer.setVideo(TasteSignatureVideo.url);
    }
}

// ===== EASY UPDATE INSTRUCTIONS =====
/*

TO ADD YOUR VIDEO AFTER RECORDING:

Option 1 - Edit this file:
1. Open video-player.js
2. Find line: url: null,
3. Change to: url: 'https://www.youtube.com/watch?v=YOUR_VIDEO_ID',
4. Save and deploy

Option 2 - Browser console (for testing):
1. Open browser console (F12)
2. Type: TasteSignatureVideo.setUrl('YOUR_VIDEO_URL')
3. Press Enter

Option 3 - Call from anywhere in your code:
TasteSignatureVideo.setUrl('https://youtube.com/watch?v=...');

*/
