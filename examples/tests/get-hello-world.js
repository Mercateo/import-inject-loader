import expect from 'expect';
import {
  getHelloWorld,
  ilOverwriteHELLO_WORLD,
  ilResetAll
} from 'import-inject-loader?HELLO_WORLD!../src/get-hello-world';

describe('getHelloWorld()', () => {
  it('should return "Hello world!"', () => {
    expect(getHelloWorld()).toBe('Hello world!');
  });

  it('should return "Mocked world!"', () => {
    ilOverwriteHELLO_WORLD('Mocked world!');
    expect(getHelloWorld()).toBe('Mocked world!');
  });

  afterEach(ilResetAll);
});
