const { buildRequestBlocks } = require('../../utils/blocks');
const { capitalize } = require('../../utils/formatters');
const { REQUEST_TYPE_ICONS } = require('../../constants/enums');


async function handleRequest({ client, channel, user, priority, type, messageText }) {
    const normalizedPriority = priority.toLowerCase();
    
    await client.chat.postMessage({
        channel,
        text: `${REQUEST_TYPE_ICONS[type]} Request: ${type} | Priority: ${capitalize(normalizedPriority)} | Reporter: <@${user}>`,
        blocks: buildRequestBlocks(type, user, messageText, normalizedPriority)
    });
}

module.exports = {
    handleRequest
};