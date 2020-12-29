import embed from '../src/embed';

describe('Sample Test', () => {
  it('the embed should have success embed', async () => {
    const result = await embed('sample/300.jpg', 'this-is-my-word');
    expect(result.type).toMatch('image/jpeg');
  });
});
