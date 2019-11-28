const cv = require('opencv4nodejs');
const mat = cv.imread('./example.jpg');
console.log(mat);
const [matB, matG, matR] = mat.splitChannels();
console.log(matG);
console.log(matR.getData());
console.log(matB.getDataAsArray());
