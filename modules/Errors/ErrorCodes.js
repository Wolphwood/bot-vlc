const keys = [
    'MinSize',
    'MaxSize',
    'WrongType',
    'WrongTypes',
    'InvalidParameter',
    'WrongValue',
    'VENTURE_UNKNOWN_ACTION_TYPE',
    'VENTURE_ACTION_INVENTORY_UNKNOWN_ITEM',
    'VENTURE_ACTION_INVENTORY_INVALID_COUNT',
    'VENTURE_ACTION_INVENTORY_INVALID_OPERATION',
    'VENTURE_VARIABLE_UNSAFE_EXPRESSION',
    'VENTURE_ACTION_MISSING_PROPERTY',
];


/**
* @type {BotErrorCodes}
* @ignore
*/
module.exports = Object.fromEntries(keys.map(key => [key, key]));