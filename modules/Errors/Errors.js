const ErrorCodes = require('./ErrorCodes');
const Messages = require('./Messages');


/**
 * Extend an error of some sort into a mtxJsError.
 * @param {Error} Base Base error to extend
 * @returns {BotError}
 * @ignore
*/
function makeError( ErrorBase ) {
    return class Err extends ErrorBase {
        constructor(code, ...args) {
            super(message(code, args));

            this.code = code;
            Error.captureStackTrace?.(this, Err);
        }
        
        get name() {
            return `${super.name} [${this.code}]`;
        }
    }
}

/**
 * Format the message for an error.
 * @param {string} code The error code
 * @param {Array<*>} args Arguments to pass for util format or as function args
 * @returns {string} Formatted string
 * @ignore
*/
function message(code, args) {
    // console.debug(code, args)

    if (!(code in ErrorCodes)) throw new Error(code);
    
    const msg = Messages[code];
    if (!msg) throw new Error(code);
    
    if (typeof msg === 'function') return msg(...args);
    
    if (!args?.length) return msg;
    
    args.unshift(msg);
    return String(...args);
}

module.exports = {
    BotError: makeError(Error),
    BotTypeError: makeError(TypeError),
    BotRangeError: makeError(RangeError),
};