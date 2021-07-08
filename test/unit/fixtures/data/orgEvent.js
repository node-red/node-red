module.exports = (org, workerId = 'worker-id') => ({
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
    workers:[{id: `${workerId}:::something:::else`}],
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
