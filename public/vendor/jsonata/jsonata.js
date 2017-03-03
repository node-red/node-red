/**
 * © Copyright IBM Corp. 2016 All Rights Reserved
 *   Project name: JSONata
 *   This project is licensed under the MIT License, see LICENSE
 */

/**
 * @module JSONata
 * @description JSON query and transformation language
 */

/**
 * jsonata
 * @function
 * @param {Object} expr - JSONata expression
 * @returns {{evaluate: evaluate, assign: assign}} Evaluated expression
 */
var jsonata = (function() {
    'use strict';

    var operators = {
        '.': 75,
        '[': 80,
        ']': 0,
        '{': 70,
        '}': 0,
        '(': 80,
        ')': 0,
        ',': 0,
        '@': 75,
        '#': 70,
        ';': 80,
        ':': 80,
        '?': 20,
        '+': 50,
        '-': 50,
        '*': 60,
        '/': 60,
        '%': 60,
        '|': 20,
        '=': 40,
        '<': 40,
        '>': 40,
        '`': 80,
        '**': 60,
        '..': 20,
        ':=': 10,
        '!=': 40,
        '<=': 40,
        '>=': 40,
        'and': 30,
        'or': 25,
        'in': 40,
        '&': 50,
        '!': 0   // not an operator, but needed as a stop character for name tokens
    };

    var escapes = {  // JSON string escape sequences - see json.org
        '"': '"',
        '\\': '\\',
        '/': '/',
        'b': '\b',
        'f': '\f',
        'n': '\n',
        'r': '\r',
        't': '\t'
    };

    // Tokenizer (lexer) - invoked by the parser to return one token at a time
    var tokenizer = function (path) {
        var position = 0;
        var length = path.length;

        var create = function (type, value) {
            var obj = {type: type, value: value, position: position};
            return obj;
        };

        var next = function () {
            if (position >= length) return null;
            var currentChar = path.charAt(position);
            // skip whitespace
            while (position < length && ' \t\n\r\v'.indexOf(currentChar) > -1) {
                position++;
                currentChar = path.charAt(position);
            }
            // handle double-char operators
            if (currentChar === '.' && path.charAt(position + 1) === '.') {
                // double-dot .. range operator
                position += 2;
                return create('operator', '..');
            }
            if (currentChar === ':' && path.charAt(position + 1) === '=') {
                // := assignment
                position += 2;
                return create('operator', ':=');
            }
            if (currentChar === '!' && path.charAt(position + 1) === '=') {
                // !=
                position += 2;
                return create('operator', '!=');
            }
            if (currentChar === '>' && path.charAt(position + 1) === '=') {
                // >=
                position += 2;
                return create('operator', '>=');
            }
            if (currentChar === '<' && path.charAt(position + 1) === '=') {
                // <=
                position += 2;
                return create('operator', '<=');
            }
            if (currentChar === '*' && path.charAt(position + 1) === '*') {
                // **  descendant wildcard
                position += 2;
                return create('operator', '**');
            }
            // test for operators
            if (operators.hasOwnProperty(currentChar)) {
                position++;
                return create('operator', currentChar);
            }
            // test for string literals
            if (currentChar === '"' || currentChar === "'") {
                var quoteType = currentChar;
                // double quoted string literal - find end of string
                position++;
                var qstr = "";
                while (position < length) {
                    currentChar = path.charAt(position);
                    if (currentChar === '\\') { // escape sequence
                        position++;
                        currentChar = path.charAt(position);
                        if (escapes.hasOwnProperty(currentChar)) {
                            qstr += escapes[currentChar];
                        } else if (currentChar === 'u') {
                            // \u should be followed by 4 hex digits
                            var octets = path.substr(position + 1, 4);
                            if (/^[0-9a-fA-F]+$/.test(octets)) {
                                var codepoint = parseInt(octets, 16);
                                qstr += String.fromCharCode(codepoint);
                                position += 4;
                            } else {
                                throw {
                                    message: "The escape sequence \\u must be followed by 4 hex digits",
                                    stack: (new Error()).stack,
                                    position: position
                                };
                            }
                        } else {
                            // illegal escape sequence
                            throw {
                                message: 'unsupported escape sequence: \\' + currentChar,
                                stack: (new Error()).stack,
                                position: position,
                                token: currentChar
                            };

                        }
                    } else if (currentChar === quoteType) {
                        position++;
                        return create('string', qstr);
                    } else {
                        qstr += currentChar;
                    }
                    position++;
                }
                throw {
                    message: 'no terminating quote found in string literal',
                    stack: (new Error()).stack,
                    position: position
                };
            }
            // test for numbers
            var numregex = /^-?(0|([1-9][0-9]*))(\.[0-9]+)?([Ee][-+]?[0-9]+)?/;
            var match = numregex.exec(path.substring(position));
            if (match !== null) {
                var num = parseFloat(match[0]);
                if (!isNaN(num) && isFinite(num)) {
                    position += match[0].length;
                    return create('number', num);
                } else {
                    throw {
                        message: 'Number out of range: ' + match[0],
                        stack: (new Error()).stack,
                        position: position,
                        token: match[0]
                    };
                }
            }
            // test for names
            var i = position;
            var ch;
            var name;
            for (;;) {
                ch = path.charAt(i);
                if (i == length || ' \t\n\r\v'.indexOf(ch) > -1 || operators.hasOwnProperty(ch)) {
                    if (path.charAt(position) === '$') {
                        // variable reference
                        name = path.substring(position + 1, i);
                        position = i;
                        return create('variable', name);
                    } else {
                        name = path.substring(position, i);
                        position = i;
                        switch (name) {
                            case 'and':
                            case 'or':
                            case 'in':
                                return create('operator', name);
                            case 'true':
                                return create('value', true);
                            case 'false':
                                return create('value', false);
                            case 'null':
                                return create('value', null);
                            default:
                                if (position == length && name === '') {
                                    // whitespace at end of input
                                    return null;
                                }
                                return create('name', name);
                        }
                    }
                } else {
                    i++;
                }
            }
        };

        return next;
    };


    // This parser implements the 'Top down operator precedence' algorithm developed by Vaughan R Pratt; http://dl.acm.org/citation.cfm?id=512931.
    // and builds on the Javascript framework described by Douglas Crockford at http://javascript.crockford.com/tdop/tdop.html
    // and in 'Beautiful Code', edited by Andy Oram and Greg Wilson, Copyright 2007 O'Reilly Media, Inc. 798-0-596-51004-6

    var parser = function (source) {
        var node;
        var lexer;

        var symbol_table = {};

        var base_symbol = {
            nud: function () {
                return this;
            }
        };

        var symbol = function (id, bp) {
            var s = symbol_table[id];
            bp = bp || 0;
            if (s) {
                if (bp >= s.lbp) {
                    s.lbp = bp;
                }
            } else {
                s = Object.create(base_symbol);
                s.id = s.value = id;
                s.lbp = bp;
                symbol_table[id] = s;
            }
            return s;
        };

        var advance = function (id) {
            if (id && node.id !== id) {
                var msg;
                if(node.id === '(end)') {
                    // unexpected end of buffer
                    msg = "Syntax error: expected '" + id + "' before end of expression";
                } else {
                    msg = "Syntax error: expected '" + id + "', got '" + node.id;
                }
                throw {
                    message: msg ,
                    stack: (new Error()).stack,
                    position: node.position,
                    token: node.id,
                    value: id
                };
            }
            var next_token = lexer();
            if (next_token === null) {
                node = symbol_table["(end)"];
                return node;
            }
            var value = next_token.value;
            var type = next_token.type;
            var symbol;
            switch (type) {
                case 'name':
                case 'variable':
                    symbol = symbol_table["(name)"];
                    break;
                case 'operator':
                    symbol = symbol_table[value];
                    if (!symbol) {
                        throw {
                            message: "Unknown operator: " + value,
                            stack: (new Error()).stack,
                            position: next_token.position,
                            token: value
                        };
                    }
                    break;
                case 'string':
                case 'number':
                case 'value':
                    type = "literal";
                    symbol = symbol_table["(literal)"];
                    break;
              /* istanbul ignore next */
                default:
                    throw {
                        message: "Unexpected token:" + value,
                        stack: (new Error()).stack,
                        position: next_token.position,
                        token: value
                    };
            }

            node = Object.create(symbol);
            node.value = value;
            node.type = type;
            node.position = next_token.position;
            return node;
        };

        // Pratt's algorithm
        var expression = function (rbp) {
            var left;
            var t = node;
            advance();
            left = t.nud();
            while (rbp < node.lbp) {
                t = node;
                advance();
                left = t.led(left);
            }
            return left;
        };

        // match infix operators
        // <expression> <operator> <expression>
        // left associative
        var infix = function (id, bp, led) {
            var bindingPower = bp || operators[id];
            var s = symbol(id, bindingPower);
            s.led = led || function (left) {
                this.lhs = left;
                this.rhs = expression(bindingPower);
                this.type = "binary";
                return this;
            };
            return s;
        };

        // match infix operators
        // <expression> <operator> <expression>
        // right associative
        var infixr = function (id, bp, led) {
            var bindingPower = bp || operators[id];
            var s = symbol(id, bindingPower);
            s.led = led || function (left) {
                this.lhs = left;
                this.rhs = expression(bindingPower - 1); // subtract 1 from bindingPower for right associative operators
                this.type = "binary";
                return this;
            };
            return s;
        };

        // match prefix operators
        // <operator> <expression>
        var prefix = function (id, nud) {
            var s = symbol(id);
            s.nud = nud || function () {
                this.expression = expression(70);
                this.type = "unary";
                return this;
            };
            return s;
        };

        symbol("(end)");
        symbol("(name)");
        symbol("(literal)");
        symbol(":");
        symbol(";");
        symbol(",");
        symbol(")");
        symbol("]");
        symbol("}");
        symbol(".."); // range operator
        infix("."); // field reference
        infix("+"); // numeric addition
        infix("-"); // numeric subtraction
        infix("*"); // numeric multiplication
        infix("/"); // numeric division
        infix("%"); // numeric modulus
        infix("="); // equality
        infix("<"); // less than
        infix(">"); // greater than
        infix("!="); // not equal to
        infix("<="); // less than or equal
        infix(">="); // greater than or equal
        infix("&"); // string concatenation
        infix("and"); // Boolean AND
        infix("or"); // Boolean OR
        infix("in"); // is member of array
        infixr(":="); // bind variable
        prefix("-"); // unary numeric negation

        // field wildcard (single level)
        prefix('*', function () {
            this.type = "wildcard";
            return this;
        });

        // descendant wildcard (multi-level)
        prefix('**', function () {
            this.type = "descendant";
            return this;
        });

        // function invocation
        infix("(", operators['('], function (left) {
            // left is is what we are trying to invoke
            this.procedure = left;
            this.type = 'function';
            this.arguments = [];
            if (node.id !== ')') {
                for (;;) {
                    if (node.type === 'operator' && node.id === '?') {
                        // partial function application
                        this.type = 'partial';
                        this.arguments.push(node);
                        advance('?');
                    } else {
                        this.arguments.push(expression(0));
                    }
                    if (node.id !== ',') break;
                    advance(',');
                }
            }
            advance(")");
            // if the name of the function is 'function' or λ, then this is function definition (lambda function)
            if (left.type === 'name' && (left.value === 'function' || left.value === '\u03BB')) {
                // all of the args must be VARIABLE tokens
                this.arguments.forEach(function (arg, index) {
                    if (arg.type !== 'variable') {
                        throw {
                            message: 'Parameter ' + (index + 1) + ' of function definition must be a variable name (start with $)',
                            stack: (new Error()).stack,
                            position: arg.position,
                            token: arg.value
                        };
                    }
                });
                this.type = 'lambda';
                // parse the function body
                advance('{');
                this.body = expression(0);
                advance('}');
            }
            return this;
        });

        // parenthesis - block expression
        prefix("(", function () {
            var expressions = [];
            while (node.id !== ")") {
                expressions.push(expression(0));
                if (node.id !== ";") {
                    break;
                }
                advance(";");
            }
            advance(")");
            this.type = 'block';
            this.expressions = expressions;
            return this;
        });

        // array constructor
        prefix("[", function () {
            var a = [];
            if (node.id !== "]") {
                for (;;) {
                    var item = expression(0);
                    if (node.id === "..") {
                        // range operator
                        var range = {type: "binary", value: "..", position: node.position, lhs: item};
                        advance("..");
                        range.rhs = expression(0);
                        item = range;
                    }
                    a.push(item);
                    if (node.id !== ",") {
                        break;
                    }
                    advance(",");
                }
            }
            advance("]");
            this.lhs = a;
            this.type = "unary";
            return this;
        });

        // filter - predicate or array index
        infix("[", operators['['], function (left) {
            if(node.id === "]") {
                // empty predicate means maintain singleton arrays in the output
                var step = left;
                while(step && step.type === 'binary' && step.value === '[') {
                    step = step.lhs;
                }
                step.keepArray = true;
                advance("]");
                return left;
            } else {
                this.lhs = left;
                this.rhs = expression(operators[']']);
                this.type = 'binary';
                advance("]");
                return this;
            }
        });

        var objectParser = function (left) {
            var a = [];
            if (node.id !== "}") {
                for (;;) {
                    var n = expression(0);
                    advance(":");
                    var v = expression(0);
                    a.push([n, v]); // holds an array of name/value expression pairs
                    if (node.id !== ",") {
                        break;
                    }
                    advance(",");
                }
            }
            advance("}");
            if(typeof left === 'undefined') {
                // NUD - unary prefix form
                this.lhs = a;
                this.type = "unary";
            } else {
                // LED - binary infix form
                this.lhs = left;
                this.rhs = a;
                this.type = 'binary';
            }
            return this;
        };

        // object constructor
        prefix("{", objectParser);

        // object grouping
        infix("{", operators['{'], objectParser);

        // if/then/else ternary operator ?:
        infix("?", operators['?'], function (left) {
            this.type = 'condition';
            this.condition = left;
            this.then = expression(0);
            if (node.id === ':') {
                // else condition
                advance(":");
                this.else = expression(0);
            }
            return this;
        });

        // tail call optimization
        // this is invoked by the post parser to analyse lambda functions to see
        // if they make a tail call.  If so, it is replaced by a thunk which will
        // be invoked by the trampoline loop during function application.
        // This enables tail-recursive functions to be written without growing the stack
        var tail_call_optimize = function(expr) {
            var result;
            if(expr.type === 'function') {
                var thunk = {type: 'lambda', thunk: true, arguments: [], position: expr.position};
                thunk.body = expr;
                result = thunk;
            } else if(expr.type === 'condition') {
                // analyse both branches
                expr.then = tail_call_optimize(expr.then);
                expr.else = tail_call_optimize(expr.else);
                result = expr;
            } else if(expr.type === 'block') {
                // only the last expression in the block
                var length = expr.expressions.length;
                if(length > 0) {
                    expr.expressions[length - 1] = tail_call_optimize(expr.expressions[length - 1]);
                }
                result = expr;
            } else {
                result = expr;
            }
            return result;
        };

        // post-parse stage
        // the purpose of this is flatten the parts of the AST representing location paths,
        // converting them to arrays of steps which in turn may contain arrays of predicates.
        // following this, nodes containing '.' and '[' should be eliminated from the AST.
        var post_parse = function (expr) {
            var result = [];
            switch (expr.type) {
                case 'binary':
                    switch (expr.value) {
                        case '.':
                            var lstep = post_parse(expr.lhs);
                            if (lstep.type === 'path') {
                                Array.prototype.push.apply(result, lstep);
                            } else {
                                result.push(lstep);
                            }
                            var rest = post_parse(expr.rhs);
                            if(rest.type !== 'path') {
                                rest = [rest];
                            }
                            Array.prototype.push.apply(result, rest);
                            result.type = 'path';
                            break;
                        case '[':
                            // predicated step
                            // LHS is a step or a predicated step
                            // RHS is the predicate expr
                            result = post_parse(expr.lhs);
                            var step = result;
                            if(result.type === 'path') {
                                step = result[result.length - 1];
                            }
                            if (typeof step.group !== 'undefined') {
                                throw {
                                    message: 'A predicate cannot follow a grouping expression in a step. Error at column: ' + expr.position,
                                    stack: (new Error()).stack,
                                    position: expr.position
                                };
                            }
                            if (typeof step.predicate === 'undefined') {
                                step.predicate = [];
                            }
                            step.predicate.push(post_parse(expr.rhs));
                            break;
                        case '{':
                            // group-by
                            // LHS is a step or a predicated step
                            // RHS is the object constructor expr
                            result = post_parse(expr.lhs);
                            if (typeof result.group !== 'undefined') {
                                throw {
                                    message: 'Each step can only have one grouping expression. Error at column: ' + expr.position,
                                    stack: (new Error()).stack,
                                    position: expr.position
                                };
                            }
                            // object constructor - process each pair
                            result.group = {
                                lhs: expr.rhs.map(function (pair) {
                                    return [post_parse(pair[0]), post_parse(pair[1])];
                                }),
                                position: expr.position
                            };
                            break;
                        default:
                            result = {type: expr.type, value: expr.value, position: expr.position};
                            result.lhs = post_parse(expr.lhs);
                            result.rhs = post_parse(expr.rhs);
                    }
                    break;
                case 'unary':
                    result = {type: expr.type, value: expr.value, position: expr.position};
                    if (expr.value === '[') {
                        // array constructor - process each item
                        result.lhs = expr.lhs.map(function (item) {
                            return post_parse(item);
                        });
                    } else if (expr.value === '{') {
                        // object constructor - process each pair
                        result.lhs = expr.lhs.map(function (pair) {
                            return [post_parse(pair[0]), post_parse(pair[1])];
                        });
                    } else {
                        // all other unary expressions - just process the expression
                        result.expression = post_parse(expr.expression);
                        // if unary minus on a number, then pre-process
                        if (expr.value === '-' && result.expression.type === 'literal' && isNumeric(result.expression.value)) {
                            result = result.expression;
                            result.value = -result.value;
                        }
                    }
                    break;
                case 'function':
                case 'partial':
                    result = {type: expr.type, name: expr.name, value: expr.value, position: expr.position};
                    result.arguments = expr.arguments.map(function (arg) {
                        return post_parse(arg);
                    });
                    result.procedure = post_parse(expr.procedure);
                    break;
                case 'lambda':
                    result = {type: expr.type, arguments: expr.arguments, position: expr.position};
                    var body = post_parse(expr.body);
                    result.body = tail_call_optimize(body);
                    break;
                case 'condition':
                    result = {type: expr.type, position: expr.position};
                    result.condition = post_parse(expr.condition);
                    result.then = post_parse(expr.then);
                    if (typeof expr.else !== 'undefined') {
                        result.else = post_parse(expr.else);
                    }
                    break;
                case 'block':
                    result = {type: expr.type, position: expr.position};
                    // array of expressions - process each one
                    result.expressions = expr.expressions.map(function (item) {
                        return post_parse(item);
                    });
                    // TODO scan the array of expressions to see if any of them assign variables
                    // if so, need to mark the block as one that needs to create a new frame
                    break;
                case 'name':
                    result = [expr];
                    result.type = 'path';
                    break;
                case 'literal':
                case 'wildcard':
                case 'descendant':
                case 'variable':
                    result = expr;
                    break;
                case 'operator':
                    // the tokens 'and' and 'or' might have been used as a name rather than an operator
                    if (expr.value === 'and' || expr.value === 'or' || expr.value === 'in') {
                        expr.type = 'name';
                        result = post_parse(expr);
                    } else if (expr.value === '?') {
                        // partial application
                        result = expr;
                    } else {
                        throw {
                            message: "Syntax error: " + expr.value,
                            stack: (new Error()).stack,
                            position: expr.position,
                            token: expr.value
                        };
                    }
                    break;
                default:
                    var reason = "Unknown expression type: " + expr.value;
                    /* istanbul ignore else */
                    if (expr.id === '(end)') {
                        reason = "Syntax error: unexpected end of expression";
                    }
                    throw {
                        message: reason,
                        stack: (new Error()).stack,
                        position: expr.position,
                        token: expr.value
                    };
            }
            return result;
        };

        // now invoke the tokenizer and the parser and return the syntax tree

        lexer = tokenizer(source);
        advance();
        // parse the tokens
        var expr = expression(0);
        if (node.id !== '(end)') {
            throw {
                message: "Syntax error: " + node.value,
                stack: (new Error()).stack,
                position: node.position,
                token: node.value
            };
        }
        expr = post_parse(expr);

        return expr;
    };

    /**
     * Check if value is a finite number
     * @param {float} n - number to evaluate
     * @returns {boolean} True if n is a finite number
     */
    function isNumeric(n) {
        var isNum = false;
        if(typeof n === 'number') {
            var num = parseFloat(n);
            isNum = !isNaN(num);
            if (isNum && !isFinite(num)) {
                throw {
                    message: "Number out of range",
                    value: n,
                    stack: (new Error()).stack
                };
            }
        }
        return isNum;
    }

    /**
     * Returns true if the arg is an array of numbers
     * @param {*} arg - the item to test
     * @returns {boolean} True if arg is an array of numbers
     */
    function isArrayOfNumbers(arg) {
        var result = false;
        if(Array.isArray(arg)) {
            result = (arg.filter(function(item){return !isNumeric(item);}).length == 0);
        }
        return result;
    }

    // Polyfill
    /* istanbul ignore next */
    Number.isInteger = Number.isInteger || function(value) {
        return typeof value === "number" &&
            isFinite(value) &&
            Math.floor(value) === value;
    };

    /**
     * Evaluate expression against input data
     * @param {Object} expr - JSONata expression
     * @param {Object} input - Input data to evaluate against
     * @param {Object} environment - Environment
     * @returns {*} Evaluated input data
     */
    function evaluate(expr, input, environment) {
        var result;

        var entryCallback = environment.lookup('__evaluate_entry');
        if(entryCallback) {
            entryCallback(expr, input, environment);
        }

        switch (expr.type) {
            case 'path':
                result = evaluatePath(expr, input, environment);
                break;
            case 'binary':
                result = evaluateBinary(expr, input, environment);
                break;
            case 'unary':
                result = evaluateUnary(expr, input, environment);
                break;
            case 'name':
                result = evaluateName(expr, input, environment);
                break;
            case 'literal':
                result = evaluateLiteral(expr, input, environment);
                break;
            case 'wildcard':
                result = evaluateWildcard(expr, input, environment);
                break;
            case 'descendant':
                result = evaluateDescendants(expr, input, environment);
                break;
            case 'condition':
                result = evaluateCondition(expr, input, environment);
                break;
            case 'block':
                result = evaluateBlock(expr, input, environment);
                break;
            case 'function':
                result = evaluateFunction(expr, input, environment);
                break;
            case 'variable':
                result = evaluateVariable(expr, input, environment);
                break;
            case 'lambda':
                result = evaluateLambda(expr, input, environment);
                break;
            case 'partial':
                result = evaluatePartialApplication(expr, input, environment);
                break;
        }
        if (expr.hasOwnProperty('predicate')) {
            result = applyPredicates(expr.predicate, result, environment);
        }
        if (expr.hasOwnProperty('group')) {
            result = evaluateGroupExpression(expr.group, result, environment);
        }

        var exitCallback = environment.lookup('__evaluate_exit');
        if(exitCallback) {
            exitCallback(expr, input, environment, result);
        }

        return result;
    }

    /**
     * Evaluate path expression against input data
     * @param {Object} expr - JSONata expression
     * @param {Object} input - Input data to evaluate against
     * @param {Object} environment - Environment
     * @returns {*} Evaluated input data
     */
    function evaluatePath(expr, input, environment) {
        var result;
        var inputSequence;
        var keepSingletonArray = false;
        // expr is an array of steps
        // if the first step is a variable reference ($...), including root reference ($$),
        //   then the path is absolute rather than relative
        if (expr[0].type === 'variable') {
            expr[0].absolute = true;
        } else if(expr[0].type === 'unary' && expr[0].value === '[') {
            // array constructor - not relative to the input
            input = [null];// dummy singleton sequence for first step
        }

        // evaluate each step in turn
        for(var ii = 0; ii < expr.length; ii++) {
            var step = expr[ii];
            if(step.keepArray === true) {
                keepSingletonArray = true;
            }
            var resultSequence = [];
            result = undefined;
            // if input is not an array, make it so
            if (step.absolute === true) {
                inputSequence = [input]; // dummy singleton sequence for first (absolute) step
            } else if (Array.isArray(input)) {
                inputSequence = input;
            } else {
                inputSequence = [input];
            }
            // if there is more than one step in the path, handle quoted field names as names not literals
            if (expr.length > 1 && step.type === 'literal') {
                step.type = 'name';
            }
            inputSequence.forEach(function (item) {
                var res = evaluate(step, item, environment);
                if (typeof res !== 'undefined') {
                    if (Array.isArray(res) && (step.value !== '[' )) {
                        // is res an array - if so, flatten it into the parent array
                        res.forEach(function (innerRes) {
                            if (typeof innerRes !== 'undefined') {
                                resultSequence.push(innerRes);
                            }
                        });
                    } else {
                        resultSequence.push(res);
                    }
                }
            });
            if (resultSequence.length == 1) {
                if(keepSingletonArray) {
                    result = resultSequence;
                } else {
                    result = resultSequence[0];
                }
            } else if (resultSequence.length > 1) {
                result = resultSequence;
            }

            if(typeof result === 'undefined') {
                break;
            }
            input = result;
        }
        return result;
    }

    /**
     * Apply predicates to input data
     * @param {Object} predicates - Predicates
     * @param {Object} input - Input data to apply predicates against
     * @param {Object} environment - Environment
     * @returns {*} Result after applying predicates
     */
    function applyPredicates(predicates, input, environment) {
        var result;
        var inputSequence = input;
        // lhs potentially holds an array
        // we want to iterate over the array, and only keep the items that are
        // truthy when applied to the predicate.
        // if the predicate evaluates to an integer, then select that index

        var results = [];
        predicates.forEach(function (predicate) {
            // if it's not an array, turn it into one
            // since in XPath >= 2.0 an item is equivalent to a singleton sequence of that item
            // if input is not an array, make it so
            if (!Array.isArray(inputSequence)) {
                inputSequence = [inputSequence];
            }
            results = [];
            result = undefined;
            if (predicate.type === 'literal' && isNumeric(predicate.value)) {
                var index = predicate.value;
                if (!Number.isInteger(index)) {
                    // round it down
                    index = Math.floor(index);
                }
                if (index < 0) {
                    // count in from end of array
                    index = inputSequence.length + index;
                }
                result = inputSequence[index];
            } else {
                inputSequence.forEach(function (item, index) {
                    var res = evaluate(predicate, item, environment);
                    if (isNumeric(res)) {
                        res = [res];
                    }
                    if(isArrayOfNumbers(res)) {
                        res.forEach(function(ires) {
                            if (!Number.isInteger(ires)) {
                                // round it down
                                ires = Math.floor(ires);
                            }
                            if (ires < 0) {
                                // count in from end of array
                                ires = inputSequence.length + ires;
                            }
                            if (ires == index) {
                                results.push(item);
                            }
                        });
                    } else if (functionBoolean(res)) { // truthy
                        results.push(item);
                    }
                });
            }
            if (results.length == 1) {
                result = results[0];
            } else if (results.length > 1) {
                result = results;
            }
            inputSequence = result;
        });
        return result;
    }

    /**
     * Evaluate binary expression against input data
     * @param {Object} expr - JSONata expression
     * @param {Object} input - Input data to evaluate against
     * @param {Object} environment - Environment
     * @returns {*} Evaluated input data
     */
    function evaluateBinary(expr, input, environment) {
        var result;

        switch (expr.value) {
            case '+':
            case '-':
            case '*':
            case '/':
            case '%':
                result = evaluateNumericExpression(expr, input, environment);
                break;
            case '=':
            case '!=':
            case '<':
            case '<=':
            case '>':
            case '>=':
                result = evaluateComparisonExpression(expr, input, environment);
                break;
            case '&':
                result = evaluateStringConcat(expr, input, environment);
                break;
            case 'and':
            case 'or':
                result = evaluateBooleanExpression(expr, input, environment);
                break;
            case '..':
                result = evaluateRangeExpression(expr, input, environment);
                break;
            case ':=':
                result = evaluateBindExpression(expr, input, environment);
                break;
            case 'in':
                result = evaluateIncludesExpression(expr, input, environment);
                break;
        }
        return result;
    }

    /**
     * Evaluate unary expression against input data
     * @param {Object} expr - JSONata expression
     * @param {Object} input - Input data to evaluate against
     * @param {Object} environment - Environment
     * @returns {*} Evaluated input data
     */
    function evaluateUnary(expr, input, environment) {
        var result;

        switch (expr.value) {
            case '-':
                result = evaluate(expr.expression, input, environment);
                if (isNumeric(result)) {
                    result = -result;
                } else {
                    throw {
                        message: "Cannot negate a non-numeric value: " + result,
                        stack: (new Error()).stack,
                        position: expr.position,
                        token: expr.value,
                        value: result
                    };
                }
                break;
            case '[':
                // array constructor - evaluate each item
                result = [];
                expr.lhs.forEach(function (item) {
                    var value = evaluate(item, input, environment);
                    if (typeof value !== 'undefined') {
                        if(item.value === '[') {
                            result.push(value);
                        } else {
                            result = functionAppend(result, value);
                        }
                    }
                });
                break;
            case '{':
                // object constructor - apply grouping
                result = evaluateGroupExpression(expr, input, environment);
                break;

        }
        return result;
    }

    /**
     * Evaluate name object against input data
     * @param {Object} expr - JSONata expression
     * @param {Object} input - Input data to evaluate against
     * @param {Object} environment - Environment
     * @returns {*} Evaluated input data
     */
    function evaluateName(expr, input, environment) {
        // lookup the 'name' item in the input
        var result;
        if (Array.isArray(input)) {
            var results = [];
            input.forEach(function (item) {
                var res = evaluateName(expr, item, environment);
                if (typeof res !== 'undefined') {
                    results.push(res);
                }
            });
            if (results.length == 1) {
                result = results[0];
            } else if (results.length > 1) {
                result = results;
            }
        } else if (input !== null && typeof input === 'object') {
            result = input[expr.value];
        }
        return result;
    }

    /**
     * Evaluate literal against input data
     * @param {Object} expr - JSONata expression
     * @returns {*} Evaluated input data
     */
    function evaluateLiteral(expr) {
        return expr.value;
    }

    /**
     * Evaluate wildcard against input data
     * @param {Object} expr - JSONata expression
     * @param {Object} input - Input data to evaluate against
     * @returns {*} Evaluated input data
     */
    function evaluateWildcard(expr, input) {
        var result;
        var results = [];
        if (input !== null && typeof input === 'object') {
            Object.keys(input).forEach(function (key) {
                var value = input[key];
                if(Array.isArray(value)) {
                    value = flatten(value);
                    results = functionAppend(results, value);
                } else {
                    results.push(value);
                }
            });
        }

        if (results.length == 1) {
            result = results[0];
        } else if (results.length > 1) {
            result = results;
        }
        return result;
    }

    /**
     * Returns a flattened array
     * @param {Array} arg - the array to be flatten
     * @param {Array} flattened - carries the flattened array - if not defined, will initialize to []
     * @returns {Array} - the flattened array
     */
    function flatten(arg, flattened) {
        if(typeof flattened === 'undefined') {
            flattened = [];
        }
        if(Array.isArray(arg)) {
            arg.forEach(function (item) {
                flatten(item, flattened);
            });
        } else {
            flattened.push(arg);
        }
        return flattened;
    }

    /**
     * Evaluate descendants against input data
     * @param {Object} expr - JSONata expression
     * @param {Object} input - Input data to evaluate against
     * @returns {*} Evaluated input data
     */
    function evaluateDescendants(expr, input) {
        var result;
        var resultSequence = [];
        if (typeof input !== 'undefined') {
            // traverse all descendants of this object/array
            recurseDescendants(input, resultSequence);
            if (resultSequence.length == 1) {
                result = resultSequence[0];
            } else {
                result = resultSequence;
            }
        }
        return result;
    }

    /**
     * Recurse through descendants
     * @param {Object} input - Input data
     * @param {Object} results - Results
     */
    function recurseDescendants(input, results) {
        // this is the equivalent of //* in XPath
        if (!Array.isArray(input)) {
            results.push(input);
        }
        if (Array.isArray(input)) {
            input.forEach(function (member) {
                recurseDescendants(member, results);
            });
        } else if (input !== null && typeof input === 'object') {
            Object.keys(input).forEach(function (key) {
                recurseDescendants(input[key], results);
            });
        }
    }

    /**
     * Evaluate numeric expression against input data
     * @param {Object} expr - JSONata expression
     * @param {Object} input - Input data to evaluate against
     * @param {Object} environment - Environment
     * @returns {*} Evaluated input data
     */
    function evaluateNumericExpression(expr, input, environment) {
        var result;

        var lhs = evaluate(expr.lhs, input, environment);
        var rhs = evaluate(expr.rhs, input, environment);

        if (typeof lhs === 'undefined' || typeof rhs === 'undefined') {
            // if either side is undefined, the result is undefined
            return result;
        }

        if (!isNumeric(lhs)) {
            throw {
                message: 'LHS of ' + expr.value + ' operator must evaluate to a number',
                stack: (new Error()).stack,
                position: expr.position,
                token: expr.value,
                value: lhs
            };
        }
        if (!isNumeric(rhs)) {
            throw {
                message: 'RHS of ' + expr.value + ' operator must evaluate to a number',
                stack: (new Error()).stack,
                position: expr.position,
                token: expr.value,
                value: rhs
            };
        }

        switch (expr.value) {
            case '+':
                result = lhs + rhs;
                break;
            case '-':
                result = lhs - rhs;
                break;
            case '*':
                result = lhs * rhs;
                break;
            case '/':
                result = lhs / rhs;
                break;
            case '%':
                result = lhs % rhs;
                break;
        }
        return result;
    }

    /**
     * Evaluate comparison expression against input data
     * @param {Object} expr - JSONata expression
     * @param {Object} input - Input data to evaluate against
     * @param {Object} environment - Environment
     * @returns {*} Evaluated input data
     */
    function evaluateComparisonExpression(expr, input, environment) {
        var result;

        var lhs = evaluate(expr.lhs, input, environment);
        var rhs = evaluate(expr.rhs, input, environment);

        if (typeof lhs === 'undefined' || typeof rhs === 'undefined') {
            // if either side is undefined, the result is false
            return false;
        }

        switch (expr.value) {
            case '=':
                result = lhs == rhs;
                break;
            case '!=':
                result = (lhs != rhs);
                break;
            case '<':
                result = lhs < rhs;
                break;
            case '<=':
                result = lhs <= rhs;
                break;
            case '>':
                result = lhs > rhs;
                break;
            case '>=':
                result = lhs >= rhs;
                break;
        }
        return result;
    }

    /**
     * Inclusion operator - in
     *
     * @param {Object} expr - AST
     * @param {*} input - input context
     * @param {Object} environment - frame
     * @returns {boolean} - true if lhs is a member of rhs
     */
    function evaluateIncludesExpression(expr, input, environment) {
        var result = false;

        var lhs = evaluate(expr.lhs, input, environment);
        var rhs = evaluate(expr.rhs, input, environment);

        if (typeof lhs === 'undefined' || typeof rhs === 'undefined') {
            // if either side is undefined, the result is false
            return false;
        }

        if(!Array.isArray(rhs)) {
            rhs = [rhs];
        }

        for(var i = 0; i < rhs.length; i++) {
            if(rhs[i] === lhs) {
                result = true;
                break;
            }
        }

        return result;
    }

    /**
     * Evaluate boolean expression against input data
     * @param {Object} expr - JSONata expression
     * @param {Object} input - Input data to evaluate against
     * @param {Object} environment - Environment
     * @returns {*} Evaluated input data
     */
    function evaluateBooleanExpression(expr, input, environment) {
        var result;

        switch (expr.value) {
            case 'and':
                result = functionBoolean(evaluate(expr.lhs, input, environment)) &&
                  functionBoolean(evaluate(expr.rhs, input, environment));
                break;
            case 'or':
                result = functionBoolean(evaluate(expr.lhs, input, environment)) ||
                  functionBoolean(evaluate(expr.rhs, input, environment));
                break;
        }
        return result;
    }

    /**
     * Evaluate string concatenation against input data
     * @param {Object} expr - JSONata expression
     * @param {Object} input - Input data to evaluate against
     * @param {Object} environment - Environment
     * @returns {string|*} Evaluated input data
     */
    function evaluateStringConcat(expr, input, environment) {
        var result;
        var lhs = evaluate(expr.lhs, input, environment);
        var rhs = evaluate(expr.rhs, input, environment);

        var lstr = '';
        var rstr = '';
        if (typeof lhs !== 'undefined') {
            lstr = functionString(lhs);
        }
        if (typeof rhs !== 'undefined') {
            rstr = functionString(rhs);
        }

        result = lstr.concat(rstr);
        return result;
    }

    /**
     * Evaluate group expression against input data
     * @param {Object} expr - JSONata expression
     * @param {Object} input - Input data to evaluate against
     * @param {Object} environment - Environment
     * @returns {{}} Evaluated input data
     */
    function evaluateGroupExpression(expr, input, environment) {
        var result = {};
        var groups = {};
        // group the input sequence by 'key' expression
        if (!Array.isArray(input)) {
            input = [input];
        }
        input.forEach(function (item) {
            expr.lhs.forEach(function (pair) {
                var key = evaluate(pair[0], item, environment);
                // key has to be a string
                if (typeof  key !== 'string') {
                    throw {
                        message: 'Key in object structure must evaluate to a string. Got: ' + key,
                        stack: (new Error()).stack,
                        position: expr.position,
                        value: key
                    };
                }
                var entry = {data: item, expr: pair[1]};
                if (groups.hasOwnProperty(key)) {
                    // a value already exists in this slot
                    // append it as an array
                    groups[key].data = functionAppend(groups[key].data, item);
                } else {
                    groups[key] = entry;
                }
            });
        });
        // iterate over the groups to evaluate the 'value' expression
        for (var key in groups) {
            var entry = groups[key];
            var value = evaluate(entry.expr, entry.data, environment);
            result[key] = value;
        }
        return result;
    }

    /**
     * Evaluate range expression against input data
     * @param {Object} expr - JSONata expression
     * @param {Object} input - Input data to evaluate against
     * @param {Object} environment - Environment
     * @returns {*} Evaluated input data
     */
    function evaluateRangeExpression(expr, input, environment) {
        var result;

        var lhs = evaluate(expr.lhs, input, environment);
        var rhs = evaluate(expr.rhs, input, environment);

        if (typeof lhs === 'undefined' || typeof rhs === 'undefined') {
            // if either side is undefined, the result is undefined
            return result;
        }

        if (lhs > rhs) {
            // if the lhs is greater than the rhs, return undefined
            return result;
        }

        if (!Number.isInteger(lhs)) {
            throw {
                message: 'LHS of range operator (..) must evaluate to an integer',
                stack: (new Error()).stack,
                position: expr.position,
                token: expr.value,
                value: lhs
            };
        }
        if (!Number.isInteger(rhs)) {
            throw {
                message: 'RHS of range operator (..) must evaluate to an integer',
                stack: (new Error()).stack,
                position: expr.position,
                token: expr.value,
                value: rhs
            };
        }

        result = new Array(rhs - lhs + 1);
        for (var item = lhs, index = 0; item <= rhs; item++, index++) {
            result[index] = item;
        }
        return result;
    }

    /**
     * Evaluate bind expression against input data
     * @param {Object} expr - JSONata expression
     * @param {Object} input - Input data to evaluate against
     * @param {Object} environment - Environment
     * @returns {*} Evaluated input data
     */
    function evaluateBindExpression(expr, input, environment) {
        // The RHS is the expression to evaluate
        // The LHS is the name of the variable to bind to - should be a VARIABLE token
        var value = evaluate(expr.rhs, input, environment);
        if (expr.lhs.type !== 'variable') {
            throw {
                message: "Left hand side of := must be a variable name (start with $)",
                stack: (new Error()).stack,
                position: expr.position,
                token: expr.value,
                value: expr.lhs.type === 'path' ? expr.lhs[0].value : expr.lhs.value
            };
        }
        environment.bind(expr.lhs.value, value);
        return value;
    }

    /**
     * Evaluate condition against input data
     * @param {Object} expr - JSONata expression
     * @param {Object} input - Input data to evaluate against
     * @param {Object} environment - Environment
     * @returns {*} Evaluated input data
     */
    function evaluateCondition(expr, input, environment) {
        var result;
        var condition = evaluate(expr.condition, input, environment);
        if (functionBoolean(condition)) {
            result = evaluate(expr.then, input, environment);
        } else if (typeof expr.else !== 'undefined') {
            result = evaluate(expr.else, input, environment);
        }
        return result;
    }

    /**
     * Evaluate block against input data
     * @param {Object} expr - JSONata expression
     * @param {Object} input - Input data to evaluate against
     * @param {Object} environment - Environment
     * @returns {*} Evaluated input data
     */
    function evaluateBlock(expr, input, environment) {
        var result;
        // create a new frame to limit the scope of variable assignments
        // TODO, only do this if the post-parse stage has flagged this as required
        var frame = createFrame(environment);
        // invoke each expression in turn
        // only return the result of the last one
        expr.expressions.forEach(function (expression) {
            result = evaluate(expression, input, frame);
        });

        return result;
    }

    /**
     * Evaluate variable against input data
     * @param {Object} expr - JSONata expression
     * @param {Object} input - Input data to evaluate against
     * @param {Object} environment - Environment
     * @returns {*} Evaluated input data
     */
    function evaluateVariable(expr, input, environment) {
        // lookup the variable value in the environment
        var result;
        // if the variable name is empty string, then it refers to context value
        if (expr.value === '') {
            result = input;
        } else {
            result = environment.lookup(expr.value);
        }
        return result;
    }

    /**
     * Evaluate function against input data
     * @param {Object} expr - JSONata expression
     * @param {Object} input - Input data to evaluate against
     * @param {Object} environment - Environment
     * @returns {*} Evaluated input data
     */
    function evaluateFunction(expr, input, environment) {
        var result;
        // evaluate the arguments
        var evaluatedArgs = [];
        expr.arguments.forEach(function (arg) {
            evaluatedArgs.push(evaluate(arg, input, environment));
        });
        // lambda function on lhs
        // create the procedure
        // can't assume that expr.procedure is a lambda type directly
        // could be an expression that evaluates to a function (e.g. variable reference, parens expr etc.
        // evaluate it generically first, then check that it is a function.  Throw error if not.
        var proc = evaluate(expr.procedure, input, environment);

        if (typeof proc === 'undefined' && expr.procedure.type === 'path' && environment.lookup(expr.procedure[0].value)) {
            // help the user out here if they simply forgot the leading $
            throw {
                message: 'Attempted to invoke a non-function. Did you mean \'$' + expr.procedure[0].value + '\'?',
                stack: (new Error()).stack,
                position: expr.position,
                token: expr.procedure[0].value
            };
        }
        // apply the procedure
        try {
            result = apply(proc, evaluatedArgs, environment, input);
            while(typeof result === 'object' && result.lambda == true && result.thunk == true) {
                // trampoline loop - this gets invoked as a result of tail-call optimization
                // the function returned a tail-call thunk
                // unpack it, evaluate its arguments, and apply the tail call
                var next = evaluate(result.body.procedure, result.input, result.environment);
                evaluatedArgs = [];
                result.body.arguments.forEach(function (arg) {
                    evaluatedArgs.push(evaluate(arg, result.input, result.environment));
                });

                result = apply(next, evaluatedArgs);
            }
        } catch (err) {
            // add the position field to the error
            err.position = expr.position;
            // and the function identifier
            err.token = expr.procedure.type === 'path' ? expr.procedure[0].value : expr.procedure.value;
            throw err;
        }
        return result;
    }

    /**
     * Apply procedure or function
     * @param {Object} proc - Procedure
     * @param {Array} args - Arguments
     * @param {Object} environment - Environment
     * @param {Object} self - Self
     * @returns {*} Result of procedure
     */
    function apply(proc, args, environment, self) {
        var result;
        if (proc && proc.lambda) {
            result = applyProcedure(proc, args);
        } else if (typeof proc === 'function') {
            result = proc.apply(self, args);
        } else {
            throw {
                message: 'Attempted to invoke a non-function',
                stack: (new Error()).stack
            };
        }
        return result;
    }

    /**
     * Evaluate lambda against input data
     * @param {Object} expr - JSONata expression
     * @param {Object} input - Input data to evaluate against
     * @param {Object} environment - Environment
     * @returns {{lambda: boolean, input: *, environment: *, arguments: *, body: *}} Evaluated input data
     */
    function evaluateLambda(expr, input, environment) {
        // make a function (closure)
        var procedure = {
            lambda: true,
            input: input,
            environment: environment,
            arguments: expr.arguments,
            body: expr.body
        };
        if(expr.thunk == true) {
            procedure.thunk = true;
        }
        return procedure;
    }

    /**
     * Evaluate partial application
     * @param {Object} expr - JSONata expression
     * @param {Object} input - Input data to evaluate against
     * @param {Object} environment - Environment
     * @returns {*} Evaluated input data
     */
    function evaluatePartialApplication(expr, input, environment) {
        // partially apply a function
        var result;
        // evaluate the arguments
        var evaluatedArgs = [];
        expr.arguments.forEach(function (arg) {
            if (arg.type === 'operator' && arg.value === '?') {
                evaluatedArgs.push(arg);
            } else {
                evaluatedArgs.push(evaluate(arg, input, environment));
            }
        });
        // lookup the procedure
        var proc = evaluate(expr.procedure, input, environment);
        if (typeof proc === 'undefined' && expr.procedure.type === 'path' && environment.lookup(expr.procedure[0].value)) {
            // help the user out here if they simply forgot the leading $
            throw {
                message: 'Attempted to partially apply a non-function. Did you mean \'$' + expr.procedure[0].value + '\'?',
                stack: (new Error()).stack,
                position: expr.position,
                token: expr.procedure[0].value
            };
        }
        if (proc && proc.lambda) {
            result = partialApplyProcedure(proc, evaluatedArgs);
        } else if (typeof proc === 'function') {
            result = partialApplyNativeFunction(proc, evaluatedArgs);
        } else {
            throw {
                message: 'Attempted to partially apply a non-function',
                stack: (new Error()).stack,
                position: expr.position,
                token: expr.procedure.type === 'path' ? expr.procedure[0].value : expr.procedure.value
            };
        }
        return result;
    }

    /**
     * Apply procedure
     * @param {Object} proc - Procedure
     * @param {Array} args - Arguments
     * @returns {*} Result of procedure
     */
    function applyProcedure(proc, args) {
        var result;
        var env = createFrame(proc.environment);
        proc.arguments.forEach(function (param, index) {
            env.bind(param.value, args[index]);
        });
        if (typeof proc.body === 'function') {
            // this is a lambda that wraps a native function - generated by partially evaluating a native
            result = applyNativeFunction(proc.body, env);
        } else {
            result = evaluate(proc.body, proc.input, env);
        }
        return result;
    }

    /**
     * Partially apply procedure
     * @param {Object} proc - Procedure
     * @param {Array} args - Arguments
     * @returns {{lambda: boolean, input: *, environment: {bind, lookup}, arguments: Array, body: *}} Result of partially applied procedure
     */
    function partialApplyProcedure(proc, args) {
        // create a closure, bind the supplied parameters and return a function that takes the remaining (?) parameters
        var env = createFrame(proc.environment);
        var unboundArgs = [];
        proc.arguments.forEach(function (param, index) {
            var arg = args[index];
            if (arg && arg.type === 'operator' && arg.value === '?') {
                unboundArgs.push(param);
            } else {
                env.bind(param.value, arg);
            }
        });
        var procedure = {
            lambda: true,
            input: proc.input,
            environment: env,
            arguments: unboundArgs,
            body: proc.body
        };
        return procedure;
    }

    /**
     * Partially apply native function
     * @param {Function} native - Native function
     * @param {Array} args - Arguments
     * @returns {{lambda: boolean, input: *, environment: {bind, lookup}, arguments: Array, body: *}} Result of partially applying native function
     */
    function partialApplyNativeFunction(native, args) {
        // create a lambda function that wraps and invokes the native function
        // get the list of declared arguments from the native function
        // this has to be picked out from the toString() value
        var sigArgs = getNativeFunctionArguments(native);
        sigArgs = sigArgs.map(function (sigArg) {
            return '$' + sigArg.trim();
        });
        var body = 'function(' + sigArgs.join(', ') + '){ _ }';

        var bodyAST = parser(body);
        bodyAST.body = native;

        var partial = partialApplyProcedure(bodyAST, args);
        return partial;
    }

    /**
     * Apply native function
     * @param {Object} proc - Procedure
     * @param {Object} env - Environment
     * @returns {*} Result of applying native function
     */
    function applyNativeFunction(proc, env) {
        var sigArgs = getNativeFunctionArguments(proc);
        // generate the array of arguments for invoking the function - look them up in the environment
        var args = sigArgs.map(function (sigArg) {
            return env.lookup(sigArg.trim());
        });

        var result = proc.apply(null, args);
        return result;
    }

    /**
     * Get native function arguments
     * @param {Function} func - Function
     * @returns {*|Array} Native function arguments
     */
    function getNativeFunctionArguments(func) {
        var signature = func.toString();
        var sigParens = /\(([^\)]*)\)/.exec(signature)[1]; // the contents of the parens
        var sigArgs = sigParens.split(',');
        return sigArgs;
    }

    /**
     * Tests whether arg is a lambda function
     * @param {*} arg - the value to test
     * @returns {boolean} - true if it is a lambda function
     */
    function isLambda(arg) {
        var result = false;
        if(arg && typeof arg === 'object' &&
          arg.lambda === true &&
          arg.hasOwnProperty('input') &&
          arg.hasOwnProperty('arguments') &&
          arg.hasOwnProperty('environment') &&
          arg.hasOwnProperty('body')) {
            result = true;
        }

        return result;
    }

    /**
     * Sum function
     * @param {Object} args - Arguments
     * @returns {number} Total value of arguments
     */
    function functionSum(args) {
        var total = 0;

        if (arguments.length != 1) {
            throw {
                message: 'The sum function expects one argument',
                stack: (new Error()).stack
            };
        }

        // undefined inputs always return undefined
        if(typeof args === 'undefined') {
            return undefined;
        }

        if(!Array.isArray(args)) {
            args = [args];
        }

        // it must be an array of numbers
        var nonNumerics = args.filter(function(val) {return (typeof val !== 'number');});
        if(nonNumerics.length > 0) {
            throw {
                message: 'Type error: argument of sum function must be an array of numbers',
                stack: (new Error()).stack,
                value: nonNumerics
            };
        }
        args.forEach(function(num){total += num;});
        return total;
    }

    /**
     * Count function
     * @param {Object} args - Arguments
     * @returns {number} Number of elements in the array
     */
    function functionCount(args) {
        if (arguments.length != 1) {
            throw {
                message: 'The count function expects one argument',
                stack: (new Error()).stack
            };
        }

        // undefined inputs always return undefined
        if(typeof args === 'undefined') {
            return 0;
        }

        if(!Array.isArray(args)) {
            args = [args];
        }

        return args.length;
    }

    /**
     * Max function
     * @param {Object} args - Arguments
     * @returns {number} Max element in the array
     */
    function functionMax(args) {
        var max;

        if (arguments.length != 1) {
            throw {
                message: 'The max function expects one argument',
                stack: (new Error()).stack
            };
        }

        // undefined inputs always return undefined
        if(typeof args === 'undefined') {
            return undefined;
        }

        if(!Array.isArray(args)) {
            args = [args];
        }

        // it must be an array of numbers
        var nonNumerics = args.filter(function(val) {return (typeof val !== 'number');});
        if(nonNumerics.length > 0) {
            throw {
                message: 'Type error: argument of max function must be an array of numbers',
                stack: (new Error()).stack,
                value: nonNumerics
            };
        }
        max = Math.max.apply(Math, args);
        return max;
    }

    /**
     * Min function
     * @param {Object} args - Arguments
     * @returns {number} Min element in the array
     */
    function functionMin(args) {
        var min;

        if (arguments.length != 1) {
            throw {
                message: 'The min function expects one argument',
                stack: (new Error()).stack
            };
        }

        // undefined inputs always return undefined
        if(typeof args === 'undefined') {
            return undefined;
        }

        if(!Array.isArray(args)) {
            args = [args];
        }

        // it must be an array of numbers
        var nonNumerics = args.filter(function(val) {return (typeof val !== 'number');});
        if(nonNumerics.length > 0) {
            throw {
                message: 'Type error: argument of min function must be an array of numbers',
                stack: (new Error()).stack,
                value: nonNumerics
            };
        }
        min = Math.min.apply(Math, args);
        return min;
    }

    /**
     * Average function
     * @param {Object} args - Arguments
     * @returns {number} Average element in the array
     */
    function functionAverage(args) {
        var total = 0;

        if (arguments.length != 1) {
            throw {
                message: 'The average function expects one argument',
                stack: (new Error()).stack
            };
        }

        // undefined inputs always return undefined
        if(typeof args === 'undefined') {
            return undefined;
        }

        if(!Array.isArray(args)) {
            args = [args];
        }

        // it must be an array of numbers
        var nonNumerics = args.filter(function(val) {return (typeof val !== 'number');});
        if(nonNumerics.length > 0) {
            throw {
                message: 'Type error: argument of average function must be an array of numbers',
                stack: (new Error()).stack,
                value: nonNumerics
            };
        }
        args.forEach(function(num){total += num;});
        return total/args.length;
    }

    /**
     * Stingify arguments
     * @param {Object} arg - Arguments
     * @returns {String} String from arguments
     */
    function functionString(arg) {
        var str;

        if(arguments.length != 1) {
            throw {
                message: 'The string function expects one argument',
                stack: (new Error()).stack
            };
        }

        // undefined inputs always return undefined
        if(typeof arg === 'undefined') {
            return undefined;
        }

        if (typeof arg === 'string') {
            // already a string
            str = arg;
        } else if(typeof arg === 'function' || isLambda(arg)) {
            // functions (built-in and lambda convert to empty string
            str = '';
        } else if (typeof arg === 'number' && !isFinite(arg)) {
            throw {
                message: "Attempting to invoke string function on Infinity or NaN",
                value: arg,
                stack: (new Error()).stack
            };
        } else
            str = JSON.stringify(arg, function (key, val) {
                return (typeof val !== 'undefined' && val !== null && val.toPrecision && isNumeric(val)) ? Number(val.toPrecision(13)) :
                  (val && isLambda(val)) ? '' :
                    (typeof val === 'function') ? '' : val;
            });
        return str;
    }

    /**
     * Create substring based on character number and length
     * @param {String} str - String to evaluate
     * @param {Integer} start - Character number to start substring
     * @param {Integer} [length] - Number of characters in substring
     * @returns {string|*} Substring
     */
    function functionSubstring(str, start, length) {
        if(arguments.length != 2 && arguments.length != 3) {
            throw {
                message: 'The substring function expects two or three arguments',
                stack: (new Error()).stack
            };
        }

        // undefined inputs always return undefined
        if(typeof str === 'undefined') {
            return undefined;
        }

        // otherwise it must be a string
        if(typeof str !== 'string') {
            throw {
                message: 'Type error: first argument of substring function must evaluate to a string',
                stack: (new Error()).stack,
                value: str
            };
        }

        if(typeof start !== 'number') {
            throw {
                message: 'Type error: second argument of substring function must evaluate to a number',
                stack: (new Error()).stack,
                value: start
            };
        }

        if(typeof length !== 'undefined' && typeof length !== 'number') {
            throw {
                message: 'Type error: third argument of substring function must evaluate to a number',
                stack: (new Error()).stack,
                value: length
            };
        }

        return str.substr(start, length);
    }

    /**
     * Create substring up until a character
     * @param {String} str - String to evaluate
     * @param {String} chars - Character to define substring boundary
     * @returns {*} Substring
     */
    function functionSubstringBefore(str, chars) {
        if(arguments.length != 2) {
            throw {
                message: 'The substringBefore function expects two arguments',
                stack: (new Error()).stack
            };
        }

        // undefined inputs always return undefined
        if(typeof str === 'undefined') {
            return undefined;
        }

        // otherwise it must be a string
        if(typeof str !== 'string') {
            throw {
                message: 'Type error: first argument of substringBefore function must evaluate to a string',
                stack: (new Error()).stack,
                value: str
            };
        }
        if(typeof chars !== 'string') {
            throw {
                message: 'Type error: second argument of substringBefore function must evaluate to a string',
                stack: (new Error()).stack,
                value: chars
            };
        }

        var pos = str.indexOf(chars);
        if (pos > -1) {
            return str.substr(0, pos);
        } else {
            return str;
        }
    }

    /**
     * Create substring after a character
     * @param {String} str - String to evaluate
     * @param {String} chars - Character to define substring boundary
     * @returns {*} Substring
     */
    function functionSubstringAfter(str, chars) {
        if(arguments.length != 2) {
            throw {
                message: 'The substringAfter function expects two arguments',
                stack: (new Error()).stack
            };
        }

        // undefined inputs always return undefined
        if(typeof str === 'undefined') {
            return undefined;
        }

        // otherwise it must be a string
        if(typeof str !== 'string') {
            throw {
                message: 'Type error: first argument of substringAfter function must evaluate to a string',
                stack: (new Error()).stack,
                value: str
            };
        }
        if(typeof chars !== 'string') {
            throw {
                message: 'Type error: second argument of substringAfter function must evaluate to a string',
                stack: (new Error()).stack,
                value: chars
            };
        }

        var pos = str.indexOf(chars);
        if (pos > -1) {
            return str.substr(pos + chars.length);
        } else {
            return str;
        }
    }

    /**
     * Lowercase a string
     * @param {String} str - String to evaluate
     * @returns {string} Lowercase string
     */
    function functionLowercase(str) {
        if(arguments.length != 1) {
            throw {
                message: 'The lowercase function expects one argument',
                stack: (new Error()).stack
            };
        }

        // undefined inputs always return undefined
        if(typeof str === 'undefined') {
            return undefined;
        }

        // otherwise it must be a string
        if(typeof str !== 'string') {
            throw {
                message: 'Type error: argument of lowercase function must evaluate to a string',
                stack: (new Error()).stack,
                value: str
            };
        }

        return str.toLowerCase();
    }

    /**
     * Uppercase a string
     * @param {String} str - String to evaluate
     * @returns {string} Uppercase string
     */
    function functionUppercase(str) {
        if(arguments.length != 1) {
            throw {
                message: 'The uppercase function expects one argument',
                stack: (new Error()).stack
            };
        }

        // undefined inputs always return undefined
        if(typeof str === 'undefined') {
            return undefined;
        }

        // otherwise it must be a string
        if(typeof str !== 'string') {
            throw {
                message: 'Type error: argument of uppercase function must evaluate to a string',
                stack: (new Error()).stack,
                value: str
            };
        }

        return str.toUpperCase();
    }

    /**
     * length of a string
     * @param {String} str - string
     * @returns {Number} The number of characters in the string
     */
    function functionLength(str) {
        if(arguments.length != 1) {
            throw {
                message: 'The length function expects one argument',
                stack: (new Error()).stack
            };
        }

        // undefined inputs always return undefined
        if(typeof str === 'undefined') {
            return undefined;
        }

        // otherwise it must be a string
        if(typeof str !== 'string') {
            throw {
                message: 'Type error: argument of length function must evaluate to a string',
                stack: (new Error()).stack,
                value: str
            };
        }

        return str.length;
    }

    /**
     * Split a string into an array of substrings
     * @param {String} str - string
     * @param {String} separator - the token that splits the string
     * @param {Integer} [limit] - max number of substrings
     * @returns {Array} The array of string
     */
    function functionSplit(str, separator, limit) {
        if(arguments.length != 2 && arguments.length != 3) {
            throw {
                message: 'The split function expects two or three arguments',
                stack: (new Error()).stack
            };
        }

        // undefined inputs always return undefined
        if(typeof str === 'undefined') {
            return undefined;
        }

        // otherwise it must be a string
        if(typeof str !== 'string') {
            throw {
                message: 'Type error: first argument of split function must evaluate to a string',
                stack: (new Error()).stack,
                value: str
            };
        }

        // separator must be a string
        if(typeof separator !== 'string') {
            throw {
                message: 'Type error: second argument of split function must evaluate to a string',
                stack: (new Error()).stack,
                value: separator
            };
        }

        // limit, if specified, must be a number
        if(typeof limit !== 'undefined' && (typeof limit !== 'number' || limit < 0)) {
            throw {
                message: 'Type error: third argument of split function must evaluate to a positive number',
                stack: (new Error()).stack,
                value: limit
            };
        }

        return str.split(separator, limit);
    }

    /**
     * Join an array of strings
     * @param {Array} strs - array of string
     * @param {String} [separator] - the token that splits the string
     * @returns {String} The concatenated string
     */
    function functionJoin(strs, separator) {
        if(arguments.length != 1 && arguments.length != 2) {
            throw {
                message: 'The join function expects one or two arguments',
                stack: (new Error()).stack
            };
        }

        // undefined inputs always return undefined
        if(typeof strs === 'undefined') {
            return undefined;
        }

        if(!Array.isArray(strs)) {
            strs = [strs];
        }

        // it must be an array of strings
        var nonStrings = strs.filter(function(val) {return (typeof val !== 'string');});
        if(nonStrings.length > 0) {
            throw {
                message: 'Type error: first argument of join function must be an array of strings',
                stack: (new Error()).stack,
                value: nonStrings
            };
        }


        // if separator is not specified, default to empty string
        if(typeof separator === 'undefined') {
            separator = "";
        }

        // separator, if specified, must be a string
        if(typeof separator !== 'string') {
            throw {
                message: 'Type error: second argument of split function must evaluate to a string',
                stack: (new Error()).stack,
                value: separator
            };
        }

        return strs.join(separator);
    }

    /**
     * Cast argument to number
     * @param {Object} arg - Argument
     * @returns {Number} numeric value of argument
     */
    function functionNumber(arg) {
        var result;

        if(arguments.length != 1) {
            throw {
                message: 'The number function expects one argument',
                stack: (new Error()).stack
            };
        }

        // undefined inputs always return undefined
        if(typeof arg === 'undefined') {
            return undefined;
        }

        if (typeof arg === 'number') {
            // already a number
            result = arg;
        } else if(typeof arg === 'string' && /^-?(0|([1-9][0-9]*))(\.[0-9]+)?([Ee][-+]?[0-9]+)?$/.test(arg) && !isNaN(parseFloat(arg)) && isFinite(arg)) {
            result = parseFloat(arg);
        } else {
            throw {
                message: "Unable to cast value to a number",
                value: arg,
                stack: (new Error()).stack
            };
        }
        return result;
    }


    /**
     * Evaluate an input and return a boolean
     * @param {*} arg - Arguments
     * @returns {boolean} Boolean
     */
    function functionBoolean(arg) {
        // cast arg to its effective boolean value
        // boolean: unchanged
        // string: zero-length -> false; otherwise -> true
        // number: 0 -> false; otherwise -> true
        // null -> false
        // array: empty -> false; length > 1 -> true
        // object: empty -> false; non-empty -> true
        // function -> false

        if(arguments.length != 1) {
            throw {
                message: 'The boolean function expects one argument',
                stack: (new Error()).stack
            };
        }

        // undefined inputs always return undefined
        if(typeof arg === 'undefined') {
            return undefined;
        }

        var result = false;
        if (Array.isArray(arg)) {
            if (arg.length == 1) {
                result = functionBoolean(arg[0]);
            } else if (arg.length > 1) {
                var trues = arg.filter(function(val) {return functionBoolean(val);});
                result = trues.length > 0;
            }
        } else if (typeof arg === 'string') {
            if (arg.length > 0) {
                result = true;
            }
        } else if (isNumeric(arg)) {
            if (arg != 0) {
                result = true;
            }
        } else if (arg != null && typeof arg === 'object') {
            if (Object.keys(arg).length > 0) {
                // make sure it's not a lambda function
                if (!(isLambda(arg))) {
                    result = true;
                }
            }
        } else if (typeof arg === 'boolean' && arg == true) {
            result = true;
        }
        return result;
    }

    /**
     * returns the Boolean NOT of the arg
     * @param {*} arg - argument
     * @returns {boolean} - NOT arg
     */
    function functionNot(arg) {
        return !functionBoolean(arg);
    }

    /**
     * Create a map from an array of arguments
     * @param {Function} func - function to apply
     * @returns {Array} Map array
     */
    function functionMap(func) {
        // this can take a variable number of arguments - each one should be mapped to the equivalent arg of func
        // assert that func is a function
        var varargs = arguments;
        var result = [];

        // each subsequent arg must be an array - coerce if not
        var args = [];
        for (var ii = 1; ii < varargs.length; ii++) {
            if (Array.isArray(varargs[ii])) {
                args.push(varargs[ii]);
            } else {
                args.push([varargs[ii]]);
            }

        }
        // do the map - iterate over the arrays, and invoke func
        if (args.length > 0) {
            for (var i = 0; i < args[0].length; i++) {
                var func_args = [];
                for (var j = 0; j < func.arguments.length; j++) {
                    func_args.push(args[j][i]);
                }
                // invoke func
                result.push(apply(func, func_args, null, null));
            }
        }
        return result;
    }

    /**
     * Fold left function
     * @param {Function} func - Function
     * @param {Array} sequence - Sequence
     * @param {Object} init - Initial value
     * @returns {*} Result
     */
    function functionFoldLeft(func, sequence, init) {
        var result;

        if (!(func.length == 2 || func.arguments.length == 2)) {
            throw {
                message: 'The first argument of the reduce function must be a function of arity 2',
                stack: (new Error()).stack
            };
        }

        if (!Array.isArray(sequence)) {
            sequence = [sequence];
        }

        var index;
        if (typeof init === 'undefined' && sequence.length > 0) {
            result = sequence[0];
            index = 1;
        } else {
            result = init;
            index = 0;
        }

        while (index < sequence.length) {
            result = apply(func, [result, sequence[index]], null, null);
            index++;
        }

        return result;
    }

    /**
     * Return keys for an object
     * @param {Object} arg - Object
     * @returns {Array} Array of keys
     */
    function functionKeys(arg) {
        var result = [];

        if(Array.isArray(arg)) {
            // merge the keys of all of the items in the array
            var merge = {};
            arg.forEach(function(item) {
                var keys = functionKeys(item);
                if(Array.isArray(keys)) {
                    keys.forEach(function(key) {
                        merge[key] = true;
                    });
                }
            });
            result = functionKeys(merge);
        } else if(arg != null && typeof arg === 'object' && !(isLambda(arg))) {
            result = Object.keys(arg);
            if(result.length == 0) {
                result = undefined;
            }
        } else {
            result = undefined;
        }
        return result;
    }

    /**
     * Return value from an object for a given key
     * @param {Object} object - Object
     * @param {String} key - Key in object
     * @returns {*} Value of key in object
     */
    function functionLookup(object, key) {
        var result = evaluateName({value: key}, object);
        return result;
    }

    /**
     * Append second argument to first
     * @param {Array|Object} arg1 - First argument
     * @param {Array|Object} arg2 - Second argument
     * @returns {*} Appended arguments
     */
    function functionAppend(arg1, arg2) {
        // disregard undefined args
        if (typeof arg1 === 'undefined') {
            return arg2;
        }
        if (typeof arg2 === 'undefined') {
            return arg1;
        }
        // if either argument is not an array, make it so
        if (!Array.isArray(arg1)) {
            arg1 = [arg1];
        }
        if (!Array.isArray(arg2)) {
            arg2 = [arg2];
        }
        Array.prototype.push.apply(arg1, arg2);
        return arg1;
    }

    /**
     * Determines if the argument is undefined
     * @param {*} arg - argument
     * @returns {boolean} False if argument undefined, otherwise true
     */
    function functionExists(arg){
        if (arguments.length != 1) {
            throw {
                message: 'The exists function expects one argument',
                stack: (new Error()).stack
            };
        }

        if (typeof arg === 'undefined') {
            return false;
        } else {
            return true;
        }
    }

    /**
     * Splits an object into an array of object with one property each
     * @param {*} arg - the object to split
     * @returns {*} - the array
     */
    function functionSpread(arg) {
        var result = [];

        if(Array.isArray(arg)) {
            // spread all of the items in the array
            arg.forEach(function(item) {
                result = functionAppend(result, functionSpread(item));
            });
        } else if(arg != null && typeof arg === 'object' && !isLambda(arg)) {
            for(var key in arg) {
                var obj = {};
                obj[key] = arg[key];
                result.push(obj);
            }
        } else {
            result = arg;
        }
        return result;
    }

    /**
     * Create frame
     * @param {Object} enclosingEnvironment - Enclosing environment
     * @returns {{bind: bind, lookup: lookup}} Created frame
     */
    function createFrame(enclosingEnvironment) {
        var bindings = {};
        return {
            bind: function (name, value) {
                bindings[name] = value;
            },
            lookup: function (name) {
                var value = bindings[name];
                if (typeof value === 'undefined' && enclosingEnvironment) {
                    value = enclosingEnvironment.lookup(name);
                }
                return value;
            }
        };
    }

    var staticFrame = createFrame(null);

    staticFrame.bind('sum', functionSum);
    staticFrame.bind('count', functionCount);
    staticFrame.bind('max', functionMax);
    staticFrame.bind('min', functionMin);
    staticFrame.bind('average', functionAverage);
    staticFrame.bind('string', functionString);
    staticFrame.bind('substring', functionSubstring);
    staticFrame.bind('substringBefore', functionSubstringBefore);
    staticFrame.bind('substringAfter', functionSubstringAfter);
    staticFrame.bind('lowercase', functionLowercase);
    staticFrame.bind('uppercase', functionUppercase);
    staticFrame.bind('length', functionLength);
    staticFrame.bind('split', functionSplit);
    staticFrame.bind('join', functionJoin);
    staticFrame.bind('number', functionNumber);
    staticFrame.bind('boolean', functionBoolean);
    staticFrame.bind('not', functionNot);
    staticFrame.bind('map', functionMap);
    staticFrame.bind('reduce', functionFoldLeft);
    staticFrame.bind('keys', functionKeys);
    staticFrame.bind('lookup', functionLookup);
    staticFrame.bind('append', functionAppend);
    staticFrame.bind('exists', functionExists);
    staticFrame.bind('spread', functionSpread);

    /**
     * JSONata
     * @param {Object} expr - JSONata expression
     * @returns {{evaluate: evaluate, assign: assign}} Evaluated expression
     */
    function jsonata(expr) {
        var ast = parser(expr);
        var environment = createFrame(staticFrame);
        return {
            evaluate: function (input, bindings) {
                if (typeof bindings !== 'undefined') {
                    var exec_env;
                    // the variable bindings have been passed in - create a frame to hold these
                    exec_env = createFrame(environment);
                    for (var v in bindings) {
                        exec_env.bind(v, bindings[v]);
                    }
                } else {
                    exec_env = environment;
                }
                // put the input document into the environment as the root object
                exec_env.bind('$', input);
                return evaluate(ast, input, exec_env);
            },
            assign: function (name, value) {
                environment.bind(name, value);
            }
        };
    }

    jsonata.parser = parser;

    return jsonata;

})();

// node.js only - export the jsonata and parser functions
// istanbul ignore else
if(typeof module !== 'undefined') {
    module.exports = jsonata;
}
;(function() {
    function indentLine(str,length) {
        if (length <= 0) {
            return str;
        }
        var i = (new Array(length)).join(" ");
        str = str.replace(/^\s*/,i);
        return str;
    }
    function formatExpression(str) {
        var length = str.length;
        var start = 0;
        var inString = false;
        var inBox = false;
        var quoteChar;
        var list = [];
        var stack = [];
        var frame;
        var v;
        var matchingBrackets = {
            "(":")",
            "[":"]",
            "{":"}"
        }
        for (var i=0;i<length;i++) {
            var c = str[i];
            if (!inString) {
                if (c === "'" || c === '"') {
                    inString = true;
                    quoteChar = c;
                    frame = {type:"string",pos:i};
                    list.push(frame);
                    stack.push(frame);
                } else if (c === ";") {
                    frame = {type:";",pos:i};
                    list.push(frame);
                } else if (c === ",") {
                    frame = {type:",",pos:i};
                    list.push(frame);
                } else if (/[\(\[\{]/.test(c)) {
                    frame = {type:"open-block",char:c,pos:i};
                    list.push(frame);
                    stack.push(frame);
                } else if (/[\}\)\]]/.test(c)) {
                    var oldFrame = stack.pop();
                    if (matchingBrackets[oldFrame.char] !== c) {
                        //console.log("Stack frame mismatch",c,"at",i,"expected",matchingBrackets[oldFrame.char],"from",oldFrame.pos);
                        return str;
                    }
                    //console.log("Closing",c,"at",i,"compare",oldFrame.type,oldFrame.pos);
                    oldFrame.width = i-oldFrame.pos;
                    frame = {type:"close-block",pos:i,char:c,width:oldFrame.width}
                    list.push(frame);
                }
            } else {
                if (c === quoteChar) {
                    // Next char must be a ]
                    inString = false;
                    stack.pop();
                }
            }

        }
        // console.log(stack);
        var result = str;
        var indent = 0;
        var offset = 0;
        var pre,post,indented;
        var longStack = [];
        list.forEach(function(f) {
            if (f.type === ";" || f.type === ",") {
                if (longStack[longStack.length-1]) {
                    pre = result.substring(0,offset+f.pos+1);
                    post = result.substring(offset+f.pos+1);
                    indented = indentLine(post,indent);
                    result = pre+"\n"+indented;
                    offset += indented.length-post.length+1;
                }
            } else if (f.type === "open-block") {
                if (f.width > 30) {
                    longStack.push(true);
                    indent += 4;
                    pre = result.substring(0,offset+f.pos+1);
                    post = result.substring(offset+f.pos+1);
                    indented = indentLine(post,indent);
                    result = pre+"\n"+indented;
                    offset += indented.length-post.length+1;
                } else {
                    longStack.push(false);
                }
            } else if (f.type === "close-block") {
                if (f.width > 30) {
                    indent -= 4;
                    pre = result.substring(0,offset+f.pos);
                    post = result.substring(offset+f.pos);
                    indented = indentLine(post,indent);
                    result = pre+"\n"+indented;
                    offset += indented.length-post.length+1;
                }
                longStack.pop();
            }
        })
        //console.log(result);
        return result;
    }

    jsonata.format = formatExpression;
    jsonata.functions =
    {
        '$append':{ args:['array','array'] },
        '$average':{ args:['value'] },
        '$boolean':{ args:['value'] },
        '$count':{ args:['array'] },
        '$exists':{ args:['value'] },
        '$join':{ args:['array','separator'] },
        '$keys':{ args:['object'] },
        '$length':{ args:['string'] },
        '$lookup':{ args:['object','key'] },
        '$lowercase':{ args:['string'] },
        '$map':{ args:[] },
        '$max':{ args:['array'] },
        '$min':{ args:['array'] },
        '$not':{ args:['value'] },
        '$number':{ args:['value'] },
        '$reduce':{ args:[] },
        '$split':{ args:['string','separator','limit'] },
        '$spread':{ args:['object'] },
        '$string':{ args:['value'] },
        '$substring':{ args:['string','start','length'] },
        '$substringAfter':{ args:['string','chars'] },
        '$substringBefore':{ args:['string','chars'] },
        '$sum':{ args:['array'] },
        '$uppercase':{ args:['string'] }
    }
    jsonata.getFunctionSnippet = function(fn) {
        var snippetText = "";
        if (jsonata.functions.hasOwnProperty(fn)) {
            var def = jsonata.functions[fn];
            snippetText = "\\"+fn+"(";
            if (def.args) {
                snippetText += def.args.map(function(a,i) { return "${"+(i+1)+":"+a+"}"}).join(", ");
            }
            snippetText += ")\n"
        }
        return snippetText;
    }
})();
