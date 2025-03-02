import { Logger } from '../utils/logger.js';
import { VideoRecorder } from './video-recorder.js';
import { ApplicationError, ErrorCodes } from '../utils/error-boundary.js';
import{audioVolume,isRecording} from '../main.js';

/**
 * @fileoverview Manages video capture and processing with motion detection and frame preview.
 */

/**
 * Manages video capture and processing with motion detection and frame preview
 * @class VideoManager
 */
export class VideoManager {
    /**
     * Creates a new VideoManager instance
     * @constructor
     */
    constructor() {
        // Add at the start of constructor
        if (!document.getElementById('video-container')) {
            throw new ApplicationError(
                'Video container element not found',
                ErrorCodes.INVALID_STATE
            );
        }
        // DOM elements
        this.videoContainer = document.getElementById('video-container');
        this.previewVideo = document.getElementById('preview');
        this.stopVideoButton = document.getElementById('stop-video');
        this.framePreview = document.createElement('canvas');
        
        // State management
        this.lastFrameData = null;
        this.lastSignificantFrame = null;
        this.frameCount = 0;
        this.lastFrameTime = 0;
        this.videoRecorder = null;
        this.isActive = false;
        this.previousVolume = 0;
        this.previousVideoDiff = 0;
        // Configuration
        this.MOTION_THRESHOLD = 0.4;  //已经修改为变化率 Minimum pixel difference to detect motion
        this.FRAME_INTERVAL = 200;   // Minimum ms between frames
        this.FORCE_FRAME_INTERVAL = 10; // Send frame every N frames regardless of motion

        // this.setupFramePreview();

        // 摄像头状态，用户切换镜头
        this.facingMode = 'user';
        this.onFrame = null;
        this.fps = null;
        
        // 获取翻转按钮元素并添加事件监听
        this.flipCameraButton = document.getElementById('flip-camera');
        if (!this.flipCameraButton) {
            throw new ApplicationError(
                'Flip camera button element not found',
                ErrorCodes.INVALID_STATE
            );
        }
        
        // 在构造函数中直接绑定事件
        this.flipCameraButton.addEventListener('click', async () => {
            event.stopPropagation(); // 阻止事件冒泡
            try {
                await this.flipCamera();
            } catch (error) {
                Logger.error('Error flipping camera:', error);
            }
        });
    }

    /**
     * Sets up the frame preview canvas
     * @private
     */
    setupFramePreview() {
        this.framePreview.id = 'frame-preview';
        this.framePreview.width = 320;
        this.framePreview.height = 240;
        this.videoContainer.appendChild(this.framePreview);

        // Add click handler to toggle preview size
        this.framePreview.addEventListener('click', () => {
            this.framePreview.classList.toggle('enlarged');
        });
    }

    /**
     * Updates the frame preview with new image data
     * @param {string} base64Data - Base64 encoded image data
     * @private
     */
    updateFramePreview(base64Data,width,height) {
        const img = new Image();
        img.onload = () => {
            const ctx = this.framePreview.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
        };
        img.src = 'data:image/jpeg;base64,' + base64Data;
    }

    /**
     * Detects motion between two frames
     * @param {Uint8ClampedArray} prevFrame - Previous frame data
     * @param {Uint8ClampedArray} currentFrame - Current frame data
     * @returns {number} Motion score
     * @private
     */
    detectMotion(prevFrame, currentFrame) {
        let diff = 0;
        const pixelsToCheck = prevFrame.length / 4;
        const skipPixels = 2;

        for (let i = 0; i < prevFrame.length; i += 4 * skipPixels) {
            const rDiff = Math.abs(prevFrame[i] - currentFrame[i]);
            const gDiff = Math.abs(prevFrame[i + 1] - currentFrame[i + 1]);
            const bDiff = Math.abs(prevFrame[i + 2] - currentFrame[i + 2]);
            diff += Math.max(rDiff, gDiff, bDiff);
        }
        let diff2 = Math.abs(diff - this.previousVideoDiff);
        this.previousVideoDiff = diff;
        return diff2 /(pixelsToCheck / skipPixels);
    }
    detectMotionByHistogram(prevFrame, currentFrame, bins = 32) {
        // 计算灰度直方图
        const getHistogram = (frame) => {
            const histogram = new Array(bins).fill(0);
            for (let i = 0; i < frame.length; i += 4) {
                // 转换为灰度值
                const gray = (frame[i] * 0.299 + frame[i + 1] * 0.587 + frame[i + 2] * 0.114);
                const bin = Math.floor(gray * bins / 256);
                histogram[bin]++;
            }
            return histogram;
        };
    
        const hist1 = getHistogram(prevFrame);
        const hist2 = getHistogram(currentFrame);
    
        // 计算直方图差异
        let diff = 0;
        for (let i = 0; i < bins; i++) {
            diff += Math.abs(hist1[i] - hist2[i]);
        }
    
        return diff / (prevFrame.length / 4);
    }

// 检测音量变化的函数
detectVolumeChange() {
    if(isRecording==false){
        return 0;
    }
    const currentVolume=audioVolume;
    const change = currentVolume - this.previousVolume ;
    this.previousVolume = currentVolume;
    if ((change > 0.3 && currentVolume==0) || (change > 0.3 && currentVolume>=0.3)){
        return 1;
      } else if(change < 0 && currentVolume==0) {
        return -1;
      }else if(change > 0.5 && currentVolume>0.8) {
        return 2;
      }else {
      return 0;
    }
  }
    /**
     * Starts video capture and processing
     * @param {Function} onFrame - Callback for processed frames
     * @returns {Promise<boolean>} Success status
     * @throws {ApplicationError} If video capture fails
     */
    async start(fps, onFrame) {
        try {
            this.onFrame = onFrame;
            this.fps = fps;
            Logger.info('Starting video manager');
            this.videoContainer.style.display = 'block';
            console.log("fps:",fps);
            this.videoRecorder = new VideoRecorder({fps: fps});
                        
            await this.videoRecorder.start(this.previewVideo,this.facingMode, (base64Data) => {
                if (!this.isActive) {
                    //Logger.debug('Skipping frame - inactive');
                    return;
                }

                const currentTime = Date.now();
                if (currentTime - this.lastFrameTime < this.FRAME_INTERVAL) {
                    return;
                }
                //在此通过检测音频输入流强度inputAudioVisualizer超阈值时才发送截图，避免实时发送截图（非实时场景，可加开关）
                let change = this.detectVolumeChange();
                if(change<=0){
                    return;
                }else if(change==2){
                    stopPlayChunk();//打断播报
                    audioElement.src = '';
                    audioElement.load();
                }

                this.processFrame(base64Data, onFrame);
                

            });

            this.isActive = true;
            return true;

        } catch (error) {
            Logger.error('Video manager error:', error);
            this.stop();
            throw new ApplicationError(
                'Failed to start video manager',
                ErrorCodes.VIDEO_START_FAILED,
                { originalError: error }
            );
        }
    }

    /**
     * Processes a single video frame
     * @param {string} base64Data - Base64 encoded frame data
     * @param {Function} onFrame - Frame callback
     * @private
     */
    processFrame(base64Data, onFrame) {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            if (this.lastFrameData) {
                const motionScore = this.detectMotion(this.lastFrameData, imageData.data);
                if (motionScore < this.MOTION_THRESHOLD && this.frameCount % this.FORCE_FRAME_INTERVAL !== 0) {
                    Logger.debug(`Skipping frame - low motion (score: ${motionScore})`);
                    return;
                }
            }

            this.framePreviewWidth = Math.round(canvas.width * 0.5);
            this.framePreviewHeight = Math.round(canvas.height * 0.5);

            this.updateFramePreview(base64Data,this.framePreviewWidth,this.framePreviewHeight);
            
            this.lastFrameData = imageData.data;
            this.lastSignificantFrame = base64Data;
            this.lastFrameTime = Date.now();
            this.frameCount++;

            const size = Math.round(base64Data.length / 1024);
            //Logger.debug(`Processing frame (${size}KB) - frame #${this.frameCount}`);

            onFrame({
                mimeType: "image/jpeg",
                data: base64Data
            });
        };
        img.src = 'data:image/jpeg;base64,' + base64Data;
    }

    /**
     * Stops video capture and processing
     */
    async stop() {
        // if (this.videoRecorder) {
            await this.videoRecorder.stop();
            this.videoRecorder = null;
        // }
        this.isActive = false;
        this.videoContainer.style.display = 'none';
        this.lastFrameData = null;
        this.lastSignificantFrame = null;
        this.frameCount = 0;
    }


    async flipCamera() {

        try {
            Logger.info('Flipping camera');
            this.facingMode = this.facingMode === 'user' ? 'environment' : 'user';    
                    // 切换摄像头时自动处理镜像
            this.previewVideo.style.transform = this.facingMode === 'user' ? 'scaleX(-1)' : 'scaleX(1)';
            this.framePreview.style.transform = this.facingMode === 'user' ? 'scaleX(-1)' : 'scaleX(1)';
             
            await this.stop();
            await this.start(this.fps,this.onFrame);
            Logger.info('Camera flipped successfully');
        } catch (error) {
            Logger.error('Error flipping camera:', error);
            throw new ApplicationError(
                'Failed to flip camera',
                ErrorCodes.VIDEO_FLIP_FAILED,
                { originalError: error }
            );
        }
    }

    async captureCurrentFrame() {
        if (!this.previewVideo || !this.previewVideo.videoWidth) {
            return null;
        }
    
        try {
            const canvas = document.createElement('canvas');
            canvas.width = this.previewVideo.videoWidth;
            canvas.height = this.previewVideo.videoHeight;
            const ctx = canvas.getContext('2d');
            
            // 绘制当前视频帧
            ctx.drawImage(this.previewVideo, 0, 0);
            
            // 转换为base64
            return {
                mimeType: "image/jpeg",
                data: canvas.toDataURL('image/jpeg', 0.8).split(',')[1]
            };
        } catch (error) {
            Logger.error('Error capturing frame:', error);
            return null;
        }
    }
}