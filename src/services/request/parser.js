function extractRequestFromMessage(message) {
    if (!message.blocks) return null;
    
    // Check if this is a request message (has header with "Request")
    const headerBlock = message.blocks.find(block => 
        block.type === 'header' && 
        block.text?.text?.includes('Request')
    );
    
    if (!headerBlock) return null;
    
    // Extract message text from section block
    const sectionBlock = message.blocks.find(block => 
        block.type === 'section' && 
        block.text?.text?.includes('*Message:*')
    );
    
    let messageText = '';
    if (sectionBlock) {
        messageText = sectionBlock.text.text
            .replace('*Message:*\n> ', '')
            .replace(/\n>/g, '\n')
            .replace(/&gt;/g, '')
            .trim();
    }
    
    // Extract request type from header
    let requestType = 'Task';
    const headerText = headerBlock.text.text;
    if (headerText.includes('Question')) requestType = 'Question';
    else if (headerText.includes('Feature')) requestType = 'Feature';
    else if (headerText.includes('Bug')) requestType = 'Bug';
    
    // Extract reporter from context block
    let reporter = '';
    const contextBlock = message.blocks.find(block => block.type === 'context');
    if (contextBlock && contextBlock.elements && contextBlock.elements[0]) {
        const contextText = contextBlock.elements[0].text;
        const userMatch = contextText.match(/<@(\w+)>/);
        if (userMatch) {
            reporter = userMatch[1];
        }
    }
    
    return {
        messageText,
        requestType,
        reporter,
        assignee: null, // Will be populated later from thread
        isValidRequest: true
    };
}

module.exports = {
    extractRequestFromMessage
};