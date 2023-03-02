import * as config from '../config';
const sticky = new pylon.KVNamespace('stickymessages');
discord.interactions.commands.register(
  {
    name: 'sticky',
    description: 'Sticky a message in this channel',
    ackBehavior: discord.interactions.commands.AckBehavior.MANUAL,
    options: (opts) => ({
      message: opts.string({
        required: true,
        description: 'The message to sticky',
      }),
    }),
  },
  async (interaction, { message }) => {
    if (!interaction.member.can(discord.Permissions.MANAGE_MESSAGES))
      return interaction.respondEphemeral(
        'You do not have permission to sticky messages.'
      );

    await sticky.put(interaction.channelId, message);

    var channel = await discord.getTextChannel(interaction.channelId);
    if (!channel) throw new Error('[STICKY] Something went wrong.');

    channel.sendMessage(message).then(async (msg) => {
      await sticky.put(`${interaction.channelId}.recentMessage`, msg.id);
    });
    interaction.respondEphemeral('Message successfully stickied!');
  }
);

discord.on(discord.Event.MESSAGE_CREATE, async (message) => {
  var items = await sticky.list();
  if (items.includes(message.channelId)) {
    var stickied = await sticky.get<string>(message.channelId);
    var recent = await sticky.get<string>(`${message.channelId}.recentMessage`);
    if (!recent) return;

    var channel = await message.getChannel();

    var msg = await channel.getMessage(recent).catch((err) => {});
    if (!msg) return;

    message.reply(<string>stickied).then(async (msg) => {
      await sticky.put(`${message.channelId}.recentMessage`, msg.id);
    });

    msg.delete().catch((err) => {
      return;
    });
  }
});

discord.on(discord.Event.MESSAGE_DELETE, async (message) => {
  var recent = await sticky
    .get<string>(`${message.channelId}.recentMessage`)
    .catch((err) => {
      return;
    });
  if (recent == message.id) {
    await sticky.delete(message.channelId);
    console.log('removed sticky');
  }
});
