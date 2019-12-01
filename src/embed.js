const cv = require('opencv4nodejs');
const fs = require('fs');
function text2Binary(string) {
  return string.split('').map(function (char) {
    return '00'.concat(char.charCodeAt(0).toString(2)).slice(-8);
  }).join('');
}

function embed(filename, mytext) {
  return new Promise((resolve, reject) => {
    cv.imreadAsync(filename, (err, mat) => {
      if (err) throw err;
      const [matB, matG, matR] = mat.splitChannels();
      let myData = text2Binary(mytext);
      const totalData = myData.length;
      let i = 0;
      for (let x = 0; x < mat.rows; x++) {
        for (let y = 0; y < mat.cols; y++) {
          let blue = matB.at(x, y);
          let green = matG.at(x, y);
          let red = matR.at(x, y);
          if (i < totalData) {
            matB.set(x, y, blue & ~1 | parseInt(myData[i]));
            i += 1;
          }
          if (i < totalData) {
            matG.set(x, y, green & ~1 | parseInt(myData[i]));
            i += 1;
          }
          if (i < totalData) {
            matR.set(x, y, red & ~1 | parseInt(myData[i]));
            i += 1;
          }
        }
      }
      const output = new cv.Mat([matB, matG, matR]);
      let currentDate = Date.now();
      let outputFile = `./remake-${currentDate}.png`;
      cv.imwriteAsync(outputFile, output, (err) => {
        if (err) {
          reject(err);
          return;
        }
        fs.readFile(outputFile, (errRead, data) => {
          if (errRead) {
            reject(errRead);
            return;
          }
          resolve(data);
          console.log('Finished');
        });
      });
    });
  });
}

module.exports = embed;

/*
embed('./example.jpg', 'Hi, Lita! How are you today? I hope you fine. I want to tell you something, but I little affraid to tell it. I want to tell in another message. Have a nice day, Lita!').then((data) => {
  console.log(data);
}).catch(err => {
  console.log(err);
});*/