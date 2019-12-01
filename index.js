const cv = require('opencv4nodejs');
const fs = require('fs');
function text2Binary(string) {
  return string.split('').map(function (char) {
    return '00'.concat(char.charCodeAt(0).toString(2)).slice(-8);
  }).join('');
}

cv.imreadAsync('./example.jpg', (err, mat) => {
  if (err) throw err;
  const [matB, matG, matR] = mat.splitChannels();
  let myinput = "I don't know!";
  let myData = text2Binary(myinput); //'0101001010010101010100101001010010101';
  const totalData = myData.length;
  console.log(myData);
  console.log(totalData);
  const [r, g, b] = mat.atRaw(0, 0);
  console.log(r, g, b);
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
  // cv.imwrite('./reoutput.jpg', mat);
  const output = new cv.Mat([matB, matG, matR]);
  const [rNew, gNew, bNew] = output.atRaw(0, 0);
  console.log(rNew, gNew, bNew);
  if (fs.existsSync('./remake-2.png')) {
    fs.unlinkSync('./remake-2.png');
  }
  cv.imwriteAsync('./remake-2.png', output, (err) => {
    if (err) throw err;
    console.log('Finished');
  });
});
// console.log(matG);
// console.log(matR.getData());
// for (let data of matB.getDataAsArray()) {
//   for (let col of data) {
//     console.log(col);
//   }
// }
// console.log(matB.getDataAsArray());
