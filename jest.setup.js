if (!process.env.LISTENING_TO_UNHANDLED_REJECTION) {
  process.on('unhandledRejection', (reason) => {
    throw reason
  })
  process.env['LISTENING_TO_UNHANDLED_REJECTION'] = 'true'
}
