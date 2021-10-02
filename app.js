/**
 * 原创性检测服务器
 */

const path = require('path');
/**
 * web框架
 * **/
const koa = require('koa');
/**
 * HTTPS
 * **/
const https = require('https');                 // https
const sslify = require('koa-sslify').default;   // 强制使用HTTPS
const static = require('koa-static');           // 静态服务器
const koaBody = require('koa-body');
const bodyParser = require('koa-bodyparser');
/**
 * 文件模块
 * **/
const logHelper = require('./controllers/logHelper.js') // 文件模块 日志
const schedule = require('node-schedule');              // 文件模块 定时器
const os = require('os');                               // 文件模块 系统
const diskinfo = require('diskinfo');                   // 文件模块 磁盘信息
const nodemailer = require('nodemailer');               // 文件模块 邮箱
/**
 * 路由
 * **/
const imageDetection = require('./controllers/imageDetection.js')
const log = require('./controllers/log.js')
const monitor = require('./controllers/monitor.js')
/**
 * 配置文件
 * **/
const config = require('./config.json');

const app = new koa();

app.use(koaBody({
    multipart: true,
    formLimit:"2mb",
    jsonLimit:"2mb"
}));
app.use(bodyParser({
    formLimit:"2mb",
    jsonLimit:"2mb"
}));
app.use(sslify());                                       // 强制使用HTTPS
// app.use(static(path.join(__dirname, 'logs')));           // 静态服务器
// app.use(static(path.join(__dirname, 'assets/images')));  // 静态服务器
// app.use((ctx)=>{
//     console.log("hello");
// });
/**
 * 路由
 * **/
app.use(imageDetection.routes())
    .use(log.routes())
    .use(monitor.routes())

let options = {
    key: config.privateKey,
    cert: config.publicKey,
    ca: config.caCertificateList,
    // 要求验证客户端的证书
    requestCert: true,
    // 如果不是可信CA颁发的证书则断开连接
    rejectUnauthorized: true
};

https.createServer(options, app.callback()).listen(config.port, (error) => {
    if (error) {
        processError("https server launch error:", error.toString());
    } else {
        processInfo('imageDetection server running on:', 'https://' + config.host + ':' + config.port+'/imageDetection');
        processInfo('logs server running on:', 'https://' + config.host + ':' + config.port+'/logs');
        processInfo('monitor server running on:', 'https://' + config.host + ':' + config.port+'/monitor');
    }
});

/**
 * 进程事件
 * **/
process.on('warning', (warning) => {
    processWarn(warning.name);
    processWarn(warning.message);
    processWarn(warning.stack);
});

process.on('uncaughtException', (err, origin)=>{
    processError(err);
    processError(origin);
});

process.on('uncaughtException', (err, origin)=>{
    processError(err);
    processError(origin);
});

process.on('uncaughtExceptionMonitor', (err, origin)=>{
    processError(err);
    processError(origin);
});

process.on('unhandledRejection', (err, origin)=>{
    processError(err);
    processError(origin);
});

process.on('exit', (code) => {
    processInfo(`About to exit with code: ${code}`);
});

process.on('SIGINT', () => {
    processInfo('Received SIGINT. Press Control-D to exit.');
});

/**
 * 定时任务
 * **/
schedule.scheduleJob(config.monitor.schedule, async ()=>{
    // 1. 进程监控
    let {rss, heapTotal, heapUsed, external} = process.memoryUsage();
    rss = parseFloat((rss/1024/1024).toFixed(2));
    external = parseFloat((external/1024/1024).toFixed(2));
    let heapUsage = parseFloat((heapUsed/heapTotal).toFixed(2));
    // 2. 内存监控
    let memUsage = parseFloat((os.freemem()/os.totalmem()).toFixed(2));
    // 3. CPU占用监控
    let cpuUsage = await cpuAverage();
    // 4. 磁盘监控
    let mounted, diskTotal, diskUsed, diskAvailable, diskUsage;
    await getDiskUsage().then((data)=>{
        mounted = data.mounted;
        diskTotal = data.diskTotal;
        diskUsed = data.diskUsed;
        diskAvailable = data.diskAvailable;
        diskUsage = data.diskUsage;
    },(error)=>{
        processError('schedule', error);
    });
    diskTotal = parseInt(diskTotal);
    diskUsed = parseInt(diskUsed);
    diskAvailable = parseInt(diskAvailable);
    diskUsage = parseFloat(diskUsage)/100;

    monitorDebug('进程监控', rss, external, heapTotal, heapUsage);
    monitorDebug('内存监控', os.totalmem(), memUsage);
    monitorDebug('CPU占用监控', cpuUsage);
    monitorDebug('磁盘监控', mounted, diskTotal, diskUsed, diskAvailable, diskUsage);

    let html;
    if (heapUsage > config.monitor.heapUsage[0]){
        html = "<p>"+config.host+"异常</p>";
        html += "<p>heapUsage>"+config.monitor.heapUsage[0]+"</p>";
        sendEMail(config.monitor.emailAddress, config.host+"异常",html).then((data)=>{
            monitorWarn('sendEMail', '进程异常', heapUsage, data);
        }).catch((error)=>{
            monitorError('sendEMail', '进程异常', heapUsage, error);
        });
    }
    if (heapUsage > config.monitor.heapUsage[1]){
        html = "<p>"+config.host+"异常</p>";
        html += "<p>heapUsage>"+config.monitor.heapUsage[1]+"</p>";
        sendEMail(config.monitor.emailAddress, config.host+"异常",html).then((data)=>{
            monitorWarn('sendEMail', '进程异常', heapUsage, data);
        }).catch((error)=>{
            monitorError('sendEMail', '进程异常', heapUsage, error);
        });
    }
    if (memUsage > config.monitor.memUsage[0]){
        html = "<p>"+config.host+"异常</p>";
        html += "<p>memUsage>"+config.monitor.memUsage[0]+"</p>";
        sendEMail(config.monitor.emailAddress, config.host+"异常",html).then((data)=>{
            monitorWarn('sendEMail', '内存异常', memUsage, data);
        }).catch((error)=>{
            monitorError('sendEMail', '内存异常', memUsage, error);
        });
    }
    if (memUsage > config.monitor.memUsage[1]){
        html = "<p>"+config.host+"异常</p>";
        html += "<p>memUsage>"+config.monitor.memUsage[1]+"</p>";
        sendEMail(config.monitor.emailAddress, config.host+"异常",html).then((data)=>{
            monitorWarn('sendEMail', '内存异常', memUsage, data);
        }).catch((error)=>{
            monitorError('sendEMail', '内存异常', memUsage, error);
        });
    }
    if (cpuUsage > config.monitor.cpuUsage[0]){
        html = "<p>"+config.host+"异常</p>";
        html += "<p>cpuUsage>"+config.monitor.cpuUsage[0]+"</p>";
        sendEMail(config.monitor.emailAddress, config.host+"异常",html).then((data)=>{
            monitorWarn('sendEMail', 'CPU占用异常', cpuUsage, data);
        }).catch((error)=>{
            monitorError('sendEMail', 'CPU占用异常', cpuUsage, error);
        });
    }
    if (cpuUsage > config.monitor.cpuUsage[1]){
        html = "<p>"+config.host+"异常</p>";
        html += "<p>cpuUsage>"+config.monitor.cpuUsage[1]+"</p>";
        sendEMail(config.monitor.emailAddress, config.host+"异常",html).then((data)=>{
            monitorWarn('sendEMail', 'CPU占用异常', cpuUsage, data);
        }).catch((error)=>{
            monitorError('sendEMail', 'CPU占用异常', cpuUsage, error);
        });
    }
    if (diskUsage > config.monitor.diskUsage[0]){
        html = "<p>"+config.host+"异常</p>";
        html += "<p>diskUsage>"+config.monitor.diskUsage[0]+"</p>";
        sendEMail(config.monitor.emailAddress, config.host+"异常",html).then((data)=>{
            monitorWarn('sendEMail', '磁盘异常', cpuUsage, data);
        }).catch((error)=>{
            monitorError('sendEMail', '磁盘异常', cpuUsage, error);
        });
    }
    if (diskUsage > config.monitor.diskUsage[1]){
        html = "<p>"+config.host+"异常</p>";
        html += "<p>diskUsage>"+config.monitor.diskUsage[1]+"</p>";
        sendEMail(config.monitor.emailAddress, config.host+"异常",html).then((data)=>{
            monitorWarn('sendEMail', '磁盘异常', cpuUsage, data);
        }).catch((error)=>{
            monitorError('sendEMail', '磁盘异常', cpuUsage, error);
        });
    }
    rss = undefined;
    heapTotal = undefined;
    heapUsed = undefined;
    external = undefined;
    heapUsage = undefined;
    memUsage = undefined;
    cpuUsage = undefined;
    mounted = undefined;
    diskTotal = undefined;
    diskUsed = undefined;
    diskAvailable = undefined;
    diskUsage = undefined;
    html = undefined;
});
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
const sendEMail = (email, subject, html) => {
    return new Promise(((resolve, reject) => {
        let transporter = nodemailer.createTransport({
            service: 'qq',
            port: 465,
            secureConnection: true,
            auth: {
                user: '1191567189@qq.com',
                pass: 'ymhtyusyknzxiefe',
            }
        });

        let mailOptions = {
            from: '"智慧生活" <1191567189@qq.com>',
            // 843080741@qq.com
            to: email,
            subject: subject,
            html: html
        };
        transporter.sendMail(mailOptions, (error, info) => {
            if (error){
                reject(error);
            }
            resolve(info);
            transporter = undefined;
            mailOptions = undefined;
        });
    }))
}

/**
 * 日志 -- process
 * **/
const processDebug = (...args)=>{
    args = JSON.stringify(args);
    logHelper.getLogger().debug('process', args);
    logHelper.getLogger('process_debug').debug(args);
}
const processInfo = (...args)=>{
    args = JSON.stringify(args);
    logHelper.getLogger().info('process', args);
    logHelper.getLogger('process_info').info(args);
}
const processWarn = (...args)=>{
    args = JSON.stringify(args);
    logHelper.getLogger().warn('process', args);
    logHelper.getLogger('process_warn').warn(args);
}
const processError = (...args)=>{
    args = JSON.stringify(args);
    logHelper.getLogger().error('process', args);
    logHelper.getLogger('process_error').error(args);
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