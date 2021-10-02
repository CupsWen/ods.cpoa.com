const Router = require('koa-router');
/**
 * 核心模块
 * **/
const fs = require("fs");                   // 核心模块 fs
const join = require('path').join;          // 核心模块 path
/**
 * 文件模块
 * **/
const validator = require('validator');     // 文件模块 数据验证模块
const logHelper = require('./logHelper.js') // 文件模块 日志

const config = require('../config.json');   // 配置文件
/**
 * 路由
 * **/
const router = new Router();
router.post('/log', async (ctx, next) => {
    // 1. 获取数据
    let userName = ctx.req.connection.getPeerCertificate().subject.CN;
    let url = ctx.request.url;
    let {command, path} = ctx.request.body;
    logInfo(url, userName, {command, path});
    // 2. 身份验证
    if (!config.log.userNames.includes(userName)) {
        returnJson(ctx, userName, 400, {message:'do not have permission.'});
        userName = undefined;
        url = undefined;
        command = undefined;
        path = undefined;
        return;
    }
    // 3. 参数验证
    let commands = ['getAllFileDir', 'downloadOne', 'downloadAll', 'deleteOne', 'deleteAll'];
    if (validator.isEmpty(command)) {
        returnJson(ctx, userName, 400, {message:'command is null.'});
        userName = undefined;
        url = undefined;
        command = undefined;
        path = undefined;
        commands = undefined;
        return;
    }
    if (!commands.includes(command)) {
        returnJson(ctx, userName, 400, {message:'command is not in ' + commands.toString() + '.'});
        userName = undefined;
        url = undefined;
        command = undefined;
        path = undefined;
        commands = undefined;
        return;
    }
    let paths = await readDirs(config.log.path);
    if (path!==undefined){
        if (!paths.includes(path)){
            returnJson(ctx, userName, 400, {message:'path error.'});
            userName = undefined;
            url = undefined;
            command = undefined;
            path = undefined;
            commands = undefined;
            return;
        }
    }
    // 4. 处理命令
    // 4.1 getAllFileDir
    if (command==='getAllFileDir'){
        returnJson(ctx, userName, 200, {message:paths});
    }
    // 4.2 downloadOne
    if (command==='downloadOne'){
        returnJson(ctx, userName, 200, {message:fs.readFileSync(path, 'utf8')});
    }
    // 4.3 downloadAll
    if (command==='downloadAll'){
        let data = [];
        for (let i=0;i<paths.length; i++){
            data.push(fs.readFileSync(paths[i], 'utf8'));
        }
        returnJson(ctx, userName, 200, {message:data});
    }
    // 4.4 deleteOne
    if (command==='deleteOne'){
        try {
            fs.unlinkSync(path);
        }catch (error) {
            returnJson(ctx, userName, 500, {message:error});
        }
        returnJson(ctx, userName, 200, {message:'OK'});
    }
    // 4.5 deleteAll
    if (command==='deleteAll'){
        try {
            for (let i=0;i<paths.length; i++){
                fs.unlinkSync(paths[i]);
            }
        }catch (error) {
            returnJson(ctx, userName, 500, {message:error});
        }
        returnJson(ctx, userName, 200, {message:'OK'});
    }
    userName = undefined;
    url = undefined;
    command = undefined;
    path = undefined;
    commands = undefined;
});

/**
 * 自定义函数
 * **/
const returnJson = (ctx, userName, code = 200, data = {}) => {
    /**
     * @description 回复客户端
     * @code   : 状态码
     * @data   : 消息(body)
     * @date   : 16:40 2021/9/25
     * @author : cups
     **/
    ctx.response.status = code;
    ctx.response.body = data;
    switch (code) {
        case 200:
            logInfo('returnJson', userName, data);
            break;
        case 400:
            logWarn('returnJson', userName, data);
            break;
        case 500:
            logError('returnJson', userName, data);
            break;
        default:
            logInfo('returnJson', userName, data);
            break;
    }
}

const logDebug = (...args) => {
    args = JSON.stringify(args);
    logHelper.getLogger().debug('log', args);
    logHelper.getLogger('log_debug').debug(args);
}
const logInfo = (...args) => {
    args = JSON.stringify(args);
    logHelper.getLogger().info('log', args);
    logHelper.getLogger('log_info').info(args);
}
const logWarn = (...args) => {
    args = JSON.stringify(args);
    logHelper.getLogger().warn('log', args);
    logHelper.getLogger('log_warn').warn(args);
}
const logError = (...args) => {
    args = JSON.stringify(args);
    logHelper.getLogger().error('log', args);
    logHelper.getLogger('log_error').error(args);
}

const readDirs = (path) => {
    /**
     * @description 读取文件列表
     * @param  : path
     * @return : dirs
     * @date   : 22:34 2021/9/26
     * @author : cups
     **/
    return new Promise((async (resolve) => {
        let jsonFiles = [];
        const findJsonFile = (path)=>{
            let files = fs.readdirSync(path);
            files.forEach(function (item, index) {
                let fPath = join(path,item);
                let stat = fs.statSync(fPath);
                if(stat.isDirectory() === true) {
                    findJsonFile(fPath);
                }
                if (stat.isFile() === true) {
                    jsonFiles.push(fPath);
                }
            });
        }
        findJsonFile(path);
        for (let i=0; i<jsonFiles.length; i++){
            jsonFiles[i] = './'+jsonFiles[i].replace('\\','/').replace('\\','/')
        }
        resolve(jsonFiles);
        jsonFiles = undefined;
    }));
}
module.exports = router;