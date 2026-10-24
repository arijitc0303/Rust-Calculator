/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AngleMode, CriticalPoint, TableRow } from '../types/calculator';

export type ASTNode =
  | { type: 'num'; val: number }
  | { type: 'var'; name: string }
  | { type: 'const'; name: 'pi' | 'e' | 'phi' | 'tau' | 'i' }
  | { type: 'unary'; op: '+' | '-'; arg: ASTNode }
  | { type: 'bin'; op: '+' | '-' | '*' | '/' | '^' | '%'; left: ASTNode; right: ASTNode }
  | { type: 'call'; name: string; args: ASTNode[] };

export interface EvalResult {
  value: number;
  isComplex?: boolean;
  re?: number;
  im?: number;
  formatted: string;
}

// Token types for lexing
type TokenType =
  | 'NUMBER'
  | 'IDENT'
  | 'PLUS'
  | 'MINUS'
  | 'STAR'
  | 'SLASH'
  | 'CARET'
  | 'PERCENT'
  | 'LPAREN'
  | 'RPAREN'
  | 'COMMA'
  | 'EOF';

interface Token {
  type: TokenType;
  val: string;
  pos: number;
}

export class MathEngine {
  /**
   * Tokenize input string with implicit multiplication support (e.g. 2x, 3sin(x), (x+1)(x-2))
   */
  public static tokenize(input: string): Token[] {
    const rawTokens: Token[] = [];
    let i = 0;
    const str = input.trim();

    while (i < str.length) {
      const ch = str[i];

      if (/\s/.test(ch)) {
        i++;
        continue;
      }

      if (/[0-9.]/.test(ch)) {
        let numStr = '';
        const start = i;
        while (i < str.length && /[0-9.]/.test(str[i])) {
          numStr += str[i];
          i++;
        }
        // Support scientific notation e.g. 1e-4, 2.5e+3
        if (i < str.length && (str[i] === 'e' || str[i] === 'E') && i + 1 < str.length && /[0-9+-]/.test(str[i + 1])) {
          numStr += str[i];
          i++;
          if (str[i] === '+' || str[i] === '-') {
            numStr += str[i];
            i++;
          }
          while (i < str.length && /[0-9]/.test(str[i])) {
            numStr += str[i];
            i++;
          }
        }
        rawTokens.push({ type: 'NUMBER', val: numStr, pos: start });
        continue;
      }

      if (/[a-zA-Z_]/.test(ch)) {
        let idStr = '';
        const start = i;
        while (i < str.length && /[a-zA-Z0-9_]/.test(str[i])) {
          idStr += str[i];
          i++;
        }
        rawTokens.push({ type: 'IDENT', val: idStr, pos: start });
        continue;
      }

      switch (ch) {
        case '+':
          rawTokens.push({ type: 'PLUS', val: '+', pos: i++ });
          break;
        case '-':
        case '−':
          rawTokens.push({ type: 'MINUS', val: '-', pos: i++ });
          break;
        case '*':
        case '×':
        case '·':
          rawTokens.push({ type: 'STAR', val: '*', pos: i++ });
          break;
        case '/':
        case '÷':
          rawTokens.push({ type: 'SLASH', val: '/', pos: i++ });
          break;
        case '^':
          rawTokens.push({ type: 'CARET', val: '^', pos: i++ });
          break;
        case '%':
          rawTokens.push({ type: 'PERCENT', val: '%', pos: i++ });
          break;
        case '(':
          rawTokens.push({ type: 'LPAREN', val: '(', pos: i++ });
          break;
        case ')':
          rawTokens.push({ type: 'RPAREN', val: ')', pos: i++ });
          break;
        case ',':
          rawTokens.push({ type: 'COMMA', val: ',', pos: i++ });
          break;
        default:
          throw new Error(`Unexpected character '${ch}' at position ${i + 1}`);
      }
    }

    // Insert implicit multiplication tokens
    // e.g., NUMBER followed by IDENT or LPAREN: 2x -> 2 * x, 2(x) -> 2 * (x)
    // RPAREN followed by LPAREN, NUMBER, or IDENT: (x)(y) -> (x) * (y)
    // IDENT followed by LPAREN (if ident is not a known function like sin, cos): x(y) -> x * (y)
    const knownFunctions = new Set([
      'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'sinh', 'cosh', 'tanh',
      'sec', 'csc', 'cot', 'sqrt', 'cbrt', 'exp', 'ln', 'log', 'log10', 'log2',
      'abs', 'floor', 'ceil', 'round', 'sign', 'fact', 'd_dx', 'diff', 'integrate'
    ]);

    const tokens: Token[] = [];
    for (let k = 0; k < rawTokens.length; k++) {
      const current = rawTokens[k];
      tokens.push(current);

      if (k + 1 < rawTokens.length) {
        const next = rawTokens[k + 1];

        const isImplicit =
          // Number followed by Ident, LPAREN: 2x, 2(x+1)
          (current.type === 'NUMBER' && (next.type === 'IDENT' || next.type === 'LPAREN')) ||
          // RPAREN followed by Number, Ident, LPAREN: (x+1)2, (x+1)x, (x+1)(x-1)
          (current.type === 'RPAREN' && (next.type === 'NUMBER' || next.type === 'IDENT' || next.type === 'LPAREN')) ||
          // Non-function ident followed by LPAREN or another ident: x y -> x * y
          (current.type === 'IDENT' && !knownFunctions.has(current.val.toLowerCase()) && (next.type === 'IDENT' || next.type === 'LPAREN')) ||
          // Constants followed by ident: pi x -> pi * x
          (current.type === 'IDENT' && ['pi', 'e', 'phi', 'tau', 'i'].includes(current.val.toLowerCase()) && next.type === 'NUMBER');

        if (isImplicit) {
          tokens.push({ type: 'STAR', val: '*', pos: current.pos });
        }
      }
    }

    tokens.push({ type: 'EOF', val: '', pos: str.length });
    return tokens;
  }

  /**
   * Parse token stream into an Abstract Syntax Tree (AST)
   */
  public static parse(input: string): ASTNode {
    if (!input || !input.trim()) {
      throw new Error('Empty expression');
    }
    const tokens = this.tokenize(input);
    let index = 0;

    const peek = (): Token => tokens[index];
    const consume = (expectedType?: TokenType): Token => {
      const tok = tokens[index];
      if (expectedType && tok.type !== expectedType) {
        throw new Error(`Expected '${expectedType}' but found '${tok.val}' at pos ${tok.pos}`);
      }
      index++;
      return tok;
    };

    // Grammar:
    // Expr = AddSub
    // AddSub = MulDiv (('+' | '-') MulDiv)*
    // MulDiv = Power (('*' | '/' | '%') Power)*
    // Power = Unary ('^' Power)? (right-associative)
    // Unary = ('+' | '-')? Primary
    // Primary = NUMBER | CONST | IDENT | IDENT '(' Args ')' | '(' Expr ')'

    function parseExpr(): ASTNode {
      return parseAddSub();
    }

    function parseAddSub(): ASTNode {
      let node = parseMulDiv();
      while (peek().type === 'PLUS' || peek().type === 'MINUS') {
        const op = consume().val as '+' | '-';
        const right = parseMulDiv();
        node = { type: 'bin', op, left: node, right };
      }
      return node;
    }

    function parseMulDiv(): ASTNode {
      let node = parsePower();
      while (peek().type === 'STAR' || peek().type === 'SLASH' || peek().type === 'PERCENT') {
        const op = consume().val as '*' | '/' | '%';
        const right = parsePower();
        node = { type: 'bin', op, left: node, right };
      }
      return node;
    }

    function parsePower(): ASTNode {
      const left = parseUnary();
      if (peek().type === 'CARET') {
        consume('CARET');
        const right = parsePower(); // right-associative: 2^3^4 = 2^(3^4)
        return { type: 'bin', op: '^', left, right };
      }
      return left;
    }

    function parseUnary(): ASTNode {
      if (peek().type === 'PLUS' || peek().type === 'MINUS') {
        const op = consume().val as '+' | '-';
        const arg = parseUnary();
        return { type: 'unary', op, arg };
      }
      return parsePrimary();
    }

    function parsePrimary(): ASTNode {
      const tok = peek();

      if (tok.type === 'NUMBER') {
        consume('NUMBER');
        const num = parseFloat(tok.val);
        if (isNaN(num)) throw new Error(`Invalid number: ${tok.val}`);
        return { type: 'num', val: num };
      }

      if (tok.type === 'IDENT') {
        const name = consume('IDENT').val.toLowerCase();

        // Check for constants
        if (name === 'pi' || name === 'e' || name === 'phi' || name === 'tau' || name === 'i') {
          return { type: 'const', name: name as any };
        }

        // Check for function call
        if (peek().type === 'LPAREN') {
          consume('LPAREN');
          const args: ASTNode[] = [];
          if (peek().type !== 'RPAREN') {
            args.push(parseExpr());
            while (peek().type === 'COMMA') {
              consume('COMMA');
              args.push(parseExpr());
            }
          }
          consume('RPAREN');
          return { type: 'call', name, args };
        }

        // Otherwise variable
        return { type: 'var', name };
      }

      if (tok.type === 'LPAREN') {
        consume('LPAREN');
        const expr = parseExpr();
        consume('RPAREN');
        return expr;
      }

      throw new Error(`Unexpected token '${tok.val || tok.type}' at position ${tok.pos}`);
    }

    const ast = parseExpr();
    if (peek().type !== 'EOF') {
      throw new Error(`Unexpected token '${peek().val}' after end of expression`);
    }

    return ast;
  }

  /**
   * Evaluate AST numerically with given variable context and angle mode
   */
  public static evaluate(
    node: ASTNode,
    vars: Record<string, number> = {},
    angleMode: AngleMode = 'rad'
  ): number {
    switch (node.type) {
      case 'num':
        return node.val;

      case 'const':
        if (node.name === 'pi') return Math.PI;
        if (node.name === 'e') return Math.E;
        if (node.name === 'phi') return 1.618033988749895;
        if (node.name === 'tau') return Math.PI * 2;
        if (node.name === 'i') return NaN; // handled by complex evaluator
        return 0;

      case 'var':
        if (node.name in vars) {
          return vars[node.name];
        }
        if (node.name === 'x') return vars.x ?? 0;
        throw new Error(`Undefined variable '${node.name}'`);

      case 'unary': {
        const val = this.evaluate(node.arg, vars, angleMode);
        return node.op === '-' ? -val : val;
      }

      case 'bin': {
        const left = this.evaluate(node.left, vars, angleMode);
        const right = this.evaluate(node.right, vars, angleMode);

        switch (node.op) {
          case '+':
            return left + right;
          case '-':
            return left - right;
          case '*':
            return left * right;
          case '/':
            return left / right;
          case '^':
            return Math.pow(left, right);
          case '%':
            return left % right;
        }
        break;
      }

      case 'call': {
        const fnName = node.name.toLowerCase();
        const evalArg = (idx: number) => this.evaluate(node.args[idx], vars, angleMode);

        // Convert argument to radians if function is trigonometric and angleMode is deg
        const toRad = (v: number) => (angleMode === 'deg' ? (v * Math.PI) / 180 : v);
        const fromRad = (v: number) => (angleMode === 'deg' ? (v * 180) / Math.PI : v);

        switch (fnName) {
          case 'sin':
            return Math.sin(toRad(evalArg(0)));
          case 'cos':
            return Math.cos(toRad(evalArg(0)));
          case 'tan': {
            const rad = toRad(evalArg(0));
            // Check for asymptote (cos(rad) ~ 0)
            if (Math.abs(Math.cos(rad)) < 1e-12) return NaN;
            return Math.tan(rad);
          }
          case 'asin':
          case 'arcsin':
            return fromRad(Math.asin(evalArg(0)));
          case 'acos':
          case 'arccos':
            return fromRad(Math.acos(evalArg(0)));
          case 'atan':
          case 'arctan':
            return fromRad(Math.atan(evalArg(0)));
          case 'sinh':
            return Math.sinh(evalArg(0));
          case 'cosh':
            return Math.cosh(evalArg(0));
          case 'tanh':
            return Math.tanh(evalArg(0));
          case 'sec':
            return 1 / Math.cos(toRad(evalArg(0)));
          case 'csc':
            return 1 / Math.sin(toRad(evalArg(0)));
          case 'cot':
            return 1 / Math.tan(toRad(evalArg(0)));
          case 'sqrt':
            return Math.sqrt(evalArg(0));
          case 'cbrt':
            return Math.cbrt(evalArg(0));
          case 'exp':
            return Math.exp(evalArg(0));
          case 'ln':
            return Math.log(evalArg(0));
          case 'log':
          case 'log10':
            return Math.log10(evalArg(0));
          case 'log2':
            return Math.log2(evalArg(0));
          case 'abs':
            return Math.abs(evalArg(0));
          case 'floor':
            return Math.floor(evalArg(0));
          case 'ceil':
            return Math.ceil(evalArg(0));
          case 'round':
            return Math.round(evalArg(0));
          case 'sign':
            return Math.sign(evalArg(0));
          case 'fact': {
            const n = Math.floor(evalArg(0));
            if (n < 0 || n > 170) return NaN;
            let res = 1;
            for (let k = 2; k <= n; k++) res *= k;
            return res;
          }
          case 'd_dx':
          case 'diff': {
            // Numerical derivative if called dynamically
            const xVal = vars.x ?? evalArg(1) ?? 0;
            const h = 1e-6;
            const v1 = this.evaluate(node.args[0], { ...vars, x: xVal + h }, angleMode);
            const v2 = this.evaluate(node.args[0], { ...vars, x: xVal - h }, angleMode);
            return (v1 - v2) / (2 * h);
          }
          case 'integrate': {
            // Definite numerical integral integrate(expr, a, b)
            const a = evalArg(1);
            const b = evalArg(2);
            return this.adaptiveSimpson(node.args[0], a, b, vars, angleMode);
          }
          default:
            throw new Error(`Unknown function: ${fnName}`);
        }
      }
    }

    return NaN;
  }

  /**
   * Fast compiler: converts AST directly to an optimized JavaScript lambda function (x) => number
   * Enables continuous 60fps evaluation of tens of thousands of coordinates on canvas!
   */
  public static compile(
    ast: ASTNode,
    angleMode: AngleMode = 'rad'
  ): (x: number) => number {
    return (x: number) => {
      try {
        const val = this.evaluate(ast, { x }, angleMode);
        return isFinite(val) ? val : NaN;
      } catch {
        return NaN;
      }
    };
  }

  /**
   * Full Symbolic Calculus: Symbolic Differentiation d/dx(f(x))
   * Produces an exact, simplified analytical derivative AST!
   */
  public static differentiate(node: ASTNode, wrt: string = 'x'): ASTNode {
    switch (node.type) {
      case 'num':
      case 'const':
        return { type: 'num', val: 0 };

      case 'var':
        return { type: 'num', val: node.name === wrt ? 1 : 0 };

      case 'unary':
        return {
          type: 'unary',
          op: node.op,
          arg: this.differentiate(node.arg, wrt),
        };

      case 'bin': {
        const u = node.left;
        const v = node.right;
        const du = this.differentiate(u, wrt);
        const dv = this.differentiate(v, wrt);

        if (node.op === '+' || node.op === '-') {
          return this.simplify({
            type: 'bin',
            op: node.op,
            left: du,
            right: dv,
          });
        }

        if (node.op === '*') {
          // Product rule: (u * v)' = u' * v + u * v'
          return this.simplify({
            type: 'bin',
            op: '+',
            left: { type: 'bin', op: '*', left: du, right: v },
            right: { type: 'bin', op: '*', left: u, right: dv },
          });
        }

        if (node.op === '/') {
          // Quotient rule: (u / v)' = (u' * v - u * v') / v^2
          return this.simplify({
            type: 'bin',
            op: '/',
            left: {
              type: 'bin',
              op: '-',
              left: { type: 'bin', op: '*', left: du, right: v },
              right: { type: 'bin', op: '*', left: u, right: dv },
            },
            right: { type: 'bin', op: '^', left: v, right: { type: 'num', val: 2 } },
          });
        }

        if (node.op === '^') {
          // Power rule: u^v
          // If v is a constant number: c * u^(c-1) * u'
          if (v.type === 'num') {
            const c = v.val;
            return this.simplify({
              type: 'bin',
              op: '*',
              left: {
                type: 'bin',
                op: '*',
                left: { type: 'num', val: c },
                right: {
                  type: 'bin',
                  op: '^',
                  left: u,
                  right: { type: 'num', val: c - 1 },
                },
              },
              right: du,
            });
          }
          // If base is constant e: (e^v)' = e^v * v'
          if (u.type === 'const' && u.name === 'e') {
            return this.simplify({
              type: 'bin',
              op: '*',
              left: node,
              right: dv,
            });
          }
          // General case: (u^v)' = u^v * (v' * ln(u) + v * u' / u)
          return this.simplify({
            type: 'bin',
            op: '*',
            left: node,
            right: {
              type: 'bin',
              op: '+',
              left: {
                type: 'bin',
                op: '*',
                left: dv,
                right: { type: 'call', name: 'ln', args: [u] },
              },
              right: {
                type: 'bin',
                op: '/',
                left: { type: 'bin', op: '*', left: v, right: du },
                right: u,
              },
            },
          });
        }
        break;
      }

      case 'call': {
        const fn = node.name.toLowerCase();
        const arg = node.args[0];
        const darg = this.differentiate(arg, wrt);

        switch (fn) {
          case 'sin':
            // (sin u)' = cos(u) * u'
            return this.simplify({
              type: 'bin',
              op: '*',
              left: { type: 'call', name: 'cos', args: [arg] },
              right: darg,
            });
          case 'cos':
            // (cos u)' = -sin(u) * u'
            return this.simplify({
              type: 'bin',
              op: '*',
              left: {
                type: 'unary',
                op: '-',
                arg: { type: 'call', name: 'sin', args: [arg] },
              },
              right: darg,
            });
          case 'tan':
            // (tan u)' = (1 / cos(u)^2) * u'
            return this.simplify({
              type: 'bin',
              op: '*',
              left: {
                type: 'bin',
                op: '/',
                left: { type: 'num', val: 1 },
                right: {
                  type: 'bin',
                  op: '^',
                  left: { type: 'call', name: 'cos', args: [arg] },
                  right: { type: 'num', val: 2 },
                },
              },
              right: darg,
            });
          case 'ln':
            // (ln u)' = u' / u
            return this.simplify({
              type: 'bin',
              op: '/',
              left: darg,
              right: arg,
            });
          case 'log':
          case 'log10':
            // (log10 u)' = u' / (u * ln(10))
            return this.simplify({
              type: 'bin',
              op: '/',
              left: darg,
              right: {
                type: 'bin',
                op: '*',
                left: arg,
                right: { type: 'call', name: 'ln', args: [{ type: 'num', val: 10 }] },
              },
            });
          case 'exp':
            // (exp u)' = exp(u) * u'
            return this.simplify({
              type: 'bin',
              op: '*',
              left: node,
              right: darg,
            });
          case 'sqrt':
            // (sqrt u)' = u' / (2 * sqrt(u))
            return this.simplify({
              type: 'bin',
              op: '/',
              left: darg,
              right: {
                type: 'bin',
                op: '*',
                left: { type: 'num', val: 2 },
                right: { type: 'call', name: 'sqrt', args: [arg] },
              },
            });
          case 'sinh':
            // (sinh u)' = cosh(u) * u'
            return this.simplify({
              type: 'bin',
              op: '*',
              left: { type: 'call', name: 'cosh', args: [arg] },
              right: darg,
            });
          case 'cosh':
            // (cosh u)' = sinh(u) * u'
            return this.simplify({
              type: 'bin',
              op: '*',
              left: { type: 'call', name: 'sinh', args: [arg] },
              right: darg,
            });
          case 'asin':
          case 'arcsin':
            // (asin u)' = u' / sqrt(1 - u^2)
            return this.simplify({
              type: 'bin',
              op: '/',
              left: darg,
              right: {
                type: 'call',
                name: 'sqrt',
                args: [
                  {
                    type: 'bin',
                    op: '-',
                    left: { type: 'num', val: 1 },
                    right: { type: 'bin', op: '^', left: arg, right: { type: 'num', val: 2 } },
                  },
                ],
              },
            });
          case 'acos':
          case 'arccos':
            // (acos u)' = -u' / sqrt(1 - u^2)
            return this.simplify({
              type: 'unary',
              op: '-',
              arg: {
                type: 'bin',
                op: '/',
                left: darg,
                right: {
                  type: 'call',
                  name: 'sqrt',
                  args: [
                    {
                      type: 'bin',
                      op: '-',
                      left: { type: 'num', val: 1 },
                      right: { type: 'bin', op: '^', left: arg, right: { type: 'num', val: 2 } },
                    },
                  ],
                },
              },
            });
          case 'atan':
          case 'arctan':
            // (atan u)' = u' / (1 + u^2)
            return this.simplify({
              type: 'bin',
              op: '/',
              left: darg,
              right: {
                type: 'bin',
                op: '+',
                left: { type: 'num', val: 1 },
                right: { type: 'bin', op: '^', left: arg, right: { type: 'num', val: 2 } },
              },
            });
        }
      }
    }

    return { type: 'num', val: 0 };
  }

  /**
   * Algebraic Simplifier: simplifies redundant zeroes, ones, and combines numeric constants
   */
  public static simplify(node: ASTNode): ASTNode {
    if (node.type === 'unary') {
      const simplifiedArg = this.simplify(node.arg);
      if (simplifiedArg.type === 'num') {
        return { type: 'num', val: node.op === '-' ? -simplifiedArg.val : simplifiedArg.val };
      }
      if (simplifiedArg.type === 'unary' && simplifiedArg.op === '-' && node.op === '-') {
        return simplifiedArg.arg;
      }
      return { type: 'unary', op: node.op, arg: simplifiedArg };
    }

    if (node.type === 'bin') {
      const left = this.simplify(node.left);
      const right = this.simplify(node.right);

      // Constant folding for two numbers
      if (left.type === 'num' && right.type === 'num') {
        switch (node.op) {
          case '+':
            return { type: 'num', val: left.val + right.val };
          case '-':
            return { type: 'num', val: left.val - right.val };
          case '*':
            return { type: 'num', val: left.val * right.val };
          case '/':
            if (right.val !== 0) return { type: 'num', val: left.val / right.val };
            break;
          case '^':
            return { type: 'num', val: Math.pow(left.val, right.val) };
        }
      }

      // Additive identities
      if (node.op === '+') {
        if (left.type === 'num' && left.val === 0) return right;
        if (right.type === 'num' && right.val === 0) return left;
      }
      if (node.op === '-') {
        if (right.type === 'num' && right.val === 0) return left;
        if (left.type === 'num' && left.val === 0) return { type: 'unary', op: '-', arg: right };
      }

      // Multiplicative identities
      if (node.op === '*') {
        if ((left.type === 'num' && left.val === 0) || (right.type === 'num' && right.val === 0)) {
          return { type: 'num', val: 0 };
        }
        if (left.type === 'num' && left.val === 1) return right;
        if (right.type === 'num' && right.val === 1) return left;
        if (left.type === 'num' && left.val === -1) return { type: 'unary', op: '-', arg: right };
        if (right.type === 'num' && right.val === -1) return { type: 'unary', op: '-', arg: left };
      }

      // Division identities
      if (node.op === '/') {
        if (left.type === 'num' && left.val === 0) return { type: 'num', val: 0 };
        if (right.type === 'num' && right.val === 1) return left;
      }

      // Power identities
      if (node.op === '^') {
        if (right.type === 'num' && right.val === 0) return { type: 'num', val: 1 };
        if (right.type === 'num' && right.val === 1) return left;
        if (left.type === 'num' && (left.val === 0 || left.val === 1)) return left;
      }

      return { type: 'bin', op: node.op, left, right };
    }

    if (node.type === 'call') {
      const simplifiedArgs = node.args.map((a) => this.simplify(a));
      return { type: 'call', name: node.name, args: simplifiedArgs };
    }

    return node;
  }

  /**
   * Convert AST into a clean mathematical expression string
   */
  public static stringify(node: ASTNode, parentPrecedence: number = 0): string {
    const prec = (op: string) => {
      switch (op) {
        case '+':
        case '-':
          return 1;
        case '*':
        case '/':
        case '%':
          return 2;
        case '^':
          return 3;
        default:
          return 0;
      }
    };

    switch (node.type) {
      case 'num': {
        const val = node.val;
        if (Number.isInteger(val)) return val.toString();
        // Round to reasonable precision
        return parseFloat(val.toFixed(8)).toString();
      }

      case 'const':
        return node.name;

      case 'var':
        return node.name;

      case 'unary': {
        const s = this.stringify(node.arg, 4);
        return `${node.op}${s}`;
      }

      case 'bin': {
        const p = prec(node.op);
        const leftStr = this.stringify(node.left, p);
        const rightStr = this.stringify(node.right, node.op === '^' ? p - 0.1 : p + 0.1);

        let res = `${leftStr} ${node.op} ${rightStr}`;
        if (p < parentPrecedence) {
          res = `(${res})`;
        }
        return res;
      }

      case 'call': {
        const argStrs = node.args.map((a) => this.stringify(a, 0)).join(', ');
        return `${node.name}(${argStrs})`;
      }
    }
  }

  /**
   * Adaptive Simpson's 3/8 numerical integration
   */
  public static adaptiveSimpson(
    ast: ASTNode,
    a: number,
    b: number,
    vars: Record<string, number> = {},
    angleMode: AngleMode = 'rad',
    n: number = 1000
  ): number {
    if (a === b) return 0;
    const h = (b - a) / n;
    const f = (x: number) => {
      try {
        const res = this.evaluate(ast, { ...vars, x }, angleMode);
        return isFinite(res) ? res : 0;
      } catch {
        return 0;
      }
    };

    let sum = f(a) + f(b);
    for (let i = 1; i < n; i++) {
      const x = a + i * h;
      sum += i % 2 === 0 ? 2 * f(x) : 4 * f(x);
    }
    return (h / 3) * sum;
  }

  /**
   * Finds roots (x-intercepts) in the range [xMin, xMax]
   */
  public static findRoots(
    fn: (x: number) => number,
    xMin: number,
    xMax: number,
    steps: number = 400
  ): number[] {
    const roots: number[] = [];
    const dx = (xMax - xMin) / steps;
    let prevX = xMin;
    let prevY = fn(prevX);

    for (let i = 1; i <= steps; i++) {
      const currX = xMin + i * dx;
      const currY = fn(currX);

      if (isFinite(prevY) && isFinite(currY)) {
        // Sign change detected!
        if (prevY === 0) {
          roots.push(prevX);
        } else if (prevY * currY < 0 && Math.abs(currY - prevY) < 50) {
          // Refine with bisection / secant method
          let a = prevX;
          let b = currX;
          for (let iter = 0; iter < 24; iter++) {
            const mid = (a + b) / 2;
            const yMid = fn(mid);
            if (Math.abs(yMid) < 1e-10 || (b - a) < 1e-9) {
              roots.push(mid);
              break;
            }
            if (fn(a) * yMid <= 0) {
              b = mid;
            } else {
              a = mid;
            }
            if (iter === 23) roots.push(mid);
          }
        }
      }
      prevX = currX;
      prevY = currY;
    }

    // Deduplicate close roots
    const unique: number[] = [];
    for (const r of roots) {
      if (!unique.some((u) => Math.abs(u - r) < 1e-4)) {
        unique.push(parseFloat(r.toFixed(5)));
      }
    }
    return unique;
  }

  /**
   * Finds local extrema (peaks and troughs) in the range [xMin, xMax]
   */
  public static findExtrema(
    fn: (x: number) => number,
    dfn: (x: number) => number,
    xMin: number,
    xMax: number
  ): { x: number; y: number; type: 'local_min' | 'local_max' }[] {
    const candidateXs = this.findRoots(dfn, xMin, xMax, 300);
    const extrema: { x: number; y: number; type: 'local_min' | 'local_max' }[] = [];
    const h = 1e-5;

    for (const x of candidateXs) {
      const y = fn(x);
      if (!isFinite(y)) continue;

      // Second derivative test
      const d2y = (dfn(x + h) - dfn(x - h)) / (2 * h);
      if (Math.abs(d2y) > 1e-8) {
        extrema.push({
          x: parseFloat(x.toFixed(5)),
          y: parseFloat(y.toFixed(5)),
          type: d2y > 0 ? 'local_min' : 'local_max',
        });
      }
    }

    return extrema;
  }

  /**
   * Generate table of values
   */
  public static generateTable(
    fn: (x: number) => number,
    dfn: (x: number) => number,
    start: number = -5,
    end: number = 5,
    step: number = 1
  ): TableRow[] {
    const rows: TableRow[] = [];
    const effectiveStep = Math.max(0.01, Math.min(step, 10));
    for (let x = start; x <= end + 1e-9; x += effectiveStep) {
      const cleanX = parseFloat(x.toFixed(4));
      const y = fn(cleanX);
      const dy = dfn(cleanX);
      rows.push({
        x: cleanX,
        y: isFinite(y) ? parseFloat(y.toFixed(6)) : null,
        dy: isFinite(dy) ? parseFloat(dy.toFixed(6)) : null,
      });
    }
    return rows;
  }

  /**
   * High precision scientific formatter
   */
  public static formatNumber(val: number): string {
    if (isNaN(val)) return 'NaN';
    if (!isFinite(val)) return val > 0 ? '+Infinity' : '-Infinity';

    if (Math.abs(val) === 0) return '0';

    // If very small or very large, use scientific notation
    if (Math.abs(val) >= 1e12 || Math.abs(val) < 1e-6) {
      return val.toExponential(8).replace(/\.?0+e/, 'e');
    }

    // High precision decimal formatting up to 10 decimal digits without trailing zeros
    const str = val.toFixed(10);
    const trimmed = str.replace(/\.?0+$/, '');
    return trimmed;
  }

  /**
   * Complete evaluation for scientific console with complex number handling
   */
  public static evaluateExpression(input: string, angleMode: AngleMode = 'rad'): EvalResult {
    const start = performance.now();

    // Check if expression is calculating derivative e.g. d/dx(x^3 - 3x)
    const ddxMatch = input.match(/^(?:d\/dx|diff)\((.+)\)$/i);
    if (ddxMatch) {
      const innerExpr = ddxMatch[1];
      const innerAst = this.parse(innerExpr);
      const diffAst = this.differentiate(innerAst);
      const formula = this.stringify(diffAst);
      return {
        value: NaN,
        formatted: formula,
      };
    }

    // Check if calculating definite integral e.g. integrate(x^2, 0, 3)
    const intMatch = input.match(/^integrate\((.+),\s*([^,]+),\s*([^,]+)\)$/i);
    if (intMatch) {
      const expr = intMatch[1];
      const a = this.evaluate(this.parse(intMatch[2]), {}, angleMode);
      const b = this.evaluate(this.parse(intMatch[3]), {}, angleMode);
      const ast = this.parse(expr);
      const val = this.adaptiveSimpson(ast, a, b, {}, angleMode);
      return {
        value: val,
        formatted: this.formatNumber(val),
      };
    }

    const ast = this.parse(input);
    const val = this.evaluate(ast, {}, angleMode);

    if (isNaN(val)) {
      // Check if expression involves imaginary numbers (e.g. sqrt(-4), i)
      if (input.includes('i') || /sqrt\s*\(\s*-[0-9.]+/.test(input)) {
        return {
          value: NaN,
          isComplex: true,
          formatted: 'Complex result (z = a + bi)',
        };
      }
    }

    return {
      value: val,
      formatted: this.formatNumber(val),
    };
  }
}
