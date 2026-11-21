// What the mascot says. Playful teasing only: she roasts you with love.
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

export const LINES = {
  greet: [
    'Ready to be productive? Haha. Press start and prove me wrong.',
    "Oh, you came back! I only said I'd miss you a LITTLE.",
    "Today's forecast: 100% chance of flow, 0% chance of excuses.",
  ],
  poke: [
    "Stop poking me and press START. >w<",
    "Ow! That's harassment. Productive harassment, but still.",
    "You can click me all day. Your quest still won't start itself.",
    'Procrastination speedrun, any%. Nice pace. nya~',
    "I'm not a button. Okay, I'm a little bit a button.",
    'Fun fact: I live in your browser tab rent-free.',
  ],
  start: ["Let's gooo! Try not to embarrass me.", 'Round 1, FIGHT! (Focus, not actual fighting.)'],
  round: ['New stage! Try not to cry this time.', 'Stage clear! ...now do it again, champ.'],
  chat: [
    'Stare at the screen harder. It helps. (It does not.)',
    'I believe in you! ...mostly. Like 70%.',
    'Your chair called. It wants a break. Ignore it.',
    'Hydrate or diedrate! nya~',
    "Bet you can't go one whole minute without thinking about snacks.",
    'Your posture is NOT S-rank right now. Fix it.',
    'Plot twist: the real flow state was the friends we made along the way.',
    'Is that a bug, or did you just get distracted? Hmmm.',
    'Main character energy detected. Do not waste it.',
    "I've seen houseplants with worse focus. You're doing fine.",
    'Another minute, another tiny piece of your soul on the quest board.',
    'You blinked. I saw that. Judging.',
  ],
  form: [
    '',
    "AWAKENED! Look at you go!",
    'SUPER MODE! LET\'S GOOOO!',
    'ULTRA! My hair is literally glowing!',
    'LIMIT BREAK!! POWER LEVEL OVER 9000!!!',
  ],
  miss: [
    'LMAO skill issue. hmph!',
    'Oh no. Anyway. Depth: gone.',
    "Bruh. We were SO close.",
    '*sips tea* ...continue.',
    "That's a 0/10 on the vibe check.",
    "I'm not mad. I'm just disappointed. And a little mad.",
    'Press F to pay respects to your streak.',
  ],
  pause: [
    'Pausing already?? Cute. >w<',
    "Taking a nap? I'll be here. Judging.",
    'Wow. Resting. So brave.',
    'The timer is paused. My patience is not.',
  ],
  resume: ['Welcome back, legend. Sort of.', 'Oh, you live! Continue. uwu'],
  retreat: ["No no no don't go!!", 'Hold... hold... you are NOT really quitting, right?!', 'Retreat?! In THIS economy?!'],
  stay: ['Haha, knew you could not quit. nya~ :3', 'Back to work, coward. (affectionate)', 'Thought so.'],
  notif: [
    'Ooh, a notification. Ignore it, I dare you.',
    "Not you getting distracted by FAKE notifications. I made those.",
    "That's not real. I faked it. Focus!",
    'Do NOT open that. It is a trap. I set the trap.',
  ],
  park: ["Noted. Now back to work, you goblin.", 'Thought parked. Brain cleared. Spicy. >w<'],
  task: ['Objective cleared! I am so proud... ew.', 'Check! Do it again.', 'One down. The rest are scared of you.'],
  clear: ['ALL CLEAR?! Look at you being productive. Disgusting. Proud of you.'],
  mute: ['Muting me?! RUDE. I can still see you.', "You can mute me but you can't mute my disappointment."],
  unmute: ['Oh good, you missed me.'],
  sprint: ['10 SECONDS! DO NOT CHOKE NOW!'],
  break: ['Zzz... wake me when the break is over.', 'Snack time. Do not doomscroll. (You will.)', 'Stretch! Look at something far away. Like your goals.'],
  grade: {
    S: ["...Okay fine, you're kind of a legend.", 'S RANK?! Who ARE you?!'],
    A: ['A rank! Not bad at all!', "Almost perfect. I'd say 'proud' but I have a reputation."],
    B: ['B rank. Mid. But cute.', 'Solid. Like a good sandwich.'],
    C: ['C rank. Bruh.', 'We call that "a start".'],
    D: ["D rank. I've seen houseplants more productive. Again tomorrow?", 'It happens. Do not look at the replay.'],
  },
  rage: ['Rage quit detected. Pathetic. See you in 5 minutes.', 'Retreat accepted. Tactically. Very tactically.'],
};

// Fake notifications that try to distract you (the mascot makes fun of you for noticing).
export const NOTIFS = [
  ['Mom', 'are u studying?? 👀', '#ff6b81'],
  ['Discord', 'Someone is typing…', '#5865f2'],
  ['Instagram', '99+ new notifications (don\'t look)', '#e1306c'],
  ['Crush', 'Seen 12:03', '#ff9f43'],
  ['Phone', 'Screen time is up 400% 📈', '#2ed573'],
  ['YouTube', 'New: "How to focus (10 min)"', '#ff2d2d'],
  ['Boss', 'quick question (it is not quick)', '#1e90ff'],
  ['Fridge', 'Hey. It\'s me. The snacks. Come back.', '#a855f7'],
  ['WhatsApp', 'Group chat: 214 unread messages', '#25d366'],
  ['Twitter', 'You won\'t BELIEVE what this guy said', '#1d9bf0'],
  ['Amazon', 'Your package is out for delivery (it is a mug)', '#ff9900'],
  ['Steam', 'Your game is 100% updated. Play me.', '#66c0f4'],
  ['TikTok', 'This video is made for you ✨ (it is not)', '#fe2c55'],
  ['Calendar', 'Reminder: you have a reminder', '#f43f5e'],
  ['Mom', 'did u eat??', '#ff6b81'],
  ['Mom', 'call me when u can', '#ff6b81'],
  ['Spotify', 'Your Daily Mix is ready. Press play. Just one song.', '#1db954'],
  ['Weather', 'It is nice outside. Just saying.', '#38bdf8'],
  ['Bank', 'Suspicious activity: you are being productive', '#14b8a6'],
  ['Group Project', 'Who is doing the slides?? (nobody)', '#f59e0b'],
  ['Tinder', 'Someone nearby is also not studying', '#ff5864'],
  ['Email', '47 unread. One is important. Which? Who knows.', '#6366f1'],
  ['Reddit', 'r/AskReddit: What is your most useless skill?', '#ff4500'],
  ['Snake', 'Your high score was beaten by a stranger', '#84cc16'],
  ['Teacher', 'Reminder: deadline was yesterday', '#ef4444'],
  ['Duolingo', 'Your owl is disappointed. And a little scary.', '#58cc02'],
  ['Pizza Place', 'Cheesy deals just for you 🍕', '#f97316'],
  ['Unknown', 'u up?', '#64748b'],
];

// Fake achievements.
export const TROLL_ACH = [
  [90, 'PROFESSIONAL STARER', 'Looked at a screen for 90 whole seconds'],
  [300, 'TOUCH GRASS', 'Not unlocked. Go outside later.'],
  [600, 'MAIN CHARACTER', 'The mascot is rooting for you. Reluctantly.'],
];

export const IMPACTS = ['BOOM!', 'ZOOM!', 'KAPOW!', 'WHAM!', 'SMASH!', 'ドン!', 'ババーン!', 'ZAP!', 'CRASH!', 'BANG!', 'ゴゴゴ'];
export const WINDOWS = [
  ['System Error', 'Your focus is dangerously high. Continue? [YES] [YES]'],
  ['Update Available', 'Installing Motivation 2.0... 99%... jk'],
  ['Congratulations!!!', 'You are the 1,000,000th visitor to your own homework!'],
  ['Warning', 'Too much productivity detected. Please slow down.'],
  ['Clippy 3.0', 'It looks like you are focusing. Would you like help? (No.)'],
  ['Antivirus', 'Found 1 threat: procrastination.exe. Deleted.'],
  ['FREE ROBUX', 'Click here! (do not click here)'],
  ['Bluescreen', 'brain.exe is running at 400% CPU'],
  ['Hot Singles', 'in your area want you to finish your quest'],
];
export const CHAT_USERS = ['xX_StudyGod_Xx', 'FlowEnjoyer', 'NotABot', 'sleepy_gamer', 'MrFocus', 'Pomodoro_Pete', 'kawaii_focus', 'chat_is_this_real', 'L0ck3dIn', 'ratio_king'];
export const CHAT = [
  'LET HIM COOK', 'KEKW', 'W focus', 'he locked in fr', 'POGGERS', 'Sadge he blinked', 'mods ban him for being too productive', 'is this legal?',
  'TRUE FLOW', 'chat clip that', 'focus diff', 'hydrate!!!', 'NO WAY', 'COMBO!!!', 'he is NOT human', 'L + distraction', 'insane concentration', 'sheeeesh',
  'imagine looking at your phone', 'BRO IS COOKING', 'ayo?!', 'new PB??', 'MY GUY', 'someone call a doctor, his focus is too high',
];
export const RAIN = ['🔥', '⚡', '💀', '✨', '🍜', '🐸', '💎', '🚀', '👑', '🧠', '⭐', '💥'];
export const STUNT_LINES = ['LOOK AT ME!!', 'MAIN CHARACTER MOMENT', 'BEHOLD!!', 'I AM THE FLOW', 'WATCH THIS!', 'TOO FAST FOR YOU', 'ZOOM ZOOM ZOOM'];
LINES.shock = ['WHAT WAS THAT?!', 'A POPUP?! IN THIS ECONOMY?!', 'It is FAKE. Probably.', 'WHO ALLOWED THIS?!'];
LINES.dvd = ['Do not stare at the logo. DO NOT.', 'Wait for it... wait for it... the CORNER.', 'Hypnotic. Ignore it.'];
