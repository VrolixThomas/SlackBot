const { STATUSES } = require('../../constants/enums');

/**
 * Handle status selection actions from request messages
 */
async function handleStatusSelect({ ack, body, client }) {
    await ack();

    try {
        const selectedStatus = body.actions[0].selected_option.value;
        
        // Only notify when status is set to resolved
        if (selectedStatus === STATUSES.RESOLVED) {
            const messageTs = body.message.ts;
            const channelId = body.channel.id;
            
            // Extract the reporter user ID from the original message
            // Look for the "Reported by <@USER_ID>" in the context block
            const contextBlock = body.message.blocks.find(block => block.type === 'context');
            if (contextBlock && contextBlock.elements && contextBlock.elements[0]) {
                const contextText = contextBlock.elements[0].text;
                const userMatch = contextText.match(/<@(\w+)>/);
                
                if (userMatch) {
                    const reporterUserId = userMatch[1];
                    
                    await client.chat.postMessage({
                        channel: channelId,
                        thread_ts: messageTs,
                        text: `✅ <@${reporterUserId}>, your request has been resolved!`
                    });
                }
            }
        }
    } catch (error) {
        console.error('Status select handler error:', error);
    }
}

module.exports = handleStatusSelect;