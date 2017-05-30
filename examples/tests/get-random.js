import expect from 'expect';
import {
  getRandom,
  ilOverwriteMath,
  ilResetAll
} from 'import-inject-loader?Math!../src/get-random';

describe('getRandom()', () => {
  it('should return 2 instead of random number', () => {
    const mockedMath = {
      random() {
        return 2;
      }
    };
    ilOverwriteMath(mockedMath);

    expect(getRandom()).toBe(2);
  });

  it('should never return 2', () => {
    expect(getRandom()).toNotBe(2);
  });

  afterEach(ilResetAll);
});
