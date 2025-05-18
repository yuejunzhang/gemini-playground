import { Logger } from '../utils/logger.js';

export class UserFeatureRecognitionByVoice {
    getDeclaration() {
        return [{
            name: "User_Feature_Recognition_By_Voice",
            description: "根据用户声音判断用户特征，如性别、年龄等，以便更好的交互或称呼",
            parameters: {
                type: "object",
                properties: {
                    User_Feature_index: {
                        type: "integer",
                        description: "女青年:0, 女孩子:1, 男中年:2, 男青年:3, 男孩子:4",
                    },                    
                },
                required: ["User_Feature_index"]
            }
        }];
    }

    async execute(args) {
        const { User_Feature_index } = args;
        console.log("********************************************Voice_index:",User_Feature_index);
        try {
            // const voiceSelect = document.getElementById('voice-select');
            // voiceSelect.selectedIndex = User_Feature_index;//Math.floor(Math.random() * 5);
            Logger.info('AI判断用户特征', args);
        } catch (error) {

            throw error;
        }
    }
}