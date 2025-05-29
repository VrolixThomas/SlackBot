const requestHandler = require('../../services/request/handler');

/**
 * Handle submit request button actions from intercepted messages
 */
async function handleSubmitRequest({ ack, body, client }) {
    await ack();

    try {
        const { messageTs, messageText } = JSON.parse(body.actions[0].value);
        const stateValues = body.state?.values || {};

        const priority = stateValues['priority_input']?.['priority_select']?.selected_option?.value;
        const type = stateValues['type_input']?.['type_select']?.selected_option?.value;

        if (!priority || !type) {
            await client.chat.postEphemeral({
                channel: body.channel.id,
                user: body.user.id,
                text: "❌ Please select both a priority and request type before submitting."
            });
            return;
        }

        await requestHandler.handleRequest({
            client,
            channel: body.channel.id,
            user: body.user.id,
            priority,
            type,
            messageText
        });
    } catch (error) {
        console.error('Submit request handler error:', error);
        await client.chat.postEphemeral({
            channel: body.channel.id,
            user: body.user.id,
            text: "❌ Something went wrong while processing your request."
        });
    }
}

module.exports = handleSubmitRequest;