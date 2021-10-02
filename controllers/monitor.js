const Router = require('koa-router');
/**
 * 核心模块
 * **/

/**
 * 文件模块
 * **/
const validator = require('validator');                 // 文件模块 数据验证模块
const logHelper = require('./logHelper.js');            // 文件模块 日志
const os = require('os');                               // 文件模块 系统
const diskinfo = require('diskinfo');                   // 文件模块 磁盘信息

const config = require('../config.json');   // 配置文件
/**
 * 路由
 * **/
const router = new Router();
router.post('/monitor',async (ctx,next)=>{
    // 1. 获取数据
    let userName = ctx.req.connection.getPeerCertificate().subject.CN;
    let url = ctx.request.url;
    let {command} = ctx.request.body;
    monitorInfo(url, userName, {command});
    // 2. 身份验证
    if (!config.monitor.userNames.includes(userName)) {
        returnJson(ctx, userName, 400, {message:'do not have permission.'});
        userName = undefined;
        url = undefined;
        command = undefined;
        return;
    }
    // 3. 参数验证
    if (validator.isEmpty(command)) {
        returnJson(ctx, userName, 400, {message:'command is null.'});
        userName = undefined;
        url = undefined;
        command = undefined;
        return;
    }
    let commands = ['getProcessState', 'getMemUsage', 'getCpuUsage', 'getDiskUsage', 'getAll'];
    if (!commands.includes(command)){
        returnJson(ctx, userName, 400, {message:'command error.'});
        userName = undefined;
        url = undefined;
        command = undefined;
        commands = undefined;
        return;
    }
    // 4.1 进程监控
    let {rss, heapTotal, heapUsed, external} = process.memoryUsage();
    rss = parseFloat((rss/1024/1024).toFixed(2));
    external = parseFloat((external/1024/1024).toFixed(2));
    let heapUsage = parseFloat((heapUsed/heapTotal).toFixed(2));
    monitorInfo(url, userName, '进程监控', rss, external, heapTotal, heapUsage);
    // 4.2 内存监控
    let totalmem = os.totalmem();
    let memUsage = parseFloat((os.freemem()/os.totalmem()).toFixed(2));
    monitorInfo(url, userName, '内存监控', totalmem, memUsage);
    // 4.3 CPU占用监控
    let cpuUsage = await cpuAverage();
    monitorInfo(url, userName, 'CPU占用监控', cpuUsage);
    // 4.4 磁盘监控
    let mounted, diskTotal, diskUsed, diskAvailable, diskUsage;
    await getDiskUsage().then((data)=>{
        mounted = data.mounted;
        diskTotal = data.diskTotal;
        diskUsed = data.diskUsed;
        diskAvailable = data.diskAvailable;
        diskUsage = data.diskUsage;
    },(error)=>{
        monitorError('getDiskUsage', error);
    });
    diskTotal = parseInt(diskTotal);
    diskUsed = parseInt(diskUsed);
    diskAvailable = parseInt(diskAvailable);
    diskUsage = parseFloat(diskUsage)/100;
    monitorInfo(url, userName, '磁盘监控', mounted, diskTotal, diskUsed, diskAvailable, diskUsage);

    // 5 处理命令
    if (command==='getProcessState'){
        returnJson(ctx, userName, 200, {rss:rss, external:external, heapTotal:heapTotal, heapUsage:heapUsage});
    }
    if (command==='getMemUsage'){
        returnJson(ctx, userName, 200, {totalmem:totalmem, memUsage:memUsage});
    }
    if (command==='getCpuUsage'){
        returnJson(ctx, userName, 200, {cpuUsage:cpuUsage});
    }
    if (command==='getDiskUsage'){
        returnJson(ctx, userName, 200, {diskTotal:diskTotal, diskUsage:diskUsage});
    }
    if (command==='getAll'){
        returnJson(ctx, userName, 200, {rss:rss, external:external, heapTotal:heapTotal, heapUsage:heapUsage,totalmem:totalmem, memUsage:memUsage, cpuUsage:cpuUsage, diskTotal:diskTotal, diskUsage:diskUsage});
    }
    userName = undefined;
    url = undefined;
    command = undefined;
    rss = undefined;
    heapTotal = undefined;
    heapUsed = undefined;
    external = undefined;
    heapUsage = undefined;
    totalmem = undefined;
    memUsage = undefined;
    cpuUsage = undefined;
    mounted = undefined;
    diskTotal = undefined;
    diskUsed = undefined;
    diskAvailable = undefined;
    diskUsage = undefined;
})

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
            monitorInfo('returnJson', userName, data);
            break;
        case 400:
            monitorWarn('returnJson', userName, data);
            break;
        case 500:
            monitorError('returnJson', userName, data);
            break;
        default:
            monitorInfo('returnJson', userName, data);
            break;
    }
}

/**
 * 日志 -- monitor
 * **/
const monitorDebug = (...args)=>{
    args = JSON.stringify(args);
    logHelper.getLogger().debug('monitor', args);
    logHelper.getLogger('monitor_debug').debug(args);
}
const monitorInfo = (...args)=>{
    args = JSON.stringify(args);
    logHelper.getLogger().info('monitor', args);
    logHelper.getLogger('monitor_info').info(args);
}
const monitorWarn = (...args)=>{
    args = JSON.stringify(args);
    logHelper.getLogger().warn('monitor', args);
    logHelper.getLogger('monitor_warn').warn(args);
}
const monitorError = (...args)=>{
    args = JSON.stringify(args);
    logHelper.getLogger().error('monitor', args);
    logHelper.getLogger('monitor_error').error(args);
}

/**
 * 函数
 * **/
const current_disk = __dirname.substr(0,2).toLowerCase();
const getDiskUsage = ()=>{
    return new Promise(((resolve, reject) => {
        try {
            diskinfo.getDrives(function(error, aDrives) {
                if (error){
                    reject(error);
                }
                for (let i = 0; i < aDrives.length; i++) {
                    if( aDrives[i].mounted.toLowerCase() == current_disk ){
                        let mounted = aDrives[i].mounted;
                        let diskTotal  = (aDrives[i].blocks /1024 /1024).toFixed(0);
                        let diskUsed = (aDrives[i].used /1024 /1024).toFixed(0);
                        let diskAvailable = (aDrives[i].available /1024 /1024).toFixed(0);
                        let diskUsage = aDrives[i].capacity;
                        resolve({mounted:mounted, diskTotal:diskTotal, diskUsed:diskUsed, diskAvailable:diskAvailable, diskUsage:diskUsage});
                        mounted = undefined;
                        diskTotal = undefined;
                        diskUsed = undefined;
                        diskAvailable = undefined;
                        diskTotal = undefined;
                        diskUsage = undefined;
                        break;
                    }
                }
            });
        }catch (error) {
            reject(error);
        }
    }));
}

const cpuAverage = ()=>{
    return new Promise(((resolve, reject) => {
        let cpu, cpus, idle, len, total, totalIdle, totalTick, type, cpuUsage=0;

        totalIdle = 0;
        totalTick = 0;
        cpus = os.cpus();
        len = cpus.length;
        for(let i=0;i<len;i++){
            cpu = cpus[i];
            for (type in cpu.times) {
                totalTick += cpu.times[type];
            }
            totalIdle += cpu.times.idle;
            idle = totalIdle / len;
            total = totalTick / len;
            cpuUsage += parseFloat(((total-idle)/total).toFixed(2));
        }
        cpuUsage += parseFloat((cpuUsage/len).toFixed(2));
        resolve(cpuUsage);
        cpu = undefined;
        cpus = undefined;
        idle = undefined;
        len = undefined;
        total = undefined;
        totalIdle = undefined;
        totalTick = undefined;
        totalTick = undefined;
        cpuUsage = undefined;
    }));
}
module.exports = router;