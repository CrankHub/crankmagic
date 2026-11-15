# Copyright (c) 2026 Rob Minor. All rights reserved. See LICENSE.
# Run with: python game/tools/batch/breaks.py tools/ai-everyone-breaks.py
# The AI door open to everyone signed in (Rob, 2026-10-14: "I want the AI door open on staging and production for anyone
# that can sign in"): with AI_EVERYONE on, the invite list is the allowlist and the app's own sign-in opens the door;
# with it off, the allowlist and the AI application hold as before; and each release sets it only as its profile says.
# Since the access groups (9d8120b7, 2026-10-26) the switch widens the sign-in only, never who may spend: createAi takes no
# `everyone`, so the six breaks of that option (the allowlist skipped, the service token, the four callers) are retired.
SUITES = ['tests/ai-door.mjs', 'tests/agent-seat-table.mjs', 'tests/release-pages.mjs']
WORKER, ROOM, AI, ACCESS, RELEASE = 'cloud/worker.mjs', 'cloud/game-room.mjs', 'cloud/ai.mjs', 'cloud/access.mjs', 'tools/release-pages.mjs'
BREAKS = [
    ("everyone let in with the switch off", AI, 'env?.AI_EVERYONE === "on"', 'true'),
    ("the app's sign-in never opens the door", WORKER, 'everyone(env) ? [env.AI_ACCESS_AUD, env.ACCESS_AUD] : env.AI_ACCESS_AUD', 'env.AI_ACCESS_AUD'),
    ("the app's sign-in opens the door with the switch off", WORKER, 'everyone(env) ? [env.AI_ACCESS_AUD, env.ACCESS_AUD] : env.AI_ACCESS_AUD', '[env.AI_ACCESS_AUD, env.ACCESS_AUD]'),
    ("a list of applications read for its first only", ACCESS, 'if (!audiences.some((audience) => named.includes(audience))) throw', 'if (!named.includes(audiences[0])) throw'),
    ("a release never sets the switch", RELEASE, '  ...(profile.ai.everyone ? {AI_EVERYONE: "on"} : {}),\n', ''),
    ("production's door for the allowlist only", RELEASE, 'ai: {aud: PRODUCTION.cloud.access.aud, everyone: true,', 'ai: {aud: PRODUCTION.cloud.access.aud,'),
    ("staging's door for the allowlist only", RELEASE, 'ai: {aud: "213cb6b10352e5ed5525d6337f355cd5190dec402e86debd30971d3bd5bda1f5", everyone: true,', 'ai: {aud: "213cb6b10352e5ed5525d6337f355cd5190dec402e86debd30971d3bd5bda1f5",'),
]
