const ErrorCodes = require('./ErrorCodes');


const Messages = {
    [ErrorCodes.MinSize]: (param, min) => `The parameter '${param}' size must be at least ${min}.`,
    [ErrorCodes.MaxSize]: (param, max) => `The parameter '${param}' size can't exced ${max}.`,
    [ErrorCodes.WrongType]: (param, type, a) => `The parameter '${param}' must be ${a ? 'a' : 'an'} ${type}.`,
    [ErrorCodes.WrongTypes]: (param, types) => `The parameter '${param}' type must be ${Array.isArray(types) ? `'${types.slice(0,-1).join("', '")}' or '${types.slice(-1)}'` : types}.`,
    [ErrorCodes.InvalidParameter]: (param) => `Invalid value for parameter '${param}'.`,
    [ErrorCodes.WrongValue]: (param, values) => `The parameter '${param}' must be ${Array.isArray(values) ? `'${values.slice(0,-1).join("', '")}' or '${values.slice(-1)}'` : values}.`,
    
    [ErrorCodes.VENTURE_UNKNOWN_ACTION_TYPE]: (id) => `The action type for venture '${id}' must be one of [ inventory, condition, stat, goto, variable ].`,
    [ErrorCodes.VENTURE_ACTION_INVENTORY_UNKNOWN_ITEM]: (item) => `Item must have string as id.\n'${data.item}' is invalid.`,
    [ErrorCodes.VENTURE_ACTION_INVENTORY_INVALID_ACTION]: (item) => `Item must have string as id.\n'${data.item}' is invalid.`,
    
    
    [ErrorCodes.VENTURE_VARIABLE_UNSAFE_EXPRESSION]: (expression) => `Unsafe Exression String : '${expression}'`,
    [ErrorCodes.VENTURE_ACTION_MISSING_PROPERTY]: ({action, missing}) => `Missing '${missing}' property into '${action.type}' action.`,
};

module.exports = Messages;