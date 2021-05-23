import request from 'supertest';
import fs from 'fs';
import app from '../../src';

describe('POST /api/embed', function () {
  it('Response correctly', function (done) {
    const bufferFile = fs.readFileSync('sample/300.jpg');
    request(app)
      .post('/api/embed')
      .field('message', 'my secret message')
      .attach('file', bufferFile, '300.jpg')
      .expect(200, done);
  });

  it('Response error when only file', function (done) {
    const bufferFile = fs.readFileSync('sample/300.jpg');
    request(app)
      .post('/api/embed')
      .attach('file', bufferFile, '300.jpg')
      .expect(400)
      .expect({ message: 'Message request is missing' }, done);
  });

  it('Response error when wrong file request', function (done) {
    const body = { file: { path: null } };
    request(app)
      .post('/api/embed')
      .field('file', JSON.stringify(body))
      .expect(400)
      .expect({ message: 'File request is missing' }, done);
  });

  it('Response error when empty', function (done) {
    request(app)
      .post('/api/embed')
      .expect(400)
      .expect({ message: 'File request is missing' }, done);
  });
});

describe('POST /api/extract', function () {
  it('Response correctly', function (done) {
    const bufferFile = fs.readFileSync('sample/cat_png.png');
    request(app)
      .post('/api/extract')
      .attach('file', bufferFile, 'cat_png.png')
      .expect(200, done);
  });

  it('Response error when empty', function (done) {
    request(app).post('/api/extract').expect(400, done);
  });
});

describe('GET /', function () {
  it('OK Response', function (done) {
    request(app).get('/').expect(200).expect(
      {
        message: 'Welcome to SIWB!',
      },
      done,
    );
  });
});

afterAll(() => {
  app.close();
});
