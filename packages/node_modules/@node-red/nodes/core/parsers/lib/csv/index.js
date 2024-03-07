
/**
 * @typedef {Object} CSVParseOptions
 * @property {number} [cursor=0] - an index into the CSV to start parsing from
 * @property {string} [separator=','] - the separator character
 * @property {string} [quote='"'] - the quote character
 * @property {boolean} [headersOnly=false] - only parse the headers and return them
 * @property {string[]} [headers=[]] - an array of headers to use instead of the first row of the CSV data
 * @property {boolean} [dataHasHeaderRow=true] - whether the CSV data to parse has a header row
 * @property {boolean} [outputHeader=true] - whether the output data should include a header row (only applies to array output)
 * @property {boolean} [parseNumeric=false] - parse numeric values into numbers
 * @property {boolean} [includeNullValues=false] - include null values in the output
 * @property {boolean} [includeEmptyStrings=true] - include empty strings in the output
 * @property {string} [outputStyle='object'] - output an array of arrays or an array of objects
 * @property {boolean} [strict=false] - throw an error if the CSV is malformed
 */

/**
 * Parses a CSV string into an array of arrays or an array of objects.
 * 
 * NOTES:
 * * Deviations from the RFC4180 spec (for the sake of user fiendliness, system implementations and flexibility), this parser will:
 *   *  accept any separator character, not just `,`
 *   *  accept any quote character, not just `"`
 *   *  parse `\r`, `\n` or `\r\n` as line endings (RRFC4180 2.1 states lines are separated by CRLF)
 * * Only single character `quote` is supported
 *   * `quote` is `"` by default
 *   * Any cell that contains a `quote` or `separator` will be quoted
 *   * Any `quote` characters inside a cell will be escaped as per RFC 4180 2.6
 * * Only single character `separator` is supported
 * * Only `array` and `object` output styles are supported
 *   * `array` output style is an array of arrays [[],[],[]]
 *   * `object` output style is an array of objects [{},{},{}]
 * * Only `headers` or `dataHasHeaderRow` are supported, not both
 * @param {string} csvIn - the CSV string to parse
 * @param {CSVParseOptions} parseOptions - options
 * @throws {Error}
 */
function parse(csvIn, parseOptions) {
    /* Normalise options */
    parseOptions = parseOptions || {};
    const separator = parseOptions.separator ?? ',';
    const quote = parseOptions.quote ?? '"';
    const headersOnly = parseOptions.headersOnly ?? false;
    const headers = Array.isArray(parseOptions.headers) ? parseOptions.headers : []
    const dataHasHeaderRow = parseOptions.dataHasHeaderRow ?? true;
    const outputHeader = parseOptions.outputHeader ?? true;
    const parseNumeric = parseOptions.parseNumeric ?? false;
    const includeNullValues = parseOptions.includeNullValues ?? false;
    const includeEmptyStrings = parseOptions.includeEmptyStrings ?? true;
    const outputStyle = ['array', 'object'].includes(parseOptions.outputStyle) ? parseOptions.outputStyle : 'object'; // 'array [[],[],[]]' or 'object [{},{},{}]
    const strict = parseOptions.strict ?? false

    /* Local variables */
    const cursorMax = csvIn.length;
    const ouputArrays = outputStyle === 'array';
    const headersSupplied = headers.length > 0
    // The original regex was an "is-a-number" positive logic test. /^ *[-]?(?!E)(?!0\d)\d*\.?\d*(E-?\+?)?\d+ *$/i;
    // Below, is less strict and inverted logic but coupled with +cast it is 13%+ faster than original regex+parsefloat
    // and has the benefit of understanding hexadecimals, binary and octal numbers.
    const skipNumberConversion = /^ *(\+|-0\d|0\d)/
    const cellBuilder = []
    let rowBuilder = []
    let cursor = typeof parseOptions.cursor === 'number' ? parseOptions.cursor : 0;
    let newCell = true, inQuote = false, closed = false, output = [];

    /* inline helper functions */
    const finaliseCell = () => {
        let cell = cellBuilder.join('')
        cellBuilder.length = 0
        // push the cell:
        // NOTE: if cell is empty but newCell==true, then this cell had zero chars - push `null`
        //       otherwise push empty string
        return rowBuilder.push(cell || (newCell ? null : '')) 
    }
    const finaliseRow = () => {
        if (cellBuilder.length) {
            finaliseCell()
        }
        if (rowBuilder.length) {
            output.push(rowBuilder)
            rowBuilder = []
        }
    }

    /* Main parsing loop */
    while (cursor < cursorMax) {
        const char = csvIn[cursor]
        if (inQuote) {
            if (char === quote && csvIn[cursor + 1] === quote) {
                cellBuilder.push(quote)
                cursor += 2;
                newCell = false;
                closed = false;
            } else if (char === quote) {
                inQuote = false;
                cursor += 1;
                newCell = false;
                closed = true;
            } else {
                cellBuilder.push(char)
                newCell = false;
                closed = false;
                cursor++;
            }
        } else {
            if (char === separator) {
                finaliseCell()
                cursor += 1;
                newCell = true;
                closed = false;
            } else if (char === quote) {
                if (newCell) {
                    inQuote = true;
                    cursor += 1;
                    newCell = false;
                    closed = false;
                }
                else if (strict) {
                    throw new UnquotedQuoteError(cursor)
                } else {
                    // not strict, keep 1 quote if the next char is not a cell/record separator
                    cursor++
                    if (csvIn[cursor] && csvIn[cursor] !== '\n' && csvIn[cursor] !== '\r' && csvIn[cursor] !== separator) {
                        cellBuilder.push(char)
                        if (csvIn[cursor] === quote) {
                            cursor++ // skip the next quote
                        } 
                    }
                }
            } else {
                if (char === '\n' || char === '\r') {
                    finaliseRow()
                    if (csvIn[cursor + 1] === '\n') {
                        cursor += 2;
                    } else {
                        cursor++
                    }
                    newCell = true;
                    closed = false;
                    if (headersOnly) {
                        break
                    }
                } else {
                    if (closed) {
                        if (strict) {
                            throw new DataAfterCloseError(cursor)
                        } else {
                            cursor--; // move back to grab the previously discarded char
                            closed = false
                        }
                    } else {
                        cellBuilder.push(char)
                        newCell = false;
                        cursor++;
                    }
                }
            }
        }
    }
    if (strict && inQuote) {
        throw new ParseError(`Missing quote, unclosed cell`, cursor)
    }
    // finalise the last cell/row
    finaliseRow()
    let firstRowIsHeader = false
    // if no headers supplied, generate them
    if (output.length >= 1) {
        if (headersSupplied) {
            // headers already supplied
        } else if (dataHasHeaderRow) {
            // take the first row as the headers
            headers.push(...output[0])
            firstRowIsHeader = true
        } else {
            // generate headers col1, col2, col3, etc
            for (let i = 0; i < output[0].length; i++) {
                headers.push("col" + (i + 1))
            }
        }
    }

    const finalResult = {
        /** @type {String[]} headers as an array of string */
        headers: headers,
        /** @type {String} headers as a comma-separated string */
        header: null,
        /** @type {Any[]} Result Data (may include header row: check `firstRowIsHeader` flag) */
        data: [],
        /** @type {Boolean|undefined} flag to indicate if the first row is a header row (only applies when `outputStyle` is 'array') */
        firstRowIsHeader: undefined,
        /** @type {'array'|'object'} flag to indicate the output style */
        outputStyle: outputStyle,
        /** @type {Number} The current cursor position */
        cursor: cursor,
    }

    const quotedHeaders = []
    for (let i = 0; i < headers.length; i++) {
        if (!headers[i]) {
            continue
        }
        quotedHeaders.push(quoteCell(headers[i], { quote, separator: ',' }))
    }
    finalResult.header = quotedHeaders.join(',') // always quote headers and join with comma

    // output is an array of arrays [[],[],[]]
    if (ouputArrays || headersOnly) {
        if (!firstRowIsHeader && !headersOnly && outputHeader && headers.length > 0) {
            if (output.length > 0) {
                output.unshift(headers)
            } else {
                output = [headers]
            }
            firstRowIsHeader = true
        }
        if (headersOnly) {
            delete finalResult.firstRowIsHeader
            return finalResult
        }
        finalResult.firstRowIsHeader = firstRowIsHeader
        finalResult.data = (firstRowIsHeader && !outputHeader) ? output.slice(1) : output
        return finalResult
    }

    // output is an array of objects [{},{},{}]
    const outputObjects = []
    let i = firstRowIsHeader ? 1 : 0
    for (; i < output.length; i++) {
        const rowObject = {}
        let isEmpty = true
        for (let j = 0; j < headers.length; j++) {
            if (!headers[j]) {
                continue
            }
            let v = output[i][j] === undefined ? null : output[i][j]
            if (v === null && !includeNullValues) {
                continue
            } else if (v === "" && !includeEmptyStrings) {
                continue
            } else if (parseNumeric === true && v && !skipNumberConversion.test(v)) {
                const vTemp = +v
                const isNumber = !isNaN(vTemp)
                if(isNumber) {
                    v = vTemp
                }
            }
            rowObject[headers[j]] = v
            isEmpty = false
        }
        // determine if this row is empty
        if (!isEmpty) {
            outputObjects.push(rowObject)
        }
    }
    finalResult.data = outputObjects
    delete finalResult.firstRowIsHeader
    return finalResult
}

/**
 * Quotes a cell in a CSV string if necessary. Addiionally, any double quotes inside the cell will be escaped as per RFC 4180 2.6 (https://datatracker.ietf.org/doc/html/rfc4180#section-2).
 * @param {string} cell - the string to quote
 * @param {*} options - options
 * @param {string} [options.quote='"'] - the quote character
 * @param {string} [options.separator=','] - the separator character
 * @param {string[]} [options.quoteables] - an array of characters that, when encountered, will trigger the application of outer quotes
 * @returns 
 */
function quoteCell(cell, { quote = '"', separator = ",", quoteables } = {
        quote: '"',
        separator: ",",
        quoteables: [quote, separator, '\r', '\n']
    }) {
    quoteables = quoteables || [quote, separator, '\r', '\n'];

    let doubleUp = false;
    if (cell.indexOf(quote) !== -1) { // add double quotes if any quotes
        doubleUp = true;
    }
    const quoteChar = quoteables.some(q => cell.includes(q)) ? quote : '';
    return quoteChar + (doubleUp ? cell.replace(/"/g, '""') : cell) + quoteChar;
}

// #region Custom Error Classes
class ParseError extends Error {
    /**
     * @param {string} message - the error message
     * @param {number} cursor - the cursor index where the error occurred
     */
    constructor(message, cursor) {
        super(message)
        this.name = 'ParseError'
        this.cursor = cursor
    }
}

class UnquotedQuoteError extends ParseError {
    /**
     * @param {number} cursor - the cursor index where the error occurred
     */
    constructor(cursor) {
        super('Quote found in the middle of an unquoted field', cursor)
        this.name = 'UnquotedQuoteError'
    }
}

class DataAfterCloseError extends ParseError {
    /**
     * @param {number} cursor - the cursor index where the error occurred
     */
    constructor(cursor) {
        super('Data found after closing quote', cursor)
        this.name = 'DataAfterCloseError'
    }
}

// #endregion

exports.parse = parse
exports.quoteCell = quoteCell
exports.ParseError = ParseError
exports.UnquotedQuoteError = UnquotedQuoteError
exports.DataAfterCloseError = DataAfterCloseError
