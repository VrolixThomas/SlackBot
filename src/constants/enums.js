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
    BUG: 'Bug'
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
    'b': REQUEST_TYPES.BUG
};

module.exports = {
    PRIORITIES,
    STATUSES,
    REQUEST_TYPES,
    PRIORITY_SHORTCUTS,
    TYPE_SHORTCUTS
};