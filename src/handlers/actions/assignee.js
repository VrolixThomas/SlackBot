/**
 * Handle assignee selection actions from request messages
 */
async function handleAssigneeSelect({ ack, body, client }) {
    await ack();

    try {
        const selectedUser = body.actions[0].selected_user;
        const messageTs = body.message.ts;
        const channelId = body.channel.id;

        await client.chat.postMessage({
            channel: channelId,
            thread_ts: messageTs,
            text: `<@${selectedUser}>, you've been assigned to this request!`
        });
    } catch (error) {
        console.error('Assignee select handler error:', error);
    }
}

module.exports = handleAssigneeSelect;