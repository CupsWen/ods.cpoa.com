const https = require('https');
const querystring = require('querystring');
const config = require('../../config.json');

const sendRequest = (path='/', method='GET' , data = {}) => {
    return new Promise((resolve, reject) => {
        let message = '';
        if(data!== undefined){
            message = querystring.stringify(data);
        }
        // console.log(message);
        const options = {
            host: config.host,                      // ip
            port: config.port,                      // 端口
            path: path,
            method: method,
            headers:{
                'Content-Type':'application/x-www-form-urlencoded',
                'Content-Length':message.length
            },
            key: config.testPrivateKey,             // 私钥
            cert: config.testPublicKey,             // 公钥
            ca: config.caCertificateList[0],        // 为服务器颁发证书的CA列表
            agent: false,                           // 不使用代理
            rejectUnauthorized: false               // 双向认证
        };
        let req = https.request(options, (res) => {
            // console.log('client connected', res.connection.authorized ? 'authorized' : 'unauthorized');
            let statusCode = res.statusCode;
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                // console.log(statusCode, data);
                resolve({statusCode, data});
            });
        });
        req.on('error', (error) => {
            reject(error);
        });
        req.write(message);
        req.end();
    });
}


let conmmands = ['getAllFileDir', 'downloadOne', 'downloadAll', 'deleteOne', 'deleteAll'];
/**
 * 日志管理--getAllFileDir
 * **/

const main = async ()=>{
    let dir;
    await sendRequest(path='/log', method='POST' , data = {command:'getAllFileDir'}).then((response) => {

        if (response.statusCode === 200){
            console.log('statusCode:', response.statusCode);
            console.log('message:', JSON.parse(response.data).message);
            dir = JSON.parse(response.data).message;
        }else {
            console.log('statusCode:', response.statusCode);
            console.log('error:', response.data.message);
        }
    }).catch((error) => {
        console.log('error', error);
    })

    await sendRequest(path='/log', method='POST' , data = {command:'downloadOne', path:dir[0]}).then((response) => {
        if (response.statusCode === 200){
            console.log('statusCode:', response.statusCode);
            console.log('message:', JSON.parse(response.data).message);
        }else {
            console.log('statusCode:', response.statusCode);
            console.log('error:', response.data.message);
        }
    }).catch((error) => {
        console.log('error', error);
    })

    // await sendRequest(path='/log', method='POST' , data = {command:'downloadAll'}).then((response) => {
    //     if (response.statusCode === 200){
    //         console.log('statusCode:', response.statusCode);
    //         console.log('message:', JSON.parse(response.data).message);
    //     }else {
    //         console.log('statusCode:', response.statusCode);
    //         console.log('error:', response.data.message);
    //     }
    // }).catch((error) => {
    //     console.log('error', error);
    // });
    //
    // await sendRequest(path='/log', method='POST' , data = {command:'deleteOne', path:dir[0]}).then((response) => {
    //     if (response.statusCode === 200){
    //         console.log('statusCode:', response.statusCode);
    //         console.log('message:', JSON.parse(response.data).message);
    //     }else {
    //         console.log('statusCode:', response.statusCode);
    //         console.log('error:', response.data.message);
    //     }
    // }).catch((error) => {
    //     console.log('error', error);
    // });
    // await sendRequest(path='/log', method='POST' , data = {command:'deleteAll'}).then((response) => {
    //     if (response.statusCode === 200){
    //         console.log('statusCode:', response.statusCode);
    //         console.log('message:', JSON.parse(response.data).message);
    //     }else {
    //         console.log('statusCode:', response.statusCode);
    //         console.log('error:', response.data.message);
    //     }
    // }).catch((error) => {
    //     console.log('error', error);
    // });
}
main();
