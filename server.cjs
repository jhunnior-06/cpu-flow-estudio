// Servidor local opcional; Vercel publica el sitio estático directamente.
const http = require('node:http');
const path = require('node:path');
const fs = require('node:fs');
const mime = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml'};
const port = Number(process.env.PORT || 3000);
http.createServer((req,res)=>{
 const raw = decodeURIComponent((req.url||'/').split('?')[0]);
 const file = path.resolve(__dirname,'.'+(raw==='/'?'/index.html':raw));
 if(!file.startsWith(__dirname+path.sep)){res.writeHead(403);res.end('No permitido');return;}
 fs.readFile(file,(err,bytes)=>{if(err){res.writeHead(404);res.end('No encontrado');return;}res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});res.end(bytes);});
}).listen(port,()=>console.log('CPU Flow Estudio: http://localhost:'+port));