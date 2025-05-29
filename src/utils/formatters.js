function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function cleanMessageText(messageText) {
    return messageText.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
}

function createSummary(requestType, messageText, maxLength = 80) {
    const cleanText = cleanMessageText(messageText);
    return `${requestType}: ${cleanText.substring(0, maxLength)}${cleanText.length > maxLength ? '...' : ''}`;
}

function buildSlackThreadUrl(teamId, channel, messageTs) {
    return `https://app.slack.com/client/${teamId}/${channel}/thread/${messageTs.replace('.', '')}`;
}

function formatJiraDescription(messageText, reporterName, assigneeName, threadMessages, slackThreadUrl) {
    let description = `**Original Request:**\n${messageText.trim()}\n\n**Reported by:** ${reporterName}`;
    
    if (assigneeName) {
        description += `\n**Assigned to:** ${assigneeName}`;
    }
    
    if (threadMessages.length > 0) {
        description += '\n\n**Thread Discussion:**\n';
        threadMessages.forEach((msg, index) => {
            description += `\n**Reply ${index + 1}** (by ${msg.user} at ${msg.timestamp}):\n${msg.text}\n`;
        });
    }
    
    description += `\n\n**Slack Thread:** ${slackThreadUrl}`;
    return description;
}

module.exports = {
    capitalize,
    cleanMessageText,
    createSummary,
    buildSlackThreadUrl,
    formatJiraDescription
};