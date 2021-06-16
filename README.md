This project is unmantained, deprecated and goes to archive with followup removal in 2 years.

[![Build Status](https://travis-ci.org/Mercateo/import-inject-loader.svg?branch=master)](https://travis-ci.org/Mercateo/import-inject-loader)

> Overwrite your dependencies with mocks and custom implementations.

# Description

`import-inject-loader` is a webpack loader which allows you to replace imported dependencies and global variables by custom implementations. At build time new exported functions are added to your module which makes it possible to change implementations at run time (e.g. within tests).

# Usage

Imagine we have this module and want to mock `fetch` in our unit test:

```js
export const getUsers = async () => {
  const response = await fetch('https://jsonplaceholder.typicode.com/users');
  return response.json();
};
```

We can do it like this:

```js
import expect from 'expect';
import {
  getUsers,
  ilOverwriteFetch,
  ilResetAll
} from 'import-inject-loader?fetch!../src/get-users';

define('Test getUsers()', () => {
  it('should return users', async () => {
    // mock `fetch`
    ilOverwriteFetch((url) => ({
      json: [
        { name: 'John Doe' }
      ]
    }));

    // test `getUsers`
    const users = await getUsers();
    expect(users).toEqual([
      { name: 'John Doe' }
    ]);
  });

  afterEach(ilResetAll);
});
```

# Explanation

The `getUsers` function is hard to test, because it requires a network request. With `import-inject-loader` we can mock `fetch` to get rid of the network request.

To do so we simply import our module with the `import-inject-loader` and specify the names of imported or global variables we'd like to replace in a comma separated list:

```js
import {
  getUsers,
  ilOverwriteFetch,
  ilResetAll
} from 'import-inject-loader?fetch!../src/get-users';
```

You can see that two new functions are exported from `../src/get-users`: `ilOverwriteFetch` and `ilResetAll`.

`ilOverwriteFetch` is exported, because we passed `?fetch` to the `import-inject-loader`. If we would pass `?fetch,Math,localStorage` the function `ilOverwriteFetch`, `ilOverwriteMath` and `ilOverwriteLocalStorage` would be exported (assuming all three variables are actually used in the file). If you pass `?fatch` - which is a typo - an error is thrown, because no `fatch` is used inside `../src/get-users`. The `ilOverwrite{Name}` functions allow you to swap out imported or global variables with own implementations.

The `ilResetAll` is _always_ exported. It is a handy way to reset your custom implementations with the original implementation after your test is done.

Note that you only change the implementation of `fetch` _within_ this one module. Other modules aren't affect and the global `fetch` on `window` isn't changed.

The `import-inject-loader` _basically_ rewrites your module to something like this (not exactly, but you get the point):

```js
let fetch = window.fetch;

export const ilOverwriteFetch = (newFetch) => fetch = newFetch;
export const ilResetAll = () => fetch = window.fetch;

export const getUsers = async () => {
  const response = await fetch('https://jsonplaceholder.typicode.com/users');
  return response.json();
};
```

As explained this functionallity is not limited to global variables. You can also mock imported variables. Say you have another module which uses our `getUsers` like this:

```js
import { getUsers } from './get-users';

export countUsers = async () => {
  const users = await getUsers();
  return users.length;
};
```

We can test `countUsers` like this:

```js
import {
  countUsers,
  ilOverwriteGetUsers,
  ilResetAll
} from 'import-inject-loader?getUsers!../src/count-users';

define('Test countUsers()', () => {
  it('should return users', async () => {
    // mock `getUsers`
    ilOverwriteGetUsers(() => [
      { name: 'John Doe' }
    ]);

    // test `countUsers`
    const count = await countUsers();
    expect(users).toBe(1);
  });

  afterEach(ilResetAll);
});
```

# Examples

You can check out a standalone example with all source and test files in our [`examples/` directory](./examples).

Another example which uses React, TypeScript and JSX can be found [here](https://github.com/Mercateo/frontend-unit-tests-examples).
