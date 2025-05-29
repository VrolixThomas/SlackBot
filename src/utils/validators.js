const { PRIORITIES, REQUEST_TYPES, PRIORITY_SHORTCUTS, TYPE_SHORTCUTS } = require('../constants/enums');

function expandPriority(input) {
    const normalized = input.toLowerCase();
    
    // Check for exact match first
    if (Object.values(PRIORITIES).includes(normalized)) {
        return normalized;
    }
    
    // Check for shortcuts
    return PRIORITY_SHORTCUTS[normalized] || null;
}

function expandType(input) {
    const normalized = input.toLowerCase();
    
    // Check for exact match first (case-insensitive)
    const exactMatch = Object.values(REQUEST_TYPES).find(t => t.toLowerCase() === normalized);
    if (exactMatch) {
        return exactMatch;
    }
    
    // Check for shortcuts
    return TYPE_SHORTCUTS[normalized] || null;
}

function validateRequestCommand(args) {
    if (args.length < 3) {
        return {
            valid: false,
            error: `Invalid format. Use \`/request priority_level request_type message\`.\n\nPriority: ${Object.values(PRIORITIES).join(', ')} (or l, m, h, c)\nType: ${Object.values(REQUEST_TYPES).join(', ')} (or q, f, b)`
        };
    }

    const [priority, type, ...message] = args;
    const messageText = message.join(' ');

    const expandedPriority = expandPriority(priority);
    const expandedType = expandType(type);

    if (!expandedPriority || !expandedType) {
        return {
            valid: false,
            error: `Invalid priority or type.\nPriority: ${Object.values(PRIORITIES).join(', ')} (or l, m, h, c)\nType: ${Object.values(REQUEST_TYPES).join(', ')} (or q, f, b)`
        };
    }

    return {
        valid: true,
        data: {
            priority: expandedPriority,
            type: expandedType,
            messageText
        }
    };
}

module.exports = {
    expandPriority,
    expandType,
    validateRequestCommand
};