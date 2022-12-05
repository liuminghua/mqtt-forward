const mqtt = require('mqtt')
const log4js = require("log4js")

log4js.configure({
    replaceConsole: true,
    appenders: {
        cheese: {
            // 设置类型为 dateFile
            type: 'dateFile',
            // 配置文件名为 forward.log
            filename: 'logs/forward.log',
            // 指定编码格式为 utf-8
            encoding: 'utf-8',
            // 配置 layout，此处使用自定义模式 pattern
            layout: {
                type: "pattern",
                // 配置模式，下面会有介绍
                pattern: '{"date":"%d","level":"%p","category":"%c","host":"%h","pid":"%z","data":\'%m\'}'
            },
            // 日志文件按日期（天）切割
            pattern: "-yyyy-MM-dd",
            // 回滚旧的日志文件时，保证以 .log 结尾 （只有在 alwaysIncludePattern 为 false 生效）
            keepFileExt: true,
            // 输出的日志文件名是都始终包含 pattern 日期结尾
            alwaysIncludePattern: true,
        },
    },
    categories: {
        // 设置默认的 categories
        default: { appenders: ['cheese'], level: 'warn' },
    }
})


const logger = log4js.getLogger('forward');

module.exports = class forward {
    constructor(pubCfg, subCfg, unitsDict) {
        this.pubCfg = pubCfg;
        this.subCfg = subCfg;
        this.unitsDict = unitsDict;
        this.pubClient = null;
        this.subClient = null;

        this.pubStart = null;
        this.pubStop = null;
        this.subStart = null;
        this.subStop = null;

        this.pubCount = 0;
        this.subCount = 0;

        this.pubLast = null;
        this.subLast = null;
    }

    codeof(clientId) {
        for (let i = 0; i < this.unitsDict.length; i++) {
            if (this.unitsDict[i].clientId == clientId)
                return this.unitsDict[i].unitcode;
        };
        return "";
    }
    rewarp(message) {

        //message.collector_time = Date.now();
        return {
            "status": 200,
            "msg": "",
            "data": message,
            "type": 1,
            "timestamp": Date.now(),
            "pushUnitCode": this.codeof(message.collector_id)
        };
    }

    start() {

        this.pubClient = mqtt.connect(this.pubCfg.url, this.pubCfg.option);
        this.pubClient.on('error', (err) => {
            logger.error(err)
        })

        logger.warn("pub connecting")
       
        this.pubClient.on('connect', () => {
            this.pubClient.on('disconnect', () => {
                logger.warn("pub disconnected")
                this.pubStop = new Date().toLocaleString();
            })
            this.pubClient.on('close', () => {
                logger.warn("pub closed")
            })
            this.pubStart = new Date().toLocaleString();
            this.pubStop = null;

            logger.warn("pub connected")
            logger.warn("sub connecting")
            this.subClient = mqtt.connect(this.subCfg.url, this.subCfg.option)
            this.subClient.on('message', (topic, payload) => {
                let message = JSON.parse(payload.toString());
                this.subLast = {
                    timestamp: Date.now(),
                    message: message
                }
                this.subCount += 1

                var fwdmsg = this.rewarp(message)

                this.pubClient.publish(this.pubCfg.topic, JSON.stringify(fwdmsg), (err, packet) => {
                    if (err)
                        logger.info(err, packet)
                    else {
                        this.pubLast = {
                            timestamp: Date.now(),
                            message: fwdmsg
                        }
                        this.pubCount += 1
                    }
                })
            })
            
            this.subClient.on('connect', () => {
                this.subClient.on('disconnect', () => {
                    logger.warn("sub disconnected")
                    this.subStop = new Date().toLocaleString();
                })

                this.subClient.on('close', () => {
                    logger.warn("sub closed")
                })
    
                this.subStart = new Date().toLocaleString();
                this.subStop = null;

                logger.warn('sub connected')

                this.subClient.subscribe([this.subCfg.topic], () => {

                })
            });

        });
    }
    stop() {
        this.subClient.end();
        this.pubClient.end();
    }
    status() {
        return {
            "sub_url": this.subCfg.url,
            "sub_topic": this.subCfg.topic,
            "sub_start": this.subStart,
            "sub_stop": this.subStop,
            "sub_count": this.subCount,
            "pub_url": this.pubCfg.url,
            "pub_topic": this.pubCfg.topic,
            "pub_start": this.pubStart,
            "pub_stop": this.pubStop,
            "pub_count": this.pubCount,
            "sub_last": this.subLast ? this.subLast.timestamp : "",
            "pub_last": this.pubLast ? this.pubLast.timestamp : ""
        }
    }
    sub_last() {
        return this.subLast;
    }
    pub_last() {
        return this.pubLast
    }
}
