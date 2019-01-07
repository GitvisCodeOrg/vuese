import generate from '@babel/generator'
import { NodePath } from '@babel/traverse'
import * as bt from '@babel/types'
import * as fs from 'fs'

/**
 * If a node satisfies the following conditions, then we will use this node as a Vue component.
 * 1. It is a default export
 * 2. others...
 */
export function isVueComponent(node: bt.Node): boolean {
  return bt.isExportDefaultDeclaration(node)
}

export function isCommentLine(node: { type: string }): boolean {
  return node.type === 'CommentLine'
}

export function isCommentBlock(node: { type: string }): boolean {
  return node.type === 'CommentBlock'
}

export function runFunction(fnCode: bt.Node): any {
  const { code: genCode } = generate(fnCode)
  const code = `return (${genCode})()`
  const fn = new Function(code)
  try {
    return fn()
  } catch (e) {
    console.error(e)
  }
}

export function getValueFromGenerate(node: any) {
  let code: string = 'return'
  const { code: genCode } = generate(node)
  code += genCode
  const fn = new Function(code)
  try {
    return fn()
  } catch (e) {
    console.error(e)
  }
}

export function isVueOption(
  path: NodePath<bt.ObjectProperty | bt.ObjectMethod>,
  optionsName: string
): boolean {
  if (
    bt.isObjectProperty(path.node) &&
    path.parentPath &&
    path.parentPath.parentPath &&
    isVueComponent(path.parentPath.parentPath.node)
  ) {
    return path.node.key.name === optionsName
  } else if (
    bt.isObjectProperty(path.node) &&
    path.parentPath &&
    path.parentPath.parentPath &&
    bt.isCallExpression(path.parentPath.parentPath.node) &&
    (path.parentPath.parentPath.node.callee as bt.Identifier).name ===
      'Component' &&
    path.parentPath.parentPath.parentPath &&
    bt.isDecorator(path.parentPath.parentPath.parentPath.node)
  ) {
    // options in ts @Component({...})
    return path.node.key.name === optionsName
  }
  return false
}

export function getEmitDecorator(
  decorators: bt.Decorator[] | null
): bt.Decorator | null {
  if (!decorators || !decorators.length) return null
  for (let i = 0; i < decorators.length; i++) {
    const exp = decorators[i].expression
    if (
      bt.isCallExpression(exp) &&
      bt.isIdentifier(exp.callee) &&
      exp.callee.name === 'Emit'
    ) {
      return decorators[i]
    }
  }
  return null
}

type PropDecoratorArgument =
  | bt.Identifier
  | bt.ArrayExpression
  | bt.ObjectExpression
  | null
export function getArgumentFromPropDecorator(
  classPropertyNode: bt.ClassProperty
): PropDecoratorArgument {
  const decorators = classPropertyNode.decorators
  if (decorators) {
    for (let i = 0; i < decorators.length; i++) {
      const deco = decorators[i]
      if (
        bt.isCallExpression(deco.expression) &&
        bt.isIdentifier(deco.expression.callee) &&
        deco.expression.callee.name === 'Prop'
      ) {
        return deco.expression.arguments[0] as PropDecoratorArgument
      }
    }
  }
  return null
}

const josnCache: [] = []
export function writeFileSync(str: any, keep?: boolean) {
  const filePath = __dirname + '/a.txt'
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(__dirname + '/a.txt', '')
  }
  const preContent = fs.readFileSync(filePath)
  const content = JSON.stringify(
    str,
    function(key, value: string | number) {
      if (typeof value === 'object' && value !== null) {
        if (josnCache.indexOf(value) !== -1) {
          // Duplicate reference found
          try {
            // If this value does not reference a parent it can be deduped
            return JSON.parse(JSON.stringify(value))
          } catch (error) {
            // discard key if value cannot be deduped
            return
          }
        }
        // Store value in our collection
        josnCache.push(value)
        key
      }
      return value
    },
    2
  )
  fs.writeFileSync(__dirname + '/a.txt', keep ? preContent + content : content)
}
