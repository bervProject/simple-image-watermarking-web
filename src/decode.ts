import jimp from 'jimp';

declare global {
  interface String {
    binaryToText(): string;
  }
}

String.prototype.binaryToText = function (): string {
  const matchString = this.match(/.{1,8}/g);
  if (!matchString) {
    return '';
  }
  return matchString
    .join(' ')
    .split(' ')
    .reduce((a, c) => (a += String.fromCharCode(parseInt(c, 2))), '');
};

function decode(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const extractedBin: number[] = [];
    jimp
      .read(filePath)
      .then((image) => {
        image.scan(
          0,
          0,
          image.bitmap.width,
          image.bitmap.height,
          function (x, y, idx) {
            const red = this.bitmap.data[idx + 0];
            const green = this.bitmap.data[idx + 1];
            const blue = this.bitmap.data[idx + 2];
            extractedBin.push(red & 1);
            extractedBin.push(green & 1);
            extractedBin.push(blue & 1);
          },
        );
        const answer = extractedBin.join('');
        const output = answer.binaryToText();
        resolve(output);
      })
      .catch((err) => {
        reject(err);
      });
  });
}
export default decode;
