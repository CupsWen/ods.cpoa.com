# 原创性检测服务器
|项目名称|项目描述|项目功能|项目特点|
|:----:|:----:|:----:|:----:|
|摄影作品原创性检测服务器|基于百度智云对摄影作品进行原创性检测|1.原创性检测</br> 2.日志管理</br> 3.监控与报警|原创性检测内容全面|
# 项目目录结构
```shell
├─assets // 静态资源
│  ├─images
│  ├─scripts
│  └─styles
├─controllers// 路由
│  ├─imageDetection.js     // 原创性检测路由
│  ├─log.js                // 日志管理路由
│  ├─logHelper.js          // 日志管理帮助文件
│  └─monitor.js            // 状态监控路由
├─docs// 文档
│  ├─History.md             // 项目修改历史文档
│  ├─INSTALL.md             // 项目安装文档
│  ├─常见Web攻击.md          // 常见网络攻击文档
│  ├─项目说明文档.md          // 项目说明文档
│  └─images                 // 文档中的图片 
├─logs// 日志
│  ├─imageDetection
│  ├─log
│  ├─monitor
│  └─process
├─node_modules// npm 模块包
├─test// 测试代码
│  ├─imageDetectionTest
│  |  ├─imageDetectionClient.js // 原创性检测服务测试
│  │  └─testImage
│  ├─logTest
│  │  └─logClient.js            // 日志管理服务测试
│  ├─moduleTest
│  │  └─diskInfo.js             // diskInfo模块测试
│  └─monitorTest
│     └─monitorClient.js        // 状态监控服务测试
├─app.js        // 项目入口
├─config.json   // 项目配置文件
├─nodemon.json  // nodemon配置文件
├─package.json  // npm 模块配置
├─README.md     // 说明文件--快速开始
└─views
```

# 快速开始
1. 安装所需要的依赖包
`npm install`
2. 配置相关参数
`config.json`
3. 调试模式启动项目
`npm dev`
4. 测试项目
`npm test`
# 了解详细内容请查看docs