import expect from 'expect';
import {
  getHelloWorld,
  getHelloWorldDefault,
  ilOverwriteHELLO_WORLD,
  ilOverwriteHELLO_WORLD_DEFAULT,
  ilResetAll
} from 'import-inject-loader?HELLO_WORLD,HELLO_WORLD_DEFAULT!../src/get-hello-world';

describe('getHelloWorld()', () => {
  it('should return "Hello world!"', () => {
    expect(getHelloWorld()).toBe('Hello world!');
    expect(getHelloWorldDefault()).toBe('Hello world!');
  });

  it('should return "Mocked world!"', () => {
    ilOverwriteHELLO_WORLD('Mocked world!');
    expect(getHelloWorld()).toBe('Mocked world!');

    ilOverwriteHELLO_WORLD_DEFAULT('Mocked world!');
    expect(getHelloWorldDefault()).toBe('Mocked world!');
  });

  afterEach(ilResetAll);
});
