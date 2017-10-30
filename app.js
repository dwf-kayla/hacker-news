//http模块用来创建http服务实例
var http = require("http");

//fs模块用来读写文件
var fs = require("fs");

//path模块可以用来拼接路径字符串
var path = require("path");

//mime模块可以根据文件名来判断当前文件的Content-Type
var mime = require("mime");

//url模块可以提供一个方法 用来解析url地址的
var url = require("url");

//underscore 中有模板渲染方法 引入underscore
var _ = require("underscore");

var querystring = require("querystring");

var server = http.createServer();

server.on("request", function (req, res) {

    res.render = function (filename, templateData) {
        fs.readFile(filename, (err, data) => {
            if (err) {
                this.writeHead(404, "Not Found", {
                    "Content-Type": "text/html;charset=utf-8"
                })
                this.end("<h1>您访问的页面不存在</h1>")
            }


            //如果有数据要被渲染到页面中去，则执行模板渲染方法，将数据渲染到页面之后，再返回页面
            //否则就直接将读到的文件内容返回给浏览器
            if(templateData){
                //先渲染数据，然后，再将渲染好的页面返回给浏览器
                //data: 就是读到的模板文件.html中的内容
                var fn = _.template(data.toString("utf-8"));
                //templateData: 就是要渲染到模板中的数据
                data = fn(templateData);
            }
            

            this.writeHead(200, "OK", {
                "Content-Type": mime.getType(filename)
            })
            this.end(data);
        })
    }

    //开始设计简单的路由 不同url指向不同的页面
    //1. 首页(新闻列表页)    /     /index      get
    //2. 新闻详情页          /detail          get
    //3. 新闻发布页          /publish        get


    //将当前浏览器请求的url转换成一个url对象
    var urlObj = url.parse(req.url, true);

    // console.log(urlObj);

    //路由设计好了，根据不同的url 要给浏览器响应不同的页面
    if ((req.url == "/" || req.url == "/index") && req.method == "GET") {

        //1. 获取data.json中保存的新闻列表数据
        readNewsData(function(newsArr){
            //2. 使用模板引擎，将数据渲染到模板页面中
            //3. 将渲染好数据的页面返回给浏览器
            res.render(path.join(__dirname, "views/index.html"), {list: newsArr});
        })
    } else if (urlObj.pathname == "/details" && req.method == "GET") {

        //1. 获取用户请求的url中的id
        var id = urlObj.query.id;
        //2. 根据id，获取到文件中对应的新闻对象(读取data.json)
        readNewsData(function(newsArr){
            
            //filter方法可以用来获取数组中满足指定条件的所有的项
            //他的返回值是一个数组，哪怕是只有一个满足条件的项，也是存在数组中的
            var result = newsArr.filter(function(v, i){
                return v.id == id;
            });

            if(result.length > 0){
                //如果找到了id对应的新闻数据，那就
                //3. 将对应的新闻对象使用模板引擎渲染
                
                res.render(path.join(__dirname, "views/details.html"), result[0]);
                //4. 将渲染结果返回给浏览器
            }else{
                res.writeHead(404, "Not Found", {
                    "Content-Type": "text/html;charset=utf-8"
                })
                res.end("<h1>您访问的页面不存在</h1>")
            }
        })
        
    } else if (req.url == "/submit" && req.method == "GET") {
        res.render(path.join(__dirname, "views/submit.html"));
    } else if (req.url.startsWith("/resources") && req.method == "GET") {
        res.render(path.join(__dirname, req.url));
    } else if (urlObj.pathname == "/add" && req.method == "GET") {
        // /add地址是用户将新建的新闻信息提交上来的地址

        // 我们可以在这里获取用户提交的数据
        // 1. 用户是通过get方式提交的数据，所以数据会以?key=value的形式拼接在url后面
        // 2. 我们可以通过解析url地址中的参数，获取到用户提交的内容

        //有一个模块，这个模块叫做url
        //url.parse方法可以将url地址中的内容解析为一个对象
        var news = urlObj.query;
        // var newsArr;

        //1. 获取之前已经存储过的新闻数据（读文件）

        readNewsData(function(newsArr){
            newsArr.push(news);
            //将存储新闻的数组，写入的data.json文件中
            writeNewsData(res, newsArr, function(){
                //1. 设置状态码为跳转状态码 300
                res.statusCode = 302;
                res.statusMessage = "Found";
                res.setHeader("Location", "/");
                res.end();
            })
        })
    } else if (urlObj.pathname == "/add" && req.method == "POST"){

        //1. 获取用户传递过来的数据
        //要获取post方式发送来的数据，需要使用req对象
        //要给req对象注册事件
        //data事件： 只要有post数据传递过来，就会触发这个data事件
        //end事件： post所有的数据传输完成之后，就会触发end事件

        //声明以个存放Buffer对象的数组，每次接收到浏览器端传输过来的数据buffer的时候
        //就将其追加到这个数组中
        getPostBody(req, function(queryObj){
            //2. 读data.json文件 
            readNewsData(function(newsArr){
                //如果数组中没有元素 则 newsArr.length 就是0 那我们直接给元素的id赋值0就可以
                //如果数组中元素，那么就让新加进去的元素的id 赋值为 数组的最后一个元素的id+1
                queryObj.id = newsArr.length == 0 ? 0 : newsArr[newsArr.length-1].id + 1;
                newsArr.push(queryObj);
                //4. 将追加数据后的新数组重新写入到data.json文件中
                writeNewsData(res, newsArr, function(){
                    //1. 设置状态码为跳转状态码 302
                    res.statusCode = 302;
                    res.statusMessage = "Found";
                    res.setHeader("Location", "/");
                    res.end();
                })
            })
        })
        
    }else{
        res.writeHead(404, "Not Found", {
            "Content-Type": "text/html;charset=utf-8"
        })

        res.end("<h1>您访问的页面不存在</h1>")
    }


}).listen(8080, function () {
    console.log("Hacker-News已经运行在 http://localhost:8080")
})

function readNewsData(callback){
    var newsList;
    fs.readFile(path.join(__dirname, "data.json"), "utf8", function(err, data){
        if(err){
            newsList = [];
        }else{
            newsList = JSON.parse(data);
        }
        callback(newsList);
    })
}

function writeNewsData(res, newsArr, callback){
    fs.writeFile(path.join(__dirname, "data.json"), JSON.stringify(newsArr), function(err){
        if(err){
            res.writeHead(500, "服务器内部错误", {
                "Content-Type": "text/html;charset=utf-8"
            })
            res.end("写入文件失败！！")
        }
        callback();
    })
}

function getPostBody(req, callback){
    var result = [];
    req.on("data", function(chunk){
        result.push(chunk);
    })
    req.on("end", function(){
        //当所有的数据传输完毕的时候，end事件会被触发
        //我们要在传输完毕的时候，将所有的数据buffer拼接起来
        //再将其转成我们需要的数据

        //1. 拼接Buffer
        result = Buffer.concat(result);
        
        //2. 将拼接好的Buffer转成正常的数据
        result = result.toString("utf8");

        //3. 获取到的result数据，其实就是 key=value&key=value字符串
        //我们需要将其转成对应的对象(借助node中的querystring)
        result = querystring.parse(result);
        //将最终获取到的post请求的数据对象 传递给callback
        //用户想要做任何处理，只需要在callback中执行自己的操作，书写自己的代码即可
        callback(result);
    })
}




//异步操作封装

// function getPerson(callback){
//     var person;
//     setTimeout(function(){
//         person = {
//             name: "张大力",
//             age: 18,
//             sayHi: function(){
//                 console.log("Hey, 多吃菠菜哦~");
//             }
//         }
//         callback(person);
//     }, 3000)
// }

// getPerson(function(p){
//     p.sayHi();
// })










//rest参数
// var sum = (...arr)=>{

// }

// sum(1,2,3,34,5,5,6,6,6)