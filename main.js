
const fs = require('fs')
const url = require('url')

let rawdata = fs.readFileSync("config.json")
let config = JSON.parse(rawdata)



const Forward = require('./forward.js')
const forward = new Forward(config.pubCfg, config.subCfg, config.unitsDict)
forward.start();

const http = require('http')
const requestListener = function (req, res) {

    var pathname = ""
    if (req.url == '/')
        pathname = __dirname + "/admin.html"
    else
        pathname = __dirname + url.parse(req.url).pathname

    if ((pathname.endsWith('.html') || pathname.endsWith('.htm')) && fs.existsSync(pathname)) {
        var data = fs.readFileSync(pathname, 'utf-8')
            
        res.write(data)
            
        
    }

    else {
        if (req.method == "GET" && req.url == "/status") {
            res.write(JSON.stringify(forward.status()));
        }
        else if(req.method == "GET" && req.url == "/sub_last") {
            res.write(JSON.stringify(forward.sub_last()))
        }
        else if(req.method == "GET" && req.url == "/pub_last") {
            res.write(JSON.stringify(forward.pub_last()))
        }

        else {
            res.writeHead(404);
            
        }
    }
    res.end();

}
const server = http.createServer(requestListener)
server.listen(config.http.port, config.http.host)

console.log("running...")

