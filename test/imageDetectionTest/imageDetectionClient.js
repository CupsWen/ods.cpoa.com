const fs = require('fs');
const https = require('https');
const querystring = require('querystring');
const md5 = require("md5");

const config = require('../../config.json');

const sendRequest = (path='/', method='GET', data={message:'hello'}) => {
    return new Promise((resolve, reject) => {
        let message = querystring.stringify(data);
        // console.log(message.length);
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
                resolve({statusCode, data});
            });
        });
        req.on('error', (error) => {
            reject(error);
        });
        req.write(message);
        req.end();
    })
}
let bitmap = fs.readFileSync('./testImage/image.jpg');
let base64Img = new Buffer(bitmap).toString('base64');
let workHash = md5(base64Img);
let jsonData = {workHash: workHash, publicKey: '', workName: 'image', workDescribe:'workDescribe', workAddress:'workAddress', image:base64Img};

sendRequest(path='/imageDetection', method='POST', data=jsonData).then((response) => {
    response.data = JSON.parse(response.data);
    if (response.statusCode === 200){
        console.log('statusCode:', response.statusCode);
        console.log('data:', response.data);
    }else {
        console.log('statusCode:', response.statusCode);
        console.log('error:', response.data.message);
    }
}).catch((error) => {
    console.log('error', error);
})