import { Logger } from '../utils/logger.js';

export class GetCurentDateTime {
    getDeclaration() {
        return [{
            name: "get_Curent_DateTime",
            description: "当用户询问日期时间，或者答复中需要参考当前日期时间，或其他和时间有关的话题需要获取当前日期时间时，执行获取当前日期时间操作。",
            parameters: {
                type: "object",
                properties: {
                    reason: {
                        type: "string",
                        description: "获取时间的原因"
                    }
                },
                required: ["reason"]
            }
        }];
    }

    async execute(args) {
        try {
            Logger.info('AI调用查询时间的工具', args);
            return new Date().toLocaleString();
        } catch (error) {

            throw error;
        }
    }
}