module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Sort imports by groups and line length',
      category: 'Stylistic Issues',
      recommended: false,
    },
    fixable: 'code', // This rule is fixable
    schema: [], // No options
  },

  create(context) {
    return {
      Program(node) {
        const sourceCode = context.getSourceCode();
        const importNodes = node.body.filter(
          (n) => n.type === 'ImportDeclaration'
        );

        if (importNodes.length === 0) {
          return;
        }

        const groupedImports = groupImports(importNodes);

        let sortedImports = [];

        groupedImports.forEach((group) => {
          const sortedGroup = group.slice().sort((a, b) => {
            const aLength = sourceCode.getText(a).length;
            const bLength = sourceCode.getText(b).length;
            return aLength - bLength;
          });

          sortedImports = sortedImports.concat(sortedGroup);
        });

        // Compare the sorted imports with the original imports
        for (let i = 0; i < importNodes.length; i++) {
          if (importNodes[i] !== sortedImports[i]) {
            context.report({
              node: importNodes[i],
              message: 'Imports are not sorted correctly.',
              fix(fixer) {
                // Generate the fixed code
                const fixedCode = generateFixedCode(sortedImports, sourceCode);

                // Replace all import statements with the fixed code
                const firstImport = importNodes[0];
                const lastImport = importNodes[importNodes.length - 1];

                return fixer.replaceTextRange(
                  [firstImport.range[0], lastImport.range[1]],
                  fixedCode
                );
              },
            });
            break; // Only report once per file
          }
        }
      },
    };
  },
};

/**
 * Groups imports according to the specified criteria.
 * @param {Array} importNodes - Array of ImportDeclaration nodes.
 * @returns {Array} - Array of grouped imports.
 */
function groupImports(importNodes) {
  const groups = [[], [], [], [], []]; // Initialize five groups

  importNodes.forEach((node) => {
    const importPath = node.source.value;

    if (isThirdParty(importPath)) {
      groups[0].push(node);
    } else if (isAtImport(importPath)) {
      groups[1].push(node);
    } else if (isSingleDotRelative(importPath)) {
      groups[2].push(node);
    } else if (isMultiDotRelative(importPath)) {
      groups[3].push(node);
    } else if (isTypeImport(node)) {
      groups[4].push(node);
    }
  });

  // Remove empty groups
  return groups.filter((group) => group.length > 0);
}

// Helper functions to classify import paths
function isThirdParty(importPath) {
  return /^[^./@]/.test(importPath);
}

function isAtImport(importPath) {
  return /^@/.test(importPath);
}

function isSingleDotRelative(importPath) {
  return /^\.[^./]/.test(importPath);
}

function isMultiDotRelative(importPath) {
  return /^\.\.?\//.test(importPath);
}

function isTypeImport(node) {
  return node.importKind === 'type';
}

/**
 * Generates the fixed code for the sorted imports.
 * @param {Array} sortedImports - Array of sorted ImportDeclaration nodes.
 * @param {Object} sourceCode - ESLint SourceCode object.
 * @returns {string} - The fixed code string.
 */
function generateFixedCode(sortedImports, sourceCode) {
  let code = '';
  let currentGroupType = null;

  sortedImports.forEach((node, index) => {
    const groupType = getGroupType(node);

    if (currentGroupType !== groupType && index !== 0) {
      code += '\n'; // Add empty line between different groups
    }

    code += sourceCode.getText(node) + '\n';
    currentGroupType = groupType;
  });

  return code.trim();
}

/**
 * Determines the group type of an import node.
 * @param {Object} node - ImportDeclaration node.
 * @returns {number} - Group type index.
 */
function getGroupType(node) {
  const importPath = node.source.value;

  if (isThirdParty(importPath)) {
    return 0;
  } else if (isAtImport(importPath)) {
    return 1;
  } else if (isSingleDotRelative(importPath)) {
    return 2;
  } else if (isMultiDotRelative(importPath)) {
    return 3;
  } else if (isTypeImport(node)) {
    return 4;
  }
}
