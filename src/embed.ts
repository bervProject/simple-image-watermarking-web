import jimp from 'jimp';

function text2Binary(text: string): string {
  return text.split('').map(function (char) {
    return '00'.concat(char.charCodeAt(0).toString(2)).slice(-8);
  }).join('');
}

function embed(filename: string, mytext: string): Promise<any> {
  return new Promise((resolve, reject) => {
    jimp.read(filename).then((image) => {
      let myData = text2Binary(mytext);
      const totalData = myData.length;
      let i = 0;
      //const origImage = image.clone();
      image.scan(0, 0, image.bitmap.width, image.bitmap.height, function (x, y, idx) {
        let red = this.bitmap.data[idx + 0];
        let green = this.bitmap.data[idx + 1];
        let blue = this.bitmap.data[idx + 2];

        if (i < totalData) {
          let result = red & ~1 | parseInt(myData[i]);
          this.bitmap.data[idx + 0] = result;
          i += 1;
        }
        if (i < totalData) {
          let result = green & ~1 | parseInt(myData[i]);
          this.bitmap.data[idx + 1] = result;
          i += 1;
        }
        if (i < totalData) {
          let result = blue & ~1 | parseInt(myData[i]);
          this.bitmap.data[idx + 2] = result;
          i += 1;
        }
        if (x == image.bitmap.width - 1 && y == image.bitmap.height - 1) {
          // image scan finished, do your stuff
          this.getBufferAsync(image.getMIME()).then(data => {
            resolve({
              data,
              type: image.getMIME()
            });
          }).catch(err => {
            reject(err);
          });
        }
      });
    }).catch((err: Error) => {
      reject(err);
    });
  });
}

export default embed;

/*
embed('./example.jpg', 'Hi, Lita! How are you today? I hope you fine. I want to tell you something, but I little affraid to tell it. I want to tell in another message. Have a nice day, Lita!').then((data) => {
  console.log(data);
}).catch(err => {
  console.log(err);
});*/