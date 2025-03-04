import { Logger } from '../utils/logger.js';

export class ChangeVoice {
    getDeclaration() {
        return [{
            name: "change_Voice",
            description: "当用户要求你更换语音时，更换TTS语音(女青年:0,女孩子:1,中年男性:2,男青年:3,男孩子:4)",
            parameters: {
                type: "object",
                properties: {
                    Voice_index: {
                        type: "integer",
                        description: "更换TTS语音的索引，如果不提供，则随机更换TTS语音。(女青年:0, 女孩子:1, 男中年:2, 男青年:3, 男孩子:4, 静音:5)",
                    },                    
                    reason: {
                        type: "string",
                        description: "更换TTS语音原因"
                    }
                },
                required: ["Voice_index", "reason"]
            }
        }];
    }

    async execute(args) {
        const { Voice_index } = args;
        try {
            const voiceSelect = document.getElementById('voice-select');
            voiceSelect.selectedIndex = Voice_index;//Math.floor(Math.random() * 5);
            Logger.info('AI更换TTS语音', args);
        } catch (error) {

            throw error;
        }
    }
}