module.exports = (org) => ({
  logger: {
    metadata: {
      organization: org
    }
  },
  payload: {
    system: {
      organization: org,
      region: 'eu-test-1',
      conversationId: 'convo-id',
      bot: 'my-bot'
    },
  },
  event: {
    event: {
      organization: org,
      token: {
        contents: {
          organization: org
        }
      }
    }
  }
});
