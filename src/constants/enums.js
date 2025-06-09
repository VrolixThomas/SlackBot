const { capitalize } = require('../utils/formatters');

const PRIORITIES = {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    CRITICAL: 'critical'
};

const STATUSES = {
    OPEN: 'open',
    IN_PROGRESS: 'in_progress',
    RESOLVED: 'resolved',
    CLOSED: 'closed'
};

const REQUEST_TYPES = {
    QUESTION: 'Question',
    FEATURE: 'Feature',
    BUG: 'Bug',
    DISCUSSION: 'Discussion',
};

// Priority expansion mappings
const PRIORITY_SHORTCUTS = {
    'l': PRIORITIES.LOW,
    'm': PRIORITIES.MEDIUM,
    'h': PRIORITIES.HIGH,
    'c': PRIORITIES.CRITICAL
};

// Type expansion mappings
const TYPE_SHORTCUTS = {
    'q': REQUEST_TYPES.QUESTION,
    'f': REQUEST_TYPES.FEATURE,
    'b': REQUEST_TYPES.BUG,
    'd': REQUEST_TYPES.DISCUSSION
};

const REQUEST_TYPE_ICONS = {
    [REQUEST_TYPES.QUESTION]: '❓',
    [REQUEST_TYPES.FEATURE]: '🌟',
    [REQUEST_TYPES.BUG]: '🐞',
    [REQUEST_TYPES.DISCUSSION]: '💬',
};


// Helper function to get request type options
function getRequestTypeOptions() {
    return Object.values(REQUEST_TYPES).map(type => ({
        text: {
            type: 'plain_text',
            text: type
        },
        value: type
    }));
}

// Helper function to get priority options
function getPriorityOptions() {
    return Object.values(PRIORITIES).map(priority => ({
        text: {
            type: 'plain_text',
            text: capitalize(priority)
        },
        value: priority
    }));
}

function getStatusOptions() {
    return Object.values(STATUSES).map(status => ({
        text: { type: "plain_text", text: status.split('_').map(capitalize).join(' ') },
        value: status
    }));
}
module.exports = {
    PRIORITIES,
    STATUSES,
    REQUEST_TYPES,
    PRIORITY_SHORTCUTS,
    TYPE_SHORTCUTS,
    REQUEST_TYPE_ICONS,
    getRequestTypeOptions,
    getPriorityOptions,
    getStatusOptions,
};