// ================================
//  ChatterBox – Mock Data
// ================================

export const ME = {
  id: 'me',
  name: 'You',
  initials: 'YO',
  color: 'av-green',
  status: 'Online',
};

export const CONTACTS = [
  { id: 'c1', name: 'Aanya Sharma', initials: 'AS', color: 'av-pink',   phone: '+91 98765 43210', about: '✨ Living in the moment', online: true  },
  { id: 'c2', name: 'Rohan Mehta',  initials: 'RM', color: 'av-blue',   phone: '+91 87654 32109', about: '🎮 Gaming is life',       online: false },
  { id: 'c3', name: 'Priya Patel',  initials: 'PP', color: 'av-purple', phone: '+91 76543 21098', about: '📚 Always learning',       online: true  },
  { id: 'c4', name: 'Dev Joshi',    initials: 'DJ', color: 'av-orange', phone: '+91 65432 10987', about: '☕ Coffee + Code',         online: false },
  { id: 'c5', name: 'Team Design',  initials: 'TD', color: 'av-teal',   phone: null,              about: 'Design team workspace',   online: true, isGroup: true, members: ['Aanya', 'Rohan', 'Priya', 'Dev', 'You'] },
  { id: 'c6', name: 'Sara Ali',     initials: 'SA', color: 'av-red',    phone: '+91 54321 09876', about: '🌍 Exploring the world',   online: true  },
  { id: 'c7', name: 'Karan Nair',   initials: 'KN', color: 'av-indigo', phone: '+91 43210 98765', about: '🎵 Music heals the soul',  online: false },
];

// Returns a new conversation list with messages
export function buildConversations() {
  return [
    {
      id: 'conv1',
      contactId: 'c1',
      pinned: true,
      unread: 2,
      messages: [
        { id: 'm1', from: 'c1', text: 'Hey! How are you doing? 😊', time: '10:15 AM', date: 'Today', read: true },
        { id: 'm2', from: 'me', text: 'All good! Just working on a new project 🚀', time: '10:16 AM', date: 'Today', read: true },
        { id: 'm3', from: 'c1', text: 'Ooh, sounds exciting! What is it about?', time: '10:17 AM', date: 'Today', read: true },
        { id: 'm4', from: 'me', text: 'A chat app actually 😄 like WhatsApp but more beautiful', time: '10:18 AM', date: 'Today', read: true },
        { id: 'm5', from: 'c1', text: 'That is so cool! 🔥 Can I try it?', time: '10:19 AM', date: 'Today', read: true },
        { id: 'm6', from: 'c1', text: 'Also are you free this evening?', time: '11:02 AM', date: 'Today', read: false },
        { id: 'm7', from: 'c1', text: '☕ Coffee?', time: '11:03 AM', date: 'Today', read: false },
      ],
    },
    {
      id: 'conv2',
      contactId: 'c2',
      pinned: false,
      unread: 0,
      messages: [
        { id: 'm1', from: 'c2', text: 'Bro did you see the game last night?? 😱', time: 'Yesterday', date: 'Yesterday', read: true },
        { id: 'm2', from: 'me', text: 'Yeah it was insane! That last quarter though...',    time: 'Yesterday', date: 'Yesterday', read: true },
        { id: 'm3', from: 'c2', text: 'I know right! My heart almost stopped lol', time: 'Yesterday', date: 'Yesterday', read: true },
        { id: 'm4', from: 'me', text: 'Haha same 😂 GGs all around', time: 'Yesterday', date: 'Yesterday', read: true },
        { id: 'm5', from: 'c2', text: 'Alright man, talk later 👋', time: 'Yesterday', date: 'Yesterday', read: true },
      ],
    },
    {
      id: 'conv3',
      contactId: 'c3',
      pinned: false,
      unread: 1,
      messages: [
        { id: 'm1', from: 'me',  text: 'Hey Priya! Did you finish reading that book?', time: '9:00 AM', date: 'Today', read: true },
        { id: 'm2', from: 'c3',  text: 'Yes!! It was absolutely amazing 📖✨', time: '9:05 AM', date: 'Today', read: true },
        { id: 'm3', from: 'c3',  text: 'I cried at the end ngl 😭', time: '9:06 AM', date: 'Today', read: true },
        { id: 'm4', from: 'me',  text: 'Lol I knew you would! Which part?', time: '9:10 AM', date: 'Today', read: true },
        { id: 'm5', from: 'c3',  text: 'When they finally meet again after all those years... 💔', time: '9:12 AM', date: 'Today', read: false },
      ],
    },
    {
      id: 'conv4',
      contactId: 'c4',
      pinned: false,
      unread: 0,
      messages: [
        { id: 'm1', from: 'c4', text: 'pushed the PR, can you review?', time: '2:00 PM', date: 'Yesterday', read: true },
        { id: 'm2', from: 'me', text: 'On it! Give me 10 min', time: '2:02 PM', date: 'Yesterday', read: true },
        { id: 'm3', from: 'me', text: 'Left some comments, mostly minor stuff 👍', time: '2:18 PM', date: 'Yesterday', read: true },
        { id: 'm4', from: 'c4', text: 'Great, will address them now. Thanks!', time: '2:25 PM', date: 'Yesterday', read: true },
      ],
    },
    {
      id: 'conv5',
      contactId: 'c5',
      pinned: true,
      unread: 4,
      messages: [
        { id: 'm1', from: 'c1', senderName: 'Aanya', text: 'Hey team! Design review is at 3pm today 🎨', time: '8:00 AM', date: 'Today', read: true },
        { id: 'm2', from: 'c3', senderName: 'Priya',  text: 'Got it! Should I prepare a presentation?', time: '8:05 AM', date: 'Today', read: true },
        { id: 'm3', from: 'c1', senderName: 'Aanya', text: 'That would be great, just an overview of the new components', time: '8:07 AM', date: 'Today', read: true },
        { id: 'm4', from: 'c4', senderName: 'Dev',   text: 'Also reminder the Figma file has been updated', time: '8:15 AM', date: 'Today', read: false },
        { id: 'm5', from: 'c2', senderName: 'Rohan', text: 'Thanks for the update 🙌', time: '8:20 AM', date: 'Today', read: false },
        { id: 'm6', from: 'c3', senderName: 'Priya', text: 'See you all at 3! ✨', time: '9:00 AM', date: 'Today', read: false },
        { id: 'm7', from: 'c1', senderName: 'Aanya', text: '👍', time: '9:01 AM', date: 'Today', read: false },
      ],
    },
    {
      id: 'conv6',
      contactId: 'c6',
      pinned: false,
      unread: 0,
      messages: [
        { id: 'm1', from: 'c6', text: 'Just landed in Tokyo! 🗾✈️', time: '3 days ago', date: '3 days ago', read: true },
        { id: 'm2', from: 'me', text: 'Omg that is amazing!! How is it??', time: '3 days ago', date: '3 days ago', read: true },
        { id: 'm3', from: 'c6', text: 'Absolutely breathtaking. Food is out of this world 🍣', time: '3 days ago', date: '3 days ago', read: true },
        { id: 'm4', from: 'me', text: 'I am so jealous 😭 Bring me back sushi!', time: '3 days ago', date: '3 days ago', read: true },
        { id: 'm5', from: 'c6', text: 'Haha will do! 🤣 Miss you all', time: '3 days ago', date: '3 days ago', read: true },
      ],
    },
    {
      id: 'conv7',
      contactId: 'c7',
      pinned: false,
      unread: 0,
      messages: [
        { id: 'm1', from: 'c7', text: 'Check out this playlist!  🎵 it is fire', time: 'Monday', date: 'Monday', read: true },
        { id: 'm2', from: 'me', text: 'Added to my queue, will listen tonight', time: 'Monday', date: 'Monday', read: true },
        { id: 'm3', from: 'c7', text: 'The 3rd song especially. You will love it bro', time: 'Monday', date: 'Monday', read: true },
        { id: 'm4', from: 'me', text: 'Okay I am intrigued now 😂', time: 'Monday', date: 'Monday', read: true },
      ],
    },
  ];
}

export const EMOJIS = [
  '😀','😂','🥰','😍','🤩','😎','🥳','🤔',
  '👍','👎','❤️','🔥','✨','🎉','🙌','💯',
  '😭','😱','🤣','😅','👀','🫡','🫶','🤝',
  '🚀','🎮','🎵','📚','☕','🌍','🗾','🍣',
  '💪','🙏','✌️','🤙','👋','🫂','💬','📱',
];

export function getContact(id) {
  return CONTACTS.find(c => c.id === id);
}

export function getLastMessage(conv) {
  return conv.messages[conv.messages.length - 1];
}
