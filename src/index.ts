import express from 'express';
import { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import multer from 'multer';
import responseTime from 'response-time';
import morgan from 'morgan';
import helmet from 'helmet';

import rateLimit from './middleware/rate-limit';

import embedFunction, { EmbedData } from './embed';
import decodeFunction from './decode';

const port = process.env.PORT || 8888;

function embed(req: Request, res: Response, next: NextFunction) {
  const file = req.file;
  const message = req.body.message;
  if (!file) {
    res.sendStatus(400);
    return;
  }
  const filePath = file.path;
  if (!filePath) {
    res.sendStatus(400);
    return next();
  }
  if (!message) {
    res.sendStatus(400);
    return next();
  }

  embedFunction(filePath, message)
    .then((data: EmbedData) => {
      res.contentType(data.type);
      res.send(data.data);
      return next();
    })
    .catch((err: Error) => {
      res.send(err);
      return next(err);
    });
}

function extract(req: Request, res: Response, next: NextFunction) {
  const file = req.file;
  if (!file) {
    res.sendStatus(400);
    return;
  }
  const filePath = file.path;
  if (!filePath) {
    res.sendStatus(400);
    return next();
  }
  decodeFunction(filePath)
    .then((data: string) => {
      res.contentType('text/plain');
      res.send(data);
      return next();
    })
    .catch((err: Error) => {
      res.send(err);
      return next(err);
    });
}

const corsOptions = {
  origin: 'https://siwb-ui.onrender.com',
};

const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 8000000,
  },
});

const server = express();
server.use(helmet());
server.use(cors(corsOptions));
server.use(rateLimit);
server.use(bodyParser.urlencoded({ extended: true }));
server.use(responseTime());
server.use(morgan('combined'));
server.post('/api/embed', upload.single('file'), embed);
server.post('/api/extract', upload.single('file'), extract);

const appServer = server.listen(port, () => {
  console.log('%s listening at %s', server.name, port);
});

export default appServer;
