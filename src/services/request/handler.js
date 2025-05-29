const { buildRequestBlocks } = require('../../utils/blocks');
const { capitalize } = require('../../utils/formatters');

async function handleRequest({ client, channel, user, priority, type, messageText }) {
    const normalizedPriority = priority.toLowerCase();
    const normalizedType = type;
    
    await client.chat.postMessage({
        channel,
        text: `🚨 Request: ${normalizedType} | Priority: ${capitalize(normalizedPriority)} | Reporter: <@${user}>`,
        blocks: buildRequestBlocks(normalizedType, user, messageText, normalizedPriority)
    });
}

module.exports = {
    handleRequest
};