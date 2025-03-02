import { Logger } from '../utils/logger.js';
export class WeatherTool {
    constructor() {
        this.API_KEY = 'SzdoTSUanNhLMxaBt';
        this.BASE_URL = 'https://api.seniverse.com/v3/weather/daily.json';
        this.config = {
            language: 'zh-Hans',
            unit: 'c',
            days: 3,
            start: 0
        };
    }

    getDeclaration() {
        return [{
            name: "get_weather_on_date",
            description: "获取指定城市指定日期的天气预报",
            parameters: {
                type: "object",
                properties: {
                    location: {
                        type: "string",
                        description: "城市名称，如：济南"
                    },
                    date: {
                        type: "string",
                        description: "查询日期 (YYYY-MM-DD格式)"
                    }
                },
                required: ["location", "date"]
            }
        }];
    }

    async execute(args) {
        try {
            Logger.info('正在查询天气', args);
            const { location, date } = args;

            // 构建 API URL
            const url = new URL(this.BASE_URL);
            const params = {
                key: this.API_KEY,
                location,
                ...this.config
            };
            Object.entries(params).forEach(([key, value]) => 
                url.searchParams.append(key, value)
            );

            // 发送请求
            const response = await fetch(url.toString());
            if (!response.ok) {
                throw new Error(`天气查询失败: ${response.statusText}`);
            }

            const weatherData = await response.json();
            const result = weatherData.results[0];
            
            // 找到请求日期对应的天气数据
            const forecast = result.daily.find(day => day.date === date);
            if (!forecast) {
                throw new Error(`未找到 ${date} 的天气数据`);
            }

            // 格式化返回数据
            return {
                location: result.location.name,
                date: forecast.date,
                weather: {
                    day: forecast.text_day,
                    night: forecast.text_night,
                    temperature: {
                        high: parseInt(forecast.high),
                        low: parseInt(forecast.low)
                    },
                    wind: {
                        direction: forecast.wind_direction,
                        speed: forecast.wind_speed,
                        scale: forecast.wind_scale
                    },
                    humidity: forecast.humidity,
                    rainfall: forecast.rainfall,
                    precipitation: forecast.precip
                },
                forecast: `${result.location.name}${forecast.date}天气情况：白天${forecast.text_day}，夜间${forecast.text_night}，气温${forecast.low}°C至${forecast.high}°C，${forecast.wind_direction}风${forecast.wind_scale}级，降水概率${forecast.precip}%，相对湿度${forecast.humidity}%。`
            };

        } catch (error) {
            Logger.error('天气查询失败', error);
            throw new Error(`天气查询失败: ${error.message}`);
        }
    }
}