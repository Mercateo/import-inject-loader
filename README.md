# Description

import-inject-loader is a webpack loader allowing you to replace imported dependencies by custom implementations during buildtime.
This can make testing classes easier by mocking used libraries with predefined results.

# Usage
## Defining overwrites
To use the import-inject-loader, simply add the loader to your import and specify the names of imported objects you'd like to replace in a comma separated list:

```js
const { CompOne, ilOverwriteDefaultAdd, ilOverwriteDefaultMultiply } = require('../import-inject-loader?defaultAdd,defaultMultiply!../src/component-one');
```

The methods to overwrite the implementation will be called `ilOverwrite{NAME}`.
Note that we currently use the prefix `il` to avoid possible naming conflicts with existing variables called `Overwrite{NAME}`.

You can simply call these functions and pass the new implementation with the same type as used in the old implementation.

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

To reset the overwritten implementation and use the default one again, simply call `ilResetAll()`. This will reset all overwrites for this file.
If the import-inject-loader is used in multiple imports in one file, you'll need to define them with separate names as shown in the example:

```js
const { CompOne, ilOverwriteDefaultAdd, ilResetAll: resetAllInAdd } = require('../import-inject-loader?defaultAdd!../src/component-one');
const { CompTwo, ilOverwriteFetch, ilResetAll: resetAllInFetchUser } = require('../import-inject-loader?fetch!../src/component-two');

...

resetAllInFetchUser();
resetAllInAdd();
```

## Example

For more information, have a look into [Frontend Unit Tests Example](https://github.com/Mercateo/frontend-unit-tests-examples) to see how we use it there.
