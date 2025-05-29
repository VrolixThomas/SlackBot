const { getUserDisplayName } = require('./user');

async function getThreadMessages(client, channel, threadTs) {
    try {
        const result = await client.conversations.replies({
            channel: channel,
            ts: threadTs,
            inclusive: true
        });
        
        if (result.ok && result.messages) {
            const replies = result.messages.slice(1).filter(msg => {
                // Skip messages from RequestManager bot
                if (msg.bot_id && msg.bot_profile && msg.bot_profile.name === 'RequestManager') {
                    return false;
                }
                return true;
            });
            
            const messagesWithUserNames = [];
            
            for (const msg of replies) {
                const userId = msg.user;
                const timestamp = new Date(parseFloat(msg.ts) * 1000).toLocaleString();
                let messageText = msg.text || '';
                
                if (msg.bot_id) {
                    messageText = msg.text || 'Bot message (no text content)';
                }
                
                const userName = userId ? await getUserDisplayName(client, userId) : 'Unknown User';
                
                messagesWithUserNames.push({
                    user: userName,
                    timestamp: timestamp,
                    text: messageText
                });
            }
            
            return messagesWithUserNames;
        }
        return [];
    } catch (error) {
        console.error('Error fetching thread messages:', error);
        return [];
    }
}

async function getAssigneeFromThread(client, channel, threadTs) {
    try {
        const result = await client.conversations.replies({
            channel: channel,
            ts: threadTs,
            inclusive: true
        });
        
        if (result.ok && result.messages) {
            const assignmentMessage = result.messages.find(msg => {
                if (msg.bot_id && msg.text) {
                    return msg.text.includes("you've been assigned to this request!");
                }
                return false;
            });
            
            if (assignmentMessage && assignmentMessage.text) {
                const userMatch = assignmentMessage.text.match(/<@(\w+)>/);
                if (userMatch) {
                    return userMatch[1];
                }
            }
        }
        return null;
    } catch (error) {
        console.error('Error fetching assignee from thread:', error);
        return null;
    }
}

module.exports = {
    getThreadMessages,
    getAssigneeFromThread
};