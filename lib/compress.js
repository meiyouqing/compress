// 压缩js和css
// html中引用js和css添加版本 ?hash

var fs = require('fs');
var uglify = require("uglify-js");
var cleanCSS = require('clean-css');
var md5 = require('md5');
var hash = {};
var currentPath = process.cwd();

function minifier(fileIn, fileOut, type) {
    console.log('正在压缩' + fileIn.join(""))
    var origCode = '', finalCode = [];
    if (type == 'js') {
        if (fileIn.length > 0) {
            finalCode.push(uglify.minify(fileIn).code);
        }
    } else if (type == 'css') {
        for (var i = 0; i < fileIn.length; i++) {
            origCode = fs.readFileSync(fileIn[i], 'utf8');
            finalCode.push(new cleanCSS({keepSpecialComments: 0}).minify(origCode).styles);
        }
    }
    var output = finalCode.join("");
    hash[fileIn[0].replace(currentPath + '/', '')] = md5(output);
    fs.writeFileSync(fileOut, output, 'utf8');
    console.log("压缩成功\n");
}

function compress(path, cPath, file) {
    var match = file.match(/^(.+)[.](js|css)$/);
    if (match && !/\.min$/.test(match[1])) {
        minifier([cPath], path +'/' + match[1] + '.min.' + match[2], match[2]);
    }
}

function searchFolder(path, callback) {
    var files = fs.readdirSync(path);
    files.forEach(function(file) {
        if (file === 'node_modules' || file === '.git' || path == currentPath && file == 'compress.js') {
            return ;
        }
        var cPath = path + '/' + file;
        if (fs.statSync(cPath).isDirectory()) {
            searchFolder(cPath, callback);
        } else {
            callback(path, cPath, file);
        }
    });
}


//TODO 处理include 命令
var updateHtml = function(path, cPath, file) {
    if (file.match(/^.+[.]template[.]html$/)) {
        console.log("正在更新" + cPath);
        var dPath = path.replace(currentPath,'');
        dPath = dPath.replace(/^\//,'');
        var html = fs.readFileSync(cPath, 'utf8');
        html = html.replace(/(href|src)=\"([^\"]+)[.](js|css)\"/g, function($0, $1, $2, $3) {
        	if (/^(?:https?:)?\/\/|\.min$/.test($2)) {
        		return $0;
        	}
            return $1 + '="' + $2 + '.min.' + $3 + '?' + hash[dPath+'/'+$2 + '.' + $3] + '"';
        });


        html = html.replace(/<\!--include\ssrc=\"([^\"]+)\"-->/g, function($0, $1) {
            var includeContent = '';
            try {
                includeContent = fs.readFileSync(path + '/' + $1);
            } catch(e) {
                includeContent = '';
            }
            return includeContent;
        });

        fs.writeFileSync(cPath.replace('template.html', 'html'), html, 'utf8');
        console.log("更新成功\n");
    }
}



searchFolder(currentPath, compress);
searchFolder(currentPath, updateHtml);

