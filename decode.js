const cv = require('opencv4nodejs');
const fs = require('fs');
function decode(filePath) {
  return new Promise((resolve, reject) => {
    let extracted_bin = [];
    cv.imreadAsync(filePath, (err, mat) => {
      if (err) {
        reject(err);
        return;
      }
      const [matB, matG, matR] = mat.splitChannels();
      const [r, g, b] = mat.atRaw(0, 0);
      console.log(r, g, b);
      for (let x = 0; x < mat.rows; x++) {
        for (let y = 0; y < mat.cols; y++) {
          let blue = matB.at(x, y);
          let green = matG.at(x, y);
          let red = matR.at(x, y);
          extracted_bin.push(blue & 1);
          extracted_bin.push(green & 1);
          extracted_bin.push(red & 1);
        }
      }
      String.prototype.binaryToText = function () {
        return this
          .match(/.{1,8}/g)
          .join(' ')
          .split(' ')
          .reduce((a, c) => a += String.fromCharCode(parseInt(c, 2)), '');
      }
      let answer = extracted_bin.join('');
      let output = answer.binaryToText();
      resolve(output);
      //fs.writeFile('output.txt', output, (err) => {
      //  if (err) throw err;
      //  console.log('Finished Extracted to output.txt');
      //});
    });
  });
}
module.exports = decode;