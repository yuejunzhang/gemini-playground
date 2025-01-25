var voiceList =[
  "zh-CN-XiaoxiaoNeural",
  "zh-CN-XiaoyiNeural",
  "zh-CN-YunjianNeural",
  "zh-CN-YunxiNeural",
  "zh-CN-YunxiaNeural",
  "zh-CN-YunyangNeural",
  "zh-CN-liaoning-XiaobeiNeural",
  "zh-CN-shaanxi-XiaoniNeural",
  "zh-HK-HiuGaaiNeural",
  "zh-HK-HiuMaanNeural",
  "zh-HK-WanLungNeural",
  "zh-TW-HsiaoChenNeural",
  "zh-TW-HsiaoYuNeural",
  "zh-TW-YunJheNeural"
]
// const  edgeurl = `wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=6A5AA1D4EAFF4E9FB37E23D68491D6F4&ConnectionId=`;

let ws = null;
let isConnected = false; // 连接状态标志
let Blobs = []; //Blob二进制对象数组
let audioElement = document.createElement('audio');
// 定义全局变量
let Sec_MS_GEC = "";
let Sec_MS_GEC_Version = "1-130.0.2849.80";
// setupTimer() ;
let Sec_MS_GEC_TimeOut=Date.now() - (4 * 60 * 1000); // 假设这是4分钟前的时间戳;
let  edgeurl = `wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=6A5AA1D4EAFF4E9FB37E23D68491D6F4&Sec-MS-GEC=`+ Sec_MS_GEC +`&Sec-MS-GEC-Version=`+ Sec_MS_GEC_Version +`&ConnectionId=`;
audioElement.src="xxx.mp3"
var stopPlay=false;
function generateRandomHex() {
  // 创建一个长度为 16 字节的 Uint8Array
  const randomBytes = new Uint8Array(16);
  // 填充数组的每个元素为一个随机的 0-255 之间的整数
  window.crypto.getRandomValues(randomBytes);
  // 将字节数组转换为十六进制字符串，并将字母转换为小写
  const hexString = Array.from(randomBytes)
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('')
    .toLowerCase();
  return hexString;
}
function escape(data, entities = {}) {
  // Must do ampersand first
  data = data.replace(/&/g, "&amp;"); 
  data = data.replace(/>/g, "&gt;");
  data = data.replace(/</g, "&lt;");

  if (Object.keys(entities).length > 0) {
    for (let key in entities) {
      data = data.replace(key, entities[key]); 
    }
  }
  return data;
}
function removeIncompatibleCharacters(string) {
  if (typeof string === 'object') {
    string = string.toString();
  }
  if (typeof string !== 'string') {
    throw new TypeError('string must be a string'); 
  }
  let chars = string.split('');
  for (let i = 0; i < chars.length; i++) {
    let code = chars[i].charCodeAt(0);
    if ((0 <= code && code <= 8) || 
        (11 <= code && code <= 12) ||
        (14 <= code && code <= 31)) {
      chars[i] = ' ';
    }
  }
  return chars.join('');
}
// function removeIncompatibleCharacters(string) {
//     // Check if the input is an ArrayBuffer or TypedArray
//     if (string instanceof ArrayBuffer || ArrayBuffer.isView(string)) {
//       // Convert to string assuming UTF-8 encoding
//       string = new TextDecoder("utf-8").decode(string);
//   }
  
//   // Ensure the input is a string
//   if (typeof string !== 'string') {
//       throw new TypeError("string must be a string or an ArrayBuffer/TypedArray");
//   }

//   // Regular expression to match and replace incompatible characters but keep math operators
//   return string.replace(/[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F]|\\+|-|\\<|\\>/g, function(match) {
//       // Check if the match is not one of the math operators
//       if (match !== '+' && match !== '-' && match !== '<' && match !== '>') {
//           return ' ';
//       }
//       // If it is a math operator, return it as is
//       console.log(match);
//       return match;
//   });
// }
function sendReq(ssml, format,connectionId){
  let configData = {
    context: {
      synthesis: {
        audio: {
          metadataoptions: {
            sentenceBoundaryEnabled: "true",
            wordBoundaryEnabled: "false",
          },
          outputFormat: format,
        },
      },
    },
  };
  let configMessage =
    `X-Timestamp:${Date()}\r\n` +
    "Content-Type:application/json; charset=utf-8\r\n" +
    "Path:speech.config\r\n\r\n" +
    JSON.stringify(configData);
  // console.log(`配置请求发送：${configMessage}\n`);
  let ssmlMessage =
    `X-Timestamp:${Date()}\r\n` +
    `X-RequestId:${connectionId}\r\n` +
    `Content-Type:application/ssml+xml\r\n` +
    `Path:ssml\r\n\r\n` +
    ssml;
  // console.log(`SSML消息发送：${ssmlMessage}\n`);
  ws.send(configMessage, (configError) => {
    if (configError) {
      console.log(`配置请求发送失败：${connectionId}\n`);
    }
  });
  ws.send(ssmlMessage, (ssmlError) => {
    if (ssmlError) {
      console.log(`SSML消息发送失败：${connectionId}\n`);
    }
  });
}

async function connect(ssml, format,autpPlay) {////////////////////////////////////////////////////////////////////
  await Set_Sec_MS_GEC();

  return new Promise((resolve, reject) =>{
    
    const connectionId = generateRandomHex();
    if(!isConnected || ws==null) {
      ws = new window.WebSocket(edgeurl+`${connectionId}`);
      // 超时计时器
      var timeoutTimer = setTimeout(function() {
        // 如果连接还未打开，则认为是超时
        if (ws.readyState === WebSocket.CONNECTING) {
            console.log('WebSocket连接超时');
            ws.close(); // 关闭连接
        }
      }, 3000);
    }
    else{
      sendReq(ssml, format,connectionId);
    };
    ws.onopen = () => {
      clearTimeout(timeoutTimer); // 连接成功，清除超时计时器
      console.log("WebSocket Opened" );
      isConnected = true; // 更新连接状态
      sendReq(ssml, format,connectionId)
    };
    ws.onclose = (code, reason) => {// 服务器会自动断开空闲超过30秒的连接
      clearTimeout(timeoutTimer); // 清除超时计时器
      isConnected = false; 
      // ws = null;
      Blobs = [];
      // reject  (new Error("TTS WebSocket connection closed"));
      console.log(`TTS连接已关闭： ${reason} ${code}`);
    };
    ws.onmessage = (message) => {

      if (!(message.data instanceof Blob)) {//收到的不是二进制对象（通信命令）
        let data = message.data.toString();
        if (data.includes("Path:turn.TTS")) {
          // 开始传输
        } 
        else if (data.includes("Path:turn.end")){
          // 结束传输
          for(let i=0;i<Blobs.length;i++){//遍历每个Blob,
            let contentIndex = 130;
            if(i == Blobs.length-1){
              contentIndex = 105;
            }
            Blobs[i] = Blobs[i].slice(contentIndex)//去除Blob前段头，截取后段数据，组成二进制音频数据数组
          }
          if(Blobs.length<2){
            Blobs = [];reject("获取音频失败");
          }else{
            let result = new Blob(Blobs); //将Blobs数组中的多个 Blob 对象合并成一个单独的 Blob 对象result
            let url = URL.createObjectURL(result);
            if(autpPlay){
              audioElement.pause();
              audioElement.src = url;
              audioElement.play();
            }
            Blobs = [];
            // ws.close();
            // console.log(`传输完成：${url}`);
            resolve(url);
          }
        }
      } else if (message.data instanceof Blob) {//收到的是二进制对象
        Blobs.push(message.data)// console.log("收到信号了b......",message.data)
      }
    };
    ws.onerror = (error) => {
      clearTimeout(timeoutTimer); // 清除超时计时器
      reject  (new Error("TTS WebSocket connection faile")); 
      console.log(`tts连接失败： ${error}`);
      isConnected = false;
      ws.close();
      ws = null;
    };
  })
}


async function TTS(text,voiceindex=0,rate = 0,pitch=0,autpPlay=true) {
  if(text){
    text=escape(removeIncompatibleCharacters(text));
    let voice=voiceList[voiceindex]
    let SSML = `
    <speak xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="http://www.w3.org/2001/mstts" xmlns:emo="http://www.w3.org/2009/10/emotionml" version="1.0" xml:lang="en-US">
        <voice name="${voice}">
            <prosody rate="${rate}%" pitch="${pitch}%">
            ${text}
            </prosody>
        </voice>
    </speak>`;
    // console.log(SSML);
    let format = "audio-24khz-48kbitrate-mono-mp3";
    let result = null;
    try {
      result = await connect(SSML, format, false);
      // console.log('Received result:', result);
    } catch (error) {
// ws.close();
stopPlay=true;
      console.error("tts已拒绝:", error);
      return null;
    }

    // let result=null;
    //  result = await connect(SSML, format,false).then(result => {
    //   // console.log('Received result:', result);
    //    return result;
    // }).catch(function(error) {
    //   console.error("tts已拒绝:", error);
    // });
    return result;
  }
}
export async function playChunk(text,voiceindex=0,rate = 0,pitch=0,autpPlay=true) {
  let data;
  stopPlay=false;
    // 设置连接超时
  // const timeoutId = setTimeout(() => {
  //   return;
  //   console.error("tts timed out");
  // }, 8000);
  try{
    data=await TTS(text,voiceindex,rate ,pitch,autpPlay) ;
  }catch(error)
  {
    console.log("play fail")
    return;
  }
  // clearTimeout(timeoutId); // 取消超时计时器
  if(!data){return;}
  const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    while (!audioElement.paused) {
      await wait(100);
      if(stopPlay||audioElement.paused || audioElement.ended){break ;}
      console.log("排队中",stopPlay);
    }
    if(stopPlay){audioElement.pause();return ;}
    audioElement.pause();
    audioElement.src = data;
    audioElement.play();
}
export function stopPlayChunk(){
  stopPlay=true;
  if(!audioElement.paused ){audioElement.currentTime = audioElement.duration;}
  audioElement.pause();
  audioElement.load();//清除缓存
}

// async function playVoice(data){
//   audioElement.pause();
//   audioElement.src = data;
//   await new Promise(resolve => {
//     audioElement.play();
//     audioElement.onended = resolve;  
//   }); 
// }


// // 定义一个函数来执行定时任务

// function setupTimer() {
//   // 立即执行一次
//   (async () => {
//       try {
//           const result = await Get_Sec_MS_GEC();
//       } catch (e) {
//           console.error(`立即执行任务错误: ${e.toString()}`);
//       }
//   })();

//   // 设置定时器，每3分钟执行一次
//   setInterval(async () => {
//       try {
//           const result = await Get_Sec_MS_GEC();
 
//       } catch (e) {
//           console.error(`定时任务执行错误: ${e.toString()}`);
//       }
//   }, 180000); // 180000毫秒等于3分钟
// }

async function Set_Sec_MS_GEC() {
  // 获取当前时间计算时间差（以毫秒为单位）
  const timeDifference = Date.now()-Sec_MS_GEC_TimeOut;
  // 将时间差转换为分钟
  const minutes = timeDifference / 1000 / 60;
  if (minutes<3) return ;
  Sec_MS_GEC_TimeOut=Date.now();
     // 获取当前的 UTC 时间（以 100 纳秒为单位的自 1601年1月1日以来的时间）
     const ticks = Date.now() * 10000 + 116444736000000000;

     // 将 ticks 除以 3,000,000,000 并向下取整，确保它是 3,000,000,000 的倍数
     const roundedTicks = Math.floor(ticks / 3000000000) * 3000000000;
 
     // 构造字符串：ticks + "6A5AA1D4EAFF4E9FB37E23D68491D6F4"
     const str = roundedTicks.toString() + "6A5AA1D4EAFF4E9FB37E23D68491D6F4";
 
     // 计算 SHA-256 哈希
      const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex =hashArray.map(b => b.toString(16).padStart(2, '0').toUpperCase()).join('');
 
      console.log("new Sec_MS_GEC:" + hashHex);
      Sec_MS_GEC=hashHex; 
      edgeurl = `wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=6A5AA1D4EAFF4E9FB37E23D68491D6F4&Sec-MS-GEC=`+ Sec_MS_GEC +`&Sec-MS-GEC-Version=`+ Sec_MS_GEC_Version +`&ConnectionId=`;
  
     return ;

}



// async function fetchSecData() {
//     // const url = "https://edge-sec.myaitool.top/?key=edge";
//     const url ="";// "http://123.207.46.66:8086/api/getGec";
    
//     try {
//         const response = await fetch(url);

//         if (response.status === 200) {
//             const htmlContent = await response.text();
//             console.log(`响应内容: ${htmlContent}`);

//             try {
//                 const data = JSON.parse(htmlContent);
//                 console.log(`解析后的JSON数据: ${JSON.stringify(data)}`);

//                 const secMsGecId = data["Sec-MS-GEC"];
//                 const secMsGecVersion = data["Sec-MS-GEC-Version"];

//                 return {
//                     secMsGecId,
//                     secMsGecVersion
//                 };
//             } catch (e) {
//                 console.error(e.toString());
//                 return {
//                     secMsGecId: null,
//                     secMsGecVersion: null
//                 };
//             }
//         } else {
//             console.error(`请求失败，状态码: ${response.status}`);
//             return {
//                 secMsGecId: null,
//                 secMsGecVersion: null
//             };
//         }
//     } catch (e) {
//         console.error(`请求错误: ${e.toString()}`);
//         return {
//             secMsGecId: null,
//             secMsGecVersion: null
//         };
//     }
// }