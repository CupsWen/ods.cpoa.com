const log4js = require('log4js');
const config = require('../config.json');

const getPath = (name, level) => {
    return config.log.path + name + '/' + level
}

log4js.configure({
    replaceConsole: true,
    pm2: true,
    appenders: {
        stdout: {
            type: 'console',                             // 命令行输出
            filename: getPath('console', 'debug')
        },
        process_debug:{
            type: 'dateFile',                               // 进程日志--debug
            filename: getPath('process', 'debug'),
            pattern: 'yyyy-MM-dd.log',
            alwaysIncludePattern: true
        },
        process_info:{
            type: 'dateFile',                               // 进程日志--debug
            filename: getPath('process', 'info'),
            pattern: 'yyyy-MM-dd.log',
            alwaysIncludePattern: true
        },
        process_warn:{
            type: 'dateFile',                               // 进程日志--warn
            filename: getPath('process', 'warn'),
            pattern: 'yyyy-MM-dd.log',
            alwaysIncludePattern: true
        },
        process_error:{
            type: 'dateFile',                               // 进程日志--warn
            filename: getPath('process', 'error'),
            pattern: 'yyyy-MM-dd.log',
            alwaysIncludePattern: true
        },
        imageDetection_debug: {                                 // 原创性检测服务日志--debug
            type: 'dateFile',
            filename: getPath('imageDetection', 'debug'),
            pattern: 'yyyy-MM-dd.log',
            alwaysIncludePattern: true
        },
        imageDetection_info: {                                  // 原创性检测服务日志--info
            type: 'dateFile',
            filename: getPath('imageDetection', 'info'),
            pattern: 'yyyy-MM-dd.log',
            alwaysIncludePattern: true
        },
        imageDetection_warn: {                                  // 原创性检测服务日志--warn
            type: 'dateFile',
            filename: getPath('imageDetection', 'warn'),
            pattern: 'yyyy-MM-dd.log',
            alwaysIncludePattern: true
        },
        imageDetection_error: {                                 // 原创性检测服务日志--error
            type: 'dateFile',
            filename: getPath('imageDetection', 'error'),
            pattern: 'yyyy-MM-dd.log',
            alwaysIncludePattern: true
        },
        log_debug: {                                    // 日志访问日志--debug
            type: 'dateFile',
            filename: getPath('log', 'debug'),
            pattern: 'yyyy-MM-dd.log',
            alwaysIncludePattern: true
        },
        log_info: {                                     // 日志访问日志--info
            type: 'dateFile',
            filename: getPath('log', 'info'),
            pattern: 'yyyy-MM-dd.log',
            alwaysIncludePattern: true
        },
        log_warn: {                                     // 日志访问日志--warn
            type: 'dateFile',
            filename: getPath('log', 'warn'),
            pattern: 'yyyy-MM-dd.log',
            alwaysIncludePattern: true
        },
        log_error: {                                     // 日志访问日志--error
            type: 'dateFile',
            filename: getPath('log', 'error'),
            pattern: 'yyyy-MM-dd.log',
            alwaysIncludePattern: true
        },
        monitor_debug: {                                 // 状态监控访问日志--debug
            type: 'dateFile',
            filename: getPath('monitor', 'debug'),
            pattern: 'yyyy-MM-dd.log',
            alwaysIncludePattern: true
        },
        monitor_info: {                                 // 状态监控访问日志--info
            type: 'file',
            filename: getPath('monitor', 'info'),
            pattern: 'yyyy-MM-dd.log',
            alwaysIncludePattern: true
        },
        monitor_warn: {                                 // 状态监控访问日志--warn
            type: 'dateFile',
            filename: getPath('monitor', 'warn'),
            pattern: 'yyyy-MM-dd.log',
            alwaysIncludePattern: true
        },
        monitor_error: {                                // 状态监控访问日志--error
            type: 'dateFile',
            filename: getPath('monitor', 'error'),
            pattern: 'yyyy-MM-dd.log',
            alwaysIncludePattern: true
        }
    },
    categories: {
        default: {appenders: ['stdout'], level: 'debug'},
        process_debug: {appenders: ['process_debug'], level: 'debug'},
        process_info: {appenders: ['process_info'], level: 'info'},
        process_warn: {appenders: ['process_warn'], level: 'warn'},
        process_error: {appenders: ['process_error'], level: 'error'},
        imageDetection_debug: {appenders: ['imageDetection_debug'], level: 'debug'},
        imageDetection_info: {appenders: ['imageDetection_info'], level: 'info'},
        imageDetection_warn: {appenders: ['imageDetection_warn'], level: 'warn'},
        imageDetection_error: {appenders: ['imageDetection_error'], level: 'error'},
        log_debug: {appenders: ['log_debug'], level: 'debug'},
        log_info: {appenders: ['log_info'], level: 'info'},
        log_warn: {appenders: ['log_warn'], level: 'warn'},
        log_error: {appenders: ['log_error'], level: 'error'},
        monitor_debug: {appenders: ['monitor_debug'], level: 'debug'},
        monitor_info: {appenders: ['monitor_info'], level: 'info'},
        monitor_warn: {appenders: ['monitor_warn'], level: 'warn'},
        monitor_error: {appenders: ['monitor_error'], level: 'error'}
    }
})
;

exports.getLogger = (name='default') => {        // name取categories项
    return log4js.getLogger(name);
};