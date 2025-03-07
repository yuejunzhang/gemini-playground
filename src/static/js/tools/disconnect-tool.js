import { Logger } from '../utils/logger.js';

export class DisconnectTool {
    getDeclaration() {
        return [{
            name: "disconnect_session",
            description: "当用户请求结束对话时，执行断开连接操作。这将关闭当前的WebSocket连接并清理资源。",
            parameters: {
                type: "object",
                properties: {
                    reason: {
                        type: "string",
                        description: "断开连接的原因"
                    }
                },
                required: ["reason"]
            }
        }];
    }

    async execute(args) {
        try {
            Logger.info('执行断开连接操作', args);
            
            // 创建自定义事件
            const disconnectEvent = new CustomEvent('aiDisconnect', {
                detail: {
                    reason: args.reason,
                }
            });

            // 触发事件
            document.dispatchEvent(disconnectEvent);

            return {
                success: true,
                message: `已断开连接：${args.reason}`
            };
        } catch (error) {
            Logger.error('断开连接失败', error);
            throw error;
        }
    }
}