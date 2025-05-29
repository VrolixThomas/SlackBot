const { PRIORITIES } = require('../../constants/enums');

/**
 * Handle priority selection actions from request messages
 */
async function handlePrioritySelect({ ack, body, client }) {
    await ack();

    try {
        const selectedPriority = body.actions[0].selected_option.value;
        
        // Only notify when priority is set to critical
        if (selectedPriority === PRIORITIES.CRITICAL) {
            const messageTs = body.message.ts;
            const channelId = body.channel.id;
            
            await client.chat.postMessage({
                channel: channelId,
                thread_ts: messageTs,
                text: `🚨 This request has been escalated to CRITICAL priority!`
            });
        }
    } catch (error) {
        console.error('Priority select handler error:', error);
    }
}

module.exports = handlePrioritySelect;