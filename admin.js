//搭建外卖的后台
// 引入
let express = require("express");
//引入co异步处理模块
let co = require('co');
//引入OSS模块
let OSS = require('ali-oss');
let fs = require("fs")
//导入formidable
let formidable = require("formidable")
//引入express-session
let session = require("express-session")
//引入mysql
let mysql = require("mysql");
let bodyParser = require('body-parser') //引入
// 创建应用
let app = express();
//设置为中间件
app.use(session({

    secret: 'keyboard cat', //参与加密的字符串（又称签名）

    saveUninitialized: false, //是否为每次请求都设置一个cookie用来存储session的id

    resave: true, //是否在每次请求时重新保存session      把session信息存储在cookie

    cookie: {
        maxAge: 1200000,
    } //session的过期时间,单位为毫秒

}))
app.use(bodyParser.urlencoded({
    extended: false
})); //设置请求报文主体的编码类型=》不用编码
app.use(bodyParser.json()); //设置请求报文主体类型
// 读取静态资源
app.use(express.static("node_modules"));
// 读取后台的静态资源
app.use(express.static("public"));
app.use(express.static("uploads"));

// 设置模板引擎的类型
app.set("view engine", "jade");
// 设置分离的模板的存储目录
app.set("views", "./views")
//配置数据库
let connection = mysql.createConnection({
    host: 'localhost', //主机
    user: 'root', //用户名
    password: '', //密码
    database: 'yulierqi' //数据库
});
//连接数据库
connection.connect();

//加载登录的模板
app.get("/login", (req, res) => {
    res.render("Login/login")
})
//执行登录
app.post("/dologin", (req, res) => {
    //获取登录的名字和密码
    let name = req.body.name;
    let password = req.body.password;
    //检测登录的用户名是否和数据表的用户名一致
    let sql = "select * from admin_users where name='" + name + "'";
    //执行sql
    connection.query(sql, (error, results, fields) => {
        if (error) {
            throw error;
        }
        if (results.length <= 0) {
            //用户名有误
            res.setHeader('content-type', 'text/html;charset=utf-8');
            // res.write(`<h1>用户名不正确</h1>!<script>setTimeout(function(){location.href='/login'},3000)</script>`);
            res.render('Login/logins')
            res.end();
        } else {
            //检测密码
            if (password == results[0].password) {
                //把登录的用户名存储在session里
                req.session.usernames = name;
                res.setHeader('content-type', 'text/html;charset=utf-8');
                // res.write(`<h1>登录成功</h1>!<script>setTimeout(function(){location.href='/adminindex'},3000)</script>`);
                res.redirect('/adminindex')
                res.end();
            } else {
                res.setHeader('content-type', 'text/html;charset=utf-8');
                // res.write(`<h1>密码错误</h1>!<script>setTimeout(function(){location.href='/login'},3000)</script>`);
                res.render('Login/loginss')
                res.end();
            }

        }
    })
})
//检测是否登录 函数
function checklogin(req, res, next) {
    if (!req.session.usernames) {
        res.setHeader('content-type', 'text/html;charset=utf-8');
        // res.write(`<h1>请登录</h1>!<script>setTimeout(function(){location.href='/login'})</script>`);
        res.redirect("/login");
        // res.render('/login')
        res.end();
    } else {
        next();
    }
}
// 加载后台首页
app.get("/adminindex", checklogin, (req, res) => {
    //统计管理员的总数量
    //给统计的总数量起别名  as count   as起别名的意思
    let sql = "select count(*) as count from admin_users"
    connection.query(sql, (error, results, fields) => {
        if (error) {
            throw error;
        }
        // console.log(results[0].count);
        var xAxis = ["管理员", "用户", "入驻商家", "商家食品", "订单"];  //x轴的echarts菜单
        var series = [results[0].count, 20, 30, 10, 10]; //y轴数量统计
        res.render("Adminindex/adminindex", { loginnames: req.session.usernames, xAxis: xAxis, series: series })
    })

})
// 加载管理员列表
app.get("/adminuser", checklogin, (req, res) => {
    //查询学生数据=》学生列表
    let sql = "select * from admin_users"
    connection.query(sql, (error, results, fields) => {
        if (error) {
            throw error;
        }
        //加载模板
        res.render("Adminuser/adminuser", {
            data: results,
            loginnames: req.session.usernames
        })
        res.end();
    })
})
//加载管理员添加的模板
app.get("/adminuseradd", checklogin, (req, res) => {
    res.render("Adminuser/adminuseradd", { loginnames: req.session.usernames })
})
//执行添加
app.post("/adminuserdoadd", checklogin, (req, res) => {
    //获取添加的数据
    // console.log(req.body);
    //获取需要的name及age
    let name = req.body.name;
    let password = req.body.password;
    //做数据插入
    let sql = "insert into admin_users (name,password)values('" + name + "','" + password + "')";
    // console.log(sql)
    connection.query(sql, (error, results, fields) => {
        if (error) {
            throw error;
        }
        // console.log(results);
        if (results.affectedRows > 0) {
            res.redirect("/adminuser");
            res.end();

        }
    })
})
//删除路由
app.get("/adminuserdel", checklogin, (req, res) => {
    // res.write("this is delete");
    //获取需要删除数据的id
    let id = req.query.id;
    //sql
    let sql = "delete from admin_users where id=" + id;
    connection.query(sql, (error, results, fields) => {
        if (error) {
            throw error;
        }
        // console.log(results);
        if (results.affectedRows > 0) {
            res.redirect("/adminuser");
            res.end();

        }
    })
})

//加载修改模板的路由
app.get("/adminuseredit", checklogin, (req, res) => {
    //获取需要修改数据的id
    let id = req.query.id;
    //准备sql语句
    let sql = "select * from admin_users where id=" + id;
    //获取需要修改的数据
    connection.query(sql, (error, results, fields) => {
        if (error) {
            throw error;
        }
        //分配需要修改的数据
        // console.log(results);
        // res.end();
        res.render("Adminuser/adminuseredit", {
            data: results[0],
            loginnames: req.session.usernames
        });
        res.end();
    })

})
//执行修改
app.post("/adminuserdoedit", checklogin, (req, res) => {
    //获取修改过的数据
    // console.log(req.body);
    let id = req.body.id;
    let name = req.body.name;
    let password = req.body.password;
    //准备sql语句
    let sql = "update admin_users set name='" + name + "',password='" + password + "' where id=" + id
    // console.log(sql)
    connection.query(sql, (error, results, fields) => {
        if (error) {
            throw error;
        }
        // console.log(results);
        if (results.affectedRows > 0) {
            res.redirect("/adminuser");
            res.end();

        }
    })
})

//加载前台会员的模板
app.get("/user", checklogin, (req, res) => {
    //获取会员数据
    //准备sql语句
    let sql = "select * from users";
    connection.query(sql, (error, results, fields) => {
        if (error) {
            throw error;
        }
        //加载模板
        res.render("User/user", {
            data: results,
            loginnames: req.session.usernames
        })
        res.end();
    })
})
//会员详情
app.get("/userinfo", checklogin, (req, res) => {
    //获取会员的id
    let id = req.query.id;
    //准备sql
    let sql = "select * from users_info where user_id=" + id;
    //获取单击会员的详情信息
    connection.query(sql, (error, results, fields) => {
        if (error) {
            throw error;
        }
        // console.log(results)
        //加载模板
        res.render("User/userinfo", {
            data: results[0],
            loginnames: req.session.usernames
        })
        res.end();
    })
})
//搜索会员用户
app.get("/usersearch", checklogin, (req, res) => {
    //获取搜索的关键词
    var keyword = req.query.keyword;
    // console.log(keyword)
    // res.end()
    //获取搜索的数据
    //准备sql语句
    let sql = "select * from users where name like '%" + keyword + "%'"
    // console.log(sql)
    // res.end()
    connection.query(sql, (error, results, fields) => {
        if (error) {
            throw error;
        }
        // console.log(results)
        //加载模板
        res.render("User/user", {
            data: results,
            loginnames: req.session.usernames
        })
        res.end();
    })
})
//会员用户收获地址
app.get("/useraddress", checklogin, (req, res) => {
    //获取会员用户的姓名
    var name = req.query.name;
    //准备sql语句
    let sql = "select * from address where username='" + name + "'";
    //执行sql语句
    connection.query(sql, (error, results, fields) => {
        if (error) {
            throw error;
        }
        // console.log(results)
        // res.end()
        //加载模板
        res.render("User/useraddress", {
            data: results,
            loginnames: req.session.usernames
        })
        res.end();
    })

})
//获取商家列表
app.get("/adminshop", checklogin, (req, res) => {
    //给客户端传递四个数据 counts数据总条数、 pages当前页、 page当前页码-1、 data当前页的数据；
    //获取客户端传递的page
    let page = (req.query.page == undefined) ? 0 : req.query.page;
    //pages   parseInt => 把字符串强制转换为整形
    let pages = parseInt(page) + 1;
    let startPage = page * 2;
    //as 在sql语句里面可以给字段起别名
    let count = "select count(*) as count from shoplists"; //计算总数
    let sql = `select * from shoplists limit ${startPage},2`;  //计算data的sql语句
    connection.query(count, (error, results, fields) => {
        // console.log(results[0].count);res.end()
        let counts = results[0].count;  //获取总条数
        //执行sql
        connection.query(sql, (error, results, fields) => {
            if (error) {
                throw error;
            }
            // console.log(results)
            // res.end()
            //加载模板
            res.render("Adminshop/adminshop", {
                count: counts,
                pages: pages,
                page: page,
                data: results,
                loginnames: req.session.usernames
            })
            res.end();
        })

    })
})
//设置阿里oss
var client = new OSS({

    region: 'oss-cn-beijing',//地域

    accessKeyId: 'LTAI5tBGesqnzSKz89cEPFsk',//keyid

    accessKeySecret: 'NiGMiuU6Qe0xnvKmnSTUuyvyeOc7Yg',//密钥

    bucket: 'yulinerqi'//仓库名字

});

var ali_oss = {

    bucket: 'yulinerqi',//仓库名字

    endPoint: 'oss-cn-beijing.aliyuncs.com',//物理服务器

}
//入驻商家的添加
app.get("/adminshopadd", checklogin, (req, res) => {
    //加载入驻商家添加的模板
    res.render("Adminshop/adminshopadd",{loginnames: req.session.usernames})
    res.end();
})
//入驻商家执行添加
app.post("/adminshopdoadd", checklogin, (req, res) => {
    //实例化formidable
    let form = new formidable.IncomingForm();
    //规定上传文件路径
    form.uploadDir = "./uploads"
    //加上传文件后缀
    form.keepExtensions = true
    //files 文件上传成功后的文件信息
    //fields普通参数
    form.parse(req, (err, fields, files) => {
        /*  console.log(files);
         console.log(fields)
         res.end(); */
        //初始化需要入库的数据
        //商家名称
        const name = fields.name;
        //商家图片(图片的路径)
        const pics = files.pic.path;
        const pic = pics.slice(8);
        //获取上传文件路径
        const filePath = files.pic.path;
        // uploads upload_666024f106acec3fd3405087ab843a4d.jpg  截取掉uploads
        //商家描述
        const content = fields.content;
        //商家配送费
        const fee = fields.fee;
        //执行阿里oss上传
        co(function* () {

            client.useBucket(ali_oss.bucket);
            //pic 上传文件名字    filePath 上传文件路径
            var result = yield client.put(pic, filePath);
            //上传之后删除本地文件         
            fs.unlinkSync(filePath);
            //   res.setHeader('content-type','text/html;charset=utf-8');
            res.end(JSON.stringify({ status: '100', msg: '上传成功' }));

        }).catch(function (err) {
            //   res.setHeader('content-type','text/html;charset=utf-8');
            res.end(JSON.stringify({ status: '101', msg: '上传失败', error: JSON.stringify(err) }));

        });
        // console.log(name,pic,content,fee);return;
        // res.end()
        //准备sql语句
        let sql = "insert into shoplists(name,pic,content,fee)values('" + name + "','" + pic + "','" + content + "','" + fee + "')"
        //执行sql语句
        connection.query(sql, (error, results, fields) => {
            if (error) {
                throw error;
            }
            // console.log(results);
            if (results.affectedRows > 0) {
                res.redirect("/adminshop");
                res.end();

            }
        })
    })
})
//执行删除
//删除路由
app.get("/adminshopdel", checklogin, (req, res) => {
    // res.write("this is delete");
    //获取需要删除数据的id
    let id = req.query.id;
    //sql
    let sql = "delete from shoplists where id=" + id;
    connection.query(sql, (error, results, fields) => {
        if (error) {
            throw error;
        }
        // console.log(results);
        if (results.affectedRows > 0) {
            res.redirect("/adminshop");
            res.end();

        }
    })
})
//加载入驻商家修改的模板
app.get("/adminshopedit", checklogin, (req, res) => {
    //获取id
    let id = req.query.id;
    let sql = "select * from shoplists where id=" + id;
    //执行sql
    connection.query(sql, (error, results, fields) => {
        if (error) {
            throw error;
        }
        //分配需要修改的数据
        // console.log(results);
        // res.end();
        res.render("AdminShop/adminshopedit", {
            data: results[0],
            loginnames: req.session.usernames
        });
        res.end();
    })
})
//执行入驻商家的修改
app.post("/adminshopdoedit", checklogin, (req, res) => {
    //实例化formidable
    let form = new formidable.IncomingForm();
    //规定上传文件路径
    form.uploadDir = "./uploads"
    //加上传文件后缀
    form.keepExtensions = true
    //files 文件上传成功后的文件信息
    //fields普通参数
    form.parse(req, (err, fields, files) => {
        // console.log(files);
        // res.end();
        if (files.pic.size > 0) {
            // console.log(fields);
            // res.end();
            //获取id
            const id = fields.id;
            //初始化需要入库的数据
            //商家名
            //执行图片修改
            const name = fields.name;
            //商家图片(图片路径)
            const pics = files.pic.path;
            const pic = pics.slice(8);
            //获取上传文件路径
            const filePath = files.pic.path
            // uploadsupload_332c147aab09e2620ebb579039e2e390.jpg
            //商家描述
            const content = fields.content;
            //商家配送费
            const fee = fields.fee;
            //执行阿里oss上传
            co(function* () {

                client.useBucket(ali_oss.bucket);
                //pic 上传文件名字    filePath 上传文件路径
                var result = yield client.put(pic, filePath);
                //上传之后删除本地文件         
                fs.unlinkSync(filePath);
                //   res.setHeader('content-type','text/html;charset=utf-8');
                res.end(JSON.stringify({
                    status: '100',
                    msg: '上传成功'
                }));

            }).catch(function (err) {
                //   res.setHeader('content-type','text/html;charset=utf-8');
                res.end(JSON.stringify({
                    status: '101',
                    msg: '上传失败',
                    error: JSON.stringify(err)
                }));

            });
            // console.log(name,pic,content,fee);return;
            // res.end();
            //准备sql语句
            let sql = "update shoplists set name='" + name + "',pic='" + pic + "',content='" + content + "',fee='" + fee + "' where id=" + id;
            // //执行sql
            connection.query(sql, (error, results, fields) => {
                if (error) {
                    throw error;
                }
                // console.log(results);
                if (results.affectedRows > 0) {
                    res.redirect("/adminshop");
                    res.end();

                }
            })

        } else {
            const id = fields.id;
            //不去修改图片
            const name1 = fields.name;
            //商家描述
            const content1 = fields.content;
            //商家配送费
            const fee1 = fields.fee;
            //准备sql语句
            let sql = "update shoplists set name='" + name1 + "',content='" + content1 + "',fee='" + fee1 + "' where id=" + id;
            // //执行sql
            connection.query(sql, (error, results, fields) => {
                if (error) {
                    throw error;
                }
                // console.log(results);
                if (results.affectedRows > 0) {
                    res.redirect("/adminshop");
                    res.end();

                }
            })
        }
    })
})

//商家食品的添加模板
app.get("/adminfoodsadd", checklogin, (req, res) => {
    //获取商家的数据
    let sql = "select * from shoplists"
    connection.query(sql, (error, results, fields) => {
        //加载入驻商家添加的模板
        res.render("Admingoods/admingoodsadd", {
            data: results,
            loginnames: req.session.usernames
        })
    })

})

//商家食品执行添加
app.post("/admingoodsdoadd", checklogin, (req, res) => {
    //实例化formidable
    let form = new formidable.IncomingForm();
    //规定上传文件路径
    form.uploadDir = "./uploads"
    //加上传文件后缀
    form.keepExtensions = true
    //files 文件上传成功后的文件信息
    //fields普通参数
    form.parse(req, (err, fields, files) => {
        /*  console.log(files);
         console.log(fields)
         res.end(); */
        //初始化需要入库的数据
        //食品名称
        const foodname = fields.foodname;
        // uploads upload_666024f106acec3fd3405087ab843a4d.jpg  截取掉uploads
        //食品描述
        const descr = fields.descr;
        //食品单价
        const price = fields.price;
        let shoplist_id = fields.shoplist_id;
        // console.log(foodname,descr,price,shoplist_id);return;
        //食品图片(图片的路径)
        const pics = files.foodpic.path;
        const pic = pics.slice(8);
        //获取上传文件路径
        const filePath = files.foodpic.path;
        //执行阿里oss上传
        co(function* () {

            client.useBucket(ali_oss.bucket);
            //pic 上传文件名字    filePath 上传文件路径
            var result = yield client.put(pic, filePath);
            //上传之后删除本地文件         
            fs.unlinkSync(filePath);
            //   res.setHeader('content-type','text/html;charset=utf-8');
            res.end(JSON.stringify({ status: '100', msg: '上传成功' }));

        }).catch(function (err) {
            //   res.setHeader('content-type','text/html;charset=utf-8');
            res.end(JSON.stringify({ status: '101', msg: '上传失败', error: JSON.stringify(err) }));

        });
        // console.log(name,pic,content,fee);return;
        // res.end()
        //准备sql语句
        let sql = "insert into goods (foodname,foodpic,descr,price,shoplist_id)values('" + foodname + "','" + pic + "','" + descr + "','" + price + "','" + shoplist_id + "')"
        //执行sql语句
        connection.query(sql, (error, results, fields) => {
            if (error) {
                throw error;
            }
            // console.log(results);
            if (results.affectedRows > 0) {
                res.redirect("/adminfoods");
                // res.end("ok");

            }
        })
    })
})

//商家食品的列表
app.get("/adminfoods", checklogin, (req, res) => {
    //准备sql语句
    let sql = "select goods.id as gid,goods.foodname,shoplists.name as sname,goods.foodpic,goods.descr,goods.price from goods,shoplists where goods.shoplist_id=shoplists.id";
    //获取商家的数据
    //执行sql
    connection.query(sql, (error, results, fields) => {
        res.render("Admingoods/admingoods", {
            data: results,
            loginnames: req.session.usernames
        })
    })
})

//执行删除
//删除路由
app.get("/admingoodsdel", checklogin, (req, res) => {
    // res.write("this is delete");
    //获取需要删除数据的id
    let id = req.query.id;
    //sql
    let sql = "delete from goods where id=" + id;
    connection.query(sql, (error, results, fields) => {
        if (error) {
            throw error;
        }
        // console.log(results);
        if (results.affectedRows > 0) {
            res.redirect("/adminfoods");
            res.end();

        }
    })
})
// 加载商家食品修改的模板
app.get("/adminfoodslistedit", checklogin, (req, res) => {
    // 获取id
    let shopls = "select * from shoplists";
    connection.query(shopls, (error, results, fields) => {
        if (error) {
            throw error;
        }
        let shoplist = results;
        let id = req.query.id;
        // console.log(id)
        let sql = "select * from goods where id = " + id;
        // 执行sql
        connection.query(sql, (error, results, fields) => {
            if (error) {
                throw error;
            }

            let good = results[0];
            let shopid = "select name as sname from shoplists where id=" + good.shoplist_id;
            connection.query(shopid, (error, results, fields) => {
                if (error) {
                    throw error;
                }
                res.render("Admingoods/admingoodslistedit", {
                    data: good,
                    sname: results[0],
                    shoplist: shoplist,
                    loginname: req.session.usernames
                });
            })

        })
    })
})
// 执行商家食品修改
app.post("/admingoodslistdoedit", checklogin, (req, res) => {
    //实例化formidable
    let form = new formidable.IncomingForm();
    //规定上传文件路径
    form.uploadDir = "./uploads"
    //加上传文件后缀
    form.keepExtensions = true
    //files 文件上传成功后的文件信息
    //fields普通参数
    form.parse(req, (err, fields, files) => {
        if (files.foodpic.size > 0) {
            //初始化需要入口的数据
            //id
            const id = fields.id;
            // 商家食品名
            const foodname = fields.foodname;
            // 商家食品图片(图片路径)
            const pics = files.foodpic.path;
            const pic = pics.slice(8);
            // 商家食品描述
            const descr = fields.descr;
            //商家食品单价
            const price = fields.price;
            //所属商家名字
            const sname = fields.shoplist_id;

            // 获取上传文件路径
            const filePath = files.foodpic.path
            //执行阿里oss上传
            co(function* () {

                client.useBucket(ali_oss.bucket);
                //pic 上传文件名字    filePath 上传文件路径
                var result = yield client.put(pic, filePath);
                //上传之后删除本地文件         
                fs.unlinkSync(filePath);
                //   res.setHeader('content-type','text/html;charset=utf-8');
                res.end(JSON.stringify({
                    status: '100',
                    msg: '上传成功'
                }));

            }).catch(function (err) {
                //   res.setHeader('content-type','text/html;charset=utf-8');
                res.end(JSON.stringify({
                    status: '101',
                    msg: '上传失败',
                    error: JSON.stringify(err)
                }));

            });
            let sql = "update goods set foodname='" + foodname + "',foodpic='" + pic + "',descr='" + descr + "',price='" + price + "',shoplist_id='" + sname + "'where id =" + id
            connection.query(sql, (error, results, fields) => {
                if (error) {
                    throw error;
                }
                if (results.affectedRows > 0) {
                    res.redirect("/adminfoods");
                    res.end();
                }
            })

        } else {
            // 不修改图片时触发
            //id
            const id = fields.id;
            // 商家食品名
            const foodname = fields.foodname;
            // 商家食品图片(图片路径)
            // 商家食品描述
            const descr = fields.descr;
            //商家食品单价
            const price = fields.price;
            //所属商家名字
            const sname = fields.shoplist_id;

            let sql = "update goods set foodname='" + foodname + "',descr='" + descr + "',price='" + price + "',shoplist_id='" + sname + "'where id =" + id
            connection.query(sql, (error, results, fields) => {
                if (error) {
                    throw error;
                }
                if (results.affectedRows > 0) {
                    res.redirect("/adminfoods");
                    res.end();
                }
            })
        }

    })
})

//加载订单列表
app.get("/adminorders", checklogin, (req, res) => {
    //准备sql语句
    let sql = "select * from orders";
    connection.query(sql, (error, results, fields) => {
        if (error) {
            throw error;
        }
        //加载模板
        res.render("Adminorders/adminorders", {
            data: results,
            loginnames: req.session.usernames
        })
        res.end();
    })
})

//订单详情
app.get("/adminordersinfo", checklogin, (req, res) => {
    //获取订单的id
    let id = req.query.id;
    //准备sql语句
    let sql = "select * from orders_goods where orders_id=" + id;
    //执行sql
    connection.query(sql, (error, results, fields) => {
        if (error) {
            throw error;
        }
        //加载模板
        res.render("Adminorders/adminordersinfo", {
            data: results,
            loginnames: req.session.usernames
        })
        res.end();
    })
})
//执行退出
app.get("/logout", (req, res) => {
    //销毁session
    req.session.usernames = "";
    //跳转到登录页
    res.redirect("/login");
    res.end();
})
// 设置监听端口
app.listen(8004, () => {
    console.log("服务启动")
})