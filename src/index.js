const loaderUtils = require('loader-utils');
const babylon = require('babylon');
const babel = require('babel-core');
const traverse = require('babel-traverse');

const loaderPrefix = 'il';

module.exports = function (contentStr, sourceMap) {
  // { [identifier: string]: true }
  const options = loaderUtils.parseQuery(this.query);
  if (!options) {
    throw new Error('No options specified! Use "import-inject-loader?fieldA,fieldB!../file"');
  }

  // parse AST
  const ast = babylon.parse(contentStr, {
    sourceType: 'module',
    plugins: [
      'jsx'
    ]
  });

  // replace variables names (= identifiers) which should be injectable
  // string[]
  const identifiers = Object.keys(options);
  identifiers.forEach(identifier => makeIdentifierInjectable(identifier, ast));

  // export method to reset all overwritten imports
  addResetFunction(ast, identifiers);

  // return converted AST
  const { code } = babel.transformFromAst(ast);

  console.log('\n---\n' + code + '\n---\n');
  return '// BEGIN-import-inject-loader\n'
    + code
    + '\n// END-import-inject-loader';
};

function makeIdentifierInjectable(identifier, ast) {
  if (!isIdentifierUsed(ast, identifier)) {
    throw new Error(`Identifier "${identifier}" is not used. Maybe you misspelled the identifier.`);
  }

  const {
    overwriteMethodName,
    usedName,
    originalReferenceName
  } = getVariableNames(identifier);

  let lastImport = 0;
  let node = ast.program.body[lastImport];
  while (node.type === 'ImportDeclaration') {
    lastImport += 1;
    node = ast.program.body[lastImport];
  }

  replaceUsages(ast, identifier, usedName); // needed?
  addExportedOverwriteMethod(ast, overwriteMethodName, usedName);
  addOverwritableVariable(ast, identifier, usedName, lastImport);
  addReferenceToOriginalValue(ast, identifier, originalReferenceName, lastImport);

  return ast;
}

function getVariableNames(identifier) {
  const capitalizedIdentifier = capitalizeFirstLetter(identifier);
  return {
    // call this method to overwrite the value stored in `usedName`
    overwriteMethodName: loaderPrefix + 'Overwrite' + capitalizedIdentifier,
    // this is the name of the variable in all used places (why change this?)
    usedName: loaderPrefix + capitalizedIdentifier,
    // this variable stores a reference to the original value
    originalReferenceName: loaderPrefix + 'Original' + capitalizedIdentifier
  }
}

function addResetFunction(ast, identifiers) {
  const expressionStatements = identifiers.map(identifier => {
    const { originalReferenceName, usedName } = getVariableNames(identifier);

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
          name: originalReferenceName
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

function isIdentifierUsed(ast, identifier) {
  let foundIdentifier = false;

  traverse.default(ast, {
    enter(path) {
      if (path.node.type === 'Identifier' && path.node.name === identifier) {
        foundIdentifier = true;
      }
    }
  });

  return foundIdentifier;
}

function replaceUsages(ast, identifier, overwrittenName) {
  traverse.default(ast, {
    enter(path) {
      if (path.node.type === 'Identifier' && path.node.name === identifier && path.parent.type !== 'ImportSpecifier') {
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
      params: [
        {
          type: 'Identifier',
          name: 'value'
        }
      ],
      body: {
        type: 'BlockStatement',
        body: [
          {
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
                name: 'value'
              }
            }
          }
        ]
      }
    },
    exportKind: 'value'
  });
}

function addOverwritableVariable(ast, identifier, usedName, nodeIndex) {
  addVariable(ast, usedName, identifier, nodeIndex);
}

function addReferenceToOriginalValue(ast, key, originalReferenceName, nodeIndex) {
  addVariable(ast, originalReferenceName, key, nodeIndex);
}

function addVariable(ast, name, value, nodeIndex) {
  ast.program.body.splice(nodeIndex, 0, {
    type: 'VariableDeclaration',
    declarations: [
      {
        type: 'VariableDeclarator',
        id: {
          type: 'Identifier',
          name: name
        },
        init: {
          type: 'Identifier',
          name: value
        }
      }
    ],
    kind: 'var'
  });
}

function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

