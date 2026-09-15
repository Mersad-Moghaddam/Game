import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..', process.argv[2] || '.');
const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.wav':'audio/wav'};
const port = Number(process.env.PORT || 4173);
http.createServer((req,res)=>{
  const raw = decodeURIComponent((req.url || '/').split('?')[0]);
  let file = path.join(root, raw === '/' ? 'index.html' : raw);
  if (!file.startsWith(root)) { res.writeHead(403); return res.end('Forbidden'); }
  fs.stat(file,(err,st)=>{
    if (!err && st.isDirectory()) file = path.join(file,'index.html');
    fs.readFile(file,(e,data)=>{
      if(e){ res.writeHead(404); return res.end('Not found'); }
      res.writeHead(200, {'Content-Type': types[path.extname(file)] || 'application/octet-stream','Cache-Control':'no-store'});
      res.end(data);
    });
  });
}).listen(port,()=>console.log(`VEIL//DRIVE running at http://localhost:${port}`));
