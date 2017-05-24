# Description

import-inject-loader is a webpack loader allowing you to replace imported dependencies by custom implementations during buildtime.
This can make testing classes easier by mocking used libraries with predefined results.

# Usage
## Defining overwrites
To use the import-inject-loader, simply add the loader to your import and specify the names of imported objects you'd like to replace in a comma separated list:

```js
const { CompOne, ilOverwriteDefaultAdd, ilDefaultMultiply } = require('../import-inject-loader?defaultAdd,defaultMultiply!../src/component-one');
const { CompTwo, ilOverwriteFetch } = require('../import-inject-loader?fetch!../src/component-two');
```

The methods to overwrite the implementation will be called `ilOverwrite{NAME}`.
You can simply call these functions and pass the new implementation with the same type like the old implementation.

```js
ilOverwriteDefaultAdd(function(a, b) {
    return a + b;
});

ilOverwriteFetch((url) => {
  return new Promise((resolve, reject) => {
    resolve({
      ok: true,
      json: async () => [{ name: 'Mocked Foo Bar' }]
    })
  });
});
```
## Resetting overwrites

To reset the overwritten implementation and use the default one again, simply call resetAllInjects(). This will reset all overwrites for this file.
If the import-inject-loader is used in multiple imports in one file, you'll need to define them with separate names as show in the example:

```js
const { Add, ilOverwriteDefaultAdd, resetAllInjects: resetAllInAdd } = require('../import-inject-loader?defaultAdd!../src/component-one');
const { FetchUser, ilOverwriteFetch, resetAllInjects: resetAllInFetchUser } = require('../import-inject-loader?fetch!../src/component-two');
```

## Example

For more information, have a look into [Frontend Unit Tests Example](https://github.com/Mercateo/frontend-unit-tests-examples) to see how we use it there.
