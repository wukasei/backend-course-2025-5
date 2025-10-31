const {Command} = require("commander");
const fs = require("fs").promises;
const files = require("fs");
const http = require("http");
const url = require("url");
const superagent = require("superagent");

const program = new Command;

program
    .requiredOption('-h, --host <host>','server host')
    .requiredOption('-p, --port <port>', 'server port')
    .requiredOption('-c, --cache <cache>', 'server cache');

program.parse(process.argv);

const options = program.opts();

if (!files.existsSync(options.cache)) {
    files.mkdirSync(options.cache, { recursive: true });
    console.log(`Directory ${options.cache} created`);
}

async function cats_request(req, res) {
    try{

        if (req.url === "/") {
            res.writeHead(200, {'Content-Type': 'text/plain'});
            res.end("Input code HTTP in URL");
            return;
        }
        const code = req.url.slice(1);
        const method = req.method;
        const filePath = `${options.cache}/${code}.jpg`;
        
        if(method === "GET"){  
            try{
                const data = await fs.readFile(filePath);
                res.writeHead(200, {'content-type': 'image/jpeg'});
                res.end(data);
            }
            catch(err){
                if(err.code === "ENOENT"){
                    try{
                        const response = await superagent
                            .get(`https://http.cat/${code}`)
                            .buffer(true)

                        const buffer = response.body;
                        await fs.writeFile(filePath, buffer);
                        
                        res.writeHead(200, {'content-type': 'image/jpeg'});
                        res.end(buffer);
                    }
                    catch(err){
                        res.writeHead(404);
                        res.end("file not found");
                    }
                }
                else{
                    res.writeHead(500);
                    res.end("server error");
                }
            }
        }
        else if(method === "PUT"){
            let request_picture = [];
            req.on("data", chunk =>{
                request_picture.push(chunk);
            });
            req.on("end", async () => {
                try{
                    const buffer = Buffer.concat(request_picture);
                    await fs.writeFile(filePath, buffer);
                    res.writeHead(201);
                    res.end("file saved");
                }
                catch{
                    res.writeHead(500);
                    res.end("server error");
                }
            });
        }
        else if(method === "DELETE"){
            try{
                await fs.unlink(filePath);
                res.writeHead(200);
                res.end("file deleted");
            }
            catch(err){
                if(err.code === "ENOENT"){
                    res.writeHead(404);
                    res.end("file not found");
                }
                else{
                    res.writeHead(500);
                    res.end("server error");
                }
            }
        }
        else{
            res.writeHead(405);
            res.end("Method not allowed");
        }

    }
    catch{

    }
}

const server = http.createServer((req, res) =>{
    cats_request(req, res)
})

server.listen(Number(options.port), options.host, () => {
    console.log(`Server running at http://${options.host}:${options.port}/`);
});