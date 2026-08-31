export const validVoiceState = {
  guildId: 'test-guild',
  userId: 'test-user',
  channelId: 'test-channel',
  sessionId: 'test-session',
};

export const temporaryRoomJoin = {
  ...validVoiceState,
  channelId: 'trigger-channel',
  previousChannelId: null,
  isBot: false,
  displayName: 'Ada Lovelace',
};

export const botTemporaryRoomJoin = { ...temporaryRoomJoin, isBot: true };
export const unrelatedVoiceMove = { ...temporaryRoomJoin, channelId: 'other-channel' };
export const unconfiguredTemporaryRoomJoin = { ...temporaryRoomJoin, guildId: 'other-guild' };
