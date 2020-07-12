import jimp from 'jimp';

declare global {
  interface String {
    binaryToText(): string;
  }
}

String.prototype.binaryToText = function (): string {
  let matchString = this.match(/.{1,8}/g);
  if (!matchString) {
    return '';
  }
  return matchString.join(' ')
    .split(' ')
    .reduce((a, c) => a += String.fromCharCode(parseInt(c, 2)), '');
}

function decode(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    let extracted_bin: number[] = [];
    jimp.read(filePath).then(image => {
      image.scan(0, 0, image.bitmap.width, image.bitmap.height, function (x, y, idx) {
        let red = this.bitmap.data[idx + 0];
        let green = this.bitmap.data[idx + 1];
        let blue = this.bitmap.data[idx + 2];
        extracted_bin.push(red & 1);
        extracted_bin.push(green & 1);
        extracted_bin.push(blue & 1);
      })
      let answer = extracted_bin.join('');
      let output = answer.binaryToText();
      resolve(output);
    }).catch(err => {
      reject(err);
    })
  });
}
export default decode;