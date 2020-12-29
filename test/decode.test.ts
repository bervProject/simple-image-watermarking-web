import embed from '../src/embed';
import decode from '../src/decode';
import fs from 'fs';

describe('Sample Test', () => {
  it('the decode should be successfully', async () => {
    const result = await embed('sample/cat_png.png', 'this-is-my-word');
    expect(result.type).toMatch('image/png');
    fs.writeFileSync('output.png', result.data);
    const newResult = await decode('output.png');
    expect(newResult).toContain('this-is-my-word');
  });
});
