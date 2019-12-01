const restify = require('restify');
const embedFunction = require('./embed');
const decodeFunction = require('./decode');

function embed(req, res, next) {
  let file = req.files['file'];
  let message = req.params['message'];
  let filePath = file.path;
  embedFunction(filePath, message).then((data) => {
    res.contentLength = Buffer.byteLength(data);
    res.contentType = 'image/png';
    res.send(data);
    next();
  }).catch(err => {
    res.send(err);
    next();
  });
}

function extract(req, res, next) {
  let file = req.files['file'];
  let filePath = file.path;
  decodeFunction(filePath).then((data) => {
    res.contentLength = Buffer.byteLength(data);
    res.contentType = 'text/plain';
    res.send(data);
  }).catch((err) => {
    res.send(err);
    next();
  });
}

const server = restify.createServer({
  strictFormatters: false
});
server.use(restify.plugins.bodyParser());
server.post('/api/embed', embed);
server.post('/api/extract', extract);

server.listen(8888, () => {
  console.log('%s listening at %s', server.name, server.url);
});