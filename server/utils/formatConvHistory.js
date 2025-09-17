export const formatConvHistory = (messages) => {
  if (!messages) return "";
  // If messages already a string, pass through
  if (typeof messages === "string") return messages;
  // Some callers wrap as { messages: [...] }
  const list = Array.isArray(messages)
    ? messages
    : Array.isArray(messages?.messages)
    ? messages.messages
    : [];
  if (list.length === 0) return "";
  const formattedMessages = list.map((m) => `${m.role}: ${m.content}`);
  return formattedMessages.join("\n");
};
