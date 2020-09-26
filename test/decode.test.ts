import embed from '../src/embed';
import decode from '../src/decode';
import fs from 'fs';

describe('Sample Test', () => {
  it('the decode should be successfully', async () => {
    var result = await embed('sample/300.jpg', 'this-is-my-word');
    expect(result.type).toMatch("image/jpeg");
    fs.writeFileSync('output.jpg', result.data);
    var newResult = await decode('output.jpg');
    expect(newResult).toContain('this-is-my-word');
  })
})
