const { validateRequestCommand } = require('../../utils/validators');
const { handleRequest } = require('../../services/request/handler');

async function requestCommandHandler({ command, ack, client }) {
    try {
        await ack();

        const validation = validateRequestCommand(command.text.split(' '));
        
        if (!validation.valid) {
            await client.chat.postEphemeral({
                channel: command.channel_id,
                user: command.user_id,
                text: `❌ ${validation.error}`
            });
            return;
        }

        const { priority, type, messageText } = validation.data;

        await handleRequest({
            client,
            channel: command.channel_id,
            user: command.user_id,
            priority,
            type,
            messageText
        });
    } catch (error) {
        console.error('Request command error:', error);
        await client.chat.postEphemeral({
            channel: command.channel_id,
            user: command.user_id,
            text: "❌ Something went wrong while processing your request."
        });
    }
}

module.exports = requestCommandHandler;