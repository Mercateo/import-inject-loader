module.exports =
/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// identity function for calling harmony imports with the correct context
/******/ 	__webpack_require__.i = function(value) { return value; };
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, {
/******/ 				configurable: false,
/******/ 				enumerable: true,
/******/ 				get: getter
/******/ 			});
/******/ 		}
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 6);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


const loaderUtils = __webpack_require__(5);
const babylon = __webpack_require__(4);
const babel = __webpack_require__(2);
const traverse = __webpack_require__(3);

const loaderPrefix = 'il';

module.exports = function (contentStr, sourceMap) {
  const options = loaderUtils.parseQuery(this.query);
  if (!options) {
    throw new Error('No options specified! Use "import-inject-loader?fieldA,fieldB!../file"');
  }

  // parse AST
  const ast = babylon.parse(contentStr, {
    sourceType: 'module',
    plugins: ['jsx']
  });

  // replace imports by custom import which can be overwritten
  const imports = Object.keys(options);
  imports.forEach(key => replaceKeyByInject(key, ast));

  // export method to reset all overwritten imports
  addResetFunction(ast, imports);

  // return converted AST
  return '// BEGIN-import-inject-loader\n' + babel.transformFromAst(ast).code + '\n// END-import-inject-loader';
};

function replaceKeyByInject(key, ast) {
  if (!fileUsesIdentifier(ast, key)) {
    throw new Error(`Identifier "${key}" is not used.`);
  }

  const {
    overwriteMethodName,
    usedName,
    defaultName
  } = getVariableNames(key);

  addOverwriteDeclarationField(ast, key, usedName);
  addDefaultDeclarationField(ast, key, defaultName);
  replaceImportUsages(ast, key, usedName);
  addExportedOverwriteMethod(ast, overwriteMethodName, usedName);

  return ast;
}

function getVariableNames(key) {
  return {
    overwriteMethodName: loaderPrefix + 'Overwrite' + capitalizeFirstLetter(key),
    usedName: loaderPrefix + capitalizeFirstLetter(key),
    defaultName: loaderPrefix + 'Default' + capitalizeFirstLetter(key)
  };
}

function addResetFunction(ast, imports) {
  const expressionStatements = imports.map(importName => {
    const { defaultName, usedName } = getVariableNames(importName);

    return {
      type: 'ExpressionStatement',
      expression: {
        type: 'AssignmentExpression',
        operator: '=',
        left: {
          type: 'Identifier',
          name: usedName
        },
        right: {
          type: 'Identifier',
          name: defaultName
        }
      }
    };
  });

  ast.program.body.push({
    type: 'ExportNamedDeclaration',
    specifiers: [],
    source: null,
    declaration: {
      type: 'FunctionDeclaration',
      id: {
        type: 'Identifier',
        name: loaderPrefix + 'ResetAll'
      },
      generator: false,
      expression: false,
      async: false,
      params: [],
      body: {
        type: 'BlockStatement',
        body: expressionStatements,
        directives: []
      }
    },
    exportKind: 'value'
  });
}

function fileUsesIdentifier(ast, key) {
  let foundIdentifier = false;

  traverse.default(ast, {
    enter(path) {
      if (path.node.type === 'Identifier' && path.node.name === key) {
        foundIdentifier = true;
      }
    }
  });

  return foundIdentifier;
}

function replaceImportUsages(ast, key, overwrittenName) {
  traverse.default(ast, {
    enter(path) {
      if (path.node.type === 'Identifier' && path.node.name === key && path.parent.type !== 'ImportSpecifier') {
        path.node.name = overwrittenName;
      }
    }
  });
}

function addExportedOverwriteMethod(ast, overwriteMethodName, usedName) {
  ast.program.body.push({
    type: 'ExportNamedDeclaration',
    specifiers: [],
    source: null,
    declaration: {
      type: 'FunctionDeclaration',
      id: {
        type: 'Identifier',
        name: overwriteMethodName
      },
      generator: false,
      expression: false,
      async: false,
      params: [{
        type: 'Identifier',
        name: 'paramOverwrite'
      }],
      body: {
        type: 'BlockStatement',
        body: [{
          type: 'ExpressionStatement',
          expression: {
            type: 'AssignmentExpression',
            operator: '=',
            left: {
              type: 'Identifier',
              name: usedName
            },
            right: {
              type: 'Identifier',
              name: 'paramOverwrite'
            }
          }
        }]
      }
    },
    exportKind: 'value'
  });
}

function addOverwriteDeclarationField(ast, key, overwrittenName) {
  addVariable(ast, overwrittenName, key);
}

function addDefaultDeclarationField(ast, key, defaultName) {
  addVariable(ast, defaultName, key);
}

function addVariable(ast, name, value) {
  ast.program.body.unshift({
    type: 'VariableDeclaration',
    declarations: [{
      type: 'VariableDeclarator',
      id: {
        type: 'Identifier',
        name: name
      },
      init: {
        type: 'Identifier',
        name: value
      }
    }],
    kind: 'var'
  });
}

function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

/***/ }),
/* 1 */
/***/ (function(module, exports) {

module.exports = require("source-map-support/register");

/***/ }),
/* 2 */
/***/ (function(module, exports) {

module.exports = require("babel-core");

/***/ }),
/* 3 */
/***/ (function(module, exports) {

module.exports = require("babel-traverse");

/***/ }),
/* 4 */
/***/ (function(module, exports) {

module.exports = require("babylon");

/***/ }),
/* 5 */
/***/ (function(module, exports) {

module.exports = require("loader-utils");

/***/ }),
/* 6 */
/***/ (function(module, exports, __webpack_require__) {

__webpack_require__(1);
module.exports = __webpack_require__(0);


/***/ })
/******/ ]);
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly8vd2VicGFjay9ib290c3RyYXAgZGI4ZDkyMzQ3MmViNzgyYjRlYzgiLCJ3ZWJwYWNrOi8vLy4vc3JjL2luZGV4LmpzIiwid2VicGFjazovLy9leHRlcm5hbCBcInNvdXJjZS1tYXAtc3VwcG9ydC9yZWdpc3RlclwiIiwid2VicGFjazovLy9leHRlcm5hbCBcImJhYmVsLWNvcmVcIiIsIndlYnBhY2s6Ly8vZXh0ZXJuYWwgXCJiYWJlbC10cmF2ZXJzZVwiIiwid2VicGFjazovLy9leHRlcm5hbCBcImJhYnlsb25cIiIsIndlYnBhY2s6Ly8vZXh0ZXJuYWwgXCJsb2FkZXItdXRpbHNcIiJdLCJuYW1lcyI6WyJsb2FkZXJVdGlscyIsInJlcXVpcmUiLCJiYWJ5bG9uIiwiYmFiZWwiLCJ0cmF2ZXJzZSIsImxvYWRlclByZWZpeCIsIm1vZHVsZSIsImV4cG9ydHMiLCJjb250ZW50U3RyIiwic291cmNlTWFwIiwib3B0aW9ucyIsInBhcnNlUXVlcnkiLCJxdWVyeSIsIkVycm9yIiwiYXN0IiwicGFyc2UiLCJzb3VyY2VUeXBlIiwicGx1Z2lucyIsImltcG9ydHMiLCJPYmplY3QiLCJrZXlzIiwiZm9yRWFjaCIsImtleSIsInJlcGxhY2VLZXlCeUluamVjdCIsImFkZFJlc2V0RnVuY3Rpb24iLCJ0cmFuc2Zvcm1Gcm9tQXN0IiwiY29kZSIsImZpbGVVc2VzSWRlbnRpZmllciIsIm92ZXJ3cml0ZU1ldGhvZE5hbWUiLCJ1c2VkTmFtZSIsImRlZmF1bHROYW1lIiwiZ2V0VmFyaWFibGVOYW1lcyIsImFkZE92ZXJ3cml0ZURlY2xhcmF0aW9uRmllbGQiLCJhZGREZWZhdWx0RGVjbGFyYXRpb25GaWVsZCIsInJlcGxhY2VJbXBvcnRVc2FnZXMiLCJhZGRFeHBvcnRlZE92ZXJ3cml0ZU1ldGhvZCIsImNhcGl0YWxpemVGaXJzdExldHRlciIsImV4cHJlc3Npb25TdGF0ZW1lbnRzIiwibWFwIiwiaW1wb3J0TmFtZSIsInR5cGUiLCJleHByZXNzaW9uIiwib3BlcmF0b3IiLCJsZWZ0IiwibmFtZSIsInJpZ2h0IiwicHJvZ3JhbSIsImJvZHkiLCJwdXNoIiwic3BlY2lmaWVycyIsInNvdXJjZSIsImRlY2xhcmF0aW9uIiwiaWQiLCJnZW5lcmF0b3IiLCJhc3luYyIsInBhcmFtcyIsImRpcmVjdGl2ZXMiLCJleHBvcnRLaW5kIiwiZm91bmRJZGVudGlmaWVyIiwiZGVmYXVsdCIsImVudGVyIiwicGF0aCIsIm5vZGUiLCJvdmVyd3JpdHRlbk5hbWUiLCJwYXJlbnQiLCJhZGRWYXJpYWJsZSIsInZhbHVlIiwidW5zaGlmdCIsImRlY2xhcmF0aW9ucyIsImluaXQiLCJraW5kIiwic3RyaW5nIiwiY2hhckF0IiwidG9VcHBlckNhc2UiLCJzbGljZSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7O0FBR0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0EsbURBQTJDLGNBQWM7O0FBRXpEO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsYUFBSztBQUNMO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsbUNBQTJCLDBCQUEwQixFQUFFO0FBQ3ZELHlDQUFpQyxlQUFlO0FBQ2hEO0FBQ0E7QUFDQTs7QUFFQTtBQUNBLDhEQUFzRCwrREFBK0Q7O0FBRXJIO0FBQ0E7O0FBRUE7QUFDQTs7Ozs7Ozs7OztBQ2hFQSxNQUFNQSxjQUFjLG1CQUFBQyxDQUFRLENBQVIsQ0FBcEI7QUFDQSxNQUFNQyxVQUFVLG1CQUFBRCxDQUFRLENBQVIsQ0FBaEI7QUFDQSxNQUFNRSxRQUFRLG1CQUFBRixDQUFRLENBQVIsQ0FBZDtBQUNBLE1BQU1HLFdBQVcsbUJBQUFILENBQVEsQ0FBUixDQUFqQjs7QUFFQSxNQUFNSSxlQUFlLElBQXJCOztBQUVBQyxPQUFPQyxPQUFQLEdBQWlCLFVBQVVDLFVB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O0FBQ0o3QixjQUFNLFlBREY7QUFFSkksY0FBTXNCO0FBRkY7QUFOUixLQURZLENBRlM7QUFldkJJLFVBQU07QUFmaUIsR0FBekI7QUFpQkQ7O0FBRUQsU0FBU2xDLHFCQUFULENBQStCbUMsTUFBL0IsRUFBdUM7QUFDckMsU0FBT0EsT0FBT0MsTUFBUCxDQUFjLENBQWQsRUFBaUJDLFdBQWpCLEtBQWlDRixPQUFPRyxLQUFQLENBQWEsQ0FBYixDQUF4QztBQUNELEM7Ozs7OztBQzdNRCx3RDs7Ozs7O0FDQUEsdUM7Ozs7OztBQ0FBLDJDOzs7Ozs7QUNBQSxvQzs7Ozs7O0FDQUEseUMiLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VzQ29udGVudCI6WyIgXHQvLyBUaGUgbW9kdWxlIGNhY2hlXG4gXHR2YXIgaW5zdGFsbGVkTW9kdWxlcyA9IHt9O1xuXG4gXHQvLyBUaGUgcmVxdWlyZSBmdW5jdGlvblxuIFx0ZnVuY3Rpb24gX193ZWJwYWNrX3JlcXVpcmVfXyhtb2R1bGVJZCkge1xuXG4gXHRcdC8vIENoZWNrIGlmIG1vZHVsZSBpcyBpbiBjYWNoZVxuIFx0XHRpZihpbnN0YWxsZWRNb2R1bGVzW21vZHVsZUlkXSkge1xuIFx0XHRcdHJldHVybiBpbnN0YWxsZWRNb2R1bGVzW21vZHVsZUlkXS5leHBvcnRzO1xuIFx0XHR9XG4gXHRcdC8vIENyZWF0ZSBhIG5ldyBtb2R1bGUgKGFuZCBwdXQgaXQgaW50byB0aGUgY2FjaGUpXG4gXHRcdHZhciBtb2R1bGUgPSBpbnN0YWxsZWRNb2R1bGVzW21vZHVsZUlkXSA9IHtcbiBcdFx0XHRpOiBtb2R1bGVJZCxcbiBcdFx0XHRsOiBmYWxzZSxcbiBcdFx0XHRleHBvcnRzOiB7fVxuIFx0XHR9O1xuXG4gXHRcdC8vIEV4ZWN1dGUgdGhlIG1vZHVsZSBmdW5jdGlvblxuIFx0XHRtb2R1bGVzW21vZHVsZUlkXS5jYWxsKG1vZHVsZS5leHBvcnRzLCBtb2R1bGUsIG1vZHVsZS5leHBvcnRzLCBfX3dlYnBhY2tfcmVxdWlyZV9fKTtcblxuIFx0XHQvLyBGbGFnIHRoZSBtb2R1bGUgYXMgbG9hZGVkXG4gXHRcdG1vZHVsZS5sID0gdHJ1ZTtcblxuIFx0XHQvLyBSZXR1cm4gdGhlIGV4cG9ydHMgb2YgdGhlIG1vZHVsZVxuIFx0XHRyZXR1cm4gbW9kdWxlLmV4cG9ydHM7XG4gXHR9XG5cblxuIFx0Ly8gZXhwb3NlIHRoZSBtb2R1bGVzIG9iamVjdCAoX193ZWJwYWNrX21vZHVsZXNfXylcbiBcdF9fd2VicGFja19yZXF1aXJlX18ubSA9IG1vZHVsZXM7XG5cbiBcdC8vIGV4cG9zZSB0aGUgbW9kdWxlIGNhY2hlXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLmMgPSBpbnN0YWxsZWRNb2R1bGVzO1xuXG4gXHQvLyBpZGVudGl0eSBmdW5jdGlvbiBmb3IgY2FsbGluZyBoYXJtb255IGltcG9ydHMgd2l0aCB0aGUgY29ycmVjdCBjb250ZXh0XG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLmkgPSBmdW5jdGlvbih2YWx1ZSkgeyByZXR1cm4gdmFsdWU7IH07XG5cbiBcdC8vIGRlZmluZSBnZXR0ZXIgZnVuY3Rpb24gZm9yIGhhcm1vbnkgZXhwb3J0c1xuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5kID0gZnVuY3Rpb24oZXhwb3J0cywgbmFtZSwgZ2V0dGVyKSB7XG4gXHRcdGlmKCFfX3dlYnBhY2tfcmVxdWlyZV9fLm8oZXhwb3J0cywgbmFtZSkpIHtcbiBcdFx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgbmFtZSwge1xuIFx0XHRcdFx0Y29uZmlndXJhYmxlOiBmYWxzZSxcbiBcdFx0XHRcdGVudW1lcmFibGU6IHRydWUsXG4gXHRcdFx0XHRnZXQ6IGdldHRlclxuIFx0XHRcdH0pO1xuIFx0XHR9XG4gXHR9O1xuXG4gXHQvLyBnZXREZWZhdWx0RXhwb3J0IGZ1bmN0aW9uIGZvciBjb21wYXRpYmlsaXR5IHdpdGggbm9uLWhhcm1vbnkgbW9kdWxlc1xuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5uID0gZnVuY3Rpb24obW9kdWxlKSB7XG4gXHRcdHZhciBnZXR0ZXIgPSBtb2R1bGUgJiYgbW9kdWxlLl9fZXNNb2R1bGUgP1xuIFx0XHRcdGZ1bmN0aW9uIGdldERlZmF1bHQoKSB7IHJldHVybiBtb2R1bGVbJ2RlZmF1bHQnXTsgfSA6XG4gXHRcdFx0ZnVuY3Rpb24gZ2V0TW9kdWxlRXhwb3J0cygpIHsgcmV0dXJuIG1vZHVsZTsgfTtcbiBcdFx0X193ZWJwYWNrX3JlcXVpcmVfXy5kKGdldHRlciwgJ2EnLCBnZXR0ZXIpO1xuIFx0XHRyZXR1cm4gZ2V0dGVyO1xuIFx0fTtcblxuIFx0Ly8gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLm8gPSBmdW5jdGlvbihvYmplY3QsIHByb3BlcnR5KSB7IHJldHVybiBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqZWN0LCBwcm9wZXJ0eSk7IH07XG5cbiBcdC8vIF9fd2VicGFja19wdWJsaWNfcGF0aF9fXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLnAgPSBcIlwiO1xuXG4gXHQvLyBMb2FkIGVudHJ5IG1vZHVsZSBhbmQgcmV0dXJuIGV4cG9ydHNcbiBcdHJldHVybiBfX3dlYnBhY2tfcmVxdWlyZV9fKF9fd2VicGFja19yZXF1aXJlX18ucyA9IDYpO1xuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIHdlYnBhY2svYm9vdHN0cmFwIGRiOGQ5MjM0NzJlYjc4MmI0ZWM4IiwiY29uc3QgbG9hZGVyVXRpbHMgPSByZXF1aXJlKCdsb2FkZXItdXRpbHMnKTtcbmNvbnN0IGJhYnlsb24gPSByZXF1aXJlKCdiYWJ5bG9uJyk7XG5jb25zdCBiYWJlbCA9IHJlcXVpcmUoJ2JhYmVsLWNvcmUnKTtcbmNvbnN0IHRyYXZlcnNlID0gcmVxdWlyZSgnYmFiZWwtdHJhdmVyc2UnKTtcblxuY29uc3QgbG9hZGVyUHJlZml4ID0gJ2lsJztcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoY29udGVudFN0ciwgc291cmNlTWFwKSB7XG4gIGNvbnN0IG9wdGlvbnMgPSBsb2FkZXJVdGlscy5wYXJzZVF1ZXJ5KHRoaXMucXVlcnkpO1xuICBpZiAoIW9wdGlvbnMpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ05vIG9wdGlvbnMgc3BlY2lmaWVkISBVc2UgXCJpbXBvcnQtaW5qZWN0LWxvYWRlcj9maWVsZEEsZmllbGRCIS4uL2ZpbGVcIicpO1xuICB9XG5cbiAgLy8gcGFyc2UgQVNUXG4gIGNvbnN0IGFzdCA9IGJhYnlsb24ucGFyc2UoY29udGVudFN0ciwge1xuICAgIHNvdXJjZVR5cGU6ICdtb2R1bGUnLFxuICAgIHBsdWdpbnM6IFtcbiAgICAgICdqc3gnXG4gICAgXVxuICB9KTtcblxuICAvLyByZXBsYWNlIGltcG9ydHMgYnkgY3VzdG9tIGltcG9ydCB3aGljaCBjYW4gYmUgb3ZlcndyaXR0ZW5cbiAgY29uc3QgaW1wb3J0cyA9IE9iamVjdC5rZXlzKG9wdGlvbnMpO1xuICBpbXBvcnRzLmZvckVhY2goa2V5ID0+IHJlcGxhY2VLZXlCeUluamVjdChrZXksIGFzdCkpO1xuXG4gIC8vIGV4cG9ydCBtZXRob2QgdG8gcmVzZXQgYWxsIG92ZXJ3cml0dGVuIGltcG9ydHNcbiAgYWRkUmVzZXRGdW5jdGlvbihhc3QsIGltcG9ydHMpO1xuXG4gIC8vIHJldHVybiBjb252ZXJ0ZWQgQVNUXG4gIHJldHVybiAnLy8gQkVHSU4taW1wb3J0LWluamVjdC1sb2FkZXJcXG4nXG4gICAgKyBiYWJlbC50cmFuc2Zvcm1Gcm9tQXN0KGFzdCkuY29kZVxuICAgICsgJ1xcbi8vIEVORC1pbXBvcnQtaW5qZWN0LWxvYWRlcic7XG59O1xuXG5mdW5jdGlvbiByZXBsYWNlS2V5QnlJbmplY3Qoa2V5LCBhc3QpIHtcbiAgaWYgKCFmaWxlVXNlc0lkZW50aWZpZXIoYXN0LCBrZXkpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBJZGVudGlmaWVyIFwiJHtrZXl9XCIgaXMgbm90IHVzZWQuYCk7XG4gIH1cblxuICBjb25zdCB7XG4gICAgb3ZlcndyaXRlTWV0aG9kTmFtZSxcbiAgICB1c2VkTmFtZSxcbiAgICBkZWZhdWx0TmFtZVxuICB9ID0gZ2V0VmFyaWFibGVOYW1lcyhrZXkpO1xuXG4gIGFkZE92ZXJ3cml0ZURlY2xhcmF0aW9uRmllbGQoYXN0LCBrZXksIHVzZWROYW1lKTtcbiAgYWRkRGVmYXVsdERlY2xhcmF0aW9uRmllbGQoYXN0LCBrZXksIGRlZmF1bHROYW1lKTtcbiAgcmVwbGFjZUltcG9ydFVzYWdlcyhhc3QsIGtleSwgdXNlZE5hbWUpO1xuICBhZGRFeHBvcnRlZE92ZXJ3cml0ZU1ldGhvZChhc3QsIG92ZXJ3cml0ZU1ldGhvZE5hbWUsIHVzZWROYW1lKTtcblxuICByZXR1cm4gYXN0O1xufVxuXG5mdW5jdGlvbiBnZXRWYXJpYWJsZU5hbWVzKGtleSkge1xuICByZXR1cm4ge1xuICAgIG92ZXJ3cml0ZU1ldGhvZE5hbWU6IGxvYWRlclByZWZpeCArICdPdmVyd3JpdGUnICsgY2FwaXRhbGl6ZUZpcnN0TGV0dGVyKGtleSksXG4gICAgdXNlZE5hbWU6IGxvYWRlclByZWZpeCArIGNhcGl0YWxpemVGaXJzdExldHRlcihrZXkpLFxuICAgIGRlZmF1bHROYW1lOiBsb2FkZXJQcmVmaXggKyAnRGVmYXVsdCcgKyBjYXBpdGFsaXplRmlyc3RMZXR0ZXIoa2V5KVxuICB9XG59XG5cbmZ1bmN0aW9uIGFkZFJlc2V0RnVuY3Rpb24oYXN0LCBpbXBvcnRzKSB7XG4gIGNvbnN0IGV4cHJlc3Npb25TdGF0ZW1lbnRzID0gaW1wb3J0cy5tYXAoaW1wb3J0TmFtZSA9PiB7XG4gICAgY29uc3QgeyBkZWZhdWx0TmFtZSwgdXNlZE5hbWUgfSA9IGdldFZhcmlhYmxlTmFtZXMoaW1wb3J0TmFtZSk7XG5cbiAgICByZXR1cm4gKHtcbiAgICAgIHR5cGU6ICdFeHByZXNzaW9uU3RhdGVtZW50JyxcbiAgICAgIGV4cHJlc3Npb246IHtcbiAgICAgICAgdHlwZTogJ0Fzc2lnbm1lbnRFeHByZXNzaW9uJyxcbiAgICAgICAgb3BlcmF0b3I6ICc9JyxcbiAgICAgICAgbGVmdDoge1xuICAgICAgICAgIHR5cGU6ICdJZGVudGlmaWVyJyxcbiAgICAgICAgICBuYW1lOiB1c2VkTmFtZVxuICAgICAgICB9LFxuICAgICAgICByaWdodDoge1xuICAgICAgICAgIHR5cGU6ICdJZGVudGlmaWVyJyxcbiAgICAgICAgICBuYW1lOiBkZWZhdWx0TmFtZVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG4gIH0pO1xuXG4gIGFzdC5wcm9ncmFtLmJvZHkucHVzaCh7XG4gICAgdHlwZTogJ0V4cG9ydE5hbWVkRGVjbGFyYXRpb24nLFxuICAgIHNwZWNpZmllcnM6IFtdLFxuICAgIHNvdXJjZTogbnVsbCxcbiAgICBkZWNsYXJhdGlvbjoge1xuICAgICAgdHlwZTogJ0Z1bmN0aW9uRGVjbGFyYXRpb24nLFxuICAgICAgaWQ6IHtcbiAgICAgICAgdHlwZTogJ0lkZW50aWZpZXInLFxuICAgICAgICBuYW1lOiBsb2FkZXJQcmVmaXggKyAnUmVzZXRBbGwnXG4gICAgICB9LFxuICAgICAgZ2VuZXJhdG9yOiBmYWxzZSxcbiAgICAgIGV4cHJlc3Npb246IGZhbHNlLFxuICAgICAgYXN5bmM6IGZhbHNlLFxuICAgICAgcGFyYW1zOiBbXSxcbiAgICAgIGJvZHk6IHtcbiAgICAgICAgdHlwZTogJ0Jsb2NrU3RhdGVtZW50JyxcbiAgICAgICAgYm9keTogZXhwcmVzc2lvblN0YXRlbWVudHMsXG4gICAgICAgIGRpcmVjdGl2ZXM6IFtdXG4gICAgICB9XG4gICAgfSxcbiAgICBleHBvcnRLaW5kOiAndmFsdWUnXG4gIH0pO1xufVxuXG5mdW5jdGlvbiBmaWxlVXNlc0lkZW50aWZpZXIoYXN0LCBrZXkpIHtcbiAgbGV0IGZvdW5kSWRlbnRpZmllciA9IGZhbHNlO1xuXG4gIHRyYXZlcnNlLmRlZmF1bHQoYXN0LCB7XG4gICAgZW50ZXIocGF0aCkge1xuICAgICAgaWYgKHBhdGgubm9kZS50eXBlID09PSAnSWRlbnRpZmllcicgJiYgcGF0aC5ub2RlLm5hbWUgPT09IGtleSkge1xuICAgICAgICBmb3VuZElkZW50aWZpZXIgPSB0cnVlO1xuICAgICAgfVxuICAgIH1cbiAgfSk7XG5cbiAgcmV0dXJuIGZvdW5kSWRlbnRpZmllcjtcbn1cblxuZnVuY3Rpb24gcmVwbGFjZUltcG9ydFVzYWdlcyhhc3QsIGtleSwgb3ZlcndyaXR0ZW5OYW1lKSB7XG4gIHRyYXZlcnNlLmRlZmF1bHQoYXN0LCB7XG4gICAgZW50ZXIocGF0aCkge1xuICAgICAgaWYgKHBhdGgubm9kZS50eXBlID09PSAnSWRlbnRpZmllcicgJiYgcGF0aC5ub2RlLm5hbWUgPT09IGtleSAmJiBwYXRoLnBhcmVudC50eXBlICE9PSAnSW1wb3J0U3BlY2lmaWVyJykge1xuICAgICAgICBwYXRoLm5vZGUubmFtZSA9IG92ZXJ3cml0dGVuTmFtZTtcbiAgICAgIH1cbiAgICB9XG4gIH0pO1xufVxuXG5mdW5jdGlvbiBhZGRFeHBvcnRlZE92ZXJ3cml0ZU1ldGhvZChhc3QsIG92ZXJ3cml0ZU1ldGhvZE5hbWUsIHVzZWROYW1lKSB7XG4gIGFzdC5wcm9ncmFtLmJvZHkucHVzaCh7XG4gICAgdHlwZTogJ0V4cG9ydE5hbWVkRGVjbGFyYXRpb24nLFxuICAgIHNwZWNpZmllcnM6IFtdLFxuICAgIHNvdXJjZTogbnVsbCxcbiAgICBkZWNsYXJhdGlvbjoge1xuICAgICAgdHlwZTogJ0Z1bmN0aW9uRGVjbGFyYXRpb24nLFxuICAgICAgaWQ6IHtcbiAgICAgICAgdHlwZTogJ0lkZW50aWZpZXInLFxuICAgICAgICBuYW1lOiBvdmVyd3JpdGVNZXRob2ROYW1lXG4gICAgICB9LFxuICAgICAgZ2VuZXJhdG9yOiBmYWxzZSxcbiAgICAgIGV4cHJlc3Npb246IGZhbHNlLFxuICAgICAgYXN5bmM6IGZhbHNlLFxuICAgICAgcGFyYW1zOiBbXG4gICAgICAgIHtcbiAgICAgICAgICB0eXBlOiAnSWRlbnRpZmllcicsXG4gICAgICAgICAgbmFtZTogJ3BhcmFtT3ZlcndyaXRlJ1xuICAgICAgICB9XG4gICAgICBdLFxuICAgICAgYm9keToge1xuICAgICAgICB0eXBlOiAnQmxvY2tTdGF0ZW1lbnQnLFxuICAgICAgICBib2R5OiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgdHlwZTogJ0V4cHJlc3Npb25TdGF0ZW1lbnQnLFxuICAgICAgICAgICAgZXhwcmVzc2lvbjoge1xuICAgICAgICAgICAgICB0eXBlOiAnQXNzaWdubWVudEV4cHJlc3Npb24nLFxuICAgICAgICAgICAgICBvcGVyYXRvcjogJz0nLFxuICAgICAgICAgICAgICBsZWZ0OiB7XG4gICAgICAgICAgICAgICAgdHlwZTogJ0lkZW50aWZpZXInLFxuICAgICAgICAgICAgICAgIG5hbWU6IHVzZWROYW1lXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIHJpZ2h0OiB7XG4gICAgICAgICAgICAgICAgdHlwZTogJ0lkZW50aWZpZXInLFxuICAgICAgICAgICAgICAgIG5hbWU6ICdwYXJhbU92ZXJ3cml0ZSdcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgXVxuICAgICAgfVxuICAgIH0sXG4gICAgZXhwb3J0S2luZDogJ3ZhbHVlJ1xuICB9KTtcbn1cblxuZnVuY3Rpb24gYWRkT3ZlcndyaXRlRGVjbGFyYXRpb25GaWVsZChhc3QsIGtleSwgb3ZlcndyaXR0ZW5OYW1lKSB7XG4gIGFkZFZhcmlhYmxlKGFzdCwgb3ZlcndyaXR0ZW5OYW1lLCBrZXkpO1xufVxuXG5mdW5jdGlvbiBhZGREZWZhdWx0RGVjbGFyYXRpb25GaWVsZChhc3QsIGtleSwgZGVmYXVsdE5hbWUpIHtcbiAgYWRkVmFyaWFibGUoYXN0LCBkZWZhdWx0TmFtZSwga2V5KTtcbn1cblxuZnVuY3Rpb24gYWRkVmFyaWFibGUoYXN0LCBuYW1lLCB2YWx1ZSkge1xuICBhc3QucHJvZ3JhbS5ib2R5LnVuc2hpZnQoe1xuICAgIHR5cGU6ICdWYXJpYWJsZURlY2xhcmF0aW9uJyxcbiAgICBkZWNsYXJhdGlvbnM6IFtcbiAgICAgIHtcbiAgICAgICAgdHlwZTogJ1ZhcmlhYmxlRGVjbGFyYXRvcicsXG4gICAgICAgIGlkOiB7XG4gICAgICAgICAgdHlwZTogJ0lkZW50aWZpZXInLFxuICAgICAgICAgIG5hbWU6IG5hbWVcbiAgICAgICAgfSxcbiAgICAgICAgaW5pdDoge1xuICAgICAgICAgIHR5cGU6ICdJZGVudGlmaWVyJyxcbiAgICAgICAgICBuYW1lOiB2YWx1ZVxuICAgICAgICB9XG4gICAgICB9XG4gICAgXSxcbiAgICBraW5kOiAndmFyJ1xuICB9KTtcbn1cblxuZnVuY3Rpb24gY2FwaXRhbGl6ZUZpcnN0TGV0dGVyKHN0cmluZykge1xuICByZXR1cm4gc3RyaW5nLmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsgc3RyaW5nLnNsaWNlKDEpO1xufVxuXG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9zcmMvaW5kZXguanMiLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCJzb3VyY2UtbWFwLXN1cHBvcnQvcmVnaXN0ZXJcIik7XG5cblxuLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBXRUJQQUNLIEZPT1RFUlxuLy8gZXh0ZXJuYWwgXCJzb3VyY2UtbWFwLXN1cHBvcnQvcmVnaXN0ZXJcIlxuLy8gbW9kdWxlIGlkID0gMVxuLy8gbW9kdWxlIGNodW5rcyA9IDAiLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCJiYWJlbC1jb3JlXCIpO1xuXG5cbi8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gV0VCUEFDSyBGT09URVJcbi8vIGV4dGVybmFsIFwiYmFiZWwtY29yZVwiXG4vLyBtb2R1bGUgaWQgPSAyXG4vLyBtb2R1bGUgY2h1bmtzID0gMCIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcImJhYmVsLXRyYXZlcnNlXCIpO1xuXG5cbi8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gV0VCUEFDSyBGT09URVJcbi8vIGV4dGVybmFsIFwiYmFiZWwtdHJhdmVyc2VcIlxuLy8gbW9kdWxlIGlkID0gM1xuLy8gbW9kdWxlIGNodW5rcyA9IDAiLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCJiYWJ5bG9uXCIpO1xuXG5cbi8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gV0VCUEFDSyBGT09URVJcbi8vIGV4dGVybmFsIFwiYmFieWxvblwiXG4vLyBtb2R1bGUgaWQgPSA0XG4vLyBtb2R1bGUgY2h1bmtzID0gMCIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcImxvYWRlci11dGlsc1wiKTtcblxuXG4vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIFdFQlBBQ0sgRk9PVEVSXG4vLyBleHRlcm5hbCBcImxvYWRlci11dGlsc1wiXG4vLyBtb2R1bGUgaWQgPSA1XG4vLyBtb2R1bGUgY2h1bmtzID0gMCJdLCJzb3VyY2VSb290IjoiIn0=