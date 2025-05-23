import { MultimodalLiveClient } from './core/websocket-client.js';
import { AudioStreamer } from './audio/audio-streamer.js';
import { AudioRecorder } from './audio/audio-recorder.js';
import { CONFIG } from './config/config.js';
import { Logger } from './utils/logger.js';
import { VideoManager } from './video/video-manager.js';
import { ScreenRecorder } from './video/screen-recorder.js';
// import { AudioPlayer } from './audio/audio-player.js';


/**
 * @fileoverview Main entry point for the application.
 * Initializes and manages the UI, audio, video, and WebSocket interactions.
 */

// DOM Elements
const logsContainer = document.getElementById('logs-container');
const msglist = document.getElementById('msg-list');
const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-button');
const micButton = document.getElementById('mic-button');
const micIcon = document.getElementById('mic-icon');
const audioVisualizer = document.getElementById('audio-visualizer');
const connectButton = document.getElementById('connect-button');
const cameraButton = document.getElementById('camera-button');
const cameraIcon = document.getElementById('camera-icon');
const stopVideoButton = document.getElementById('stop-video');
const screenButton = document.getElementById('screen-button');
const screenIcon = document.getElementById('screen-icon');
const screenContainer = document.getElementById('screen-container');
const screenPreview = document.getElementById('screen-preview');
const inputAudioVisualizer = document.getElementById('input-audio-visualizer');
const apiKeyInput = document.getElementById('api-key');
const voiceSelect = document.getElementById('voice-select');
const fpsInput = document.getElementById('fps-input');
const configToggle = document.getElementById('config-toggle');
const configContainer = document.getElementById('config-container');
const systemInstructionInput = document.getElementById('system-instruction');
systemInstructionInput.value = CONFIG.SYSTEM_INSTRUCTION.TEXT;
const applyConfigButton = document.getElementById('apply-config');
const responseTypeSelect = document.getElementById('response-type-select');

// Load saved values from localStorage
const savedApiKey = localStorage.getItem('gemini_api_key');
const savedVoice = localStorage.getItem('gemini_voice');
const savedFPS = localStorage.getItem('video_fps');
const savedSystemInstruction = localStorage.getItem('system_instruction');

const SAMPLE_RATE=CONFIG.AUDIO.SAMPLE_RATE;
const IS_MOBILE = isMobileDevice();
let audioVolume=0 ;
let TTSaudioVolume=1;
let previousVolume = 0;
let change = 0;

export let enableSnapshot = false;

if (savedApiKey) {
    apiKeyInput.value = savedApiKey;
}
if (savedVoice) {
    voiceSelect.value = savedVoice;
}

if (savedFPS) {
    fpsInput.value = savedFPS;
}
if (savedSystemInstruction) {
    systemInstructionInput.value = savedSystemInstruction;
    CONFIG.SYSTEM_INSTRUCTION.TEXT = savedSystemInstruction;
}

// Handle configuration panel toggle
configToggle.addEventListener('click', () => {
    configContainer.classList.toggle('active');
    configToggle.classList.toggle('active');
});

applyConfigButton.addEventListener('click', () => {
    configContainer.classList.toggle('active');
    configToggle.classList.toggle('active');
});

// State variables
export let isRecording = false;
let audioStreamer = null;
let audioCtx = null;
let isConnected = false;
let audioRecorder = null;
let isVideoActive = false;
let videoManager = null;
let isScreenSharing = false;
let screenRecorder = null;
let isUsingTool = false;

// Multimodal Client
const client = new MultimodalLiveClient();
var chunks=""
  // 监听自定义事件
  document.addEventListener('NewChunks', async  function(event) {
    console.log('Custom event received:=================================开始接收一条新的消息的文本', event.detail.message);
    // console.log(chunks);
           // 使用正则表达式检测断句符号（句号、问号、感叹号等）
    const chunkEndRegex = /[。：?？\n]/u;
    
    // if (isLooping()){return;}//检查是否在循环中,调用时首先检查，防止重入循环
    while (chunks.length>0) {
        // 查找缓冲区中第一个断句符号的位置
        const match = chunks.match(chunkEndRegex);

        if (!match) {
            // 如果没有找到断句符号，继续等待更多数据
            await new Promise(resolve => setTimeout(resolve, 50));
            continue;
        }

        // 获取断句符号的位置
        const endIndex = match.index + 1;

        // 提取完整的句子.replace(/[^\w\s\n]/g, '').trim();
        const chunk = chunks.slice(0, endIndex).trim();
        chunks = chunks.slice(endIndex).trim();
// console.log(chunks);
        if (chunk.length > 1) {
            // 播放句子
            if (voiceSelect.value !== 'none') {
                console.log("\n正在播报==="+chunk);
                audioElement.volume = 1;
                await playChunk(chunk, voiceSelect.selectedIndex, 20, 0, false);
                if (stopPlay){ break;}///////////////////////////必须加上这个判断，才能正常结束播放
            }
        }
 
    }

  });
/**
 * Logs a message to the UI.
 * @param {string} message - The message to log.
 * @param {string} [type='system'] - The type of the message (system, user, ai).
 */
let completed=false;
async function logMessage(message, type = 'system') {
    const logEntry = document.createElement('div');
    logEntry.classList.add('log-entry', type);

    const timestamp = document.createElement('span');
    timestamp.classList.add('timestamp');
    timestamp.textContent = new Date().toLocaleTimeString();
    logEntry.appendChild(timestamp);

    const emoji = document.createElement('span');
    emoji.classList.add('emoji');
    switch (type) {
        case 'system':
            emoji.textContent = '⚙️';
            // console.log(message)
            if(message.includes("Turn complete")){
                completed=true;
                chunks+="\n";
            }
            if(message.includes("WebSocket connection opened")){
                // stopPlayChunks();
                disconnectFromWebsocket();
                const msgDiv = document.createElement('div');
                msglist.innerHTML="";
                msgDiv.classList.add('msg-div');
                msglist.appendChild(msgDiv);
                let text="你好呀，我来了。";
                msglist.lastElementChild.textContent=text;
                if (voiceSelect.value !== 'none') playChunk(text,voiceSelect.selectedIndex,20,0,false);
            }
            if(message.includes("WebSocket connection closed")||message.includes('message.includes("WebSocket connection closed")')){
                stopPlayChunks();
                disconnectFromWebsocket();
                const msgDiv = document.createElement('div');
                msgDiv.classList.add('msg-div');
                msglist.appendChild(msgDiv);
                let text="您已经断开与智能助理的连接。";
                msglist.lastElementChild.textContent=text;
                if (voiceSelect.value !== 'none') playChunk(text,voiceSelect.selectedIndex,20,0,false);
            }
            if(message.includes("Camera started")){
                document.getElementById("video-container").style.height = '250px';
            }
            break;
        case 'user':
            emoji.textContent = '🫵';
            break;
        case 'ai':
            emoji.textContent = '🤖';
            if(completed){
                completed=false;
                chunks="";
                // playChunk(".",2,0,0,false);
                stopPlayChunks();
                const msgDiv = document.createElement('div');
                msgDiv.classList.add('msg-div');
                msglist.appendChild(msgDiv);
            }
            if (msglist.lastElementChild) {
                msglist.lastElementChild.textContent += message;

                let chunksLength = chunks.length;
                chunks += message;
                chunks=chunks.replace(/[\\*#]/g, '');
                chunks=chunks.replace(/\n+/g, "\n");
                if(chunksLength==0){
                    var customEvent = new CustomEvent('NewChunks', {
                        detail: { message:  "new chunks" },
                        bubbles: true,
                        cancelable: true
                    });
                    document.dispatchEvent(customEvent);
                }
                msglist.scrollTop = msglist.scrollHeight;
            }
            break;
    }
    logEntry.appendChild(emoji);

    const messageText = document.createElement('span');
    messageText.textContent = message;
    logEntry.appendChild(messageText);

    logsContainer.appendChild(logEntry);
    logsContainer.scrollTop = logsContainer.scrollHeight;
}

/**
 * Updates the microphone icon based on the recording state.
 */
function updateMicIcon() {
    micIcon.textContent = isRecording ? 'mic_off' : 'mic';
    micButton.style.backgroundColor = isRecording ? '#ea4335' : '#4285f4';
}

/**
 * Updates the audio visualizer based on the audio volume.
 * @param {number} volume - The audio volume (0.0 to 1.0).
 * @param {boolean} [isInput=false] - Whether the visualizer is for input audio.
 */
function updateAudioVisualizer(volume, isInput = false) {
    const visualizer = isInput ? inputAudioVisualizer : audioVisualizer;
    const audioBar = visualizer.querySelector('.audio-bar') || document.createElement('div');
    
    if (!visualizer.contains(audioBar)) {
        audioBar.classList.add('audio-bar');
        visualizer.appendChild(audioBar);
    }
    audioVolume =  volume;
    audioBar.style.width = `${volume * 100}%`;
    if (volume > 0) {
        audioBar.classList.add('active');
    } else {
        audioBar.classList.remove('active');
    }
}

/**
 * Initializes the audio context and streamer if not already initialized.
 * @returns {Promise<AudioStreamer>} The audio streamer instance.
 */
async function ensureAudioInitialized() {
    if (!audioCtx) {
        audioCtx = new AudioContext();
    }
    if (!audioStreamer) {
        audioStreamer = new AudioStreamer(audioCtx);
        await audioStreamer.addWorklet('vumeter-out', 'js/audio/worklets/vol-meter.js', (ev) => {
            updateAudioVisualizer(ev.data.volume);
        });
    }
    return audioStreamer;
}

/**
 * Handles the microphone toggle. Starts or stops audio recording.
 * @returns {Promise<void>}
 */
let inputVolume = 0;
async function handleMicToggle() {
    if (!isRecording) {
        try {
            await ensureAudioInitialized();
            audioRecorder = new AudioRecorder();
            
            const inputAnalyser = audioCtx.createAnalyser();
            inputAnalyser.fftSize = 256;
            const inputDataArray = new Uint8Array(inputAnalyser.frequencyBinCount);
            
            await audioRecorder.start(async (base64Data) => {
                if (isUsingTool) {
                    client.sendRealtimeInput([{
                        mimeType: "audio/pcm;rate=" + SAMPLE_RATE,
                        data: base64Data,
                        interrupt: true     // Model isn't interruptable when using tools, so we do it manually
                    }]);
                } else {
                    client.sendRealtimeInput([{
                        mimeType: "audio/pcm;rate="+ SAMPLE_RATE,
                        data: base64Data
                    }]);
                }
                
                inputAnalyser.getByteFrequencyData(inputDataArray);
                inputVolume = Math.max(...inputDataArray) / 255;
                updateAudioVisualizer(inputVolume, true);

            //    //在此通过检测音频输入流强度inputAudioVisualizer超阈值时才发送截图，避免实时发送截图（非实时场景，可加开关）
                change = detectVolumeChange();
                // console.log("=========================change:",change,enableSnapshot);
                if(change==1){
                    enableSnapshot=true;
                    audioElement.volume = 0.1;
                    await setTimeout(() => {
                        if(inputVolume<=0.3) {
                            enableSnapshot=false;
                            audioElement.volume = 1;
                        }
                    }, 3000);
                }
                // else if (change==1 && IS_MOBILE){// console.log("是否移动设备",IS_MOBILE);
                //     // stopPlayChunk();//打断播报
                //     // audioElement.src = '';
                //     // audioElement.load();
                // }
            });

            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const source = audioCtx.createMediaStreamSource(stream);
            source.connect(inputAnalyser);
            
            await audioStreamer.resume();
            isRecording = true;
            Logger.info('Microphone started');
            logMessage('Microphone started', 'system');
            updateMicIcon();
        } catch (error) {
            Logger.error('Microphone error:', error);
            logMessage(`Error: ${error.message}`, 'system');
            isRecording = false;
            updateMicIcon();
        }
    } else {
        if (audioRecorder && isRecording) {
            audioRecorder.stop();
        }
        isRecording = false;
        logMessage('Microphone stopped', 'system');
        updateMicIcon();
        updateAudioVisualizer(0, true);
    }
}

/**
 * Resumes the audio context if it's suspended.
 * @returns {Promise<void>}
 */
async function resumeAudioContext() {
    if (audioCtx && audioCtx.state === 'suspended') {
        await audioCtx.resume();
    }
}

/**
 * Connects to the WebSocket server.
 * @returns {Promise<void>}
 */
async function connectToWebsocket() {
    if (!apiKeyInput.value) {
        logMessage('Please input API Key', 'system');
        return;
    }

    // Save values to localStorage
    localStorage.setItem('gemini_api_key', apiKeyInput.value);
    localStorage.setItem('gemini_voice', voiceSelect.value);
    localStorage.setItem('system_instruction', systemInstructionInput.value);

    const config = {
        model: CONFIG.API.MODEL_NAME,
        generationConfig: {
            responseModalities: responseTypeSelect.value,
            speechConfig: {
                voiceConfig: { 
                    prebuiltVoiceConfig: { 
                        voiceName: voiceSelect.value    // You can change voice in the config.js file
                    }
                }
            },

        },
        systemInstruction: {
            parts: [{
                text: systemInstructionInput.value     // You can change system instruction in the config.js file
            }],
        }
    };  

    try {
        await client.connect(config,apiKeyInput.value);
        isConnected = true;
        await resumeAudioContext();
        connectButton.textContent = 'Disconnect';
        connectButton.classList.add('connected');
        messageInput.disabled = false;
        sendButton.disabled = false;
        micButton.disabled = false;
        cameraButton.disabled = false;
        screenButton.disabled = false;
        logMessage('Connected to Gemini 2.0 Flash Multimodal Live API', 'system');
                // 自动启动视频和麦克风
                await handleVideoToggle();
                await handleMicToggle();
    } catch (error) {
        const errorMessage = error.message || 'Unknown error';
        Logger.error('Connection error:', error);
        logMessage(`Connection error: ${errorMessage}`, 'system');
        isConnected = false;
        connectButton.textContent = 'Connect';
        connectButton.classList.remove('connected');
        messageInput.disabled = true;
        sendButton.disabled = true;
        micButton.disabled = true;
        cameraButton.disabled = true;
        screenButton.disabled = true;
    }
}

/**
 * Disconnects from the WebSocket server.
 */
function disconnectFromWebsocket() {
    client.disconnect();
    isConnected = false;
    if (audioStreamer) {
        audioStreamer.stop();
        if (audioRecorder) {
            audioRecorder.stop();
            audioRecorder = null;
        }
        isRecording = false;
        updateMicIcon();
    }
    connectButton.textContent = 'Connect';
    connectButton.classList.remove('connected');
    messageInput.disabled = true;
    sendButton.disabled = true;
    micButton.disabled = true;
    cameraButton.disabled = true;
    screenButton.disabled = true;
    logMessage('Disconnected from server', 'system');
    
    if (videoManager) {
        stopVideo();
    }
    
    if (screenRecorder) {
        stopScreenSharing();
    }
}

/**
 * Handles sending a text message.
 */
// function handleSendMessage() {
//     const message = messageInput.value.trim();
//     if (message) {
//         client.sendRealtimeInput([{ mimeType: 'text/plain', data: message }]);
//         logMessage(message, 'user');
//         client.send({ text: message });
//         messageInput.value = '';
//     }
// }

async function handleSendMessage() {
    const message = messageInput.value.trim();
    if (message) {
        try {
            const parts = [{ text: message }];

            // 如果视频激活，添加视频帧
            if (isVideoActive && videoManager) {
                const frameData = await videoManager.captureCurrentFrame();
                if (frameData) {
                    parts.push({
                        inlineData: {
                            mimeType: frameData.mimeType,
                            data: frameData.data
                        }
                    });
                    Logger.info('已添加视频帧到消息');
                }
            }

            // 发送文本和图片
            logMessage(message, 'user');
            await client.send(parts);
            messageInput.value = '';
            Logger.info('消息发送完成');
            
        } catch (error) {
            Logger.error('发送消息失败:', error);
            logMessage(`发送失败: ${error.message}`, 'system');
        }
    }
}
// Event Listeners
client.on('open', () => {
    logMessage('WebSocket connection opened', 'system');
});

client.on('log', (log) => {
    logMessage(`${log.type}: ${JSON.stringify(log.message)}`, 'system');
});

client.on('close', (event) => {
    logMessage(`WebSocket connection closed (code ${event.code})`, 'system');
});

client.on('audio', async (data) => {
    try {
        await resumeAudioContext();
        const streamer = await ensureAudioInitialized();
        streamer.addPCM16(new Uint8Array(data));
    } catch (error) {
        logMessage(`Error processing audio: ${error.message}`, 'system');
    }
});

client.on('content', (data) => {
    if (data.modelTurn) {
        if (data.modelTurn.parts.some(part => part.functionCall)) {
            isUsingTool = true;
            Logger.info('Model is using a tool');
        } else if (data.modelTurn.parts.some(part => part.functionResponse)) {
            isUsingTool = false;
            Logger.info('Tool usage completed');
        }

        const text = data.modelTurn.parts.map(part => part.text).join('');
        if (text) {
            logMessage(text, 'ai');
        }
    }
});

client.on('interrupted', () => {
    audioStreamer?.stop();
    isUsingTool = false;
    Logger.info('Model interrupted');
    logMessage('Model interrupted', 'system');
});

client.on('setupcomplete', () => {
    logMessage('Setup complete', 'system');
});

client.on('turncomplete', () => {
    isUsingTool = false;
    logMessage('Turn complete', 'system');
});

client.on('error', (error) => {
    if (error instanceof ApplicationError) {
        Logger.error(`Application error: ${error.message}`, error);
    } else {
        Logger.error('Unexpected error', error);
    }
    logMessage(`Error: ${error.message}`, 'system');
});

client.on('message', (message) => {
    if (message.error) {
        Logger.error('Server error:', message.error);
        logMessage(`Server error: ${message.error}`, 'system');
    }
});

sendButton.addEventListener('click', handleSendMessage);
messageInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        handleSendMessage();
    }
});

micButton.addEventListener('click', handleMicToggle);

connectButton.addEventListener('click', () => {
    if (isConnected) {
        disconnectFromWebsocket();
    } else {
        connectToWebsocket();
    }
});

messageInput.disabled = true;
sendButton.disabled = true;
micButton.disabled = true;
connectButton.textContent = 'Connect';

/**
 * Handles the video toggle. Starts or stops video streaming.
 * @returns {Promise<void>}
 */
async function handleVideoToggle() {
    Logger.info('Video toggle clicked, current state:', { isVideoActive, isConnected });
    
    localStorage.setItem('video_fps', fpsInput.value);

    if (!isVideoActive) {
        try {
            Logger.info('Attempting to start video');
            if (!videoManager) {
                videoManager = new VideoManager();
            }
            //在此通过检测音频输入流强度inputAudioVisualizer超阈值时才发送截图，避免实时发送截图（非实时场景，可加开关）
            await videoManager.start(fpsInput.value,(frameData) => {
                if (isConnected ) {
                    // 发送前后闪烁画面的边框
                    document.getElementById("preview").style.border = '2px solid red';

                    client.sendRealtimeInput([frameData]);
                    enableSnapshot = false;

                    console.log("图片发送成功=================");
                    setTimeout(() => {
                        document.getElementById("preview").style.border = 'none';
                    }, 200);

                }
            });

            isVideoActive = true;
            cameraIcon.textContent = 'videocam_off';
            cameraButton.classList.add('active');
            Logger.info('Camera started successfully');
            logMessage('Camera started', 'system');

        } catch (error) {
            Logger.error('Camera error:', error);
            logMessage(`Error: ${error.message}`, 'system');
            isVideoActive = false;
            videoManager = null;
            cameraIcon.textContent = 'videocam';
            cameraButton.classList.remove('active');
        }
    } else {
        Logger.info('Stopping video');
        stopVideo();
    }
}

/**
 * Stops the video streaming.
 */
function stopVideo() {
    if (videoManager) {
        videoManager.stop();
        videoManager = null;
    }
    isVideoActive = false;
    cameraIcon.textContent = 'videocam';
    cameraButton.classList.remove('active');
    logMessage('Camera stopped', 'system');
}

cameraButton.addEventListener('click', handleVideoToggle);
stopVideoButton.addEventListener('click', stopVideo);

cameraButton.disabled = true;

/**
 * Handles the screen share toggle. Starts or stops screen sharing.
 * @returns {Promise<void>}
 */
async function handleScreenShare() {
    if (!isScreenSharing) {
        try {
            screenContainer.style.display = 'block';
            
            screenRecorder = new ScreenRecorder();
            await screenRecorder.start(screenPreview, (frameData) => {
                if (isConnected) {
                    client.sendRealtimeInput([{
                        mimeType: "image/jpeg",
                        data: frameData
                    }]);
                }
            });

            isScreenSharing = true;
            screenIcon.textContent = 'stop_screen_share';
            screenButton.classList.add('active');
            Logger.info('Screen sharing started');
            logMessage('Screen sharing started', 'system');

        } catch (error) {
            Logger.error('Screen sharing error:', error);
            logMessage(`Error: ${error.message}`, 'system');
            isScreenSharing = false;
            screenIcon.textContent = 'screen_share';
            screenButton.classList.remove('active');
            screenContainer.style.display = 'none';
        }
    } else {
        stopScreenSharing();
    }
}

/**
 * Stops the screen sharing.
 */
function stopScreenSharing() {
    if (screenRecorder) {
        screenRecorder.stop();
        screenRecorder = null;
    }
    isScreenSharing = false;
    screenIcon.textContent = 'screen_share';
    screenButton.classList.remove('active');
    screenContainer.style.display = 'none';
    logMessage('Screen sharing stopped', 'system');
}

screenButton.addEventListener('click', handleScreenShare);
screenButton.disabled = true;
// ...existing code...

// 监听 AI 工具触发的断开连接事件
document.addEventListener('aiDisconnect', async (event) => {
    const { reason, saveHistory } = event.detail;
    // 记录日志
    Logger.info('AI主动断开连接', { reason, saveHistory });
    // 显示断开原因
    logMessage(`AI断开连接：${reason}`, 'system');
     // 执行断开连接
    if (client && client.ws) {
        await client.disconnect();
    }
    isConnected = false;
    //更新UI状态
    // disconnectFromWebsocket();
});

function stopPlayChunks(){
    chunks=""
    stopPlayChunk();
    var customEvent = new CustomEvent('NewChunks', {
        detail: { message:  "new chunks" },
        bubbles: true,
        cancelable: true
    });
    document.dispatchEvent(customEvent);
    // audioElement.src = '';
    // audioElement.load();
}
// 检测音量变化的函数
function detectVolumeChange() {
    if(isRecording==false){
        return 0;
    }
    const currentVolume=audioVolume;
    const change = currentVolume - previousVolume ;
    previousVolume = currentVolume;
    // console.log("currentVolume:",currentVolume);
    // console.log("change:",change);
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

function isMobileDevice() {
    // 1. 检查 User Agent
    const ua = navigator.userAgent.toLowerCase();
    const isMobileUA = /mobile|android|iphone|ipad|phone/i.test(ua);
    
    // 2. 检查屏幕触摸功能
    const hasTouchScreen = (
        ('ontouchstart' in window) ||
        (navigator.maxTouchPoints > 0) ||
        (navigator.msMaxTouchPoints > 0)
    );
    
    // 3. 检查屏幕宽度（一般移动设备小于 768px）
    const isNarrowScreen = window.innerWidth < 768;
    
    return isMobileUA || (hasTouchScreen && isNarrowScreen);
}