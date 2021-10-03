/**
 * 核心模块
 * **/
const fs = require('fs');                  // 核心模块 fs
const path = require('path');              // 核心模块 path
const crypto = require('crypto');          // 核心模块 crypto
/**
 * 文件模块
 * **/
const md5 = require('md5');                 // 文件模块 Hash模块
const validator = require('validator');     // 文件模块 数据验证模块
const asn1 = require('asn1.js');            // 文件模块 签名
const logHelper = require('./logHelper.js') // 文件模块 日志
/**
 *  百度图像审核
 * **/
const AipContentCensorClient = require('baidu-aip-sdk').contentCensor;
const ApiImageSearch = require('baidu-aip-sdk').imageSearch;
const APP_ID = '...';
const API_KEY = '...';
const SECRET_KEY = '...';
const contentCensorClient = new AipContentCensorClient(APP_ID, API_KEY, SECRET_KEY);
const apiImageSearch = new ApiImageSearch(APP_ID, API_KEY, SECRET_KEY);
/**
 * 配置文件
 * **/
const config = require('../config.json');   // 配置文件
/**
 * 路由
 * **/
const Router = require('koa-router');       // koa-router
const router = new Router();

// 摄影作品原创性检测
router.post('/imageDetection', async (ctx, next) => {
    // 1. 获取并检查参数
    let userName = ctx.req.connection.getPeerCertificate().subject.CN;
    let url = ctx.request.url;
    let {workHash, publicKey, workName, workDescribe, workAddress, image} = ctx.request.body;
    imageDetectionInfo(url, userName, {workHash, publicKey, workName, workDescribe, workAddress});
    let isOk = 0;
    await checkParams(workHash, publicKey, workName, workDescribe, workAddress, image)
        .then((data)=>{
            isOk = data;
            imageDetectionDebug('checkParams', 'resolve', data);
        })
        .catch((error) => {
            returnJson(ctx, userName, 400, {message:error});
            isOk=0;
            imageDetectionDebug('getResponse', 'reject', error);
        });
    if (!isOk){return;}
    if (!config.imageDetection.userNames.includes(userName)){
        returnJson(ctx, userName, 400, {message:'do not have permission.'});
        return;
    }
    // 2. 比对图片和Hash值是否匹配并保存图片到本地
    await saveImage(workHash, image).then((data) => {
        isOk = data;
        imageDetectionDebug('saveImage', 'resolve', data);
    }).catch((error) => {
        returnJson(ctx, userName, 500, {message:error});
        isOk=0;
        imageDetectionDebug('getResponse', 'reject', error);
    });
    if (!isOk){return;}
    // 3. 图像内容审核（包含美学质量评价）和相似图像检索
    isOk=0;
    let contentCensorResult, similarSearchResult;
    await Promise.all(
        [contentCensorClient.imageCensorUserDefined(image, 'base64'),apiImageSearch.similarSearch(image,{pn:0,rn:36})]
    ).then((data) => {
        contentCensorResult = data[0];
        similarSearchResult = data[1];
        isOk = 1;
        imageDetectionDebug('contentCensorClient and apiImageSearch', 'resolve', data);
    }).catch((error)=>{
        returnJson(ctx, userName, 400, {message:error});
        isOk = 0;
        imageDetectionDebug('getResponse', 'reject', error);
    });
    if (!isOk){return;}
    // 4. 签名并返回原创性检测结果
    isOk = 0;
    await getResponse(contentCensorResult, similarSearchResult, workHash, publicKey, workName, workDescribe, workAddress).then((data)=>{
        returnJson(ctx, userName, 200, data);
        isOk = 1;
        imageDetectionDebug('getResponse', 'resolve', data);
    }).catch((error)=>{
        returnJson(ctx, userName, 500, {message:error});
        isOk = 0;
        imageDetectionDebug('getResponse', 'reject', error);
    });
    // if (!isOk){return;}
    // 5. 图片入库
    // await apiImageSearch.similarAdd(image,{"brief": workHash}).then(function (data) {
    //     imageDetectionDebug('similarAdd', 'resolve', data);
    // }).catch(function (error) {
    //     imageDetectionDebug('similarAdd', 'reject', error);
    // });
    userName = undefined;
    url = undefined;
    workHash = undefined;
    publicKey = undefined;
    workName = undefined;
    workDescribe = undefined;
    workAddress = undefined;
    image = undefined;
    isOk = undefined;
    contentCensorResult = undefined;
    similarSearchResult = undefined;
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
            imageDetectionInfo('returnJson', userName, data);
            break;
        case 400:
            imageDetectionWarn('returnJson', userName, data);
            break;
        case 500:
            imageDetectionError('returnJson', userName, data);
            break;
        default:
            imageDetectionInfo('returnJson', userName, data);
            break;
    }
}

const imageDetectionDebug = (...args)=>{
    args = JSON.stringify(args);
    logHelper.getLogger().debug('imageDetection', args);
    logHelper.getLogger('imageDetection_debug').debug(args);
}
const imageDetectionInfo = (...args)=>{
    args = JSON.stringify(args);
    logHelper.getLogger().info('imageDetection', args);
    logHelper.getLogger('imageDetection_info').info(args);
}
const imageDetectionWarn = (...args)=>{
    args = JSON.stringify(args);
    logHelper.getLogger().warn('imageDetection', args);
    logHelper.getLogger('imageDetection_warn').warn(args);
}
const imageDetectionError = (...args)=>{
    args = JSON.stringify(args);
    logHelper.getLogger().error('imageDetection', args);
    logHelper.getLogger('imageDetection_error').error(args);
}


const checkParams = async (workHash, publicKey, workName, workDescribe, workAddress, image) => {
    /**
     * @description 检查输入参数
     * @param  : workHash, publicKey, workName, workDescribe, workAddress, image
     * @return : 1 or error info
     * @date   : 16:40 2021/9/25
     * @author : cups
     **/
    return new Promise((resolve, reject) => {
        // workHash
        if (validator.isEmpty(workHash)){
            reject('workHash is null.');
        }
        if (!validator.isMD5(workHash)){
            reject('workHash is not md5 hash.');
        }
        // publicKey
        if (validator.isEmpty(publicKey)){
            reject('workHash is null.');
        }
        // workName
        if (validator.isEmpty(workName)){
            reject('workName is null.');
        }
        // workDescribe
        if (validator.isEmpty(workDescribe)){
            reject('workDescribe is null.');
        }
        // workAddress
        if (validator.isEmpty(workAddress)){
            reject('workAddress is null.');
        }
        // image
        if (validator.isEmpty(image)){
            reject('image is null.');
        }
        if (!validator.isBase64(image)){
            reject('image encoding is not base64.');
        }
        if (workHash!==md5(image)){
            reject('image and workHash not match.');
        }
        resolve(1);
    })
}

const saveImage = async (workHash, image) => {
    /**
     * @description 保存图片
     * @param  : image
     * @return : hash or error info
     * @date   : 15:52 2021/9/25
     * @author : cups
     **/
    return new Promise((resolve, reject) => {
        let bitmap = new Buffer(image, "base64");
        fs.writeFile(path.join(config.imageDetection.imageSavePath, workHash + '.png'), bitmap, (error) => {
            reject(error);
            bitmap = undefined;
        });
        resolve(1);
        bitmap = undefined;
    })
}

const EcdsaDerSig = asn1.define('ECPrivateKey', function() {
    return this.seq().obj(
        this.key('r').int(),
        this.key('s').int()
    );
});

function ecdsaSign(hashBuffer, key) {
    let result = '';
    let r, s = '';
    while (result.length != 154 || r.length != s.length){
        let sign = crypto.createSign("sha256");
        sign.update(Buffer(hashBuffer));
        let asn1SigBuffer = sign.sign(key, 'buffer');
        let rsSig = EcdsaDerSig.decode(asn1SigBuffer, 'der');
        r = rsSig.r.toString();
        s = rsSig.s.toString();
        result =  r + s
        sign = undefined;
        asn1SigBuffer = undefined;
        rsSig = undefined;
    }
    r = undefined;
    s = undefined;
    return result;
}

const getResponse = (contentCensorResult, similarSearchResult, workHash, publicKey, workName, workDescribe, workAddress)=> {
    return new Promise((resolve, reject)=>{
        let mspId = config.mspId;
        if(contentCensorResult.conclusionType === 2){
            resolve({workHash:workHash, mspId:mspId, isPass: 0, evaluation: 0, signature:""});
        }
        if(similarSearchResult.result[0].score > 0.83){
            resolve({workHash:workHash, mspId:mspId, isPass: 0, evaluation: 0, signature:""});
        }
        if (contentCensorResult.data[0].probability > 0.40){
            let isPass = 1;
            let evaluation = parseFloat(contentCensorResult.data[0].probability.toFixed(2));
            let signMsg = {workHash, publicKey, workName, workDescribe, workAddress, mspId, isPass, evaluation};
            let signature = "";
            try{
                signature = ecdsaSign(Buffer.from(JSON.stringify(signMsg),"utf-8"), config.privateKey);
                resolve({workHash:workHash, mspId:mspId, isPass: isPass, evaluation: evaluation, signature:signature});
            }catch (error) {
                reject(error);
            }
        }
        resolve({workHash:workHash, mspId:mspId, isPass: 0, evaluation: 0, signature:""});
        mspId = undefined;
    });
}

module.exports = router;
